-- Script para resolver o problema do ConnectionStatus.tsx

-- 1. Criar uma função que retorna lastSync como texto
CREATE OR REPLACE FUNCTION get_lastsync()
RETURNS TABLE (lastsync TEXT) AS $$
BEGIN
  RETURN QUERY SELECT to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
END;
$$ LANGUAGE plpgsql;

-- 2. Criar uma API REST para a função
DROP FUNCTION IF EXISTS api.get_lastsync();
CREATE OR REPLACE FUNCTION api.get_lastsync()
RETURNS TABLE (lastsync TEXT) AS $$
  SELECT * FROM public.get_lastsync();
$$ LANGUAGE sql;

-- 3. Conceder permissões para a função
GRANT EXECUTE ON FUNCTION api.get_lastsync TO anon;
GRANT EXECUTE ON FUNCTION api.get_lastsync TO authenticated;

-- 4. Criar uma view que expõe lastSync
CREATE OR REPLACE VIEW sync_data_with_lastsync AS
SELECT 
  s.*,
  s.lastsync AS "lastSync"
FROM 
  sync_data s;

-- 5. Conceder permissões para a view
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_data_with_lastsync TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_data_with_lastsync TO authenticated;

-- 6. Adicionar a view à publicação realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE sync_data, sync_data_with_lastsync; 