-- Criar tabela para armazenar dados sincronizados
CREATE TABLE IF NOT EXISTS sync_data (
  id TEXT PRIMARY KEY,
  expenses JSONB DEFAULT '{}'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  stock JSONB DEFAULT '[]'::jsonb,
  employees JSONB DEFAULT '{}'::jsonb,
  will_base_rate NUMERIC DEFAULT 200,
  will_bonus NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar realtime para esta tabela
ALTER TABLE sync_data REPLICA IDENTITY FULL;

-- Configurar política de segurança para permitir acesso anônimo
CREATE POLICY "Allow anonymous access to sync_data" ON sync_data
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Habilitar RLS na tabela
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY; 