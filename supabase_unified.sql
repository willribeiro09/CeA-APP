-- Script unificado para configurar o Supabase com sistema de sincronização melhorado
-- Este script resolve problemas de conflitos de sincronização entre múltiplos usuários

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Remover tabelas existentes (caso existam)
DROP TABLE IF EXISTS sync_data CASCADE;
DROP TABLE IF EXISTS sync_history CASCADE;

-- Criar tabela para armazenar o histórico de todas as sincronizações
CREATE TABLE sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id UUID NOT NULL,
  operation_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,  -- 'expense', 'project', 'stock', 'employee'
  entity_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_timestamp BIGINT NOT NULL,
  device_id TEXT
);

-- Criar índices para melhorar performance de consultas em sync_history
CREATE INDEX idx_sync_history_sync_id ON sync_history(sync_id);
CREATE INDEX idx_sync_history_entity_type_id ON sync_history(entity_type, entity_id);
CREATE INDEX idx_sync_history_created_at ON sync_history(created_at);

-- Criar tabela principal para dados sincronizados
CREATE TABLE sync_data (
  id UUID PRIMARY KEY,
  expenses JSONB DEFAULT '{}'::JSONB, 
  projects JSONB DEFAULT '[]'::JSONB,
  stock JSONB DEFAULT '[]'::JSONB,
  employees JSONB DEFAULT '{}'::JSONB,
  willbaseRate INTEGER DEFAULT 200,
  willbonus INTEGER DEFAULT 0,
  last_sync_timestamp BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Comentários sobre as colunas
COMMENT ON COLUMN sync_data.expenses IS 'Mapa de despesas: { chave: Array<Despesa> }';
COMMENT ON COLUMN sync_data.projects IS 'Array de projetos';
COMMENT ON COLUMN sync_data.stock IS 'Array de itens de estoque';
COMMENT ON COLUMN sync_data.employees IS 'Mapa de funcionários: { chave: Array<Funcionário> }';
COMMENT ON COLUMN sync_data.willbaseRate IS 'Taxa base do Will';
COMMENT ON COLUMN sync_data.willbonus IS 'Bônus do Will';
COMMENT ON COLUMN sync_data.last_sync_timestamp IS 'Timestamp da última sincronização (em milissegundos)';
COMMENT ON COLUMN sync_data.version IS 'Número da versão, incrementado a cada atualização';

-- Função para incrementar automaticamente a versão a cada atualização
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar versão e timestamp automaticamente
DROP TRIGGER IF EXISTS update_sync_data_version ON sync_data;
CREATE TRIGGER update_sync_data_version
BEFORE UPDATE ON sync_data
FOR EACH ROW
EXECUTE FUNCTION increment_version();

-- Função para registrar mudanças no histórico
CREATE OR REPLACE FUNCTION log_sync_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB;
  entity_type TEXT;
  entity_id TEXT;
  operation TEXT;
BEGIN
  -- Determinar a operação (INSERT, UPDATE, DELETE)
  IF TG_OP = 'INSERT' THEN
    operation := 'INSERT';
    changes := NEW.expenses || NEW.projects || NEW.stock || NEW.employees;
  ELSIF TG_OP = 'UPDATE' THEN
    operation := 'UPDATE';
    
    -- Detectar mudanças em expenses
    IF OLD.expenses IS DISTINCT FROM NEW.expenses THEN
      entity_type := 'expense';
      -- Aqui devemos identificar quais expenses específicas foram alteradas
      -- Esta é uma simplificação; numa implementação real, seria necessário 
      -- um algoritmo mais sofisticado para detectar alterações específicas
      changes := NEW.expenses;
      
      INSERT INTO sync_history (
        sync_id, 
        operation_type, 
        entity_type, 
        entity_id, 
        data, 
        client_timestamp, 
        device_id
      )
      VALUES (
        NEW.id, 
        operation, 
        entity_type, 
        'all', -- simplificado para este exemplo
        changes, 
        NEW.last_sync_timestamp,
        coalesce(current_setting('app.device_id', true), 'unknown')
      );
    END IF;
    
    -- Detectar mudanças em projects
    IF OLD.projects IS DISTINCT FROM NEW.projects THEN
      entity_type := 'project';
      changes := NEW.projects;
      
      INSERT INTO sync_history (
        sync_id, 
        operation_type, 
        entity_type, 
        entity_id, 
        data, 
        client_timestamp, 
        device_id
      )
      VALUES (
        NEW.id, 
        operation, 
        entity_type, 
        'all', -- simplificado para este exemplo
        changes, 
        NEW.last_sync_timestamp,
        coalesce(current_setting('app.device_id', true), 'unknown')
      );
    END IF;
    
    -- Detectar mudanças em stock
    IF OLD.stock IS DISTINCT FROM NEW.stock THEN
      entity_type := 'stock';
      changes := NEW.stock;
      
      INSERT INTO sync_history (
        sync_id, 
        operation_type, 
        entity_type, 
        entity_id, 
        data, 
        client_timestamp, 
        device_id
      )
      VALUES (
        NEW.id, 
        operation, 
        entity_type, 
        'all', -- simplificado para este exemplo
        changes, 
        NEW.last_sync_timestamp,
        coalesce(current_setting('app.device_id', true), 'unknown')
      );
    END IF;
    
    -- Detectar mudanças em employees
    IF OLD.employees IS DISTINCT FROM NEW.employees THEN
      entity_type := 'employee';
      changes := NEW.employees;
      
      INSERT INTO sync_history (
        sync_id, 
        operation_type, 
        entity_type, 
        entity_id, 
        data, 
        client_timestamp, 
        device_id
      )
      VALUES (
        NEW.id, 
        operation, 
        entity_type, 
        'all', -- simplificado para este exemplo
        changes, 
        NEW.last_sync_timestamp,
        coalesce(current_setting('app.device_id', true), 'unknown')
      );
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar mudanças 
CREATE TRIGGER log_sync_data_changes
AFTER INSERT OR UPDATE ON sync_data
FOR EACH ROW
EXECUTE FUNCTION log_sync_changes();

-- Função para realizar merge inteligente de dados
CREATE OR REPLACE FUNCTION merge_sync_data(
  client_data JSONB, 
  current_data JSONB, 
  client_timestamp BIGINT,
  entity_type TEXT
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  client_entity JSONB;
  server_entity JSONB;
  merged_entities JSONB;
  entity_key TEXT;
  entity_id TEXT;
BEGIN
  -- Algoritmo de merge diferente dependendo do tipo de entidade
  IF entity_type = 'expenses' OR entity_type = 'employees' THEN
    -- Expenses e employees são mapas de arrays
    result := current_data;
    
    -- Iterar por cada chave no dado do cliente
    FOR entity_key IN SELECT jsonb_object_keys(client_data)
    LOOP
      -- Se a chave não existe no servidor, apenas adicionar
      IF NOT result ? entity_key THEN
        result := jsonb_set(result, ARRAY[entity_key], client_data->entity_key);
      ELSE
        client_entity := client_data->entity_key;
        server_entity := result->entity_key;
        merged_entities := server_entity;
        
        -- Para cada elemento no array do cliente
        FOR i IN 0..jsonb_array_length(client_entity)-1
        LOOP
          entity_id := client_entity->i->>'id';
          -- Verificar se este id já existe no servidor
          IF NOT EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(server_entity) AS e 
            WHERE e->>'id' = entity_id
          ) THEN
            -- Se não existe, adicionar ao array mesclado
            merged_entities := merged_entities || jsonb_build_array(client_entity->i);
          ELSE
            -- Se existe, usar a versão mais recente (neste caso, a do cliente)
            -- Em implementação real, poderia verificar timestamps específicos
            FOR j IN 0..jsonb_array_length(server_entity)-1
            LOOP
              IF server_entity->j->>'id' = entity_id THEN
                merged_entities := jsonb_set(
                  merged_entities, 
                  ARRAY[j::text], 
                  client_entity->i
                );
                EXIT;
              END IF;
            END LOOP;
          END IF;
        END LOOP;
        
        result := jsonb_set(result, ARRAY[entity_key], merged_entities);
      END IF;
    END LOOP;
    
  ELSIF entity_type = 'projects' OR entity_type = 'stock' THEN
    -- Projects e stock são arrays simples
    merged_entities := current_data;
    
    -- Para cada elemento no array do cliente
    FOR i IN 0..jsonb_array_length(client_data)-1
    LOOP
      entity_id := client_data->i->>'id';
      -- Verificar se este id já existe no servidor
      IF NOT EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(current_data) AS e 
        WHERE e->>'id' = entity_id
      ) THEN
        -- Se não existe, adicionar ao array mesclado
        merged_entities := merged_entities || jsonb_build_array(client_data->i);
      ELSE
        -- Se existe, usar a versão mais recente
        FOR j IN 0..jsonb_array_length(current_data)-1
        LOOP
          IF current_data->j->>'id' = entity_id THEN
            merged_entities := jsonb_set(
              merged_entities, 
              ARRAY[j::text], 
              client_data->i
            );
            EXIT;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    
    result := merged_entities;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para sincronizar dados entre cliente e servidor
CREATE OR REPLACE FUNCTION sync_client_data(
  p_id UUID,
  p_expenses JSONB,
  p_projects JSONB,
  p_stock JSONB,
  p_employees JSONB,
  p_willbaseRate INTEGER,
  p_willbonus INTEGER,
  p_client_timestamp BIGINT,
  p_device_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  current_data RECORD;
  result JSONB;
  merged_expenses JSONB;
  merged_projects JSONB;
  merged_stock JSONB;
  merged_employees JSONB;
BEGIN
  -- Configurar o ID do dispositivo para o contexto da sessão
  IF p_device_id IS NOT NULL THEN
    PERFORM set_config('app.device_id', p_device_id, false);
  END IF;

  -- Buscar dados atuais do servidor
  SELECT * INTO current_data FROM sync_data WHERE id = p_id;
  
  IF NOT FOUND THEN
    -- Se não existem dados, criar um novo registro
    INSERT INTO sync_data (
      id, 
      expenses, 
      projects, 
      stock, 
      employees, 
      willbaseRate, 
      willbonus, 
      last_sync_timestamp
    ) 
    VALUES (
      p_id, 
      p_expenses, 
      p_projects, 
      p_stock, 
      p_employees, 
      p_willbaseRate, 
      p_willbonus, 
      p_client_timestamp
    )
    RETURNING jsonb_build_object(
      'id', id,
      'expenses', expenses,
      'projects', projects,
      'stock', stock,
      'employees', employees,
      'willbaseRate', willbaseRate,
      'willbonus', willbonus,
      'last_sync_timestamp', last_sync_timestamp,
      'version', version
    ) INTO result;
  ELSE
    -- Realizar merge inteligente dos dados
    merged_expenses := merge_sync_data(p_expenses, current_data.expenses, p_client_timestamp, 'expenses');
    merged_projects := merge_sync_data(p_projects, current_data.projects, p_client_timestamp, 'projects');
    merged_stock := merge_sync_data(p_stock, current_data.stock, p_client_timestamp, 'stock');
    merged_employees := merge_sync_data(p_employees, current_data.employees, p_client_timestamp, 'employees');
    
    -- Atualizar o registro com os dados mesclados
    UPDATE sync_data 
    SET 
      expenses = merged_expenses,
      projects = merged_projects,
      stock = merged_stock,
      employees = merged_employees,
      willbaseRate = GREATEST(p_willbaseRate, current_data.willbaseRate),
      willbonus = GREATEST(p_willbonus, current_data.willbonus),
      last_sync_timestamp = p_client_timestamp
    WHERE id = p_id
    RETURNING jsonb_build_object(
      'id', id,
      'expenses', expenses,
      'projects', projects,
      'stock', stock,
      'employees', employees,
      'willbaseRate', willbaseRate,
      'willbonus', willbonus,
      'last_sync_timestamp', last_sync_timestamp,
      'version', version
    ) INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para obter mudanças desde a última sincronização
CREATE OR REPLACE FUNCTION get_changes_since(
  p_id UUID,
  p_last_sync_timestamp BIGINT
) RETURNS JSONB AS $$
DECLARE
  current_data RECORD;
  result JSONB;
BEGIN
  -- Buscar dados atuais do servidor
  SELECT * INTO current_data FROM sync_data WHERE id = p_id;
  
  IF NOT FOUND THEN
    -- Se não existem dados, retornar estrutura vazia
    result := jsonb_build_object(
      'expenses', '{}'::jsonb,
      'projects', '[]'::jsonb,
      'stock', '[]'::jsonb,
      'employees', '{}'::jsonb,
      'willbaseRate', 200,
      'willbonus', 0,
      'last_sync_timestamp', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      'version', 1
    );
  ELSE
    -- Se o timestamp do cliente é mais antigo que o do servidor, retornar todos os dados
    IF p_last_sync_timestamp < current_data.last_sync_timestamp THEN
      result := jsonb_build_object(
        'expenses', current_data.expenses,
        'projects', current_data.projects,
        'stock', current_data.stock,
        'employees', current_data.employees,
        'willbaseRate', current_data.willbaseRate,
        'willbonus', current_data.willbonus,
        'last_sync_timestamp', current_data.last_sync_timestamp,
        'version', current_data.version
      );
    ELSE
      -- Cliente já está atualizado, retornar apenas confirmação
      result := jsonb_build_object(
        'up_to_date', true,
        'last_sync_timestamp', current_data.last_sync_timestamp,
        'version', current_data.version
      );
    END IF;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Configurar a publicação para realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE sync_data;

-- Configurar políticas de segurança (RLS)
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso anônimo (leitura e escrita)
DROP POLICY IF EXISTS "Allow anonymous access" ON sync_data;
CREATE POLICY "Allow anonymous access" 
  ON sync_data 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- Política para histórico - apenas leitura anônima
DROP POLICY IF EXISTS "Allow anonymous read access" ON sync_history;
CREATE POLICY "Allow anonymous read access" 
  ON sync_history 
  FOR SELECT
  TO anon 
  USING (true);

-- Inserir um registro inicial (se for nova instalação)
INSERT INTO sync_data (
  id,
  expenses,
  projects,
  stock,
  employees,
  willbaseRate,
  willbonus,
  last_sync_timestamp
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '{}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  200,
  0,
  (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
)
ON CONFLICT (id) DO NOTHING;

-- Exemplos de uso das funções:

-- 1. Para sincronizar dados do cliente:
-- SELECT sync_client_data(
--   '00000000-0000-0000-0000-000000000000', 
--   '{"2023-01":[]}'::jsonb, 
--   '[]'::jsonb, 
--   '[]'::jsonb, 
--   '{"2023-01":[]}'::jsonb, 
--   200, 
--   0, 
--   extract(epoch from now()) * 1000,
--   'device123'
-- );

-- 2. Para obter mudanças desde a última sincronização:
-- SELECT get_changes_since(
--   '00000000-0000-0000-0000-000000000000', 
--   1672531200000  -- timestamp em milissegundos
-- ); 