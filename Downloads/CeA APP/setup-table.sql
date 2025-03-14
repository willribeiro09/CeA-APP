-- Criar tabela para registrar alterações individuais
CREATE TABLE IF NOT EXISTS item_changes (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  change_type TEXT NOT NULL,
  data JSONB,
  timestamp BIGINT NOT NULL,
  session_id TEXT NOT NULL,
  list_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhorar desempenho das consultas
CREATE INDEX IF NOT EXISTS idx_item_changes_timestamp ON item_changes (timestamp);
CREATE INDEX IF NOT EXISTS idx_item_changes_item_id ON item_changes (item_id);
CREATE INDEX IF NOT EXISTS idx_item_changes_item_type ON item_changes (item_type);

-- Configurar RLS (segurança em nível de linha) para permitir acesso público
ALTER TABLE item_changes ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir insert, select para todos (sem autenticação)
CREATE POLICY "Allow public insert" ON item_changes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public select" ON item_changes FOR SELECT TO public USING (true);

-- Adicionar função para limpar registros antigos periodicamente
-- Esta função pode ser executada como uma tarefa programada para manter o tamanho da tabela gerenciável
CREATE OR REPLACE FUNCTION cleanup_old_changes()
RETURNS void AS $$
BEGIN
  -- Remove registros com mais de 30 dias
  DELETE FROM item_changes 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comentário sobre como usar a função de limpeza
COMMENT ON FUNCTION cleanup_old_changes IS 'Execute esta função periodicamente para limpar registros antigos. Exemplo: SELECT cleanup_old_changes();';

-- Adicione esse comentário para lembrar de configurar uma tarefa programada
COMMENT ON TABLE item_changes IS 'Registra alterações individuais em itens para sincronização em tempo real. Configure uma tarefa programada para executar cleanup_old_changes() periodicamente.'; 