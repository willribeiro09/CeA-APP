-- Remover a tabela existente para garantir uma estrutura limpa
DROP TABLE IF EXISTS sync_data;

-- Criação da tabela sync_data para armazenar dados sincronizados
CREATE TABLE sync_data (
  id UUID PRIMARY KEY,
  expenses JSONB DEFAULT '{}'::JSONB,
  projects JSONB DEFAULT '[]'::JSONB,
  stock JSONB DEFAULT '[]'::JSONB,
  employees JSONB DEFAULT '{}'::JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Limpar todos os dados existentes
DELETE FROM sync_data;

-- Inserir um registro inicial com ID fixo
INSERT INTO sync_data (id, expenses, projects, stock, employees)
VALUES ('00000000-0000-0000-0000-000000000000', '{}'::JSONB, '[]'::JSONB, '[]'::JSONB, '{}'::JSONB);

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

-- Remover a política existente se necessário
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_policy
        WHERE polname = 'Allow anonymous access'
        AND polrelid = 'sync_data'::regclass
    ) THEN
        DROP POLICY "Allow anonymous access" ON sync_data;
    END IF;
END
$$;

-- Criar a política
CREATE POLICY "Allow anonymous access" ON sync_data
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true); 