-- Solução para o erro 406 (Not Acceptable)

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
  "lastSync" TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- 4. Inserir APENAS UM registro inicial com valores válidos e ID FIXO
-- Este é o ponto chave: garantir que exista apenas um registro com ID conhecido
INSERT INTO sync_data (
  id, 
  expenses, 
  projects, 
  stock, 
  employees, 
  willbaseRate, 
  willbonus, 
  "lastSync"
) VALUES (
  'be800980-2f6b-47f4-9567-30eac5299350',  -- ID FIXO para garantir consistência
  '{}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  200,
  0,
  to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- 5. Criar uma função para atualizar o lastSync automaticamente
CREATE OR REPLACE FUNCTION update_lastsync()
RETURNS TRIGGER AS $$
BEGIN
  NEW."lastSync" = to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Adicionar um gatilho para atualizar o lastSync automaticamente
DROP TRIGGER IF EXISTS update_lastsync_trigger ON sync_data;
CREATE TRIGGER update_lastsync_trigger
BEFORE UPDATE ON sync_data
FOR EACH ROW
EXECUTE FUNCTION update_lastsync();

-- 7. Configurar as políticas de segurança (RLS)
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso anônimo (leitura e escrita)
DROP POLICY IF EXISTS "Allow anonymous access" ON sync_data;
CREATE POLICY "Allow anonymous access" 
  ON sync_data 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- 8. Criar uma função que retorna APENAS o registro com o ID fixo
CREATE OR REPLACE FUNCTION get_single_sync_data()
RETURNS SETOF sync_data AS $$
BEGIN
  RETURN QUERY SELECT * FROM sync_data 
  WHERE id = 'be800980-2f6b-47f4-9567-30eac5299350'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 9. Criar uma view que usa a função para garantir que retorne apenas um registro
DROP VIEW IF EXISTS sync_data_single;
CREATE VIEW sync_data_single AS
  SELECT * FROM get_single_sync_data();

-- 10. Configurar permissões para a view
GRANT SELECT, UPDATE ON sync_data_single TO anon, authenticated;

-- 11. Reiniciar a publicação realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE sync_data;

-- 12. Verificar o conteúdo da tabela após as alterações
SELECT * FROM sync_data;
SELECT * FROM sync_data_single; 