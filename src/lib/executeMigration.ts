import { supabase } from './supabase';

/**
 * Executa a migração do banco de dados através do frontend.
 * Este script pode ser usado para migrar dados sem acessar o console SQL.
 */
export const executeMigration = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase não configurado. Verifique suas credenciais.'
    };
  }

  try {
    console.log('Iniciando migração do banco de dados...');
    
    // Passo 1: Verificar se as tabelas principais já existem
    console.log('Verificando tabelas existentes...');
    const { data: tablesData, error: tablesError } = await supabase.rpc('count_records_in_new_tables');
    
    if (!tablesError && tablesData) {
      console.log('Contagem de registros nas tabelas:', tablesData);
      
      if (tablesData.total_records > 0) {
        return {
          success: true,
          message: 'Migração já realizada anteriormente. Tabelas já contêm dados.',
          details: tablesData
        };
      }
    }
    
    // Passo 2: Executar o script SQL principal parte por parte
    console.log('Criando backup da tabela sync_data...');
    const backupSQL = `
      CREATE TABLE IF NOT EXISTS sync_data_backup (
        id UUID PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        backup_date TIMESTAMPTZ DEFAULT now(),
        expenses JSONB,
        projects JSONB,
        stock JSONB,
        employees JSONB,
        "willBaseRate" INTEGER,
        "willBonus" INTEGER,
        "lastSync" TEXT
      );
      
      INSERT INTO sync_data_backup (
        id, created_at, updated_at, expenses, projects, stock, 
        employees, "willBaseRate", "willBonus", "lastSync", backup_date
      )
      SELECT 
        id, created_at, updated_at, expenses, projects, stock, 
        employees, "willBaseRate", "willBonus", "lastSync", now()
      FROM sync_data
      ON CONFLICT (id) DO NOTHING;
    `;
    
    const { error: backupError } = await supabase.rpc('exec_sql', { sql: backupSQL });
    
    if (backupError) {
      console.warn('Erro ao criar backup, mas continuando com a migração:', backupError);
    }
    
    // Passo 3: Criar as tabelas na ordem correta
    console.log('Criando tabela projects...');
    const projectsSQL = `
      CREATE TABLE IF NOT EXISTS projects (
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
      );
    `;
    
    const { error: projectsError } = await supabase.rpc('exec_sql', { sql: projectsSQL });
    
    if (projectsError) {
      return {
        success: false,
        message: 'Erro ao criar tabela projects',
        details: projectsError
      };
    }
    
    console.log('Criando tabelas expenses, stock_items, employees e sync_control...');
    const otherTablesSQL = `
      CREATE TABLE IF NOT EXISTS expenses (
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
      );
      
      CREATE TABLE IF NOT EXISTS stock_items (
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
      );
      
      CREATE TABLE IF NOT EXISTS employees (
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
      );
      
      CREATE TABLE IF NOT EXISTS sync_control (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        table_name TEXT NOT NULL,
        last_sync TIMESTAMPTZ DEFAULT now(),
        will_base_rate INTEGER DEFAULT 200,
        will_bonus INTEGER DEFAULT 0,
        global_version INTEGER DEFAULT 1,
        last_modified_by TEXT
      );
      
      INSERT INTO sync_control (
        id, table_name, will_base_rate, will_bonus, global_version
      )
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'global',
        200,
        0,
        1
      )
      ON CONFLICT (id) DO NOTHING;
    `;
    
    const { error: otherTablesError } = await supabase.rpc('exec_sql', { sql: otherTablesSQL });
    
    if (otherTablesError) {
      return {
        success: false,
        message: 'Erro ao criar tabelas de dados',
        details: otherTablesError
      };
    }
    
    // Passo 4: Criar funções, triggers e configurar realtime
    console.log('Configurando funções, triggers e realtime...');
    const functionsSQL = `
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      DROP TRIGGER IF EXISTS update_expenses_timestamp ON expenses;
      CREATE TRIGGER update_expenses_timestamp
      BEFORE UPDATE ON expenses
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
      
      DROP TRIGGER IF EXISTS update_projects_timestamp ON projects;
      CREATE TRIGGER update_projects_timestamp
      BEFORE UPDATE ON projects
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
      
      DROP TRIGGER IF EXISTS update_stock_items_timestamp ON stock_items;
      CREATE TRIGGER update_stock_items_timestamp
      BEFORE UPDATE ON stock_items
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
      
      DROP TRIGGER IF EXISTS update_employees_timestamp ON employees;
      CREATE TRIGGER update_employees_timestamp
      BEFORE UPDATE ON employees
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
      
      DROP TRIGGER IF EXISTS update_sync_control_timestamp ON sync_control;
      CREATE TRIGGER update_sync_control_timestamp
      BEFORE UPDATE ON sync_control
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
      
      ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
      ALTER PUBLICATION supabase_realtime ADD TABLE projects;
      ALTER PUBLICATION supabase_realtime ADD TABLE stock_items;
      ALTER PUBLICATION supabase_realtime ADD TABLE employees;
      ALTER PUBLICATION supabase_realtime ADD TABLE sync_control;
    `;
    
    const { error: functionsError } = await supabase.rpc('exec_sql', { sql: functionsSQL });
    
    if (functionsError) {
      console.warn('Erro ao configurar funções e triggers, mas continuando:', functionsError);
    }
    
    // Passo 5: Configurar RLS (Row Level Security)
    console.log('Configurando políticas de segurança (RLS)...');
    const rlsSQL = `
      ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
      ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
      ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
      ALTER TABLE sync_control ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Permitir acesso de leitura para todos os usuários autenticados - expenses"
        ON expenses FOR SELECT TO authenticated USING (true);
      
      CREATE POLICY "Permitir acesso de leitura para todos os usuários autenticados - projects"
        ON projects FOR SELECT TO authenticated USING (true);
      
      CREATE POLICY "Permitir acesso de leitura para todos os usuários autenticados - stock_items"
        ON stock_items FOR SELECT TO authenticated USING (true);
      
      CREATE POLICY "Permitir acesso de leitura para todos os usuários autenticados - employees"
        ON employees FOR SELECT TO authenticated USING (true);
      
      CREATE POLICY "Permitir acesso de leitura para todos os usuários autenticados - sync_control"
        ON sync_control FOR SELECT TO authenticated USING (true);
      
      CREATE POLICY "Permitir inserção para todos os usuários autenticados - expenses"
        ON expenses FOR INSERT TO authenticated WITH CHECK (true);
      
      CREATE POLICY "Permitir atualização para todos os usuários autenticados - expenses"
        ON expenses FOR UPDATE TO authenticated USING (true);
      
      CREATE POLICY "Permitir inserção para todos os usuários autenticados - projects"
        ON projects FOR INSERT TO authenticated WITH CHECK (true);
      
      CREATE POLICY "Permitir atualização para todos os usuários autenticados - projects"
        ON projects FOR UPDATE TO authenticated USING (true);
      
      CREATE POLICY "Permitir inserção para todos os usuários autenticados - stock_items"
        ON stock_items FOR INSERT TO authenticated WITH CHECK (true);
      
      CREATE POLICY "Permitir atualização para todos os usuários autenticados - stock_items"
        ON stock_items FOR UPDATE TO authenticated USING (true);
      
      CREATE POLICY "Permitir inserção para todos os usuários autenticados - employees"
        ON employees FOR INSERT TO authenticated WITH CHECK (true);
      
      CREATE POLICY "Permitir atualização para todos os usuários autenticados - employees"
        ON employees FOR UPDATE TO authenticated USING (true);
      
      CREATE POLICY "Permitir inserção para todos os usuários autenticados - sync_control"
        ON sync_control FOR INSERT TO authenticated WITH CHECK (true);
      
      CREATE POLICY "Permitir atualização para todos os usuários autenticados - sync_control"
        ON sync_control FOR UPDATE TO authenticated USING (true);
    `;
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsSQL });
    
    if (rlsError) {
      console.warn('Erro ao configurar políticas RLS, mas continuando:', rlsError);
    }
    
    // Passo 6: Criar funções para contar registros e migrar dados
    console.log('Criando funções para contar registros e migrar dados...');
    const countFunctionSQL = `
      CREATE OR REPLACE FUNCTION count_records_in_new_tables()
      RETURNS jsonb AS $$
      DECLARE
        projects_count INTEGER;
        expenses_count INTEGER;
        stock_items_count INTEGER;
        employees_count INTEGER;
        total_count INTEGER;
      BEGIN
        -- Verificar se cada tabela existe antes de contar registros
        BEGIN
          SELECT COUNT(*) INTO projects_count FROM projects;
        EXCEPTION WHEN undefined_table THEN
          projects_count := 0;
        END;
        
        BEGIN
          SELECT COUNT(*) INTO expenses_count FROM expenses;
        EXCEPTION WHEN undefined_table THEN
          expenses_count := 0;
        END;
        
        BEGIN
          SELECT COUNT(*) INTO stock_items_count FROM stock_items;
        EXCEPTION WHEN undefined_table THEN
          stock_items_count := 0;
        END;
        
        BEGIN
          SELECT COUNT(*) INTO employees_count FROM employees;
        EXCEPTION WHEN undefined_table THEN
          employees_count := 0;
        END;
        
        total_count := COALESCE(projects_count, 0) + COALESCE(expenses_count, 0) + 
                      COALESCE(stock_items_count, 0) + COALESCE(employees_count, 0);
        
        RETURN jsonb_build_object(
          'projects', COALESCE(projects_count, 0),
          'expenses', COALESCE(expenses_count, 0),
          'stock_items', COALESCE(stock_items_count, 0),
          'employees', COALESCE(employees_count, 0),
          'total_records', total_count
        );
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: countFunctionError } = await supabase.rpc('exec_sql', { sql: countFunctionSQL });
    
    if (countFunctionError) {
      console.warn('Erro ao criar função count_records_in_new_tables, mas continuando:', countFunctionError);
    }
    
    const migrationFunctionSQL = `
      CREATE OR REPLACE FUNCTION migrate_data_to_new_structure()
      RETURNS BOOLEAN AS $$
      DECLARE
        sync_record RECORD;
        expense_record RECORD;
        project_record RECORD;
        stock_record RECORD;
        employee_record RECORD;
        week_key TEXT;
        employee_list JSONB;
        expense_list JSONB;
      BEGIN
        -- Obter o registro mais recente da tabela sync_data
        SELECT * INTO sync_record FROM sync_data ORDER BY updated_at DESC LIMIT 1;
        
        IF sync_record IS NULL THEN
          RAISE NOTICE 'Nenhum dado encontrado para migrar';
          RETURN FALSE;
        END IF;
        
        -- Migrar projetos
        IF sync_record.projects IS NOT NULL THEN
          FOR project_record IN SELECT * FROM jsonb_array_elements(sync_record.projects)
          LOOP
            INSERT INTO projects (
              id, name, client, location, start_date, end_date, status,
              description, project_number, value, invoice_ok, version
            ) VALUES (
              (project_record.value->>'id')::UUID,
              COALESCE(project_record.value->>'name', 'Projeto sem nome'),
              project_record.value->>'client',
              project_record.value->>'location',
              (project_record.value->>'startDate')::DATE,
              (project_record.value->>'endDate')::DATE,
              COALESCE(project_record.value->>'status', 'in_progress'),
              project_record.value->>'description',
              project_record.value->>'projectNumber',
              COALESCE((project_record.value->>'value')::NUMERIC, 0),
              COALESCE((project_record.value->>'invoiceOk')::BOOLEAN, FALSE),
              1
            )
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              client = EXCLUDED.client,
              location = EXCLUDED.location,
              start_date = EXCLUDED.start_date,
              end_date = EXCLUDED.end_date,
              status = EXCLUDED.status,
              description = EXCLUDED.description,
              project_number = EXCLUDED.project_number,
              value = EXCLUDED.value,
              invoice_ok = EXCLUDED.invoice_ok,
              version = projects.version + 1,
              updated_at = now();
          END LOOP;
        END IF;
        
        -- Migrar itens de estoque
        IF sync_record.stock IS NOT NULL THEN
          FOR stock_record IN SELECT * FROM jsonb_array_elements(sync_record.stock)
          LOOP
            INSERT INTO stock_items (
              id, name, quantity, unit, version
            ) VALUES (
              (stock_record.value->>'id')::UUID,
              stock_record.value->>'name',
              COALESCE((stock_record.value->>'quantity')::INTEGER, 0),
              stock_record.value->>'unit',
              1
            )
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              quantity = EXCLUDED.quantity,
              unit = EXCLUDED.unit,
              version = stock_items.version + 1,
              updated_at = now();
          END LOOP;
        END IF;
        
        -- Migrar funcionários
        IF sync_record.employees IS NOT NULL THEN
          FOR week_key, employee_list IN SELECT * FROM jsonb_each(sync_record.employees)
          LOOP
            -- Para cada semana
            FOR employee_record IN SELECT * FROM jsonb_array_elements(employee_list)
            LOOP
              INSERT INTO employees (
                id, name, role, daily_rate, week_start, days_worked, worked_dates, version
              ) VALUES (
                (employee_record.value->>'id')::UUID,
                employee_record.value->>'name',
                employee_record.value->>'role',
                COALESCE((employee_record.value->>'dailyRate')::NUMERIC, 250),
                week_key::DATE,
                COALESCE((employee_record.value->>'daysWorked')::INTEGER, 0),
                COALESCE(employee_record.value->'workedDates', '[]'::jsonb),
                1
              )
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                daily_rate = EXCLUDED.daily_rate,
                days_worked = EXCLUDED.days_worked,
                worked_dates = EXCLUDED.worked_dates,
                version = employees.version + 1,
                updated_at = now();
            END LOOP;
          END LOOP;
        END IF;
        
        -- Migrar despesas
        IF sync_record.expenses IS NOT NULL THEN
          FOR week_key, expense_list IN SELECT * FROM jsonb_each(sync_record.expenses)
          LOOP
            -- Para cada lista de despesas
            FOR expense_record IN SELECT * FROM jsonb_array_elements(expense_list)
            LOOP
              INSERT INTO expenses (
                id, description, amount, date, category, photo_url, is_paid, owner_id, version
              ) VALUES (
                (expense_record.value->>'id')::UUID,
                expense_record.value->>'description',
                COALESCE((expense_record.value->>'amount')::NUMERIC, 0),
                COALESCE((expense_record.value->>'date')::DATE, now()::DATE),
                expense_record.value->>'category',
                expense_record.value->>'photoUrl',
                COALESCE((expense_record.value->>'isPaid')::BOOLEAN, FALSE),
                week_key,
                1
              )
              ON CONFLICT (id) DO UPDATE SET
                description = EXCLUDED.description,
                amount = EXCLUDED.amount,
                date = EXCLUDED.date,
                category = EXCLUDED.category,
                photo_url = EXCLUDED.photo_url,
                is_paid = EXCLUDED.is_paid,
                version = expenses.version + 1,
                updated_at = now();
            END LOOP;
          END LOOP;
        END IF;
        
        -- Configurar valores do Will
        INSERT INTO sync_control (
          id, table_name, will_base_rate, will_bonus, global_version
        ) VALUES (
          '00000000-0000-0000-0000-000000000001',
          'global',
          COALESCE(sync_record."willBaseRate", 200),
          COALESCE(sync_record."willBonus", 0),
          1
        )
        ON CONFLICT (id) DO UPDATE SET
          will_base_rate = EXCLUDED.will_base_rate,
          will_bonus = EXCLUDED.will_bonus,
          global_version = sync_control.global_version + 1,
          updated_at = now();
        
        RETURN TRUE;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro durante a migração: %', SQLERRM;
        RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: migrationFunctionError } = await supabase.rpc('exec_sql', { sql: migrationFunctionSQL });
    
    if (migrationFunctionError) {
      console.warn('Erro ao criar função migrate_data_to_new_structure, mas continuando:', migrationFunctionError);
    }
    
    // Passo 7: Executar a migração
    console.log('Executando migração de dados...');
    const { data: migrationResult, error: migrationError } = await supabase.rpc('migrate_data_to_new_structure');
    
    if (migrationError) {
      return {
        success: false,
        message: 'Erro ao migrar dados',
        details: migrationError
      };
    }
    
    // Passo 8: Verificar resultado final
    console.log('Verificando resultado da migração...');
    const { data: finalCounts, error: finalCountsError } = await supabase.rpc('count_records_in_new_tables');
    
    if (finalCountsError) {
      return {
        success: true,
        message: 'Migração concluída, mas não foi possível obter contagem final',
        details: migrationResult
      };
    }
    
    return {
      success: true,
      message: 'Migração concluída com sucesso',
      details: finalCounts
    };
    
  } catch (error) {
    console.error('Erro durante a migração:', error);
    return {
      success: false,
      message: 'Erro inesperado durante a migração',
      details: error
    };
  }
}; 