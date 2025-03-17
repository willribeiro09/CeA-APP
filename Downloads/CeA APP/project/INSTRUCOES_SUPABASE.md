# Instruções para Configurar o Supabase

Para resolver os problemas de sincronização com o Supabase, siga estas instruções:

## 1. Acesse o Painel do Supabase

1. Acesse [https://app.supabase.com/](https://app.supabase.com/)
2. Faça login na sua conta
3. Selecione o projeto "mnucrulwdurskwofsgwp"

## 2. Execute o Script SQL

1. No menu lateral, clique em **SQL Editor**
2. Clique em **+ New Query**
3. Copie e cole o conteúdo do arquivo `supabase_setup.sql` no editor
4. Clique em **Run** para executar o script

O script irá:
- Criar a tabela `sync_data` com a estrutura correta
- Configurar a publicação para realtime
- Adicionar um gatilho para atualizar o campo `updated_at` automaticamente

## 3. Verifique a Tabela

1. No menu lateral, clique em **Table Editor**
2. Verifique se a tabela `sync_data` foi criada com as seguintes colunas:
   - `id` (UUID, chave primária)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)
   - `expenses` (JSONB)
   - `projects` (JSONB)
   - `stock` (JSONB)
   - `employees` (JSONB)
   - `willBaseRate` (integer)
   - `willBonus` (integer)
   - `lastSync` (timestamp)

## 4. Acesse o Aplicativo

1. Acesse o aplicativo em [https://main--appceagutters.netlify.app/](https://main--appceagutters.netlify.app/)
2. Verifique se os erros de sincronização foram resolvidos

## Observações Importantes

- Este script é compatível com a versão `main@4fac295` do código
- Não é necessário modificar o código-fonte do aplicativo
- A tabela `sync_data` armazena todos os dados do aplicativo em formato JSON
- A sincronização em tempo real é habilitada pela publicação `supabase_realtime` 