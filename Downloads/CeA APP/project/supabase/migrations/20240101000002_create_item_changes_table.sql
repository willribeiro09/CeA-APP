-- Criar tabela para eventos de alteração
CREATE TABLE IF NOT EXISTS item_changes (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  change_type TEXT NOT NULL,
  data JSONB,
  timestamp BIGINT NOT NULL,
  session_id TEXT NOT NULL,
  list_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_item_changes_item_id ON item_changes(item_id);
CREATE INDEX IF NOT EXISTS idx_item_changes_item_type ON item_changes(item_type);
CREATE INDEX IF NOT EXISTS idx_item_changes_timestamp ON item_changes(timestamp);
CREATE INDEX IF NOT EXISTS idx_item_changes_session_id ON item_changes(session_id);

-- Habilitar realtime para esta tabela
ALTER TABLE item_changes REPLICA IDENTITY FULL;

-- Configurar política de segurança para permitir acesso anônimo
CREATE POLICY "Allow anonymous access to item_changes" ON item_changes
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Habilitar RLS na tabela
ALTER TABLE item_changes ENABLE ROW LEVEL SECURITY; 