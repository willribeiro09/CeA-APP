-- Migração para corrigir problemas de sincronização
-- Execute este script em bancos de dados Supabase existentes
-- Este script adiciona suporte para deletedIds e corrige problemas de sincronização

-- 1. Adicionar coluna deleted_ids se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sync_data' 
        AND column_name = 'deleted_ids'
    ) THEN
        ALTER TABLE sync_data ADD COLUMN deleted_ids JSONB DEFAULT '[]'::JSONB;
        COMMENT ON COLUMN sync_data.deleted_ids IS 'Array de IDs de itens deletados para sincronização';
    END IF;
END $$;

-- 2. Atualizar função sync_client_data para incluir deleted_ids
CREATE OR REPLACE FUNCTION sync_client_data(
  p_id UUID,
  p_expenses JSONB,
  p_projects JSONB,
  p_stock JSONB,
  p_employees JSONB,
  p_deleted_ids JSONB DEFAULT '[]'::JSONB,
  p_willbaseRate INTEGER DEFAULT 200,
  p_willbonus INTEGER DEFAULT 0,
  p_client_timestamp BIGINT DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  current_data RECORD;
  result JSONB;
  merged_expenses JSONB;
  merged_projects JSONB;
  merged_stock JSONB;
  merged_employees JSONB;
  current_timestamp BIGINT;
BEGIN
  -- Configurar o ID do dispositivo para o contexto da sessão
  IF p_device_id IS NOT NULL THEN
    PERFORM set_config('app.device_id', p_device_id, false);
  END IF;

  -- Usar timestamp atual se não fornecido
  current_timestamp := COALESCE(p_client_timestamp, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT);

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
      deleted_ids,
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
      p_deleted_ids,
      p_willbaseRate, 
      p_willbonus, 
      current_timestamp
    )
    RETURNING jsonb_build_object(
      'id', id,
      'expenses', expenses,
      'projects', projects,
      'stock', stock,
      'employees', employees,
      'deleted_ids', deleted_ids,
      'willbaseRate', willbaseRate,
      'willbonus', willbonus,
      'last_sync_timestamp', last_sync_timestamp,
      'version', version
    ) INTO result;
  ELSE
    -- Realizar merge inteligente dos dados
    merged_expenses := merge_sync_data(p_expenses, current_data.expenses, current_timestamp, 'expenses');
    merged_projects := merge_sync_data(p_projects, current_data.projects, current_timestamp, 'projects');
    merged_stock := merge_sync_data(p_stock, current_data.stock, current_timestamp, 'stock');
    merged_employees := merge_sync_data(p_employees, current_data.employees, current_timestamp, 'employees');
    
    -- Atualizar o registro com os dados mesclados
    UPDATE sync_data 
    SET 
      expenses = merged_expenses,
      projects = merged_projects,
      stock = merged_stock,
      employees = merged_employees,
      deleted_ids = (
        SELECT jsonb_agg(DISTINCT value) 
        FROM jsonb_array_elements_text(
          COALESCE(current_data.deleted_ids, '[]'::jsonb) || COALESCE(p_deleted_ids, '[]'::jsonb)
        ) AS value
      ),
      willbaseRate = GREATEST(p_willbaseRate, current_data.willbaseRate),
      willbonus = GREATEST(p_willbonus, current_data.willbonus),
      last_sync_timestamp = current_timestamp
    WHERE id = p_id
    RETURNING jsonb_build_object(
      'id', id,
      'expenses', expenses,
      'projects', projects,
      'stock', stock,
      'employees', employees,
      'deleted_ids', deleted_ids,
      'willbaseRate', willbaseRate,
      'willbonus', willbonus,
      'last_sync_timestamp', last_sync_timestamp,
      'version', version
    ) INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Atualizar função get_changes_since para incluir deleted_ids
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
      'deleted_ids', '[]'::jsonb,
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
        'deleted_ids', COALESCE(current_data.deleted_ids, '[]'::jsonb),
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

-- 4. Atualizar registros existentes para ter deleted_ids vazio se for NULL
UPDATE sync_data 
SET deleted_ids = '[]'::jsonb 
WHERE deleted_ids IS NULL;

-- 5. Criar função para limpar deleted_ids antigos
CREATE OR REPLACE FUNCTION cleanup_old_deleted_ids()
RETURNS void AS $$
DECLARE
  cutoff_time BIGINT;
BEGIN
  -- Calcular timestamp de 30 dias atrás (em milissegundos)
  cutoff_time := (EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000)::BIGINT;
  
  -- Para cada registro, limpar deleted_ids se for muito antigo
  UPDATE sync_data 
  SET deleted_ids = '[]'::jsonb
  WHERE last_sync_timestamp < cutoff_time 
    AND jsonb_array_length(deleted_ids) > 0;
  
  -- Limpar histórico antigo também (se a tabela existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_history') THEN
    DELETE FROM sync_history 
    WHERE created_at < NOW() - INTERVAL '30 days';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Atualizar função de log para incluir deleted_ids
CREATE OR REPLACE FUNCTION log_sync_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB;
  entity_type TEXT;
  operation TEXT;
BEGIN
  -- Determinar a operação (INSERT, UPDATE, DELETE)
  IF TG_OP = 'INSERT' THEN
    operation := 'INSERT';
    changes := NEW.expenses || NEW.projects || NEW.stock || NEW.employees;
  ELSIF TG_OP = 'UPDATE' THEN
    operation := 'UPDATE';
    
    -- Detectar mudanças em qualquer campo incluindo deleted_ids
    IF (OLD.expenses IS DISTINCT FROM NEW.expenses) OR
       (OLD.projects IS DISTINCT FROM NEW.projects) OR
       (OLD.stock IS DISTINCT FROM NEW.stock) OR
       (OLD.employees IS DISTINCT FROM NEW.employees) OR
       (OLD.deleted_ids IS DISTINCT FROM NEW.deleted_ids) THEN
      
      -- Apenas registrar se a tabela sync_history existir
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_history') THEN
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
          'sync_update', 
          'all',
          jsonb_build_object(
            'expenses', NEW.expenses,
            'projects', NEW.projects,
            'stock', NEW.stock,
            'employees', NEW.employees,
            'deleted_ids', NEW.deleted_ids
          ), 
          NEW.last_sync_timestamp,
          coalesce(current_setting('app.device_id', true), 'unknown')
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Migração de sincronização concluída com sucesso!';
  RAISE NOTICE 'Agora o sistema suporta:';
  RAISE NOTICE '- Sincronização de deletions (deletedIds)';
  RAISE NOTICE '- Merge inteligente sem sobrescrita';
  RAISE NOTICE '- Limpeza automática de deleted_ids antigos';
  RAISE NOTICE '- Logging melhorado de mudanças';
END $$;
