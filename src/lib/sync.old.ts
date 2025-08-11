import { supabase } from './supabase';
import { StorageItems, Expense, Project, StockItem, Employee, PendingChange } from '../types';
import { storage, getData } from './storage';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { openDB as openIndexedDB, IDBPDatabase } from 'idb';

// Identificador único para esta sessão do navegador
const SESSION_ID = Math.random().toString(36).substring(2, 15);
console.log('ID da sessão:', SESSION_ID);

// ID FIXO compartilhado por todas as instalações do app
// Usando um UUID fixo para garantir que todos os usuários vejam os mesmos dados
const SHARED_UUID = "ce764a91-58e0-4c3d-a821-b52b16ca3e7c";
console.log('UUID compartilhado para sincronização:', SHARED_UUID);

// Intervalo de sincronização em milissegundos (5 segundos)
const SYNC_INTERVAL = 5000;

// Canais de sincronização para cada tipo de dados
type SyncChannels = {
  expenses: RealtimeChannel | null;
  employees: RealtimeChannel | null;
  projects: RealtimeChannel | null;
  stock: RealtimeChannel | null;
  willSettings: RealtimeChannel | null;
};

// Interface para as despesas adaptadas ao formato de banco de dados
interface DBExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  project?: string;
  photo_url?: string;
  is_paid: boolean;
}

// Interface para os funcionários adaptados ao formato de banco de dados
interface DBEmployee {
  id: string;
  name: string;
  role?: string;
  base_rate: number;
  bonus: number;
  expenses: any[];
}

// Interface para os projetos adaptados ao formato de banco de dados
interface DBProject {
  id: string;
  name: string;
  client?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  description?: string;
}

// Interface para os itens de estoque adaptados ao formato de banco de dados
interface DBStockItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  project?: string;
}

// Função para garantir que os valores do Will estejam definidos
const ensureWillValues = (data: any): { willBaseRate: number, willBonus: number } => {
  return {
    willBaseRate: typeof data.willBaseRate === 'number' ? data.willBaseRate : 200,
    willBonus: typeof data.willBonus === 'number' ? data.willBonus : 0
  };
};

// Função para resolver conflitos de versão
const resolveConflict = (localData: StorageItems, remoteData: any): Promise<StorageItems> => {
  console.log('Resolvendo conflito de versão:');
  console.log('- Versão local:', localData.version);
  console.log('- Última atualização local:', new Date(localData.updatedAt || 0).toISOString());
  console.log('- Versão remota:', remoteData.version);
  console.log('- Última atualização remota:', new Date(remoteData.updated_at).toISOString());

  // Extrair timestamps para comparação
  const localTimestamp = Number(localData.updatedAt || 0);
  const remoteTimestamp = new Date(remoteData.updated_at).getTime();

  // Retornar uma Promise que será resolvida após a decisão do usuário
  return new Promise((resolve) => {
    // Chamar função para perguntar ao usuário
    handleConflict(localData, remoteData, (useRemoteData) => {
      if (useRemoteData) {
        console.log('Usuário escolheu dados remotos, dando prioridade');

        // Pegar valores remotos, mas manter dados pendentes locais se existirem
        const pendingChanges = localData.pendingChanges || [];

        // Garantir que os valores do Will estejam definidos
        const willValues = ensureWillValues(remoteData);

        resolve({
          expenses: remoteData.expenses || {},
          projects: remoteData.projects || [],
          stock: remoteData.stock || [],
          employees: remoteData.employees || {},
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          lastSync: remoteTimestamp,
          updatedAt: remoteTimestamp,
          version: remoteData.version || (localData.version || 0) + 1,
          pendingChanges: pendingChanges,
          isOffline: false
        });
      } else {
        console.log('Usuário escolheu dados locais, mantendo-os e marcando para upload');

        // Incrementar versão para garantir que seja considerada mais recente na próxima sincronização
        resolve({
          ...localData,
          version: Math.max((remoteData.version || 0) + 1, (localData.version || 0) + 1),
          isOffline: false
        });
      }
    });
  });
};

/**
 * Função para exibir diálogo de conflito ao usuário
 * @param localData Dados locais atuais
 * @param remoteData Dados remotos do servidor
 * @param callback Função de retorno com a decisão do usuário (true = usar dados remotos, false = manter dados locais)
 */
const handleConflict = (localData: StorageItems, remoteData: any, callback: (useRemoteData: boolean) => void) => {
  // Criar o elemento de diálogo
  const dialogWrapper = document.createElement('div');
  dialogWrapper.style.position = 'fixed';
  dialogWrapper.style.top = '0';
  dialogWrapper.style.left = '0';
  dialogWrapper.style.width = '100%';
  dialogWrapper.style.height = '100%';
  dialogWrapper.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  dialogWrapper.style.display = 'flex';
  dialogWrapper.style.justifyContent = 'center';
  dialogWrapper.style.alignItems = 'center';
  dialogWrapper.style.zIndex = '9999';

  // Criar o conteúdo do diálogo
  const dialog = document.createElement('div');
  dialog.style.backgroundColor = 'white';
  dialog.style.borderRadius = '8px';
  dialog.style.padding = '20px';
  dialog.style.maxWidth = '450px';
  dialog.style.width = '90%';
  dialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';

  // Cabeçalho
  const header = document.createElement('h3');
  header.textContent = 'Conflito de dados detectado';
  header.style.margin = '0 0 16px 0';
  header.style.color = '#333';
  header.style.fontWeight = 'bold';

  // Mensagem
  const message = document.createElement('p');
  message.textContent = 'Houve uma alteração externa. Deseja sobrescrever ou manter sua versão local?';
  message.style.marginBottom = '12px';
  message.style.color = '#555';

  // Detalhes
  const details = document.createElement('div');
  details.style.backgroundColor = '#f5f5f5';
  details.style.padding = '12px';
  details.style.borderRadius = '4px';
  details.style.marginBottom = '16px';
  details.style.fontSize = '14px';

  const localDate = new Date(localData.updatedAt || 0).toLocaleString('pt-BR');
  const remoteDate = new Date(remoteData.updated_at).toLocaleString('pt-BR');

  details.innerHTML = `
    <div style="margin-bottom: 8px"><strong>Sua versão:</strong> atualizada em ${localDate}</div>
    <div><strong>Versão do servidor:</strong> atualizada em ${remoteDate}</div>
  `;

  // Botões
  const buttons = document.createElement('div');
  buttons.style.display = 'flex';
  buttons.style.justifyContent = 'flex-end';
  buttons.style.gap = '12px';

  const keepButton = document.createElement('button');
  keepButton.textContent = 'Manter Local';
  keepButton.style.padding = '8px 16px';
  keepButton.style.border = '1px solid #ddd';
  keepButton.style.borderRadius = '4px';
  keepButton.style.backgroundColor = '#f1f1f1';
  keepButton.style.cursor = 'pointer';

  const updateButton = document.createElement('button');
  updateButton.textContent = 'Atualizar para Servidor';
  updateButton.style.padding = '8px 16px';
  updateButton.style.border = 'none';
  updateButton.style.borderRadius = '4px';
  updateButton.style.backgroundColor = '#0066CC';
  updateButton.style.color = 'white';
  updateButton.style.cursor = 'pointer';

  // Fechar o diálogo e retornar a decisão
  keepButton.onclick = () => {
    document.body.removeChild(dialogWrapper);
    callback(false);
  };

  updateButton.onclick = () => {
    document.body.removeChild(dialogWrapper);
    callback(true);
  };

  // Montar o diálogo
  buttons.appendChild(keepButton);
  buttons.appendChild(updateButton);

  dialog.appendChild(header);
  dialog.appendChild(message);
  dialog.appendChild(details);
  dialog.appendChild(buttons);

  dialogWrapper.appendChild(dialog);

  // Adicionar ao DOM
  document.body.appendChild(dialogWrapper);
};

// Função para aplicar mudanças locais pendentes
const applyPendingChanges = (data: StorageItems, changes: PendingChange[]): StorageItems => {
  if (!changes.length) return data;

  console.log(`Aplicando ${changes.length} mudanças pendentes aos dados`);

  // Ordenar mudanças por timestamp para garantir sequência correta
  const sortedChanges = [...changes].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  // Clonar os dados para não modificar os originais
  const updatedData: StorageItems = JSON.parse(JSON.stringify(data));

  // Aplicar cada mudança sequencialmente
  for (const change of sortedChanges) {
    console.log(`Aplicando mudança: ${change.type} em ${change.entity}`, change.data);

    try {
      switch (change.entity) {
        case 'expenses':
          if (change.type === 'add' || change.type === 'update') {
            const expense = change.data as Expense;
            const category = expense.category;
            if (!updatedData.expenses[category]) {
              updatedData.expenses[category] = [];
            }

            // Verificar se já existe
            const expenseIndex = updatedData.expenses[category].findIndex(e => e.id === expense.id);

            if (expenseIndex >= 0) {
              // Atualizar
              updatedData.expenses[category][expenseIndex] = expense;
            } else {
              // Adicionar
              updatedData.expenses[category].push(expense);
            }
          } else if (change.type === 'delete') {
            const { id, category } = change.data;
            if (updatedData.expenses[category]) {
              updatedData.expenses[category] = updatedData.expenses[category].filter(e => e.id !== id);
            }
          }
          break;

        case 'projects':
          if (change.type === 'add' || change.type === 'update') {
            const project = change.data as Project;

            // Verificar se já existe
            const projectIndex = updatedData.projects.findIndex(p => p.id === project.id);

            if (projectIndex >= 0) {
              // Atualizar
              updatedData.projects[projectIndex] = project;
            } else {
              // Adicionar
              updatedData.projects.push(project);
            }
          } else if (change.type === 'delete') {
            const { id } = change.data;
            updatedData.projects = updatedData.projects.filter(p => p.id !== id);
          }
          break;

        case 'stock':
          if (change.type === 'add' || change.type === 'update') {
            const stockItem = change.data as StockItem;

            // Verificar se já existe
            const itemIndex = updatedData.stock.findIndex(i => i.id === stockItem.id);

            if (itemIndex >= 0) {
              // Atualizar
              updatedData.stock[itemIndex] = stockItem;
            } else {
              // Adicionar
              updatedData.stock.push(stockItem);
            }
          } else if (change.type === 'delete') {
            const { id } = change.data;
            updatedData.stock = updatedData.stock.filter(i => i.id !== id);
          }
          break;

        case 'employees':
          if (change.type === 'add' || change.type === 'update') {
            const employee = change.data as Employee;
            const weekKey = employee.weekStartDate;

            if (!updatedData.employees[weekKey]) {
              updatedData.employees[weekKey] = [];
            }

            // Verificar se já existe
            const employeeIndex = updatedData.employees[weekKey].findIndex(e => e.id === employee.id);

            if (employeeIndex >= 0) {
              // Atualizar
              updatedData.employees[weekKey][employeeIndex] = employee;
            } else {
              // Adicionar
              updatedData.employees[weekKey].push(employee);
            }
          } else if (change.type === 'delete') {
            const { id, weekStartDate } = change.data;
            if (updatedData.employees[weekStartDate]) {
              updatedData.employees[weekStartDate] = updatedData.employees[weekStartDate].filter(e => e.id !== id);
            }
          }
          break;

        case 'willSettings' as any:
          if (change.type === 'update') {
            const { willBaseRate, willBonus } = change.data;
            if (willBaseRate !== undefined) {
              updatedData.willBaseRate = willBaseRate;
            }
            if (willBonus !== undefined) {
              updatedData.willBonus = willBonus;
            }
          }
          break;
      }
    } catch (error) {
      console.error(`Erro ao aplicar mudança ${change.id}:`, error);
    }
  }

  // Atualizar timestamp após aplicar todas as mudanças
  updatedData.updatedAt = Date.now();

  return updatedData;
};

/**
 * Abre a conexão com o IndexedDB
 */
async function openDB(): Promise<IDBPDatabase> {
  return openIndexedDB('offline-storage', 1, {
    upgrade(db: IDBPDatabase) {
      // Criar store para alterações pendentes se não existir
      if (!db.objectStoreNames.contains('pendingChanges')) {
        const store = db.createObjectStore('pendingChanges', { keyPath: 'id' });
        store.createIndex('syncStatus', 'syncStatus');
        store.createIndex('timestamp', 'timestamp');
      }
    }
  });
}

export const syncService = {
  channel: null as RealtimeChannel | null,
  realtimeSubscription: null as (() => void) | null,
  isInitialized: false,
  isProcessingSyncQueue: false,
  syncQueue: [] as PendingChange[],

  init() {
    if (!supabase || this.isInitialized) return;

    console.log('Inicializando serviço de sincronização com ID:', SESSION_ID);
    this.isInitialized = true;

    // Limpar inscrição anterior se existir
    if (this.channel) {
      this.channel.unsubscribe();
    }

    // Iniciar canal de tempo real para ouvir atualizações do banco
    this.setupRealtimeChannel();

    // Configurar listener para mudanças de conectividade
    this.setupConnectivityListener();
  },

  // Novo método para configurar o canal de tempo real
  setupRealtimeChannel() {
    if (!supabase) return;

    console.log('Configurando canal de sincronização em tempo real');

    try {
      // Criar nova inscrição
      this.channel = supabase
        .channel('sync_updates')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sync_data'
          },
          this.handleRealtimeChanges
        )
        .subscribe((status) => {
          console.log('Status da inscrição do canal:', status);

          if (status === 'SUBSCRIBED') {
            console.log('Canal de tempo real conectado com sucesso.');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.log('Conexão do canal perdida, tentando reconectar em 5 segundos...');
            // Tentar reconectar em caso de erro
            setTimeout(() => {
              if (!this.isInitialized) return;
              this.setupRealtimeChannel();
            }, 5000);
          }
        });
    } catch (error) {
      console.error('Erro ao configurar canal de tempo real:', error);
    }
  },

  // Função separada para lidar com mudanças em tempo real
  handleRealtimeChanges: async function(payload: RealtimePostgresChangesPayload<any>) {
    console.log('Mudança recebida em tempo real:', payload);

    // Ignorar se a atualização veio da mesma sessão
    if (payload.commit_timestamp && payload.new?.session_id === SESSION_ID) {
      console.log('Ignorando atualização da mesma sessão');
      return;
    }

    if (payload.new) {
      const data = payload.new as any;
      console.log('Dados recebidos em tempo real:', data);

      // Verificar se é o mesmo UUID que estamos usando
      if (data.id !== SHARED_UUID) {
        console.log('Ignorando atualização para UUID diferente');
        return;
      }

      // Carregar dados atuais do cache local
      const localData = await storage.load();

      if (!localData) {
        console.log('Sem dados locais, aplicando dados remotos diretamente');

        // Garantir que os valores do Will estejam definidos
        const willValues = ensureWillValues(data);

        const storageData: StorageItems = {
          expenses: data.expenses || {},
          projects: data.projects || [],
          stock: data.stock || [],
          employees: data.employees || {},
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          lastSync: new Date(data.updated_at).getTime(),
          updatedAt: new Date(data.updated_at).getTime(),
          version: data.version || 1,
          isOffline: false
        };

        // Salvar no armazenamento local
        await storage.save(storageData);

        // Disparar evento para atualizar a UI
        window.dispatchEvent(new CustomEvent('dataUpdated', {
          detail: storageData
        }));

        return;
      }

      // Verificar conflito de versão
      if (data.version && localData.version && data.version !== localData.version) {
        console.log('Detectado conflito de versão em tempo real');

        // Verificar se há mudanças offline pendentes
        const pendingChanges = await storage.offline.getPendingChanges();

        if (pendingChanges.length > 0) {
          console.log(`Existem ${pendingChanges.length} mudanças offline pendentes`);

          // Aplicar mudanças pendentes aos dados locais
          const updatedLocalData = applyPendingChanges(localData, pendingChanges);

          // Resolver conflito
          const resolvedData = await resolveConflict(updatedLocalData, data);

          // Salvar dados resolvidos localmente
          await storage.save(resolvedData);

          // Se dados locais prevaleceram, enviar para o servidor
          if (resolvedData.updatedAt !== new Date(data.updated_at).getTime()) {
            console.log('Dados locais mais recentes, enviando para o servidor');
            await this.saveToSupabase(resolvedData);

            // Marcar mudanças como sincronizadas
            for (const change of pendingChanges) {
              await storage.offline.updateChangeStatus(change.id, 'completed');
            }

            // Limpar mudanças sincronizadas
            await storage.offline.cleanupSyncedChanges();
          } else {
            console.log('Dados remotos mais recentes, mantendo-os');
          }

          // Notificar UI sobre atualização
          window.dispatchEvent(new CustomEvent('dataUpdated', {
            detail: resolvedData
          }));
        } else {
          // Sem mudanças pendentes, resolver conflito normalmente
          const resolvedData = await resolveConflict(localData, data);

          // Salvar dados resolvidos localmente
          await storage.save(resolvedData);

          // Notificar UI sobre atualização
          window.dispatchEvent(new CustomEvent('dataUpdated', {
            detail: resolvedData
          }));
        }
      } else {
        // Sem conflito de versão, verificar timestamps
        const localTimestamp = localData?.lastSync || 0;
        const remoteUpdatedAt = data.updated_at;
        const remoteTimestamp = new Date(remoteUpdatedAt).getTime();

        console.log('Comparando timestamps - Remoto:', new Date(remoteTimestamp).toISOString(),
          'Local:', new Date(localTimestamp).toISOString());

        // Converter ambos os timestamps para number para comparação segura
        const remoteTimestampNum = Number(remoteTimestamp);
        const localTimestampNum = Number(localTimestamp);

        // Só atualizar se os dados remotos forem mais recentes
        if (remoteTimestampNum > localTimestampNum) {
          console.log('Dados remotos mais recentes detectados, atualizando cache local');

          // Garantir que os valores do Will estejam definidos
          const willValues = ensureWillValues(data);

          const storageData: StorageItems = {
            expenses: data.expenses || {},
            projects: data.projects || [],
            stock: data.stock || [],
            employees: data.employees || {},
            willBaseRate: willValues.willBaseRate,
            willBonus: willValues.willBonus,
            lastSync: remoteTimestamp,
            updatedAt: remoteTimestamp,
            version: data.version || (localData.version || 0) + 1,
            isOffline: false
          };

          console.log('Dados processados para armazenamento local:', storageData);

          // Salvar no armazenamento local
          await storage.save(storageData);

          // Disparar evento para atualizar a UI
          window.dispatchEvent(new CustomEvent('dataUpdated', {
            detail: storageData
          }));

          console.log('UI notificada sobre atualização em tempo real');
        } else {
          console.log('Dados locais já estão atualizados');
        }
      }
    }
  },

  setupRealtimeUpdates(callback: (data: StorageItems) => void): (() => void) {
    if (!supabase) return () => {};

    // Garantir que o canal de tempo real esteja configurado
    if (!this.isInitialized) {
      this.init();
    }

    const handleDataUpdate = (event: CustomEvent<StorageItems>) => {
      console.log('Evento de atualização recebido:', event.detail);
      callback(event.detail);
    };

    window.addEventListener('dataUpdated', handleDataUpdate as EventListener);

    // Retornar função para limpar os listeners
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate as EventListener);
    };
  },

  // Método para encerrar a conexão de tempo real
  cleanup() {
    console.log('Limpando recursos de sincronização em tempo real');

    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }

    this.isInitialized = false;
  },

  async loadLatestData(): Promise<StorageItems | null> {
    if (!supabase) return null;

    try {
      // Usar o UUID compartilhado para carregar dados
      const { data, error } = await supabase
        .from('sync_data')
        .select('*')
        .eq('id', SHARED_UUID)
        .limit(1);

      if (error) {
        console.error('Erro ao carregar dados mais recentes:', error);
        return null;
      }

      // Verificar se o array contém dados
      if (data && data.length > 0) {
        console.log('Dados recebidos do Supabase:', data[0]);

        // Garantir que os valores do Will estejam definidos
        const willValues = ensureWillValues(data[0]);

        const storageData: StorageItems = {
          expenses: data[0].expenses || {},
          projects: data[0].projects || [],
          stock: data[0].stock || [],
          employees: data[0].employees || {},
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          lastSync: new Date().getTime()
        };

        // Atualizar timestamp com o horário remoto para garantir consistência
        if (data[0].updated_at) {
          try {
            const remoteTimestamp = new Date(data[0].updated_at).getTime();
            storageData.lastSync = remoteTimestamp;
          } catch (e) {
            console.warn('Erro ao converter timestamp remoto:', e);
          }
        }

        // Salvar no armazenamento local
        await storage.save(storageData);

        return storageData;
      }

      return null;
    } catch (error) {
      console.error('Erro ao carregar dados mais recentes:', error);
      return null;
    }
  },

  async sync(data: StorageItems): Promise<boolean> {
    if (!supabase) {
      console.log('Supabase não configurado, salvando apenas localmente');
      await storage.save(data);
      return true;
    }

    try {
      // Verificar e validar os dados antes de sincronizar
      if (!data.projects) {
        console.warn('Array de projetos não definido, inicializando como vazio');
        data.projects = [];
      } else if (!Array.isArray(data.projects)) {
        console.error('Dados de projetos não são um array! Tipo:', typeof data.projects);
        data.projects = [];
      } else {
        console.log(`Sincronizando ${data.projects.length} projetos:`,
          data.projects.map(p => `${p.id}: ${p.client}`).join(', '));
      }

      // Garantir que os valores do Will estejam definidos
      const willValues = ensureWillValues(data);

      console.log('Sincronizando dados com Supabase usando UUID compartilhado:', SHARED_UUID);
      console.log('Valores do Will a serem sincronizados:', willValues.willBaseRate, willValues.willBonus);

      // Primeiro, carregamos os dados existentes para garantir que não sobrescrevemos nada
      const { data: existingData, error: fetchError } = await supabase
        .from('sync_data')
        .select('*')
        .eq('id', SHARED_UUID)
        .limit(1);

      if (fetchError) {
        console.error('Erro ao buscar dados existentes:', fetchError);
        // Mesmo com erro, tentamos salvar no armazenamento local
        await storage.save(data);
        return false;
      }

      let dataToSave;

      if (existingData && existingData.length > 0) {
        // Mesclamos os dados existentes com os novos dados
        console.log('Dados existentes encontrados, mesclando com novos dados');

        dataToSave = {
          id: SHARED_UUID,
          expenses: { ...existingData[0].expenses, ...data.expenses },
          projects: data.projects || existingData[0].projects || [],
          stock: data.stock || existingData[0].stock || [],
          employees: { ...existingData[0].employees, ...data.employees },
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          updated_at: new Date().toISOString(),
          session_id: SESSION_ID // Adicionar ID da sessão para identificar a origem
        };
      } else {
        // Não encontramos dados existentes, salvamos os novos dados
        console.log('Nenhum dado existente encontrado, salvando novos dados');

        dataToSave = {
          id: SHARED_UUID,
          expenses: data.expenses || {},
          projects: data.projects || [],
          stock: data.stock || [],
          employees: data.employees || {},
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          updated_at: new Date().toISOString(),
          session_id: SESSION_ID // Adicionar ID da sessão para identificar a origem
        };
      }

      console.log('Dados a serem salvos:', dataToSave);

      // Salvar no Supabase
      const { error } = await supabase
        .from('sync_data')
        .upsert(dataToSave);

      if (error) {
        console.error('Erro ao sincronizar com Supabase:', error);
        return false;
      }

      // Atualizar os valores do Will nos dados originais
      data.willBaseRate = willValues.willBaseRate;
      data.willBonus = willValues.willBonus;

      // Salvar localmente
      await storage.save(data);
      return true;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return false;
    }
  },

  // Novo método para configurar listener de conectividade
  setupConnectivityListener() {
    console.log('Configurando listener de conectividade');

    // Usar o método do storage.offline para monitorar conectividade
    storage.offline.onConnectivityChange((online) => {
      console.log('Status de conectividade alterado:', online ? 'Online' : 'Offline');

      // Se voltou a ficar online, tentar sincronizar mudanças pendentes
      if (online) {
        console.log('Dispositivo está online novamente, tentando sincronizar mudanças pendentes');
        setTimeout(() => this.syncOfflineChanges(), 2000); // Pequeno atraso para garantir que a conexão está estável
      }
    });
  },

  // Método para sincronizar dados offline quando a conexão for restaurada
  async syncOfflineChanges() {
    if (!supabase) {
      console.log('Supabase não está configurado, não é possível sincronizar');
      return false;
    }

    // Evitar múltiplas tentativas simultâneas
    if (this.isProcessingSyncQueue) {
      console.log('Já existe uma sincronização em andamento');
      return false;
    }

    this.isProcessingSyncQueue = true;
    console.log('Iniciando sincronização de mudanças offline');

    try {
      // Verificar se há conexão
      if (!navigator.onLine) {
        console.log('Dispositivo está offline, não é possível sincronizar');
        this.isProcessingSyncQueue = false;
        return false;
      }

      // Carregar mudanças pendentes
      const pendingChanges = await storage.offline.getPendingChanges();

      if (!pendingChanges.length) {
        console.log('Não há mudanças pendentes para sincronizar');
        this.isProcessingSyncQueue = false;
        return true;
      }

      console.log(`Encontradas ${pendingChanges.length} mudanças pendentes para sincronizar`);

      // Carregar dados locais mais recentes
      const localData = await getData();

      // Aplicar todas as mudanças pendentes para garantir que temos a versão mais atual
      const updatedLocalData = applyPendingChanges(localData, pendingChanges);

      // Carregar dados remotos mais recentes
      const remoteData = await this.loadLatestData();

      if (!remoteData) {
        console.error('Não foi possível carregar dados remotos');
        this.isProcessingSyncQueue = false;
        return false;
      }

      let dataToSave: StorageItems;

      // Verificar e resolver conflitos de versão
      if (remoteData &&
          (remoteData as any).updated_at &&
          remoteData.version !== localData.version) {
        console.log('Detectado conflito de versão');
        dataToSave = await resolveConflict(updatedLocalData, remoteData);
      } else {
        console.log('Sem conflito de versão, usando dados locais mais recentes');
        dataToSave = {
          ...updatedLocalData,
          // Manter versão mais alta
          version: Math.max(remoteData.version || 0, updatedLocalData.version || 0) + 1,
          isOffline: false
        };
      }

      // Atualizar timestamp
      dataToSave.updatedAt = Date.now();
      dataToSave.lastSync = dataToSave.updatedAt;

      // Salvar dados resolvidos localmente (remover pendingChanges para não duplicar)
      const { pendingChanges: _, ...dataToSaveLocally } = dataToSave;

      console.log('Salvando dados resolvidos localmente');
      await storage.save(dataToSaveLocally);

      // Enviar para o servidor
      console.log('Enviando dados resolvidos para o servidor');
      await this.saveToSupabase(dataToSaveLocally);

      // Marcar todas as mudanças como sincronizadas
      for (const change of pendingChanges) {
        await storage.offline.updateChangeStatus(change.id, 'completed');
      }

      // Limpar mudanças sincronizadas
      await storage.offline.cleanupSyncedChanges();

      console.log('Sincronização concluída com sucesso');

      // Notificar UI sobre dados atualizados
      window.dispatchEvent(new CustomEvent('dataUpdated', {
        detail: dataToSaveLocally
      }));

      return true;
    } catch (error) {
      console.error('Erro ao sincronizar mudanças offline:', error);
      this.isProcessingSyncQueue = false;
      return false;
    } finally {
      this.isProcessingSyncQueue = false;
    }
  },

  // Método para salvar dados no Supabase
  async saveToSupabase(data: StorageItems) {
    if (!supabase) return false;

    try {
      console.log('Salvando dados no Supabase');

      // Preparar dados para o Supabase
      const dataToSave = {
        id: SHARED_UUID,
        expenses: data.expenses || {},
        projects: data.projects || [],
        stock: data.stock || [],
        employees: data.employees || {},
        willBaseRate: data.willBaseRate,
        willBonus: data.willBonus,
        updated_at: new Date().toISOString(),
        version: data.version,
        session_id: SESSION_ID
      };

      // Upsert na tabela de sincronização
      const { error } = await supabase
        .from('sync_data')
        .upsert(dataToSave);

      if (error) {
        console.error('Erro ao salvar dados no Supabase:', error);
        return false;
      }

      console.log('Dados salvos no Supabase com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar no Supabase:', error);
      return false;
    }
  },

  /**
   * Adiciona uma alteração offline para sincronização posterior
   */
  async addOfflineChange(change: Omit<PendingChange, 'id' | 'timestamp' | 'syncStatus'>): Promise<string> {
    const db = await openDB();
    const pendingChange: PendingChange = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      syncStatus: 'pending',
      ...change
    };

    try {
      await db.add('pendingChanges', pendingChange);
      console.log('Alteração offline registrada:', pendingChange);
      return pendingChange.id;
    } catch (error) {
      console.error('Erro ao registrar alteração offline:', error);
      throw error;
    } finally {
      db.close();
    }
  },

  /**
   * Retorna o número de alterações pendentes
   */
  async getPendingChangesCount(): Promise<number> {
    const db = await openDB();
    try {
      const count = await db.count('pendingChanges');
      return count;
    } catch (error) {
      console.error('Erro ao contar alterações pendentes:', error);
      return 0;
    } finally {
      db.close();
    }
  },

  /**
   * Sincroniza todas as alterações pendentes
   */
  async syncPendingChanges(): Promise<boolean> {
    if (this.isProcessingSyncQueue || !navigator.onLine) {
      console.log(`Não iniciando sincronização: ${this.isProcessingSyncQueue ? 'já está sincronizando' : 'está offline'}`);
      return false;
    }

    this.isProcessingSyncQueue = true;
    console.log('Iniciando sincronização de alterações pendentes');

    try {
      const db = await openDB();
      const changes = await db.getAll('pendingChanges');

      if (changes.length === 0) {
        console.log('Nenhuma alteração pendente para sincronizar');
        return true;
      }

      console.log(`Encontradas ${changes.length} alterações pendentes`);

      // Ordenar por timestamp para processar na ordem correta
      changes.sort((a: PendingChange, b: PendingChange) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });

      for (const change of changes) {
        try {
          await this.processPendingChange(change);
          await db.delete('pendingChanges', change.id);
          console.log(`Alteração ${change.id} sincronizada e removida da fila`);
        } catch (error) {
          console.error(`Erro ao processar alteração ${change.id}:`, error);
          // Marcar como falha para tentar novamente depois
          change.syncStatus = 'failed';
          change.lastAttempt = new Date().toISOString();
          await db.put('pendingChanges', change);
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao sincronizar alterações pendentes:', error);
      return false;
    } finally {
      this.isProcessingSyncQueue = false;
      console.log('Sincronização concluída');
    }
  },

  /**
   * Processa uma alteração pendente
   */
  async processPendingChange(change: PendingChange): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase não inicializado');
    }

    console.log(`Processando alteração: ${change.type} em ${change.entity}`);

    switch (change.type) {
      case 'add':
        await this.processSyncAdd(change);
        break;
      case 'update':
        await this.processSyncUpdate(change);
        break;
      case 'delete':
        await this.processSyncDelete(change);
        break;
      default:
        throw new Error(`Tipo de alteração não suportado: ${change.type}`);
    }
  },

  /**
   * Processa uma adição pendente
   */
  async processSyncAdd(change: PendingChange): Promise<void> {
    if (!supabase) return;

    const { data: existingData, error: checkError } = await supabase
      .from('sync_data')
      .select()
      .eq('session_id', SESSION_ID)
      .single();

    if (checkError) {
      if (checkError.code !== 'PGRST116') { // Não encontrado
        throw checkError;
      }

      // Primeiro registro, inserir novo
      const storageData = await getData();

      // Atualizar a entidade específica no dados
      if (change.entity === 'expenses') {
        // Verificar se expenses é um objeto com propriedades
        if (typeof storageData.expenses === 'object' && !Array.isArray(storageData.expenses)) {
          // Adicionar à lista apropriada no objeto expenses
          const category = change.data.category || 'default';
          if (!storageData.expenses[category]) {
            storageData.expenses[category] = [];
          }
          storageData.expenses[category].push(change.data);
        }
      } else if (change.entity === 'projects') {
        if (Array.isArray(storageData.projects)) {
          storageData.projects.push(change.data);
        }
      } else if (change.entity === 'stock') {
        if (Array.isArray(storageData.stock)) {
          storageData.stock.push(change.data);
        }
      } else if (change.entity === 'employees') {
        // Verificar se employees é um objeto com propriedades
        if (typeof storageData.employees === 'object' && !Array.isArray(storageData.employees)) {
          // Para employees, precisamos adicionar ao objeto correto baseado na data
          const weekStartDate = change.data.weekStartDate || 'default';
          if (!storageData.employees[weekStartDate]) {
            storageData.employees[weekStartDate] = [];
          }
          storageData.employees[weekStartDate].push(change.data);
        }
      }

      // Salvar dados no Supabase
      const { error } = await supabase
        .from('sync_data')
        .insert({
          data: storageData,
          session_id: SESSION_ID,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;
    } else {
      // Já existe, atualizar
      const currentData = existingData.data;

      // Adicionar o novo item na entidade correspondente
      if (change.entity === 'expenses') {
        // Verificar se expenses é um objeto com propriedades
        if (typeof currentData.expenses === 'object' && !Array.isArray(currentData.expenses)) {
          // Adicionar à lista apropriada no objeto expenses
          const category = change.data.category || 'default';
          if (!currentData.expenses[category]) {
            currentData.expenses[category] = [];
          }
          currentData.expenses[category].push(change.data);
        }
      } else if (change.entity === 'projects') {
        if (Array.isArray(currentData.projects)) {
          currentData.projects.push(change.data);
        }
      } else if (change.entity === 'stock') {
        if (Array.isArray(currentData.stock)) {
          currentData.stock.push(change.data);
        }
      } else if (change.entity === 'employees') {
        // Verificar se employees é um objeto com propriedades
        if (typeof currentData.employees === 'object' && !Array.isArray(currentData.employees)) {
          // Para employees, precisamos adicionar ao objeto correto baseado na data
          const weekStartDate = change.data.weekStartDate || 'default';
          if (!currentData.employees[weekStartDate]) {
            currentData.employees[weekStartDate] = [];
          }
          currentData.employees[weekStartDate].push(change.data);
        }
      }

      // Atualizar no Supabase
      const { error } = await supabase
        .from('sync_data')
        .update({
          data: currentData,
          timestamp: new Date().toISOString()
        })
        .eq('session_id', SESSION_ID);

      if (error) throw error;
    }
  },

  /**
   * Processa uma atualização pendente
   */
  async processSyncUpdate(change: PendingChange): Promise<void> {
    if (!supabase) return;

    const { data: existingData, error: checkError } = await supabase
      .from('sync_data')
      .select()
      .eq('session_id', SESSION_ID)
      .single();

    if (checkError) {
      throw new Error('Não foi possível encontrar os dados para atualizar');
    }

    const currentData = existingData.data;
    const entityArray = currentData[change.entity];

    if (!entityArray) {
      throw new Error(`Entidade não encontrada: ${change.entity}`);
    }

    // Encontrar e atualizar o item
    const itemIndex = entityArray.findIndex((item: any) => item.id === change.data.id);

    if (itemIndex === -1) {
      throw new Error(`Item com ID ${change.data.id} não encontrado em ${change.entity}`);
    }

    // Atualizar o item com os novos dados
    entityArray[itemIndex] = { ...entityArray[itemIndex], ...change.data };

    // Atualizar no Supabase
    const { error } = await supabase
      .from('sync_data')
      .update({
        data: currentData,
        timestamp: new Date().toISOString()
      })
      .eq('session_id', SESSION_ID);

    if (error) throw error;
  },

  /**
   * Processa uma exclusão pendente
   */
  async processSyncDelete(change: PendingChange): Promise<void> {
    if (!supabase) return;

    const { data: existingData, error: checkError } = await supabase
      .from('sync_data')
      .select()
      .eq('session_id', SESSION_ID)
      .single();

    if (checkError) {
      throw new Error('Não foi possível encontrar os dados para exclusão');
    }

    const currentData = existingData.data;
    const entityArray = currentData[change.entity];

    if (!entityArray) {
      throw new Error(`Entidade não encontrada: ${change.entity}`);
    }

    // Filtrar o item a ser excluído
    currentData[change.entity] = entityArray.filter((item: any) => item.id !== change.data.id);

    // Atualizar no Supabase
    const { error } = await supabase
      .from('sync_data')
      .update({
        data: currentData,
        timestamp: new Date().toISOString()
      })
      .eq('session_id', SESSION_ID);

    if (error) throw error;
  }
};

export const loadInitialData = async (): Promise<StorageItems | null> => {
  if (!supabase) {
    console.log('Supabase não configurado, carregando dados locais');
    return await storage.load();
  }

  try {
    // Primeiro, verificar se existem dados no Supabase usando UUID compartilhado
    const { data, error } = await supabase
      .from('sync_data')
      .select('*')
      .eq('id', SHARED_UUID)
      .limit(1);

    if (error) {
      console.warn('Erro ao carregar dados iniciais do Supabase:', error);
      return await storage.load();
    }

    // Verificar se o array contém dados
    if (data && data.length > 0) {
      console.log('Dados encontrados no Supabase com UUID compartilhado:', data[0]);

      // Garantir que os valores do Will estejam definidos
      const willValues = ensureWillValues(data[0]);

      const storageData: StorageItems = {
        expenses: data[0].expenses || {},
        projects: data[0].projects || [],
        stock: data[0].stock || [],
        employees: data[0].employees || {},
        willBaseRate: willValues.willBaseRate,
        willBonus: willValues.willBonus,
        lastSync: new Date().getTime()
      };

      console.log('Valores do Will carregados:', storageData.willBaseRate, storageData.willBonus);

      // Salvar no armazenamento local
      await storage.save(storageData);
      return storageData;
    } else {
      console.log('Registro com UUID compartilhado não encontrado, procurando qualquer registro');

      // Se não encontrou com o UUID compartilhado, tentar encontrar qualquer registro
      const { data: anyData, error: anyError } = await supabase
        .from('sync_data')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (anyError) {
        console.warn('Erro ao procurar por qualquer registro no Supabase:', anyError);
      } else if (anyData && anyData.length > 0) {
        console.log('Encontrado outro registro no Supabase:', anyData[0]);

        // Garantir que os valores do Will estejam definidos
        const willValues = ensureWillValues(anyData[0]);

        const storageData: StorageItems = {
          expenses: anyData[0].expenses || {},
          projects: anyData[0].projects || [],
          stock: anyData[0].stock || [],
          employees: anyData[0].employees || {},
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          lastSync: new Date().getTime()
        };

        console.log('Dados de outro registro carregados. Salvando com UUID compartilhado.');

        // Salvar esses dados com o UUID compartilhado
        const dataToSave = {
          id: SHARED_UUID,
          expenses: storageData.expenses,
          projects: storageData.projects,
          stock: storageData.stock,
          employees: storageData.employees,
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          updated_at: new Date().toISOString()
        };

        // Salvar no Supabase com o UUID compartilhado
        const { error: saveError } = await supabase
          .from('sync_data')
          .upsert(dataToSave);

        if (saveError) {
          console.error('Erro ao salvar dados com UUID compartilhado:', saveError);
        } else {
          console.log('Dados salvos com sucesso usando UUID compartilhado');
        }

        // Salvar no armazenamento local
        await storage.save(storageData);
        return storageData;
      }

      // Se ainda não encontrou dados, verificar armazenamento local
      console.log('Nenhum registro encontrado no Supabase, verificando armazenamento local');
      const localData = await storage.load();

      if (localData && (
        Object.keys(localData.expenses || {}).length > 0 ||
        (localData.projects || []).length > 0 ||
        (localData.stock || []).length > 0 ||
        Object.keys(localData.employees || {}).length > 0
      )) {
        console.log('Dados encontrados no armazenamento local:', localData);

        // Garantir que os valores do Will estejam definidos no localData
        const willValues = ensureWillValues(localData);
        localData.willBaseRate = willValues.willBaseRate;
        localData.willBonus = willValues.willBonus;

        // Sincronizar dados locais com Supabase
        await syncService.sync(localData);
        return localData;
      }

      // Se não encontrou dados em lugar nenhum, criar estrutura vazia
      console.log('Nenhum dado encontrado, inicializando com estrutura vazia');
      const emptyData: StorageItems = {
        expenses: {},
        projects: [],
        stock: [],
        employees: {},
        willBaseRate: 200,
        willBonus: 0,
        lastSync: new Date().getTime()
      };

      // NÃO sincronizamos dados vazios com o Supabase para evitar sobrescrever dados existentes
      // Apenas salvamos localmente
      await storage.save(emptyData);
      return emptyData;
    }
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
    return await storage.load();
  }
};

export const saveData = async (data: StorageItems): Promise<boolean> => {
  // Garantir que os valores do Will estejam definidos
  const willValues = ensureWillValues(data);
  data.willBaseRate = willValues.willBaseRate;
  data.willBonus = willValues.willBonus;

  console.log('Salvando dados com valores do Will:', data.willBaseRate, data.willBonus);

  // Adicionar informações sobre status offline
  const isOfflineMode = !navigator.onLine;
  const timestamp = Date.now();

  const dataToSave: StorageItems = {
    ...data,
    updatedAt: timestamp,
    version: (data.version || 0) + 1,
    lastSync: timestamp,
    isOffline: isOfflineMode
  };

  // Salvar localmente primeiro para resposta imediata
  await storage.save(dataToSave);

  // Se estiver offline, registrar para sincronização posterior
  if (isOfflineMode) {
    console.log('Dispositivo offline, dados salvos apenas localmente');
    return true;
  }

  // Sincronizar com Supabase
  if (supabase) {
    syncService.sync(dataToSave).catch(error => {
      console.error('Erro ao sincronizar dados:', error);
    });
  }

  return true;
};

// Função para sincronizar dados quando o app ficar visível
export const watchVisibilityChanges = (): (() => void) => {
  console.log('Configurando monitoramento de visibilidade do app');

  // Função para sincronizar dados
  const syncData = async () => {
    console.log('Sincronizando dados após mudança de visibilidade ou carregamento inicial');

    try {
      // Carregar dados locais atuais (agora assíncrono)
      const localData = await storage.load();
      const localTimestamp = localData?.lastSync || 0;

      console.log('Dados locais carregados, timestamp:', new Date(localTimestamp).toISOString());

      // Verificar se o Supabase está disponível
      if (!supabase) {
        console.log('Supabase não está disponível, mantendo dados locais');

        // Disparar evento para atualizar a UI com dados locais
        if (localData) {
          window.dispatchEvent(new CustomEvent('dataUpdated', {
            detail: localData
          }));
        }
        return;
      }

      // Buscar dados do Supabase (nosso Firestore nesse caso)
      const { data: remoteData, error } = await supabase
        .from('sync_data')
        .select('*')
        .eq('id', SHARED_UUID)
        .limit(1);

      if (error) {
        console.error('Erro ao buscar dados remotos:', error);
        return;
      }

      if (!remoteData || remoteData.length === 0) {
        console.log('Nenhum dado remoto encontrado');
        return;
      }

      // Extrair data de atualização do registro remoto
      const remoteUpdatedAt = remoteData[0].updated_at;

      // Converter a string de data para timestamp numérico
      const remoteTimestamp = new Date(remoteUpdatedAt).getTime();

      console.log('Dados remotos carregados, timestamp:', new Date(remoteTimestamp).toISOString());

      // Garantir que localTimestamp seja número para comparação segura
      const localTimestampNum = Number(localTimestamp);

      // Comparar timestamps para decidir se atualiza o cache local
      if (remoteTimestamp > localTimestampNum) {
        console.log('Dados remotos são mais recentes, atualizando cache local');

        // Garantir que os valores do Will estejam definidos
        const willValues = ensureWillValues(remoteData[0]);

        // Preparar dados para armazenamento local
        const updatedData: StorageItems = {
          expenses: remoteData[0].expenses || {},
          projects: remoteData[0].projects || [],
          stock: remoteData[0].stock || [],
          employees: remoteData[0].employees || {},
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          lastSync: new Date().getTime() // Atualizar timestamp de sincronização
        };

        // Atualizar armazenamento local (agora assíncrono)
        await storage.save(updatedData);

        // Disparar evento para atualizar a UI
        window.dispatchEvent(new CustomEvent('dataUpdated', {
          detail: updatedData
        }));

        console.log('Cache local atualizado e UI notificada');
      } else {
        console.log('Dados locais já estão atualizados ou são mais recentes');

        // Mesmo não atualizando, podemos disparar um evento para manter a UI consistente
        if (localData) {
          window.dispatchEvent(new CustomEvent('dataUpdated', {
            detail: localData
          }));
        }
      }
    } catch (error) {
      console.error('Erro durante a sincronização de dados:', error);
    }
  };

  // Função para lidar com mudanças de visibilidade
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('App voltou para o primeiro plano, sincronizando dados...');
      // Usar uma IIFE assíncrona para poder usar await
      (async () => {
        await syncData();
      })();

      // Registrar tarefas de sincronização em segundo plano quando suportado
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready
          .then(registration => {
            // @ts-ignore: Background Sync API ainda é experimental
            return registration.sync.register('sync-data');
          })
          .catch(err => {
            console.error('Erro ao registrar sincronização em segundo plano:', err);
          });
      }
    } else {
      console.log('App foi para segundo plano');
    }
  };

  // Registrar listener para mudanças de visibilidade
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Sincronizar na inicialização
  if (document.visibilityState === 'visible') {
    console.log('App inicializado, realizando sincronização inicial');
    // Usar uma IIFE assíncrona para poder usar await
    (async () => {
      await syncData();
    })();
  }

  // Registrar listener para evento de carregamento
  const handleLoad = () => {
    console.log('Evento load disparado, sincronizando dados');
    // Usar uma IIFE assíncrona para poder usar await
    (async () => {
      await syncData();
    })();
  };

  window.addEventListener('load', handleLoad);

  // Listener para mensagens do service worker
  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'PERFORM_SYNC') {
      console.log('Mensagem de sincronização recebida do service worker:', event.data);
      // Usar uma IIFE assíncrona para poder usar await
      (async () => {
        await syncData();
      })();
    }
  };

  // Registrar listener para mensagens do service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  }

  // Função para remover os listeners
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('load', handleLoad);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    }

    console.log('Monitoramento de visibilidade removido');
  };
};