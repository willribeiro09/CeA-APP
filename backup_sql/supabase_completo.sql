-- Script completo para configurar o Supabase
-- Compatível com a versão main@4fac295 do código

-- Habilitar a extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Remover tabelas existentes (se houver)
DROP TABLE IF EXISTS sync_data;

-- Criar a tabela sync_data com a estrutura correta
CREATE TABLE sync_data (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expenses JSONB DEFAULT '{}'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  stock JSONB DEFAULT '[]'::jsonb,
  employees JSONB DEFAULT '{}'::jsonb,
  willBaseRate INTEGER DEFAULT 200,
  willBonus INTEGER DEFAULT 0,
  lastSync TIMESTAMP WITH TIME ZONE
);

-- Configurar a publicação para realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Adicionar um gatilho para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sync_data_updated_at ON sync_data;
CREATE TRIGGER update_sync_data_updated_at
BEFORE UPDATE ON sync_data
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Configurar políticas de segurança (RLS)
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso anônimo (leitura e escrita)
DROP POLICY IF EXISTS "Allow anonymous access" ON sync_data;
CREATE POLICY "Allow anonymous access" 
  ON sync_data 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- Política para permitir acesso autenticado (leitura e escrita)
DROP POLICY IF EXISTS "Allow authenticated access" ON sync_data;
CREATE POLICY "Allow authenticated access" 
  ON sync_data 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Política para permitir acesso de serviço (leitura e escrita)
DROP POLICY IF EXISTS "Allow service role access" ON sync_data;
CREATE POLICY "Allow service role access" 
  ON sync_data 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Inserir um registro inicial (opcional)
INSERT INTO sync_data (id, expenses, projects, stock, employees, willBaseRate, willBonus, lastSync)
VALUES (
  uuid_generate_v4(),
  '{}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  200,
  0,
  NOW()
)
ON CONFLICT (id) DO NOTHING; 