-- Script específico para resolver o problema da coluna lastSync

-- 1. Verificar a estrutura atual da tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sync_data';

-- 2. Verificar se a tabela sync_data existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sync_data'
  ) THEN
    -- Criar a tabela se não existir
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
  ELSE
    -- Verificar se a coluna lastsync existe
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sync_data' 
      AND column_name = 'lastsync'
    ) THEN
      -- Adicionar a coluna lastsync se não existir
      ALTER TABLE sync_data ADD COLUMN lastsync TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    ELSE
      -- Converter a coluna para TEXT se existir
      ALTER TABLE sync_data ALTER COLUMN lastsync TYPE TEXT USING lastsync::TEXT;
    END IF;
    
    -- Verificar se a coluna lastSync (com S maiúsculo) existe
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sync_data' 
      AND column_name = 'lastSync'
    ) THEN
      -- Copiar os valores de lastSync para lastsync
      UPDATE sync_data SET lastsync = "lastSync"::TEXT;
      -- Remover a coluna lastSync
      ALTER TABLE sync_data DROP COLUMN "lastSync";
    END IF;
  END IF;
END $$;

-- 3. Atualizar todos os registros com um valor válido para lastsync
UPDATE sync_data SET lastsync = to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

-- 4. Criar um alias para a coluna lastsync
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

-- 5. Configurar as políticas de segurança (RLS)
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso anônimo (leitura e escrita)
DROP POLICY IF EXISTS "Allow anonymous access" ON sync_data;
CREATE POLICY "Allow anonymous access" 
  ON sync_data 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- 6. Reiniciar a publicação realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 7. Verificar o conteúdo da tabela após as alterações
SELECT * FROM sync_data; 