import { supabase } from './supabase';
import { StorageItems, Expense, Project, StockItem, Employee } from '../types';

// Tipo de tabela para a nova estrutura
export type TableName = 'expenses' | 'projects' | 'stock_items' | 'employees' | 'sync_control';

// Estrutura que define as tabelas do banco
export const tableDefinitions = {
  // Tabela de despesas
  expenses: `
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    date DATE NOT NULL,
    category TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    photo_url TEXT,
    is_paid BOOLEAN DEFAULT false,
    owner_id TEXT,
    version INTEGER DEFAULT 1,
    last_modified_by TEXT,
    last_sync TIMESTAMPTZ DEFAULT now()
  `,
  
  // Tabela de projetos
  projects: `
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    client TEXT,
    location TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'in_progress',
    description TEXT,
    project_number TEXT,
    value NUMERIC(10,2) DEFAULT 0,
    is_invoiced BOOLEAN DEFAULT false,
    invoice_ok BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    last_modified_by TEXT,
    last_sync TIMESTAMPTZ DEFAULT now()
  `,
  
  // Tabela de itens de estoque
  stock_items: `
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    version INTEGER DEFAULT 1,
    last_modified_by TEXT,
    last_sync TIMESTAMPTZ DEFAULT now()
  `,
  
  // Tabela de funcionários
  employees: `
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    role TEXT,
    daily_rate NUMERIC(10,2) DEFAULT 250,
    week_start DATE,
    days_worked INTEGER DEFAULT 0,
    worked_dates JSONB DEFAULT '[]'::jsonb,
    version INTEGER DEFAULT 1,
    last_modified_by TEXT,
    last_sync TIMESTAMPTZ DEFAULT now()
  `,
  
  // Tabela de controle de sincronização
  sync_control: `
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    table_name TEXT NOT NULL,
    last_sync TIMESTAMPTZ DEFAULT now(),
    will_base_rate INTEGER DEFAULT 200,
    will_bonus INTEGER DEFAULT 0,
    global_version INTEGER DEFAULT 1
  `
};

// Função para criar uma tabela se não existir
export const createTableIfNotExists = async (tableName: TableName): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    console.log(`Verificando/criando tabela ${tableName}...`);
    
    // Verificar se a tabela existe usando o método da API
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') { // Tabela não existe
      console.log(`Tabela ${tableName} não existe. Criando...`);
      
      // Usar RPC para criar a tabela
      const { error: rpcError } = await supabase.rpc('create_table_if_not_exists', {
        table_name: tableName,
        table_definition: tableDefinitions[tableName]
      });
      
      if (rpcError) {
        console.error(`Erro ao criar tabela ${tableName}:`, rpcError);
        return false;
      }
      
      console.log(`Tabela ${tableName} criada com sucesso`);
      return true;
    } else if (error) {
      console.error(`Erro ao verificar tabela ${tableName}:`, error);
      return false;
    }
    
    console.log(`Tabela ${tableName} já existe`);
    return true;
  } catch (error) {
    console.error(`Erro ao verificar/criar tabela ${tableName}:`, error);
    return false;
  }
};

// Função para fazer backup dos dados da tabela sync_data
export const backupSyncData = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    console.log('Fazendo backup dos dados da tabela sync_data...');
    
    // Verificar se a tabela sync_data existe
    const { data, error } = await supabase
      .from('sync_data')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Erro ao verificar tabela sync_data:', error);
      return false;
    }
    
    // Verificar se a tabela de backup existe, se não, criar
    const { error: backupCheckError } = await supabase
      .from('sync_data_backup')
      .select('id')
      .limit(1);
    
    if (backupCheckError && backupCheckError.code === '42P01') {
      // Usar RPC para criar a tabela de backup
      const { error: createError } = await supabase.rpc('create_sync_data_backup');
      
      if (createError) {
        console.error('Erro ao criar tabela de backup:', createError);
        return false;
      }
    }
    
    // Fazer backup dos dados
    const { error: backupError } = await supabase.rpc('backup_sync_data');
    
    if (backupError) {
      console.error('Erro ao fazer backup dos dados:', backupError);
      return false;
    }
    
    console.log('Backup realizado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao fazer backup:', error);
    return false;
  }
};

// Função para migrar dados da tabela sync_data para as novas tabelas
export const migrateDataToNewStructure = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    console.log('Iniciando migração dos dados para a nova estrutura...');
    
    // Obter dados da tabela sync_data
    const { data: syncData, error: syncError } = await supabase
      .from('sync_data')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (syncError) {
      console.error('Erro ao obter dados para migração:', syncError);
      return false;
    }
    
    if (!syncData || syncData.length === 0) {
      console.warn('Não há dados para migrar');
      return true;
    }
    
    const data = syncData[0];
    
    // Migrar projetos
    if (data.projects && Array.isArray(data.projects)) {
      for (const project of data.projects) {
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
            is_invoiced: false,
            invoice_ok: project.invoiceOk || false,
            version: 1,
            last_modified_by: 'migration',
            last_sync: new Date().toISOString()
          });
        
        if (error) {
          console.error('Erro ao migrar projeto:', error);
        }
      }
    }
    
    // Migrar itens de estoque
    if (data.stock && Array.isArray(data.stock)) {
      for (const item of data.stock) {
        const { error } = await supabase
          .from('stock_items')
          .upsert({
            id: item.id,
            name: item.name,
            quantity: item.quantity || 0,
            unit: item.unit,
            version: 1,
            last_modified_by: 'migration',
            last_sync: new Date().toISOString()
          });
        
        if (error) {
          console.error('Erro ao migrar item de estoque:', error);
        }
      }
    }
    
    // Migrar funcionários
    if (data.employees) {
      // Para cada semana de funcionários
      for (const [weekKey, weekEmployees] of Object.entries(data.employees)) {
        if (Array.isArray(weekEmployees)) {
          for (const employee of weekEmployees) {
            // Verificar se o funcionário já foi migrado
            const { data: existingEmployee, error: checkError } = await supabase
              .from('employees')
              .select('id')
              .eq('id', employee.id)
              .limit(1);
            
            if (checkError) {
              console.error('Erro ao verificar funcionário existente:', checkError);
              continue;
            }
            
            if (!existingEmployee || existingEmployee.length === 0) {
              // Inserir novo funcionário
              const { error } = await supabase
                .from('employees')
                .upsert({
                  id: employee.id,
                  name: employee.name,
                  role: employee.role,
                  daily_rate: employee.dailyRate || 250,
                  week_start: weekKey,
                  days_worked: employee.daysWorked || 0,
                  worked_dates: JSON.stringify(employee.workedDates || []),
                  version: 1,
                  last_modified_by: 'migration',
                  last_sync: new Date().toISOString()
                });
              
              if (error) {
                console.error('Erro ao migrar funcionário:', error);
              }
            } else {
              // Atualizar funcionário existente com os dados mais recentes
              const { error } = await supabase
                .from('employees')
                .update({
                  name: employee.name,
                  role: employee.role,
                  daily_rate: employee.dailyRate || 250,
                  days_worked: employee.daysWorked || 0,
                  worked_dates: JSON.stringify(employee.workedDates || []),
                  version: 1,
                  last_modified_by: 'migration',
                  last_sync: new Date().toISOString()
                })
                .eq('id', employee.id);
              
              if (error) {
                console.error('Erro ao atualizar funcionário existente:', error);
              }
            }
          }
        }
      }
    }
    
    // Migrar despesas
    if (data.expenses) {
      // Para cada lista de despesas
      for (const [listName, listExpenses] of Object.entries(data.expenses)) {
        if (Array.isArray(listExpenses)) {
          for (const expense of listExpenses) {
            const { error } = await supabase
              .from('expenses')
              .upsert({
                id: expense.id,
                description: expense.description,
                amount: expense.amount || 0,
                date: expense.date,
                category: expense.category,
                photo_url: expense.photoUrl,
                is_paid: expense.isPaid || false,
                owner_id: listName,
                version: 1,
                last_modified_by: 'migration',
                last_sync: new Date().toISOString()
              });
            
            if (error) {
              console.error('Erro ao migrar despesa:', error);
            }
          }
        }
      }
    }
    
    // Configurar valores do Will
    const { error: willError } = await supabase
      .from('sync_control')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        table_name: 'global',
        will_base_rate: data.willBaseRate || 200,
        will_bonus: data.willBonus || 0,
        global_version: 1,
        last_sync: new Date().toISOString()
      });
    
    if (willError) {
      console.error('Erro ao configurar valores do Will:', willError);
    }
    
    console.log('Migração concluída com sucesso');
    return true;
  } catch (error) {
    console.error('Erro durante a migração:', error);
    return false;
  }
};

// Função para inicializar a nova estrutura do banco de dados
export const initializeNewDatabaseStructure = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    console.log('Inicializando nova estrutura do banco de dados...');
    
    // Criar a função RPC para criar tabelas dinamicamente (se não existir)
    const { error: rpcError } = await supabase.rpc('register_create_table_function');
    
    if (rpcError) {
      console.error('Erro ao registrar função create_table_if_not_exists:', rpcError);
      // Continue mesmo com erro, pois a função pode já existir
    }
    
    // Criar a função RPC para backup (se não existir)
    const { error: backupRpcError } = await supabase.rpc('register_backup_functions');
    
    if (backupRpcError) {
      console.error('Erro ao registrar funções de backup:', backupRpcError);
      // Continue mesmo com erro, pois as funções podem já existir
    }
    
    // Criar tabelas na ordem correta (devido às referências)
    await createTableIfNotExists('projects');
    await createTableIfNotExists('stock_items');
    await createTableIfNotExists('employees');
    await createTableIfNotExists('expenses');
    await createTableIfNotExists('sync_control');
    
    // Fazer backup dos dados existentes
    const backupSuccess = await backupSyncData();
    
    if (!backupSuccess) {
      console.warn('Não foi possível fazer backup dos dados. Continuando mesmo assim...');
    }
    
    // Migrar dados para a nova estrutura
    const migrationSuccess = await migrateDataToNewStructure();
    
    if (!migrationSuccess) {
      console.error('Erro durante a migração dos dados');
      return false;
    }
    
    console.log('Nova estrutura do banco de dados inicializada com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar nova estrutura do banco de dados:', error);
    return false;
  }
};

// Registrar as funções SQL necessárias para criar tabelas e fazer backup
export const registerRequiredSqlFunctions = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    // Função para criar tabelas dinamicamente
    const createTableFunctionSql = `
      CREATE OR REPLACE FUNCTION create_table_if_not_exists(
        table_name TEXT,
        table_definition TEXT
      ) RETURNS BOOLEAN AS $$
      DECLARE
        query TEXT;
      BEGIN
        query := 'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' || table_definition || ');';
        EXECUTE query;
        RETURN TRUE;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating table %: %', table_name, SQLERRM;
        RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Função para registrar a função create_table_if_not_exists
    const registerCreateTableFunctionSql = `
      CREATE OR REPLACE FUNCTION register_create_table_function() RETURNS BOOLEAN AS $$
      BEGIN
        -- Implementação da função create_table_if_not_exists
        EXECUTE $function$
          CREATE OR REPLACE FUNCTION create_table_if_not_exists(
            table_name TEXT,
            table_definition TEXT
          ) RETURNS BOOLEAN AS $inner$
          DECLARE
            query TEXT;
          BEGIN
            query := 'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' || table_definition || ');';
            EXECUTE query;
            RETURN TRUE;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error creating table %: %', table_name, SQLERRM;
            RETURN FALSE;
          END;
          $inner$ LANGUAGE plpgsql SECURITY DEFINER;
        $function$;
        
        RETURN TRUE;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error registering create_table_if_not_exists: %', SQLERRM;
        RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Função para registrar as funções de backup
    const registerBackupFunctionsSql = `
      CREATE OR REPLACE FUNCTION register_backup_functions() RETURNS BOOLEAN AS $$
      BEGIN
        -- Função para criar tabela de backup
        EXECUTE $function$
          CREATE OR REPLACE FUNCTION create_sync_data_backup() RETURNS BOOLEAN AS $inner$
          BEGIN
            CREATE TABLE IF NOT EXISTS sync_data_backup (
              id UUID PRIMARY KEY,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now(),
              backup_date TIMESTAMPTZ DEFAULT now(),
              expenses JSONB,
              projects JSONB,
              stock JSONB,
              employees JSONB,
              willBaseRate INTEGER,
              willBonus INTEGER,
              lastSync TEXT
            );
            RETURN TRUE;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error creating backup table: %', SQLERRM;
            RETURN FALSE;
          END;
          $inner$ LANGUAGE plpgsql SECURITY DEFINER;
        $function$;
        
        -- Função para fazer backup dos dados
        EXECUTE $function$
          CREATE OR REPLACE FUNCTION backup_sync_data() RETURNS BOOLEAN AS $inner$
          BEGIN
            INSERT INTO sync_data_backup (
              id, created_at, updated_at, expenses, projects, stock, 
              employees, willBaseRate, willBonus, lastSync
            )
            SELECT 
              id, created_at, updated_at, expenses, projects, stock, 
              employees, willBaseRate, willBonus, lastSync
            FROM sync_data;
            
            RETURN TRUE;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error backing up data: %', SQLERRM;
            RETURN FALSE;
          END;
          $inner$ LANGUAGE plpgsql SECURITY DEFINER;
        $function$;
        
        RETURN TRUE;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error registering backup functions: %', SQLERRM;
        RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Registrar as funções usando RPC
    const { error: createTableError } = await supabase.rpc('register_create_table_function');
    
    if (createTableError) {
      // Se falhar, tentar chamar SQL diretamente
      console.warn('Erro ao registrar função create_table_if_not_exists via RPC, tentando via SQL');
      await supabase.rpc('exec_sql', { sql: registerCreateTableFunctionSql });
    }
    
    const { error: backupError } = await supabase.rpc('register_backup_functions');
    
    if (backupError) {
      // Se falhar, tentar chamar SQL diretamente
      console.warn('Erro ao registrar funções de backup via RPC, tentando via SQL');
      await supabase.rpc('exec_sql', { sql: registerBackupFunctionsSql });
    }
    
    console.log('Funções SQL registradas com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao registrar funções SQL:', error);
    return false;
  }
}; 