#!/bin/bash

# Substitua estas variáveis pelos seus valores
REPO_OWNER="willribeiro09"
REPO_NAME="CeA-APP"
GITHUB_TOKEN="seu_token_pessoal_aqui"  # Você precisará criar um token pessoal no GitHub

# Conteúdo do issue
ISSUE_TITLE="Erro 406 (Not Acceptable) em Requisições ao Supabase"
ISSUE_BODY=$(cat <<EOF
## Descrição do Problema

O aplicativo está enfrentando erros 406 (Not Acceptable) ao fazer requisições para a tabela \`sync_data\` no Supabase. Especificamente, a requisição que está falhando é:

\`\`\`
GET https://mnucrulwdurskwofsgwp.supabase.co/rest/v1/sync_data?select=*&id=eq.ac9b3353-9740-4ae4-9c05-57625e5483c5
\`\`\`

Este erro ocorre porque o cabeçalho \`accept: application/vnd.pgrst.object+json\` indica que o cliente espera um único objeto como resposta, mas a consulta pode estar retornando múltiplos registros ou nenhum registro.

## Tentativas de Solução

Já foram implementadas as seguintes correções:

1. Modificação do código em \`src/lib/sync.ts\` para usar \`.limit(1)\` em vez de \`.single()\` nas consultas ao Supabase.
2. Adição de verificação para a existência de dados no array retornado antes de tentar acessá-los.

Apesar dessas correções, o erro 406 ainda persiste nos logs.

## Impacto Atual

Atualmente, o erro não parece estar afetando a funcionalidade principal do aplicativo:
- A sincronização em tempo real está funcionando corretamente
- Os dados estão sendo salvos e carregados sem problemas visíveis

## Próximos Passos

Ações a serem tomadas em uma próxima iteração:

1. Investigar se há outras partes do código que ainda estão usando \`.single()\` ou fazendo consultas que esperam um único objeto.
2. Verificar se o deploy foi atualizado com as alterações feitas.
3. Analisar os logs detalhados para identificar exatamente de onde vem a requisição que causa o erro.
4. Considerar uma solução no lado do servidor (Supabase) se as correções no cliente não forem suficientes.
EOF
)

# Criar o issue usando a API do GitHub
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues" \
  -d "{
    \"title\": \"$ISSUE_TITLE\",
    \"body\": $(echo "$ISSUE_BODY" | jq -Rs .),
    \"labels\": [\"bug\", \"documentation\"]
  }"

echo "GitHub Issue criado com sucesso!" 