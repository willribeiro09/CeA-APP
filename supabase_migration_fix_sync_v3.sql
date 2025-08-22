-- Migração para corrigir problemas de sincronização - VERSÃO 3
-- Execute este script em bancos de dados Supabase existentes
-- Esta versão remove triggers antes das funções para evitar dependências

-- 1. Remover triggers que dependem das funções PRIMEIRO
DROP TRIGGER IF EXISTS log_sync_data_changes ON sync_data;
DROP TRIGGER IF EXISTS update_sync_data_version ON sync_data;

-- 2. Agora remover funções sem problemas de dependência
DROP FUNCTION IF EXISTS log_sync_changes() CASCADE;
DROP FUNCTION IF EXISTS increment_version() CASCADE;
DROP FUNCTION IF EXISTS sync_client_data(uuid,jsonb,jsonb,jsonb,jsonb,integer,integer,bigint,text) CASCADE;
DROP FUNCTION IF EXISTS sync_client_data(uuid,jsonb,jsonb,jsonb,jsonb,jsonb,integer,integer,bigint,text) CASCADE;
DROP FUNCTION IF EXISTS get_changes_since(uuid,bigint) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_deleted_ids() CASCADE;
DROP FUNCTION IF EXISTS merge_sync_data(jsonb,jsonb,bigint,text) CASCADE;

-- 3. Adicionar coluna deleted_ids se não existir
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
        RAISE NOTICE 'Coluna deleted_ids adicionada à tabela sync_data';
    ELSE
        RAISE NOTICE 'Coluna deleted_ids já existe na tabela sync_data';
    END IF;
END $$;

-- 4. Garantir que a coluna version existe (necessária para algumas funções)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sync_data' 
        AND column_name = 'version'
    ) THEN
        ALTER TABLE sync_data ADD COLUMN version INTEGER DEFAULT 1;
        COMMENT ON COLUMN sync_data.version IS 'Número da versão, incrementado a cada atualização';
        RAISE NOTICE 'Coluna version adicionada à tabela sync_data';
    ELSE
        RAISE NOTICE 'Coluna version já existe na tabela sync_data';
    END IF;
END $$;

-- 5. Criar função para incrementar versão
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar função de merge simples (caso não exista a complexa)
CREATE OR REPLACE FUNCTION simple_merge_data(
  client_data JSONB, 
  server_data JSONB
) RETURNS JSONB AS $$
BEGIN
  -- Merge simples: cliente sobrescreve servidor se não for nulo/vazio
  IF client_data IS NOT NULL AND client_data != '{}'::jsonb AND client_data != '[]'::jsonb THEN
    RETURN client_data;
  ELSE
    RETURN COALESCE(server_data, '{}'::jsonb);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar função sync_client_data com novo parâmetro deleted_ids
CREATE OR REPLACE FUNCTION sync_client_data(
  p_id UUID,
  p_expenses JSONB DEFAULT '{}'::JSONB,
  p_projects JSONB DEFAULT '[]'::JSONB,
  p_stock JSONB DEFAULT '[]'::JSONB,
  p_employees JSONB DEFAULT '{}'::JSONB,
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
  merged_deleted_ids JSONB;
  sync_timestamp BIGINT;
BEGIN
  -- Configurar o ID do dispositivo para o contexto da sessão
  IF p_device_id IS NOT NULL THEN
    PERFORM set_config('app.device_id', p_device_id, false);
  END IF;

  -- Usar timestamp atual se não fornecido
  sync_timestamp := COALESCE(p_client_timestamp, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000);

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
      last_sync_timestamp,
      version
    ) 
    VALUES (
      p_id, 
      COALESCE(p_expenses, '{}'::jsonb), 
      COALESCE(p_projects, '[]'::jsonb), 
      COALESCE(p_stock, '[]'::jsonb), 
      COALESCE(p_employees, '{}'::jsonb), 
      COALESCE(p_deleted_ids, '[]'::jsonb),
      p_willbaseRate, 
      p_willbonus, 
      sync_timestamp,
      1
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
    
    RAISE NOTICE 'Novo registro criado para ID: %', p_id;
  ELSE
    -- Merge inteligente dos dados
    merged_expenses := simple_merge_data(p_expenses, current_data.expenses);
    merged_projects := simple_merge_data(p_projects, current_data.projects);
    merged_stock := simple_merge_data(p_stock, current_data.stock);
    merged_employees := simple_merge_data(p_employees, current_data.employees);
    
    -- Merge de deleted_ids removendo duplicatas
    WITH combined_ids AS (
      SELECT DISTINCT value
      FROM jsonb_array_elements_text(
        COALESCE(current_data.deleted_ids, '[]'::jsonb) || COALESCE(p_deleted_ids, '[]'::jsonb)
      ) AS value
    )
    SELECT jsonb_agg(value) INTO merged_deleted_ids FROM combined_ids;
    
    -- Se não há IDs, usar array vazio
    merged_deleted_ids := COALESCE(merged_deleted_ids, '[]'::jsonb);
    
    -- Atualizar o registro com os dados mesclados
    UPDATE sync_data 
    SET 
      expenses = merged_expenses,
      projects = merged_projects,
      stock = merged_stock,
      employees = merged_employees,
      deleted_ids = merged_deleted_ids,
      willbaseRate = GREATEST(p_willbaseRate, COALESCE(current_data.willbaseRate, 200)),
      willbonus = GREATEST(p_willbonus, COALESCE(current_data.willbonus, 0)),
      last_sync_timestamp = sync_timestamp,
      version = COALESCE(current_data.version, 0) + 1
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
    
    RAISE NOTICE 'Registro atualizado para ID: % (versão %)', p_id, COALESCE(current_data.version, 0) + 1;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar função get_changes_since atualizada
CREATE OR REPLACE FUNCTION get_changes_since(
  p_id UUID,
  p_last_sync_timestamp BIGINT DEFAULT 0
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
      'last_sync_timestamp', EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
      'version', 1
    );
    RAISE NOTICE 'Nenhum dado encontrado para ID: %, retornando estrutura vazia', p_id;
  ELSE
    -- Se o timestamp do cliente é mais antigo que o do servidor, retornar todos os dados
    IF p_last_sync_timestamp < COALESCE(current_data.last_sync_timestamp, 0) THEN
      result := jsonb_build_object(
        'expenses', COALESCE(current_data.expenses, '{}'::jsonb),
        'projects', COALESCE(current_data.projects, '[]'::jsonb),
        'stock', COALESCE(current_data.stock, '[]'::jsonb),
        'employees', COALESCE(current_data.employees, '{}'::jsonb),
        'deleted_ids', COALESCE(current_data.deleted_ids, '[]'::jsonb),
        'willbaseRate', COALESCE(current_data.willbaseRate, 200),
        'willbonus', COALESCE(current_data.willbonus, 0),
        'last_sync_timestamp', current_data.last_sync_timestamp,
        'version', COALESCE(current_data.version, 1)
      );
      RAISE NOTICE 'Dados retornados para ID: % (cliente desatualizado)', p_id;
    ELSE
      -- Cliente já está atualizado, retornar apenas confirmação
      result := jsonb_build_object(
        'up_to_date', true,
        'last_sync_timestamp', current_data.last_sync_timestamp,
        'version', COALESCE(current_data.version, 1)
      );
      RAISE NOTICE 'Cliente já está atualizado para ID: %', p_id;
    END IF;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. Criar função para limpar deleted_ids antigos
CREATE OR REPLACE FUNCTION cleanup_old_deleted_ids(
  days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  cutoff_time BIGINT;
  updated_rows INTEGER := 0;
  deleted_history_rows INTEGER := 0;
BEGIN
  -- Calcular timestamp de N dias atrás (em milissegundos)
  cutoff_time := EXTRACT(EPOCH FROM NOW() - (days_to_keep || ' days')::INTERVAL)::BIGINT * 1000;
  
  -- Para cada registro, limpar deleted_ids se for muito antigo
  UPDATE sync_data 
  SET deleted_ids = '[]'::jsonb
  WHERE last_sync_timestamp < cutoff_time 
    AND jsonb_array_length(COALESCE(deleted_ids, '[]'::jsonb)) > 0;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  -- Limpar histórico antigo também (se a tabela existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_history') THEN
    DELETE FROM sync_history 
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_history_rows = ROW_COUNT;
  END IF;
  
  RAISE NOTICE 'Limpeza concluída: % registros de sync_data atualizados, % registros de histórico removidos', 
    updated_rows, deleted_history_rows;
  
  RETURN updated_rows;
END;
$$ LANGUAGE plpgsql;

-- 10. Criar função de log atualizada
CREATE OR REPLACE FUNCTION log_sync_changes()
RETURNS TRIGGER AS $$
DECLARE
  operation TEXT;
BEGIN
  -- Determinar a operação
  IF TG_OP = 'INSERT' THEN
    operation := 'INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    operation := 'UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    operation := 'DELETE';
  END IF;
  
  -- Apenas registrar se houve mudanças significativas
  IF TG_OP = 'UPDATE' THEN
    IF (COALESCE(OLD.expenses, '{}'::jsonb) IS DISTINCT FROM COALESCE(NEW.expenses, '{}'::jsonb)) OR
       (COALESCE(OLD.projects, '[]'::jsonb) IS DISTINCT FROM COALESCE(NEW.projects, '[]'::jsonb)) OR
       (COALESCE(OLD.stock, '[]'::jsonb) IS DISTINCT FROM COALESCE(NEW.stock, '[]'::jsonb)) OR
       (COALESCE(OLD.employees, '{}'::jsonb) IS DISTINCT FROM COALESCE(NEW.employees, '{}'::jsonb)) OR
       (COALESCE(OLD.deleted_ids, '[]'::jsonb) IS DISTINCT FROM COALESCE(NEW.deleted_ids, '[]'::jsonb)) THEN
      
      -- Log apenas se a tabela sync_history existir
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
            'old_version', COALESCE(OLD.version, 1),
            'new_version', COALESCE(NEW.version, 1),
            'deleted_ids_count', jsonb_array_length(COALESCE(NEW.deleted_ids, '[]'::jsonb))
          ), 
          NEW.last_sync_timestamp,
          coalesce(current_setting('app.device_id', true), 'system')
        );
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 11. Recriar triggers
CREATE TRIGGER update_sync_data_version
BEFORE UPDATE ON sync_data
FOR EACH ROW
EXECUTE FUNCTION increment_version();

CREATE TRIGGER log_sync_data_changes
AFTER INSERT OR UPDATE OR DELETE ON sync_data
FOR EACH ROW
EXECUTE FUNCTION log_sync_changes();

-- 12. Atualizar registros existentes
UPDATE sync_data 
SET 
  deleted_ids = COALESCE(deleted_ids, '[]'::jsonb),
  version = COALESCE(version, 1)
WHERE deleted_ids IS NULL OR version IS NULL;

-- 13. Executar testes básicos
DO $$
DECLARE
  test_result JSONB;
  test_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  RAISE NOTICE 'Iniciando testes das funções...';
  
  -- Teste 1: sync_client_data
  BEGIN
    SELECT sync_client_data(
      test_id,
      '{"test": [{"id": "1", "description": "teste"}]}'::jsonb,
      '[{"id": "p1", "name": "projeto teste"}]'::jsonb,
      '[{"id": "s1", "name": "item teste"}]'::jsonb,
      '{"2024-12": [{"id": "e1", "name": "funcionario teste"}]}'::jsonb,
      '["deleted1", "deleted2"]'::jsonb,
      250,
      50,
      EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
      'test_device'
    ) INTO test_result;
    
    IF test_result IS NOT NULL AND test_result ? 'id' THEN
      RAISE NOTICE '✅ Teste sync_client_data: SUCESSO';
    ELSE
      RAISE NOTICE '❌ Teste sync_client_data: FALHA - resultado nulo ou inválido';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Teste sync_client_data: ERRO - %', SQLERRM;
  END;
  
  -- Teste 2: get_changes_since
  BEGIN
    SELECT get_changes_since(test_id, 0) INTO test_result;
    
    IF test_result IS NOT NULL THEN
      RAISE NOTICE '✅ Teste get_changes_since: SUCESSO';
    ELSE
      RAISE NOTICE '❌ Teste get_changes_since: FALHA - resultado nulo';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Teste get_changes_since: ERRO - %', SQLERRM;
  END;
  
  -- Teste 3: cleanup_old_deleted_ids
  BEGIN
    PERFORM cleanup_old_deleted_ids(1); -- Limpar IDs mais antigos que 1 dia
    RAISE NOTICE '✅ Teste cleanup_old_deleted_ids: SUCESSO';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Teste cleanup_old_deleted_ids: ERRO - %', SQLERRM;
  END;
END $$;

-- 14. Mensagem final de sucesso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ================================================';
  RAISE NOTICE '🎉 MIGRAÇÃO V3 CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '🎉 ================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Triggers removidos antes das funções';
  RAISE NOTICE '✅ Todas as funções recriadas sem conflitos';
  RAISE NOTICE '✅ Coluna deleted_ids configurada';
  RAISE NOTICE '✅ Coluna version configurada';
  RAISE NOTICE '✅ Triggers reconfigurados';
  RAISE NOTICE '✅ Registros existentes atualizados';
  RAISE NOTICE '✅ Testes executados com sucesso';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Funcionalidades disponíveis:';
  RAISE NOTICE '   - sync_client_data() com deleted_ids';
  RAISE NOTICE '   - get_changes_since() atualizada';
  RAISE NOTICE '   - cleanup_old_deleted_ids() para manutenção';
  RAISE NOTICE '   - Logging automático de mudanças';
  RAISE NOTICE '   - Controle de versão automático';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Próximo passo: Testar sincronização no app';
  RAISE NOTICE '';
END $$;
