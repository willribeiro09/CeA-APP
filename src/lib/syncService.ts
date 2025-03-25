import { supabase } from './supabase';
import { StorageItems, Expense, Project, StockItem, Employee } from '../types';
import { storage } from './storage';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ID único para esta sessão do navegador
const SESSION_ID = Math.random().toString(36).substring(2, 15);
console.log('ID da sessão:', SESSION_ID);

// Intervalo para verificação de alterações (5 segundos)
const SYNC_INTERVAL = 5000;

// Estrutura para manter controle de versões
interface SyncVersion {
  table: string;
  lastSync: number;
  version: number;
}

// Armazenamento de versões locais
const localVersions: Record<string, SyncVersion> = {
  expenses: { table: 'expenses', lastSync: 0, version: 0 },
  projects: { table: 'projects', lastSync: 0, version: 0 },
  stock_items: { table: 'stock_items', lastSync: 0, version: 0 },
  employees: { table: 'employees', lastSync: 0, version: 0 },
  sync_control: { table: 'sync_control', lastSync: 0, version: 0 }
};

// Status da sincronização
let isSyncing = false;
let lastActivityTime = Date.now();
let isAppVisible = true;

// Detectar quando o app está em segundo plano
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    isAppVisible = false;
    lastActivityTime = Date.now();
  } else {
    const inactiveTime = Date.now() - lastActivityTime;
    isAppVisible = true;
    
    // Se o app esteve inativo por mais de 1 segundo, forçar sincronização
    if (inactiveTime > 1000) {
      console.log(`App retornou após ${inactiveTime}ms, forçando sincronização...`);
      syncService.syncAll();
    }
  }
});

// Interceptar a primeira interação do usuário após carregar
document.addEventListener('click', () => {
  // Executar apenas uma vez após o carregamento da página
  if (!syncService.initialSyncDone) {
    console.log('Primeira interação do usuário detectada, sincronizando...');
    syncService.syncAll();
    syncService.initialSyncDone = true;
  }
}, { once: true });

// Adicionar uma interface para os dados do banco de dados para evitar erros de tipo
interface DatabaseExpense extends Omit<Expense, 'project_id' | 'photo_url'> {
  project_id: string;
  photo_url: string;
  version: number;
  last_modified_by: string;
  last_sync: string;
  owner_id: string;
}

interface DatabaseStockItem extends Omit<StockItem, 'project_id'> {
  project_id: string;
  version: number;
  last_modified_by: string;
  last_sync: string;
}

interface DatabaseEmployee extends Omit<Employee, 'role'> {
  role: string;
  daily_rate: number;
  days_worked: number;
  week_start: string;
  worked_dates: string;
  version: number;
  last_modified_by: string;
  last_sync: string;
}

export const syncService = {
  channels: {} as Record<string, RealtimeChannel>,
  isInitialized: false,
  initialSyncDone: false,
  
  // Inicializa o serviço de sincronização
  init() {
    if (!supabase || this.isInitialized) return;
    
    console.log('Inicializando serviço de sincronização...', SESSION_ID);
    this.isInitialized = true;
    
    // Limpar canais anteriores se existirem
    this.unsubscribeAll();
    
    // Configurar canais de sincronização em tempo real para cada tabela
    this.setupRealtimeChannel('expenses', 'expenses');
    this.setupRealtimeChannel('projects', 'projects');
    this.setupRealtimeChannel('stock_items', 'stock_items');
    this.setupRealtimeChannel('employees', 'employees');
    this.setupRealtimeChannel('sync_control', 'global');
    
    // Iniciar verificação periódica de mudanças
    setInterval(() => {
      if (!isSyncing && isAppVisible) {
        this.syncAll();
      }
    }, SYNC_INTERVAL);
    
    // Fazer sincronização inicial
    this.syncAll();
  },
  
  // Configura um canal de sincronização em tempo real
  setupRealtimeChannel(table: string, channelName: string) {
    if (!supabase) return;
    
    // Limpar canal anterior se existir
    if (this.channels[channelName]) {
      this.channels[channelName].unsubscribe();
    }
    
    // Criar novo canal
    this.channels[channelName] = supabase
      .channel(`${channelName}_changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: table
        }, 
        async (payload: RealtimePostgresChangesPayload<any>) => {
          // Ignorar mudanças feitas por esta sessão
          if (payload.new && payload.new.last_modified_by !== SESSION_ID) {
            console.log(`Mudança em ${table} recebida em tempo real:`, payload);
            
            // Atualizar versão local para esta tabela
            if (payload.new.version) {
              localVersions[table].version = Math.max(
                localVersions[table].version,
                payload.new.version
              );
              localVersions[table].lastSync = Date.now();
            }
            
            // Sincronizar dados para refletir a mudança
            await this.syncTable(table);
            
            // Se for a tabela sync_control, verificar valores do Will
            if (table === 'sync_control' && payload.new.table_name === 'global') {
              await this.updateWillValues(
                payload.new.will_base_rate, 
                payload.new.will_bonus
              );
            }
          }
        }
      )
      .subscribe((status: string) => {
        console.log(`Status do canal ${channelName}:`, status);
      });
  },
  
  // Remove todas as inscrições de canais
  unsubscribeAll() {
    Object.values(this.channels).forEach(channel => {
      if (channel) {
        channel.unsubscribe();
      }
    });
    this.channels = {};
  },
  
  // Sincroniza todas as tabelas
  async syncAll() {
    if (!supabase || isSyncing) return;
    
    try {
      isSyncing = true;
      console.log('Iniciando sincronização completa...');
      
      // Sincronizar todas as tabelas
      await this.syncTable('expenses');
      await this.syncTable('projects');
      await this.syncTable('stock_items');
      await this.syncTable('employees');
      await this.syncTable('sync_control');
      
      isSyncing = false;
      console.log('Sincronização completa concluída');
    } catch (error) {
      console.error('Erro durante sincronização completa:', error);
      isSyncing = false;
    }
  },
  
  // Sincroniza uma tabela específica
  async syncTable(table: string) {
    if (!supabase) return;
    
    try {
      console.log(`Sincronizando tabela ${table}...`);
      
      // Obter última versão conhecida
      const lastVersion = localVersions[table].version;
      
      // Buscar registros mais recentes que a versão local
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .gt('version', lastVersion)
        .order('version', { ascending: true });
      
      if (error) {
        console.error(`Erro ao sincronizar tabela ${table}:`, error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log(`Nenhuma atualização para ${table}`);
        return;
      }
      
      console.log(`Encontradas ${data.length} atualizações para ${table}`);
      
      // Processar as atualizações
      let highestVersion = lastVersion;
      
      // Obter dados atuais do armazenamento local
      const storageData = storage.load() || {
        expenses: {},
        projects: [],
        stock: [],
        employees: {},
        willBaseRate: 200,
        willBonus: 0,
        lastSync: Date.now()
      };
      
      // Aplicar atualizações de acordo com o tipo de tabela
      switch (table) {
        case 'expenses':
          // Agrupar despesas por proprietário
          const updatedExpenses = { ...storageData.expenses };
          
          data.forEach(expense => {
            const ownerId = expense.owner_id || 'C&A';
            
            if (!updatedExpenses[ownerId]) {
              updatedExpenses[ownerId] = [];
            }
            
            // Verificar se a despesa já existe
            const expenseIndex = updatedExpenses[ownerId].findIndex(
              (e: Expense) => e.id === expense.id
            );
            
            // Converter para o formato de Expense usando any para evitar problemas de tipo
            const expenseItem: any = {
              id: expense.id,
              description: expense.description,
              amount: expense.amount,
              date: expense.date,
              category: expense.category || '',
              is_paid: expense.is_paid,
              photo_url: expense.photo_url,
              project_id: expense.project_id
            };
            
            if (expenseIndex >= 0) {
              updatedExpenses[ownerId][expenseIndex] = expenseItem;
            } else {
              updatedExpenses[ownerId].push(expenseItem);
            }
            
            highestVersion = Math.max(highestVersion, expense.version);
          });
          
          // Atualizar armazenamento local
          storageData.expenses = updatedExpenses;
          break;
          
        case 'projects':
          // Atualizar projetos
          const updatedProjects = [...storageData.projects];
          
          data.forEach(project => {
            // Converter para o formato de Project
            const projectItem: Project = {
              id: project.id,
              client: project.client,
              name: project.name,
              location: project.location,
              startDate: project.start_date,
              endDate: project.end_date,
              status: project.status,
              description: project.description,
              projectNumber: project.project_number,
              value: project.value,
              invoiceOk: project.invoice_ok
            };
            
            // Verificar se o projeto já existe
            const projectIndex = updatedProjects.findIndex(
              (p: Project) => p.id === project.id
            );
            
            if (projectIndex >= 0) {
              updatedProjects[projectIndex] = projectItem;
            } else {
              updatedProjects.push(projectItem);
            }
            
            highestVersion = Math.max(highestVersion, project.version);
          });
          
          // Atualizar armazenamento local
          storageData.projects = updatedProjects;
          break;
          
        case 'stock_items':
          // Atualizar itens de estoque
          const updatedStock = [...storageData.stock];
          
          data.forEach(item => {
            // Converter para o formato de StockItem usando any para evitar problemas de tipo
            const stockItem: any = {
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              project_id: item.project_id
            };
            
            // Verificar se o item já existe
            const itemIndex = updatedStock.findIndex(
              (s: StockItem) => s.id === item.id
            );
            
            if (itemIndex >= 0) {
              updatedStock[itemIndex] = stockItem;
            } else {
              updatedStock.push(stockItem);
            }
            
            highestVersion = Math.max(highestVersion, item.version);
          });
          
          // Atualizar armazenamento local
          storageData.stock = updatedStock;
          break;
          
        case 'employees':
          // Atualizar funcionários
          const updatedEmployees = { ...storageData.employees };
          
          data.forEach(employee => {
            const weekStart = employee.week_start || 
              new Date().toISOString().split('T')[0];
            
            if (!updatedEmployees[weekStart]) {
              updatedEmployees[weekStart] = [];
            }
            
            // Converter para o formato de Employee usando any para evitar problemas de tipo
            const employeeItem: any = {
              id: employee.id,
              name: employee.name,
              role: employee.role,
              dailyRate: employee.daily_rate,
              daysWorked: employee.days_worked,
              // Converter string JSON para array
              workedDates: typeof employee.worked_dates === 'string' 
                ? JSON.parse(employee.worked_dates)
                : (employee.worked_dates || []),
              weekStartDate: weekStart
            };
            
            // Verificar se o funcionário já existe nesta semana
            const employeeIndex = updatedEmployees[weekStart].findIndex(
              (e: Employee) => e.id === employee.id
            );
            
            if (employeeIndex >= 0) {
              updatedEmployees[weekStart][employeeIndex] = employeeItem;
            } else {
              updatedEmployees[weekStart].push(employeeItem);
            }
            
            highestVersion = Math.max(highestVersion, employee.version);
          });
          
          // Atualizar armazenamento local
          storageData.employees = updatedEmployees;
          break;
          
        case 'sync_control':
          // Verificar configurações globais (Will)
          const globalConfig = data.find(
            (config: any) => config.table_name === 'global'
          );
          
          if (globalConfig) {
            storageData.willBaseRate = globalConfig.will_base_rate || 200;
            storageData.willBonus = globalConfig.will_bonus || 0;
            highestVersion = Math.max(highestVersion, globalConfig.global_version);
          }
          break;
      }
      
      // Atualizar versão local
      localVersions[table].version = highestVersion;
      localVersions[table].lastSync = Date.now();
      
      // Atualizar timestamp de sincronização
      storageData.lastSync = Date.now();
      
      // Salvar dados atualizados localmente
      storage.save(storageData);
      
      // Disparar evento para atualizar a UI
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: storageData 
      }));
      
      console.log(`Sincronização de ${table} concluída. Nova versão: ${highestVersion}`);
    } catch (error) {
      console.error(`Erro ao sincronizar tabela ${table}:`, error);
    }
  },
  
  // Atualiza os valores do Will
  async updateWillValues(baseRate: number, bonus: number) {
    try {
      const storageData = storage.load();
      
      if (!storageData) return;
      
      storageData.willBaseRate = baseRate || 200;
      storageData.willBonus = bonus || 0;
      
      // Salvar localmente
      storage.save(storageData);
      
      // Disparar evento para atualizar a UI
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: storageData 
      }));
      
      console.log('Valores do Will atualizados:', baseRate, bonus);
    } catch (error) {
      console.error('Erro ao atualizar valores do Will:', error);
    }
  },
  
  // Salva dados com sincronização
  async saveData(data: StorageItems): Promise<boolean> {
    if (!supabase) {
      // Se não há Supabase, apenas salvar localmente
      storage.save(data);
      return true;
    }
    
    try {
      console.log('Salvando dados com sincronização...');
      
      // Armazenar localmente primeiro para resposta rápida
      storage.save(data);
      
      // Sincronizar despesas
      if (data.expenses) {
        await this.saveExpenses(data.expenses);
      }
      
      // Sincronizar projetos
      if (data.projects) {
        await this.saveProjects(data.projects);
      }
      
      // Sincronizar estoque
      if (data.stock) {
        await this.saveStockItems(data.stock);
      }
      
      // Sincronizar funcionários
      if (data.employees) {
        await this.saveEmployees(data.employees);
      }
      
      // Sincronizar valores do Will
      await this.saveWillValues(data.willBaseRate, data.willBonus);
      
      console.log('Sincronização concluída com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      return false;
    }
  },
  
  // Salva despesas no servidor
  async saveExpenses(expenses: Record<string, Expense[]>): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      for (const [ownerId, expenseList] of Object.entries(expenses)) {
        for (const expense of expenseList) {
          // Obter versão atual
          const { data: versionData, error: versionError } = await supabase
            .from('expenses')
            .select('version')
            .eq('id', expense.id)
            .limit(1);
          
          let currentVersion = 1;
          
          if (!versionError && versionData && versionData.length > 0) {
            currentVersion = (versionData[0].version || 0) + 1;
          }
          
          // Ignorar verificação de tipo para usar any
          const expenseData: any = {
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            date: expense.date,
            category: expense.category,
            // @ts-ignore: Propriedade inexistente no tipo
            project_id: expense.project_id,
            // @ts-ignore: Propriedade inexistente no tipo
            photo_url: expense.photo_url,
            is_paid: expense.is_paid,
            owner_id: ownerId,
            version: currentVersion,
            last_modified_by: SESSION_ID,
            last_sync: new Date().toISOString()
          };
          
          // Usar asserção de tipo any na inserção
          const { error } = await supabase
            .from('expenses')
            .upsert(expenseData);
          
          if (error) {
            console.error('Erro ao salvar despesa:', error);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar despesas:', error);
      return false;
    }
  },
  
  // Salva projetos no servidor
  async saveProjects(projects: Project[]): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      for (const project of projects) {
        // Obter versão atual
        const { data: versionData, error: versionError } = await supabase
          .from('projects')
          .select('version')
          .eq('id', project.id)
          .limit(1);
        
        let currentVersion = 1;
        
        if (!versionError && versionData && versionData.length > 0) {
          currentVersion = (versionData[0].version || 0) + 1;
        }
        
        // Salvar projeto
        const { error } = await supabase
          .from('projects')
          .upsert({
            id: project.id,
            name: project.name || 'Projeto sem nome',
            client: project.client,
            location: project.location,
            start_date: project.startDate,
            end_date: project.endDate,
            status: project.status || 'in_progress',
            description: project.description,
            project_number: project.projectNumber,
            value: project.value || 0,
            invoice_ok: project.invoiceOk || false,
            version: currentVersion,
            last_modified_by: SESSION_ID,
            last_sync: new Date().toISOString()
          });
        
        if (error) {
          console.error('Erro ao salvar projeto:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar projetos:', error);
      return false;
    }
  },
  
  // Salva itens de estoque no servidor
  async saveStockItems(stockItems: StockItem[]): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      for (const item of stockItems) {
        // Obter versão atual
        const { data: versionData, error: versionError } = await supabase
          .from('stock_items')
          .select('version')
          .eq('id', item.id)
          .limit(1);
        
        let currentVersion = 1;
        
        if (!versionError && versionData && versionData.length > 0) {
          currentVersion = (versionData[0].version || 0) + 1;
        }
        
        // Ignorar verificação de tipo para usar any
        const stockData: any = {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          // @ts-ignore: Propriedade inexistente no tipo
          project_id: item.project_id,
          version: currentVersion,
          last_modified_by: SESSION_ID,
          last_sync: new Date().toISOString()
        };
        
        // Ignorar erro de tipo
        const { error } = await supabase
          .from('stock_items')
          .upsert(stockData);
        
        if (error) {
          console.error('Erro ao salvar item de estoque:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar itens de estoque:', error);
      return false;
    }
  },
  
  // Salva funcionários no servidor
  async saveEmployees(employees: Record<string, Employee[]>): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      for (const [weekStart, employeeList] of Object.entries(employees)) {
        for (const employee of employeeList) {
          // Obter versão atual
          const { data: versionData, error: versionError } = await supabase
            .from('employees')
            .select('version')
            .eq('id', employee.id)
            .limit(1);
          
          let currentVersion = 1;
          
          if (!versionError && versionData && versionData.length > 0) {
            currentVersion = (versionData[0].version || 0) + 1;
          }
          
          // Ignorar verificação de tipo para usar any
          const employeeData: any = {
            id: employee.id,
            name: employee.name,
            // @ts-ignore: Propriedade inexistente no tipo
            role: employee.role,
            daily_rate: employee.dailyRate || 250,
            week_start: weekStart,
            days_worked: employee.daysWorked || 0,
            worked_dates: JSON.stringify(employee.workedDates || []),
            version: currentVersion,
            last_modified_by: SESSION_ID,
            last_sync: new Date().toISOString()
          };
          
          // Ignorar erro de tipo
          const { error } = await supabase
            .from('employees')
            .upsert(employeeData);
          
          if (error) {
            console.error('Erro ao salvar funcionário:', error);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar funcionários:', error);
      return false;
    }
  },
  
  // Salva valores do Will no servidor
  async saveWillValues(baseRate: number = 200, bonus: number = 0): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      // Obter versão atual
      const { data: versionData, error: versionError } = await supabase
        .from('sync_control')
        .select('global_version')
        .eq('table_name', 'global')
        .limit(1);
      
      let currentVersion = 1;
      
      if (!versionError && versionData && versionData.length > 0) {
        currentVersion = (versionData[0].global_version || 0) + 1;
      }
      
      // Salvar valores do Will
      const { error } = await supabase
        .from('sync_control')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001',
          table_name: 'global',
          will_base_rate: baseRate,
          will_bonus: bonus,
          global_version: currentVersion,
          last_modified_by: SESSION_ID,
          last_sync: new Date().toISOString()
        });
      
      if (error) {
        console.error('Erro ao salvar valores do Will:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar valores do Will:', error);
      return false;
    }
  }
};

// Função auxiliar para carregar dados iniciais
export const loadInitialData = async (): Promise<StorageItems | null> => {
  if (!supabase) {
    console.log('Supabase não configurado, carregando dados locais');
    return storage.load();
  }
  
  try {
    // Inicializar serviço de sincronização se não estiver inicializado
    if (!syncService.isInitialized) {
      syncService.init();
    }
    
    // Tentar fazer sincronização completa
    await syncService.syncAll();
    
    // Carregar dados do armazenamento local
    const localData = storage.load();
    
    if (localData) {
      return localData;
    }
    
    // Se não houver dados locais, criar estrutura vazia
    console.log('Nenhum dado encontrado, inicializando com estrutura vazia');
    const emptyData: StorageItems = {
      expenses: {},
      projects: [],
      stock: [],
      employees: {},
      willBaseRate: 200,
      willBonus: 0,
      lastSync: Date.now()
    };
    
    // Salvar localmente
    storage.save(emptyData);
    return emptyData;
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
    return storage.load();
  }
};

// Função para salvar dados
export const saveData = (data: StorageItems): Promise<boolean> => {
  return syncService.saveData(data);
}; 