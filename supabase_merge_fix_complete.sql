-- =====================================================================
-- SCRIPT DE CORREÇÃO COMPLETA DO SISTEMA DE SINCRONIZAÇÃO
-- =====================================================================
-- Este script resolve os problemas de múltiplos registros e melhora
-- o sistema de merge inteligente existente
-- =====================================================================

-- 1. BACKUP DOS DADOS ATUAIS
CREATE TABLE IF NOT EXISTS sync_data_migration_backup AS 
SELECT * FROM sync_data;

-- 2. ANÁLISE DOS REGISTROS EXISTENTES
DO $$
DECLARE
    primary_record RECORD;
    secondary_record RECORD;
    merged_expenses JSONB;
    merged_projects JSONB;
    merged_stock JSONB;
    merged_employees JSONB;
    merged_deleted_ids JSONB;
    final_willbaserate INTEGER;
    final_willbonus INTEGER;
BEGIN
    RAISE NOTICE 'Iniciando migração e merge de dados...';
    
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
    
    RAISE NOTICE 'Registro principal encontrado: versão %, última sync %', 
        primary_record.version, 
        to_timestamp(primary_record.last_sync_timestamp/1000);
    
    -- 3. MERGE INTELIGENTE DOS DADOS
    
    -- Merge expenses: combinar objetos, mantendo tudo
    merged_expenses := COALESCE(primary_record.expenses, '{}'::jsonb);
    IF secondary_record.id IS NOT NULL THEN
        merged_expenses := merged_expenses || COALESCE(secondary_record.expenses, '{}'::jsonb);
    END IF;
    
    -- Merge projects: combinar arrays por ID único
    merged_projects := COALESCE(primary_record.projects, '[]'::jsonb);
    IF secondary_record.id IS NOT NULL THEN
        WITH combined_projects AS (
            SELECT DISTINCT ON (value->>'id') value
            FROM (
                SELECT jsonb_array_elements(COALESCE(primary_record.projects, '[]'::jsonb)) as value
                UNION ALL
                SELECT jsonb_array_elements(COALESCE(secondary_record.projects, '[]'::jsonb)) as value
            ) t
            WHERE value->>'id' IS NOT NULL
        )
        SELECT jsonb_agg(value) INTO merged_projects FROM combined_projects;
    END IF;
    
    -- Merge stock: combinar arrays por ID único
    merged_stock := COALESCE(primary_record.stock, '[]'::jsonb);
    IF secondary_record.id IS NOT NULL THEN
        WITH combined_stock AS (
            SELECT DISTINCT ON (value->>'id') value
            FROM (
                SELECT jsonb_array_elements(COALESCE(primary_record.stock, '[]'::jsonb)) as value
                UNION ALL
                SELECT jsonb_array_elements(COALESCE(secondary_record.stock, '[]'::jsonb)) as value
            ) t
            WHERE value->>'id' IS NOT NULL
        )
        SELECT jsonb_agg(value) INTO merged_stock FROM combined_stock;
    END IF;
    
    -- Merge employees: combinar objetos
    merged_employees := COALESCE(primary_record.employees, '{}'::jsonb);
    IF secondary_record.id IS NOT NULL THEN
        merged_employees := merged_employees || COALESCE(secondary_record.employees, '{}'::jsonb);
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
    
    -- Usar valores mais altos para Will settings
    final_willbaserate := GREATEST(
        COALESCE(primary_record.willbaserate, 200),
        COALESCE(secondary_record.willbaserate, 200)
    );
    
    final_willbonus := GREATEST(
        COALESCE(primary_record.willbonus, 0),
        COALESCE(secondary_record.willbonus, 0)
    );
    
    -- 4. ATUALIZAR REGISTRO PRINCIPAL COM DADOS MERGED
    UPDATE sync_data SET
        expenses = merged_expenses,
        projects = merged_projects,
        stock = merged_stock,
        employees = merged_employees,
        deleted_ids = merged_deleted_ids,
        willbaserate = final_willbaserate,
        willbonus = final_willbonus,
        version = primary_record.version + 1,
        last_sync_timestamp = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
        updated_at = NOW()
    WHERE id = '00000000-0000-0000-0000-000000000000';
    
    RAISE NOTICE 'Dados merged no registro principal com sucesso!';
    
    -- 5. REMOVER REGISTRO SECUNDÁRIO
    IF secondary_record.id IS NOT NULL THEN
        DELETE FROM sync_data WHERE id = '1f51760f-c0d7-463e-b328-2be1d85f4f70';
        RAISE NOTICE 'Registro secundário removido';
    END IF;
    
    -- 6. LIMPAR IDS DELETADOS ANTIGOS (mais de 7 dias)
    WITH old_sync_threshold AS (
        SELECT (EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000)::BIGINT as threshold
    )
    UPDATE sync_data 
    SET deleted_ids = '[]'::jsonb
    FROM old_sync_threshold
    WHERE last_sync_timestamp < old_sync_threshold.threshold;
    
    RAISE NOTICE 'IDs deletados antigos limpos';
    
END $$;

-- 7. MELHORAR FUNÇÃO DE MERGE PARA EVITAR MÚLTIPLOS REGISTROS
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
    
    -- Verificar se existe mais de um registro (problema de sincronização)
    SELECT COUNT(*) INTO existing_count FROM sync_data;
    
    IF existing_count > 1 THEN
        RAISE NOTICE 'AVISO: Múltiplos registros detectados (%). Usando apenas registro principal.', existing_count;
    END IF;
    
    sync_timestamp := COALESCE(p_client_timestamp, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000);
    
    -- Buscar dados existentes (sempre o registro principal)
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
        RAISE NOTICE 'Novo registro criado: %', p_id;
    ELSE
        -- Merge inteligente preservando dados existentes
        new_version := current_data.version + 1;
        
        -- Merge expenses: combinar objetos
        merged_expenses := COALESCE(current_data.expenses, '{}'::jsonb) || COALESCE(p_expenses, '{}'::jsonb);
        
        -- Merge projects: manter IDs únicos, cliente sobrescreve servidor para mesmo ID
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
        
        RAISE NOTICE 'Dados sincronizados com merge inteligente: % (versão %)', p_id, new_version;
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

-- 8. CRIAR FUNÇÃO DE LIMPEZA AUTOMÁTICA DE IDS DELETADOS
CREATE OR REPLACE FUNCTION auto_cleanup_deleted_ids()
RETURNS void AS $$
BEGIN
    -- Limpar IDs deletados mais antigos que 7 dias
    WITH cleanup_threshold AS (
        SELECT (EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000)::BIGINT as threshold
    )
    UPDATE sync_data 
    SET deleted_ids = (
        SELECT COALESCE(jsonb_agg(id_elem), '[]'::jsonb)
        FROM jsonb_array_elements_text(deleted_ids) as id_elem
        WHERE id_elem NOT IN (
            SELECT value FROM jsonb_array_elements_text(deleted_ids) as value
            LIMIT (jsonb_array_length(deleted_ids) - 5) -- Manter apenas os 5 mais recentes
        )
    )
    FROM cleanup_threshold
    WHERE jsonb_array_length(deleted_ids) > 10; -- Só limpar se houver muitos IDs
    
    RAISE NOTICE 'Limpeza automática de deleted_ids executada';
END;
$$ LANGUAGE plpgsql;

-- 9. TRIGGER PARA LIMPEZA AUTOMÁTICA
CREATE OR REPLACE FUNCTION trigger_cleanup_deleted_ids()
RETURNS TRIGGER AS $$
BEGIN
    -- Executar limpeza se há muitos IDs deletados
    IF jsonb_array_length(NEW.deleted_ids) > 15 THEN
        PERFORM auto_cleanup_deleted_ids();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_cleanup_trigger ON sync_data;
CREATE TRIGGER auto_cleanup_trigger
    AFTER UPDATE ON sync_data
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_deleted_ids();

-- 10. FUNÇÃO DE VERIFICAÇÃO DE INTEGRIDADE
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

-- 11. EXECUTAR VERIFICAÇÃO FINAL
SELECT verify_sync_integrity() as migration_result;

-- 12. MOSTRAR ESTATÍSTICAS FINAIS
SELECT 
    'MIGRAÇÃO CONCLUÍDA' as status,
    COUNT(*) as total_registros,
    MAX(version) as versao_maxima,
    MAX(jsonb_array_length(deleted_ids)) as max_deleted_ids,
    MAX(to_timestamp(last_sync_timestamp/1000)) as ultima_sincronizacao
FROM sync_data;

RAISE NOTICE '==============================================';
RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
RAISE NOTICE 'Execute verify_sync_integrity() para verificar';
RAISE NOTICE '==============================================';
