-- Script para configurar a tabela sync_data no Supabase
-- Compatível com a versão main@4fac295 do código

-- Verificar se a tabela sync_data existe e, se existir, removê-la
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