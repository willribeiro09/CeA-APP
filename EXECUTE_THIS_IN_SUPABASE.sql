-- =====================================================================
-- 🚀 EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR
-- =====================================================================
-- Cole este script completo no SQL Editor do Supabase e execute
-- =====================================================================

-- 1. VERIFICAR ESTADO ATUAL
SELECT 
    'ESTADO ANTES DA MIGRAÇÃO' as status,
    id,
    version,
    jsonb_array_length(deleted_ids) as deleted_count,
    device_last_seen,
    to_timestamp(last_sync_timestamp/1000) as last_sync
FROM sync_data 
ORDER BY last_sync_timestamp DESC;

-- 2. FAZER BACKUP DOS DADOS ATUAIS
CREATE TABLE IF NOT EXISTS sync_data_migration_backup AS 
SELECT * FROM sync_data;

-- 3. MERGE DOS REGISTROS DUPLICADOS
DO $$
DECLARE
    primary_record RECORD;
    secondary_record RECORD;
    merged_expenses JSONB;
    merged_employees JSONB;
    merged_deleted_ids JSONB;
    final_willbonus INTEGER;
BEGIN
    RAISE NOTICE '🔄 Iniciando merge dos registros duplicados...';
    
    -- Buscar registro principal (mais recente)
    SELECT * INTO primary_record 
    FROM sync_data 
    WHERE id = '00000000-0000-0000-0000-000000000000'
    LIMIT 1;
    
    -- Buscar registro secundário
    SELECT * INTO secondary_record 
    FROM sync_data 
    WHERE id = '1f51760f-c0d7-463e-b328-2be1d85f4f70'
    LIMIT 1;
    
    IF primary_record.id IS NULL THEN
        RAISE EXCEPTION 'Registro principal não encontrado!';
    END IF;
    
    RAISE NOTICE '✅ Registro principal encontrado: versão %, última sync %', 
        primary_record.version, 
        to_timestamp(primary_record.last_sync_timestamp/1000);
    
    -- Merge expenses: combinar objetos
    merged_expenses := COALESCE(primary_record.expenses, '{}'::jsonb);
    IF secondary_record.id IS NOT NULL THEN
        merged_expenses := merged_expenses || COALESCE(secondary_record.expenses, '{}'::jsonb);
        RAISE NOTICE '📊 Merged expenses de ambos registros';
    END IF;
    
    -- Merge employees: combinar objetos
    merged_employees := COALESCE(primary_record.employees, '{}'::jsonb);
    IF secondary_record.id IS NOT NULL THEN
        merged_employees := merged_employees || COALESCE(secondary_record.employees, '{}'::jsonb);
        RAISE NOTICE '👥 Merged employees de ambos registros';
    END IF;
    
    -- Merge deleted_ids: combinar e remover duplicatas
    WITH combined_deleted AS (
        SELECT DISTINCT value
        FROM (
            SELECT jsonb_array_elements_text(COALESCE(primary_record.deleted_ids, '[]'::jsonb)) as value
            UNION ALL
            SELECT jsonb_array_elements_text(COALESCE(secondary_record.deleted_ids, '[]'::jsonb)) as value
        ) t
        WHERE value IS NOT NULL AND value != ''
    )
    SELECT jsonb_agg(value) INTO merged_deleted_ids FROM combined_deleted;
    
    -- Usar valor mais alto para Will bonus
    final_willbonus := GREATEST(
        COALESCE(primary_record.willbonus, 0),
        COALESCE(secondary_record.willbonus, 0)
    );
    
    -- Atualizar registro principal com dados merged
    UPDATE sync_data SET
        expenses = merged_expenses,
        employees = merged_employees,
        deleted_ids = merged_deleted_ids,
        willbonus = final_willbonus,
        version = primary_record.version + 1,
        last_sync_timestamp = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
        updated_at = NOW()
    WHERE id = '00000000-0000-0000-0000-000000000000';
    
    RAISE NOTICE '✅ Dados merged no registro principal com sucesso!';
    
    -- Remover registro secundário
    IF secondary_record.id IS NOT NULL THEN
        DELETE FROM sync_data WHERE id = '1f51760f-c0d7-463e-b328-2be1d85f4f70';
        RAISE NOTICE '🗑️ Registro secundário removido';
    END IF;
    
    RAISE NOTICE '🎉 MERGE CONCLUÍDO COM SUCESSO!';
    
END $$;

-- 4. CRIAR FUNÇÃO MELHORADA DE SINCRONIZAÇÃO
CREATE OR REPLACE FUNCTION intelligent_sync_client_data(
    p_id UUID,
    p_expenses JSONB,
    p_projects JSONB,
    p_stock JSONB,
    p_employees JSONB,
    p_deleted_ids JSONB,
    p_willbaserate INTEGER,
    p_willbonus INTEGER,
    p_client_timestamp BIGINT,
    p_device_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    current_data RECORD;
    sync_timestamp BIGINT;
    new_version INTEGER;
    result JSONB;
    merged_expenses JSONB;
    merged_projects JSONB;
    merged_stock JSONB;
    merged_employees JSONB;
    merged_deleted_ids JSONB;
    existing_count INTEGER;
BEGIN
    -- Garantir que sempre use o UUID padrão
    p_id := '00000000-0000-0000-0000-000000000000';
    
    -- Verificar se existe mais de um registro
    SELECT COUNT(*) INTO existing_count FROM sync_data;
    
    IF existing_count > 1 THEN
        RAISE NOTICE 'AVISO: Múltiplos registros detectados (%). Usando apenas registro principal.', existing_count;
    END IF;
    
    sync_timestamp := COALESCE(p_client_timestamp, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000);
    
    -- Buscar dados existentes
    SELECT * INTO current_data FROM sync_data WHERE id = p_id;
    
    IF NOT FOUND THEN
        -- Criar novo registro
        INSERT INTO sync_data (
            id, expenses, projects, stock, employees, deleted_ids,
            willbaserate, willbonus, last_sync_timestamp, version, device_last_seen
        ) VALUES (
            p_id, p_expenses, p_projects, p_stock, p_employees, p_deleted_ids,
            p_willbaserate, p_willbonus, sync_timestamp, 1, p_device_id
        );
        
        new_version := 1;
    ELSE
        -- Merge inteligente preservando dados existentes
        new_version := current_data.version + 1;
        
        -- Merge expenses: combinar objetos
        merged_expenses := COALESCE(current_data.expenses, '{}'::jsonb) || COALESCE(p_expenses, '{}'::jsonb);
        
        -- Merge projects: manter IDs únicos, cliente sobrescreve servidor
        WITH combined_projects AS (
            SELECT DISTINCT ON (value->>'id') value, 
                   CASE WHEN source = 'client' THEN 1 ELSE 0 END as priority
            FROM (
                SELECT jsonb_array_elements(COALESCE(current_data.projects, '[]'::jsonb)) as value, 'server' as source
                UNION ALL
                SELECT jsonb_array_elements(COALESCE(p_projects, '[]'::jsonb)) as value, 'client' as source
            ) t
            WHERE value->>'id' IS NOT NULL
            ORDER BY value->>'id', priority DESC
        )
        SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) INTO merged_projects FROM combined_projects;
        
        -- Merge stock: mesma lógica que projects
        WITH combined_stock AS (
            SELECT DISTINCT ON (value->>'id') value,
                   CASE WHEN source = 'client' THEN 1 ELSE 0 END as priority
            FROM (
                SELECT jsonb_array_elements(COALESCE(current_data.stock, '[]'::jsonb)) as value, 'server' as source
                UNION ALL
                SELECT jsonb_array_elements(COALESCE(p_stock, '[]'::jsonb)) as value, 'client' as source
            ) t
            WHERE value->>'id' IS NOT NULL
            ORDER BY value->>'id', priority DESC
        )
        SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) INTO merged_stock FROM combined_stock;
        
        -- Merge employees: combinar objetos
        merged_employees := COALESCE(current_data.employees, '{}'::jsonb) || COALESCE(p_employees, '{}'::jsonb);
        
        -- Merge deleted_ids: combinar e remover duplicatas
        WITH combined_deleted AS (
            SELECT DISTINCT value
            FROM (
                SELECT jsonb_array_elements_text(COALESCE(current_data.deleted_ids, '[]'::jsonb)) as value
                UNION ALL
                SELECT jsonb_array_elements_text(COALESCE(p_deleted_ids, '[]'::jsonb)) as value
            ) t
            WHERE value IS NOT NULL AND value != ''
        )
        SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) INTO merged_deleted_ids FROM combined_deleted;
        
        -- Atualizar com merge
        UPDATE sync_data SET
            expenses = merged_expenses,
            projects = merged_projects,
            stock = merged_stock,
            employees = merged_employees,
            deleted_ids = merged_deleted_ids,
            willbaserate = GREATEST(current_data.willbaserate, p_willbaserate),
            willbonus = GREATEST(current_data.willbonus, p_willbonus),
            last_sync_timestamp = sync_timestamp,
            version = new_version,
            device_last_seen = COALESCE(p_device_id, current_data.device_last_seen),
            updated_at = NOW()
        WHERE id = p_id;
    END IF;
    
    -- Retornar dados atualizados
    SELECT jsonb_build_object(
        'id', id,
        'expenses', expenses,
        'projects', projects,
        'stock', stock,
        'employees', employees,
        'deleted_ids', deleted_ids,
        'willbaserate', willbaserate,
        'willbonus', willbonus,
        'last_sync_timestamp', last_sync_timestamp,
        'version', version,
        'needs_sync', false,
        'sync_status', 'success'
    ) INTO result FROM sync_data WHERE id = p_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. CRIAR FUNÇÃO DE LIMPEZA AUTOMÁTICA
CREATE OR REPLACE FUNCTION auto_cleanup_deleted_ids()
RETURNS void AS $$
BEGIN
    -- Limpar IDs deletados se houver mais de 10
    UPDATE sync_data 
    SET deleted_ids = (
        SELECT COALESCE(jsonb_agg(id_elem), '[]'::jsonb)
        FROM (
            SELECT id_elem 
            FROM jsonb_array_elements_text(deleted_ids) as id_elem
            ORDER BY id_elem DESC
            LIMIT 5  -- Manter apenas os 5 mais recentes
        ) t
    )
    WHERE jsonb_array_length(deleted_ids) > 10;
    
    RAISE NOTICE '🧹 Limpeza automática de deleted_ids executada';
END;
$$ LANGUAGE plpgsql;

-- 6. CRIAR FUNÇÃO DE VERIFICAÇÃO DE INTEGRIDADE
CREATE OR REPLACE FUNCTION verify_sync_integrity()
RETURNS jsonb AS $$
DECLARE
    total_records INTEGER;
    main_record RECORD;
    result JSONB;
BEGIN
    SELECT COUNT(*) INTO total_records FROM sync_data;
    
    SELECT * INTO main_record 
    FROM sync_data 
    WHERE id = '00000000-0000-0000-0000-000000000000';
    
    result := jsonb_build_object(
        'total_records', total_records,
        'has_main_record', main_record.id IS NOT NULL,
        'main_version', COALESCE(main_record.version, 0),
        'deleted_ids_count', COALESCE(jsonb_array_length(main_record.deleted_ids), 0),
        'last_sync', CASE 
            WHEN main_record.last_sync_timestamp IS NOT NULL 
            THEN to_timestamp(main_record.last_sync_timestamp/1000)
            ELSE NULL 
        END,
        'device_last_seen', main_record.device_last_seen,
        'status', CASE 
            WHEN total_records = 1 AND main_record.id IS NOT NULL THEN 'OK'
            WHEN total_records > 1 THEN 'MULTIPLE_RECORDS'
            WHEN main_record.id IS NULL THEN 'NO_MAIN_RECORD'
            ELSE 'UNKNOWN'
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. EXECUTAR LIMPEZA INICIAL
SELECT auto_cleanup_deleted_ids();

-- 8. VERIFICAÇÃO FINAL
SELECT verify_sync_integrity() as migration_result;

-- 9. MOSTRAR ESTADO FINAL
SELECT 
    '🎉 MIGRAÇÃO CONCLUÍDA' as status,
    id,
    version,
    jsonb_array_length(deleted_ids) as deleted_count,
    device_last_seen,
    to_timestamp(last_sync_timestamp/1000) as last_sync
FROM sync_data 
ORDER BY last_sync_timestamp DESC;
