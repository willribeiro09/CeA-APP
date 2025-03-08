-- Solução final para o problema de sincronização com o Supabase

-- Habilitar a extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Verificar a estrutura atual da tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sync_data';

-- 2. Fazer backup da tabela existente (caso exista)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sync_data'
  ) THEN
    CREATE TABLE IF NOT EXISTS sync_data_backup AS 
    SELECT * FROM sync_data;
  END IF;
END $$;

-- 3. Recriar a tabela com a estrutura correta
DROP TABLE IF EXISTS sync_data CASCADE;

CREATE TABLE sync_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expenses JSONB DEFAULT '{}'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  stock JSONB DEFAULT '[]'::jsonb,
  employees JSONB DEFAULT '{}'::jsonb,
  willbaseRate INTEGER DEFAULT 200,
  willbonus INTEGER DEFAULT 0,
  lastsync TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- 4. Inserir um registro inicial com valores válidos
INSERT INTO sync_data (
  id, 
  expenses, 
  projects, 
  stock, 
  employees, 
  willbaseRate, 
  willbonus, 
  lastsync
) VALUES (
  uuid_generate_v4(),
  '{}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  200,
  0,
  to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- 5. Criar uma view que expõe lastSync (com S maiúsculo)
CREATE OR REPLACE VIEW sync_data_view AS
SELECT 
  id,
  created_at,
  updated_at,
  expenses,
  projects,
  stock,
  employees,
  willbaseRate,
  willbonus,
  lastsync,
  lastsync AS "lastSync"
FROM sync_data;

-- 6. Configurar as políticas de segurança (RLS)
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso anônimo (leitura e escrita)
DROP POLICY IF EXISTS "Allow anonymous access" ON sync_data;
CREATE POLICY "Allow anonymous access" 
  ON sync_data 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- 7. Conceder permissões para a view
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_data_view TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_data_view TO authenticated;

-- 8. Criar uma função que retorna lastSync
CREATE OR REPLACE FUNCTION get_lastsync()
RETURNS TABLE (lastsync TEXT) AS $$
BEGIN
  RETURN QUERY SELECT to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
END;
$$ LANGUAGE plpgsql;

-- 9. Reiniciar a publicação realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE sync_data, sync_data_view;

-- 10. Verificar o conteúdo da tabela após as alterações
SELECT * FROM sync_data;
SELECT * FROM sync_data_view; 