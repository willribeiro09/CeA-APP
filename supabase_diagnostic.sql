-- Função para diagnosticar problemas de sincronização
CREATE OR REPLACE FUNCTION diagnose_sync_issues(
  p_check_timestamps BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  sync_data_exists BOOLEAN;
  sync_history_exists BOOLEAN;
  sync_triggers_exist BOOLEAN;
  sync_table_columns TEXT[];
  sync_history_columns TEXT[];
  sync_records_count INTEGER;
  sync_history_count INTEGER;
  sync_functions_list TEXT[];
  sync_id_values TEXT[];
BEGIN
  -- Verificar se as tabelas de sincronização existem
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sync_data'
  ) INTO sync_data_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sync_history'
  ) INTO sync_history_exists;
  
  -- Verificar se os triggers de sincronização estão ativos
  SELECT EXISTS (
    SELECT FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND event_object_table = 'sync_data'
    AND trigger_name = 'log_sync_data_changes'
  ) INTO sync_triggers_exist;
  
  -- Obter nomes das colunas da tabela sync_data
  SELECT array_agg(column_name) 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'sync_data'
  INTO sync_table_columns;
  
  -- Obter nomes das colunas da tabela sync_history
  SELECT array_agg(column_name) 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'sync_history'
  INTO sync_history_columns;
  
  -- Contar registros na tabela sync_data
  IF sync_data_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM sync_data' INTO sync_records_count;
    
    -- Obter valores únicos de id da tabela sync_data
    EXECUTE 'SELECT array_agg(id::text) FROM sync_data' INTO sync_id_values;
  ELSE
    sync_records_count := 0;
    sync_id_values := '{}';
  END IF;
  
  -- Contar registros na tabela sync_history
  IF sync_history_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM sync_history' INTO sync_history_count;
  ELSE
    sync_history_count := 0;
  END IF;
  
  -- Listar funções de sincronização
  SELECT array_agg(routine_name) 
  FROM information_schema.routines 
  WHERE routine_schema = 'public'
  AND routine_name IN ('sync_client_data', 'get_changes_since', 'merge_sync_data', 'log_sync_changes', 'increment_version')
  INTO sync_functions_list;
  
  -- Construir resultado
  result := jsonb_build_object(
    'tables', jsonb_build_object(
      'sync_data_exists', sync_data_exists,
      'sync_history_exists', sync_history_exists,
      'sync_data_columns', sync_table_columns,
      'sync_history_columns', sync_history_columns,
      'sync_records_count', sync_records_count,
      'sync_history_count', sync_history_count,
      'sync_ids', sync_id_values
    ),
    'triggers', jsonb_build_object(
      'sync_triggers_exist', sync_triggers_exist
    ),
    'functions', jsonb_build_object(
      'sync_functions', sync_functions_list
    )
  );
  
  -- Verificar possíveis incompatibilidades nos nomes de colunas
  IF sync_data_exists AND p_check_timestamps THEN
    result := result || jsonb_build_object(
      'column_checks', jsonb_build_object(
        'has_camelcase', 
        (SELECT EXISTS(
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'sync_data'
          AND column_name = 'willBaseRate'
        )),
        'has_lowercase', 
        (SELECT EXISTS(
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'sync_data'
          AND column_name = 'willbaserate'
        )),
        'has_lastsync', 
        (SELECT EXISTS(
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'sync_data'
          AND column_name = 'lastsync'
        )),
        'has_last_sync_timestamp', 
        (SELECT EXISTS(
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'sync_data'
          AND column_name = 'last_sync_timestamp'
        ))
      )
    );
    
    -- Verificar tipos incompatíveis
    result := result || jsonb_build_object(
      'type_checks', jsonb_build_object(
        'expenses_type', 
        (SELECT data_type FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'sync_data'
         AND column_name = 'expenses'),
        'projects_type', 
        (SELECT data_type FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'sync_data'
         AND column_name = 'projects'),
        'willbaserate_type', 
        (SELECT data_type FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'sync_data'
         AND column_name = 'willbaserate'),
        'last_sync_type', 
        (SELECT data_type FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'sync_data'
         AND column_name = 'last_sync_timestamp')
      )
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql; 