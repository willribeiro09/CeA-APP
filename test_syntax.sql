-- Teste rápido de sintaxe das principais funções
-- Execute este primeiro para verificar se não há erros de syntax

-- Teste 1: Verificar se podemos criar a função básica
CREATE OR REPLACE FUNCTION test_syntax_check()
RETURNS JSONB AS $$
DECLARE
  sync_timestamp BIGINT;
  test_result JSONB;
BEGIN
  -- Testar sintaxe de timestamp
  sync_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000;
  
  -- Testar JSONB
  test_result := jsonb_build_object(
    'timestamp', sync_timestamp,
    'status', 'ok'
  );
  
  RETURN test_result;
END;
$$ LANGUAGE plpgsql;

-- Teste 2: Executar função
SELECT test_syntax_check();

-- Teste 3: Limpar função de teste
DROP FUNCTION test_syntax_check();

-- Se chegou até aqui, a sintaxe básica está OK
SELECT 'Sintaxe básica OK - pode prosseguir com a migração' as status;
