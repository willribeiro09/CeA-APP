-- Script de configuração para tabelas de sincronização
-- Executar este script no Console SQL do Supabase

-- Criar ou atualizar a tabela item_changes
CREATE TABLE IF NOT EXISTS public.item_changes (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  change_type TEXT NOT NULL,
  data JSONB,
  timestamp BIGINT NOT NULL,
  session_id TEXT NOT NULL,
  list_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  client_version BIGINT DEFAULT 1,
  server_version BIGINT DEFAULT 1,
  is_conflicted BOOLEAN DEFAULT false
);

-- Adicionar índices para melhorar a performance de consultas
CREATE INDEX IF NOT EXISTS idx_item_changes_timestamp ON public.item_changes (timestamp);
CREATE INDEX IF NOT EXISTS idx_item_changes_item_id ON public.item_changes (item_id);
CREATE INDEX IF NOT EXISTS idx_item_changes_session_id ON public.item_changes (session_id);
CREATE INDEX IF NOT EXISTS idx_item_changes_is_conflicted ON public.item_changes (is_conflicted);

-- Criar função para limpar registros antigos (execução periódica)
CREATE OR REPLACE FUNCTION public.cleanup_old_changes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remover registros com mais de 30 dias
  DELETE FROM item_changes 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Habilitar realtime para a tabela item_changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.item_changes;

-- Configurar RLS (Row Level Security) para item_changes
ALTER TABLE public.item_changes ENABLE ROW LEVEL SECURITY;

-- Criar políticas para controlar acesso
CREATE POLICY "Permitir acesso de leitura para todos os usuários autenticados"
  ON public.item_changes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção para todos os usuários autenticados"
  ON public.item_changes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Adicionar comentário à tabela para documentação
COMMENT ON TABLE public.item_changes IS 'Registra alterações individuais em itens para sincronização em tempo real. Configure uma tarefa programada para executar cleanup_old_changes() periodicamente.';

-- Função para gerar versão do servidor para mudanças
CREATE OR REPLACE FUNCTION public.generate_server_version()
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  current_version BIGINT;
BEGIN
  SELECT COALESCE(MAX(server_version), 0) + 1 INTO current_version FROM public.item_changes;
  RETURN current_version;
END;
$$;

-- Trigger para atualizar a versão do servidor em novas mudanças
CREATE OR REPLACE FUNCTION public.update_server_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.server_version := public.generate_server_version();
  RETURN NEW;
END;
$$;

CREATE TRIGGER item_changes_server_version
  BEFORE INSERT ON public.item_changes
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_server_version();

-- Função para detectar conflitos entre mudanças
CREATE OR REPLACE FUNCTION public.check_for_conflicts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  recent_changes INTEGER;
BEGIN
  -- Verificar se há outras mudanças recentes para o mesmo item (últimos 5 min)
  SELECT COUNT(*)
  INTO recent_changes
  FROM public.item_changes
  WHERE item_id = NEW.item_id
    AND item_type = NEW.item_type
    AND session_id <> NEW.session_id
    AND timestamp > (NEW.timestamp - 300000);  -- 5 minutos em ms
    
  -- Marcar como conflito se houver mudanças recentes de outras sessões
  IF recent_changes > 0 THEN
    NEW.is_conflicted := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_item_conflicts
  BEFORE INSERT ON public.item_changes
  FOR EACH ROW
  EXECUTE PROCEDURE public.check_for_conflicts(); 