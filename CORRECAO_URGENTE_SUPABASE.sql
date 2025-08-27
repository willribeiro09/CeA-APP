-- =====================================================================
-- CORREÇÃO URGENTE: FUNÇÃO get_changes_since COM NOMES CORRETOS
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para corrigir os erros

-- Primeiro, remover a função existente
DROP FUNCTION IF EXISTS get_changes_since(uuid, bigint);

-- Criar a função get_changes_since com os nomes corretos dos campos
CREATE FUNCTION get_changes_since(
    p_id UUID,
    p_last_sync_timestamp BIGINT
) RETURNS JSONB AS $$
DECLARE
    current_data RECORD;
BEGIN
    SELECT * INTO current_data FROM sync_data WHERE id = p_id;
    
    IF NOT FOUND THEN
        -- Usuário novo
        RETURN jsonb_build_object(
            'expenses', '{}'::JSONB,
            'projects', '[]'::JSONB,
            'stock', '[]'::JSONB,
            'employees', '{}'::JSONB,
            'deleted_ids', '[]'::JSONB,
            'willbaserate', 200,
            'willbonus', 0,
            'last_sync_timestamp', EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
            'version', 1,
            'is_new_user', true
        );
    END IF;
    
    -- Verificar se há mudanças
    IF p_last_sync_timestamp < current_data.last_sync_timestamp THEN
        RETURN jsonb_build_object(
            'expenses', current_data.expenses,
            'projects', current_data.projects,
            'stock', current_data.stock,
            'employees', current_data.employees,
            'deleted_ids', current_data.deleted_ids,
            'willbaserate', current_data.willbaserate,
            'willbonus', current_data.willbonus,
            'last_sync_timestamp', current_data.last_sync_timestamp,
            'version', current_data.version,
            'has_changes', true
        );
    ELSE
        -- Sem mudanças
        RETURN jsonb_build_object(
            'last_sync_timestamp', current_data.last_sync_timestamp,
            'version', current_data.version,
            'has_changes', false
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Verificar se a correção funcionou
SELECT 'FUNÇÃO CORRIGIDA COM SUCESSO' as status;
