CREATE OR REPLACE FUNCTION create_sync_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Verificar se a tabela sync_data existe
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'sync_data'
  ) THEN
    -- Criar a tabela se não existir
    CREATE TABLE public.sync_data (
      id TEXT PRIMARY KEY,
      expenses JSONB DEFAULT '{}'::jsonb,
      projects JSONB DEFAULT '[]'::jsonb,
      stock JSONB DEFAULT '[]'::jsonb,
      employees JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Configurar RLS (Row Level Security)
    ALTER TABLE public.sync_data ENABLE ROW LEVEL SECURITY;
    
    -- Criar política para permitir acesso anônimo
    CREATE POLICY "Permitir acesso anônimo" 
    ON public.sync_data 
    FOR ALL 
    TO anon 
    USING (true) 
    WITH CHECK (true);
    
    -- Habilitar realtime
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_data;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 