-- Script para corrigir o problema com a coluna lastSync

-- 1. Verificar se a coluna lastSync existe e seu tipo
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sync_data' AND column_name = 'lastSync';

-- 2. Renomear a coluna para garantir consistência de maiúsculas/minúsculas
ALTER TABLE sync_data RENAME COLUMN "lastSync" TO lastsync;

-- 3. Alterar o tipo da coluna para TEXT (mais compatível com o cliente)
ALTER TABLE sync_data ALTER COLUMN lastsync TYPE TEXT;

-- 4. Atualizar o registro existente com um valor de lastSync válido
UPDATE sync_data 
SET lastsync = to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

-- 5. Verificar o conteúdo da tabela após as alterações
SELECT * FROM sync_data;

-- 6. Reiniciar a publicação realtime para aplicar as alterações
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES; 