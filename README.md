# Expenses App

Aplicativo para gerenciamento de despesas, projetos, estoque e funcionários com sincronização em tempo real entre dispositivos.

## Tecnologias

- React
- TypeScript
- Tailwind CSS
- Supabase (banco de dados e sincronização em tempo real)
- Vite

## Configuração

### Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Conta no Supabase (gratuita)

### Passos para configuração

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITORIO]
cd expenses-app
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Configure o Supabase:
   - Crie uma conta no [Supabase](https://supabase.com/)
   - Crie um novo projeto
   - Vá para SQL Editor e execute o script SQL localizado em `supabase/schema.sql`
   - Ou crie manualmente as seguintes tabelas:
     - `expenses` (despesas)
     - `projects` (projetos)
     - `stock_items` (itens de estoque)
     - `employees` (funcionários)
   - Habilite o Realtime para todas as tabelas:
     - Vá para Database > Replication
     - Clique em "Manage Realtime"
     - Adicione todas as tabelas à publicação `supabase_realtime`

4. Configure as variáveis de ambiente:
   - Copie o arquivo `.env.example` para `.env`
   - Preencha as variáveis com suas credenciais do Supabase:
     - `VITE_SUPABASE_URL`: URL do seu projeto Supabase (encontrado em Project Settings > API)
     - `VITE_SUPABASE_ANON_KEY`: Chave anônima do seu projeto Supabase (encontrado em Project Settings > API)

5. Execute o projeto em modo de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
```

6. Acesse o aplicativo em `http://localhost:5173`

## Estrutura do banco de dados

### Tabela `expenses`
- `id`: string (UUID) - Identificador único da despesa
- `name`: string - Nome da despesa
- `amount`: decimal - Valor da despesa
- `paid`: boolean - Status de pagamento
- `due_date`: timestamp - Data de vencimento
- `date`: timestamp - Data da despesa
- `list_name`: string - Nome da lista ('Carlos', 'Diego' ou 'C&A')
- `created_at`: timestamp - Data de criação
- `updated_at`: timestamp - Data de atualização

### Tabela `projects`
- `id`: string (UUID) - Identificador único do projeto
- `name`: string - Nome do projeto
- `description`: string - Descrição do projeto
- `status`: string - Status do projeto ('pending', 'in_progress' ou 'completed')
- `start_date`: timestamp - Data de início
- `created_at`: timestamp - Data de criação
- `updated_at`: timestamp - Data de atualização

### Tabela `stock_items`
- `id`: string (UUID) - Identificador único do item
- `name`: string - Nome do item
- `quantity`: integer - Quantidade em estoque
- `created_at`: timestamp - Data de criação
- `updated_at`: timestamp - Data de atualização

### Tabela `employees`
- `id`: string (UUID) - Identificador único do registro
- `employee_name`: string - Nome do funcionário
- `days_worked`: integer - Dias trabalhados
- `week_start_date`: timestamp - Data de início da semana
- `daily_rate`: decimal - Valor da diária
- `created_at`: timestamp - Data de criação
- `updated_at`: timestamp - Data de atualização

## Configuração do Supabase Realtime

O Supabase Realtime permite a sincronização em tempo real entre dispositivos. Para configurá-lo:

1. Vá para o painel do Supabase > Database > Replication
2. Clique em "Manage Realtime"
3. Adicione todas as tabelas à publicação `supabase_realtime`
4. Certifique-se de que o Realtime está habilitado nas configurações do projeto

## Deploy

### Netlify

1. Faça login no [Netlify](https://www.netlify.com/)
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente no Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Configure o comando de build: `npm run build` ou `yarn build`
5. Configure o diretório de publicação: `dist`

### Vercel

1. Faça login no [Vercel](https://vercel.com/)
2. Importe seu repositório GitHub
3. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Configure o comando de build: `npm run build` ou `yarn build`
5. Configure o diretório de saída: `dist`

## Funcionalidades

- Gerenciamento de despesas por categoria
- Gerenciamento de projetos
- Controle de estoque
- Registro de dias trabalhados por funcionário
- Sincronização em tempo real entre dispositivos
- Modo offline com sincronização automática quando online

## Solução de problemas

### Problemas de sincronização

Se você estiver enfrentando problemas com a sincronização em tempo real:

1. Verifique se as variáveis de ambiente estão configuradas corretamente
2. Certifique-se de que o Realtime está habilitado no Supabase
3. Verifique se todas as tabelas estão adicionadas à publicação `supabase_realtime`
4. Verifique os logs do console para erros

### Erros de conexão

Se você estiver enfrentando erros de conexão com o Supabase:

1. Verifique se o URL e a chave anônima estão corretos
2. Certifique-se de que o projeto do Supabase está ativo
3. Verifique se você tem permissões suficientes para acessar as tabelas

## Licença

MIT 