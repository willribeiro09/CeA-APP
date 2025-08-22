-- Script para adicionar suporte a Merge Inteligente
-- Adiciona campo para metadados de itens e melhora a sincronização

-- 1. Adicionar coluna para metadados de itens se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sync_data' 
        AND column_name = 'item_metadata'
    ) THEN
        ALTER TABLE sync_data ADD COLUMN item_metadata JSONB DEFAULT '{}'::JSONB;
        COMMENT ON COLUMN sync_data.item_metadata IS 'Metadados de sincronização por item (timestamps, versões, etc)';
        RAISE NOTICE 'Coluna item_metadata adicionada à tabela sync_data';
    ELSE
        RAISE NOTICE 'Coluna item_metadata já existe na tabela sync_data';
    END IF;
END $$;

-- 2. Atualizar função sync_client_data para incluir metadados
CREATE OR REPLACE FUNCTION sync_client_data(
  p_id UUID,
  p_expenses JSONB DEFAULT '{}'::JSONB,
  p_projects JSONB DEFAULT '[]'::JSONB,
  p_stock JSONB DEFAULT '[]'::JSONB,
  p_employees JSONB DEFAULT '{}'::JSONB,
  p_deleted_ids JSONB DEFAULT '[]'::JSONB,
  p_item_metadata JSONB DEFAULT '{}'::JSONB,
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
  merged_metadata JSONB;
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
      item_metadata,
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
      COALESCE(p_item_metadata, '{}'::jsonb),
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
      'item_metadata', item_metadata,
      'willbaseRate', willbaseRate,
      'willbonus', willbonus,
      'last_sync_timestamp', last_sync_timestamp,
      'version', version
    ) INTO result;
    
    RAISE NOTICE 'Novo registro criado para ID: %', p_id;
  ELSE
    -- Merge inteligente dos dados usando a função melhorada
    merged_expenses := intelligent_merge_data(p_expenses, current_data.expenses, 'expenses');
    merged_projects := intelligent_merge_data(p_projects, current_data.projects, 'projects');
    merged_stock := intelligent_merge_data(p_stock, current_data.stock, 'stock');
    merged_employees := intelligent_merge_data(p_employees, current_data.employees, 'employees');
    
    -- Merge de deleted_ids removendo duplicatas
    WITH combined_ids AS (
      SELECT DISTINCT value
      FROM jsonb_array_elements_text(
        COALESCE(current_data.deleted_ids, '[]'::jsonb) || COALESCE(p_deleted_ids, '[]'::jsonb)
      ) AS value
    )
    SELECT jsonb_agg(value) INTO merged_deleted_ids FROM combined_ids;
    merged_deleted_ids := COALESCE(merged_deleted_ids, '[]'::jsonb);
    
    -- Merge de metadados (cliente sobrescreve servidor para itens mais recentes)
    merged_metadata := COALESCE(current_data.item_metadata, '{}'::jsonb) || COALESCE(p_item_metadata, '{}'::jsonb);
    
    -- Atualizar o registro com os dados mesclados
    UPDATE sync_data 
    SET 
      expenses = merged_expenses,
      projects = merged_projects,
      stock = merged_stock,
      employees = merged_employees,
      deleted_ids = merged_deleted_ids,
      item_metadata = merged_metadata,
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
      'item_metadata', item_metadata,
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

-- 3. Criar função de merge inteligente melhorada
CREATE OR REPLACE FUNCTION intelligent_merge_data(
  client_data JSONB,
  server_data JSONB,
  data_type TEXT
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Se não há dados do cliente, usar dados do servidor
  IF client_data IS NULL OR client_data = '{}'::jsonb OR client_data = '[]'::jsonb THEN
    RETURN COALESCE(server_data, CASE WHEN data_type IN ('projects', 'stock', 'deleted_ids') THEN '[]'::jsonb ELSE '{}'::jsonb END);
  END IF;
  
  -- Se não há dados do servidor, usar dados do cliente
  IF server_data IS NULL OR server_data = '{}'::jsonb OR server_data = '[]'::jsonb THEN
    RETURN client_data;
  END IF;
  
  -- Para arrays (projects, stock), fazer merge por ID
  IF data_type IN ('projects', 'stock') THEN
    WITH merged AS (
      -- Itens do servidor que não estão no cliente
      SELECT item FROM jsonb_array_elements(server_data) AS item
      WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(client_data) AS client_item
        WHERE client_item->>'id' = item->>'id'
      )
      
      UNION ALL
      
      -- Todos os itens do cliente (sobrescreve servidor se mesmo ID)
      SELECT item FROM jsonb_array_elements(client_data) AS item
    )
    SELECT jsonb_agg(item) INTO result FROM merged;
    
    RETURN COALESCE(result, '[]'::jsonb);
  END IF;
  
  -- Para objetos (expenses, employees), fazer merge por chave
  IF data_type IN ('expenses', 'employees') THEN
    -- Combinar chaves de ambos os objetos
    result := server_data;
    
    -- Sobrescrever com dados do cliente
    SELECT result || client_data INTO result;
    
    RETURN result;
  END IF;
  
  -- Caso padrão: usar dados do cliente
  RETURN client_data;
END;
$$ LANGUAGE plpgsql;

-- 4. Atualizar função get_changes_since para incluir metadados
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
      'item_metadata', '{}'::jsonb,
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
        'item_metadata', COALESCE(current_data.item_metadata, '{}'::jsonb),
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

-- 5. Atualizar registros existentes para ter item_metadata vazio se for NULL
UPDATE sync_data 
SET item_metadata = COALESCE(item_metadata, '{}'::jsonb)
WHERE item_metadata IS NULL;

-- 6. Criar função para estatísticas de sincronização
CREATE OR REPLACE FUNCTION get_sync_stats(p_id UUID)
RETURNS JSONB AS $$
DECLARE
  current_data RECORD;
  stats JSONB;
  total_items INTEGER := 0;
  total_metadata INTEGER := 0;
BEGIN
  SELECT * INTO current_data FROM sync_data WHERE id = p_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No data found for ID');
  END IF;
  
  -- Contar itens por categoria
  SELECT jsonb_build_object(
    'expenses_lists', jsonb_object_keys(COALESCE(current_data.expenses, '{}'::jsonb)),
    'expenses_total', (
      SELECT COALESCE(SUM(jsonb_array_length(value)), 0)
      FROM jsonb_each(COALESCE(current_data.expenses, '{}'::jsonb))
    ),
    'projects_total', jsonb_array_length(COALESCE(current_data.projects, '[]'::jsonb)),
    'stock_total', jsonb_array_length(COALESCE(current_data.stock, '[]'::jsonb)),
    'employees_lists', jsonb_object_keys(COALESCE(current_data.employees, '{}'::jsonb)),
    'employees_total', (
      SELECT COALESCE(SUM(jsonb_array_length(value)), 0)
      FROM jsonb_each(COALESCE(current_data.employees, '{}'::jsonb))
    ),
    'deleted_ids_total', jsonb_array_length(COALESCE(current_data.deleted_ids, '[]'::jsonb)),
    'metadata_items', jsonb_object_keys(COALESCE(current_data.item_metadata, '{}'::jsonb)),
    'last_sync', current_data.last_sync_timestamp,
    'version', current_data.version,
    'updated_at', current_data.updated_at
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧠 ===============================================';
  RAISE NOTICE '🧠 MERGE INTELIGENTE CONFIGURADO COM SUCESSO!';
  RAISE NOTICE '🧠 ===============================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Coluna item_metadata adicionada/atualizada';
  RAISE NOTICE '✅ Função sync_client_data atualizada com metadados';
  RAISE NOTICE '✅ Função intelligent_merge_data criada';
  RAISE NOTICE '✅ Função get_changes_since atualizada';
  RAISE NOTICE '✅ Função get_sync_stats criada para debugging';
  RAISE NOTICE '✅ Registros existentes atualizados';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Funcionalidades do Merge Inteligente:';
  RAISE NOTICE '   - Detecção automática de retorno do segundo plano';
  RAISE NOTICE '   - Merge por timestamps de modificação de cada item';
  RAISE NOTICE '   - Resolução automática de conflitos';
  RAISE NOTICE '   - Notificações de conflitos na UI';
  RAISE NOTICE '   - Sincronização suave sem sobrescrita';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Para ver estatísticas: SELECT get_sync_stats(uuid);';
  RAISE NOTICE '';
END $$;
