-- Criação da tabela sync_data para armazenar dados sincronizados
CREATE TABLE IF NOT EXISTS sync_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expenses JSONB DEFAULT '{}'::JSONB,
  projects JSONB DEFAULT '[]'::JSONB,
  stock JSONB DEFAULT '[]'::JSONB,
  employees JSONB DEFAULT '{}'::JSONB,
  lastSync BIGINT DEFAULT extract(epoch from now()) * 1000,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Função para atualizar o timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o timestamp automaticamente
DROP TRIGGER IF EXISTS update_sync_data_timestamp ON sync_data;
CREATE TRIGGER update_sync_data_timestamp
BEFORE UPDATE ON sync_data
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Política de segurança para permitir acesso anônimo
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous access" ON sync_data
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true); 