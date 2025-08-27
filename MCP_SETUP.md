# Configuração do MCP (Model Context Protocol) Supabase

## O que foi instalado

✅ **Pacote instalado**: `@supabase/mcp-server-supabase` (versão 0.4.5)
✅ **Arquivo de configuração**: `mcp.json` criado
✅ **Script npm**: `mcp:supabase` adicionado ao package.json

## Como configurar

### 1. Criar Token de Acesso Pessoal no Supabase

1. Acesse [https://app.supabase.com/](https://app.supabase.com/)
2. Faça login na sua conta
3. Vá para **Configurações** > **Tokens de Acesso**
4. Clique em **Gerar novo token**
5. Dê um nome descritivo como "MCP Server Token"
6. Copie o token gerado

### 2. Configurar o Token

**Opção A - Editar o arquivo mcp.json:**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--access-token",
        "SEU_TOKEN_AQUI"
      ]
    }
  }
}
```

**Opção B - Usar variável de ambiente:**
```bash
# No Windows (PowerShell)
$env:SUPABASE_ACCESS_TOKEN="seu_token_aqui"

# No Linux/Mac
export SUPABASE_ACCESS_TOKEN="seu_token_aqui"
```

### 3. Executar o servidor MCP

```bash
# Usando o script npm (com variável de ambiente)
npm run mcp:supabase

# Ou diretamente
npx @supabase/mcp-server-supabase --access-token SEU_TOKEN_AQUI
```

## O que o MCP Supabase permite

- **Consultar dados**: Executar queries SQL no seu banco de dados
- **Gerenciar tabelas**: Criar, alterar e visualizar estruturas de tabelas
- **Administrar dados**: Inserir, atualizar e deletar registros
- **Monitorar**: Verificar estatísticas e performance do banco

## Segurança

⚠️ **IMPORTANTE**: O token de acesso pessoal dá acesso completo ao seu projeto Supabase. Use com cuidado e:

- Não compartilhe o token
- Não commite o token no Git
- Use variáveis de ambiente em produção
- Revogue tokens não utilizados

## Integração com Claude/IA

Para usar com Claude ou outras ferramentas de IA:

1. Configure o MCP conforme acima
2. Aponte sua ferramenta de IA para o arquivo `mcp.json`
3. A IA poderá então interagir diretamente com seu banco Supabase

## Projeto Atual

Seu projeto usa:
- **ID do projeto**: mnucrulwdurskwofsgwp
- **Tabela principal**: sync_data
- **Funcionalidades**: Gestão de despesas, projetos, estoque e funcionários
