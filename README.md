# Forçando novo deploy no Netlify

# CeA App - Nova Solução de Sincronização

Esta versão do CeA App implementa uma nova solução de sincronização que resolve os problemas de perda de dados e conflitos quando múltiplos usuários atualizam informações simultaneamente.

## Problema Resolvido

O sistema anterior tinha problemas críticos:

1. **Perda de dados**: As alterações feitas por um usuário eram sobrescritas por outro
2. **Estrutura inadequada**: Todos os dados estavam em uma única tabela como JSONB
3. **Sincronização ineficiente**: Operação completa de sobrescrição em vez de alterações granulares
4. **Ausência de versionamento**: Impossível determinar qual versão dos dados era mais recente

## Nova Arquitetura

A nova solução implementa:

1. **Banco de dados normalizado**:
   - Tabelas separadas para cada tipo de entidade (`expenses`, `projects`, `stock_items`, `employees`)
   - Tabela de controle de sincronização (`sync_control`)
   - Campos de versionamento e controle de modificações

2. **Sistema de sincronização em tempo real**:
   - Usa Supabase Realtime para propagar alterações instantaneamente
   - Apenas dados modificados são sincronizados, não documentos inteiros
   - Detecta automaticamente quando o app volta do segundo plano

3. **Identificação de sessão**: Cada cliente gera um ID de sessão único para evitar loops de atualização

## Arquivos Importantes

- `src/lib/syncService.ts`: Implementação do serviço de sincronização
- `src/lib/databaseStructure.ts`: Define a estrutura do banco de dados 
- `src/components/DatabaseMigration.tsx`: Componente que gerencia a migração
- `migracao_completa.sql`: Script SQL para migração manual do banco
- `GUIA_MIGRACAO.md`: Guia passo a passo para a migração
- `SOLUCAO_SINCRONIZACAO.md`: Explicação técnica da solução

## Como Implementar

Existem duas maneiras de implementar a nova estrutura:

### 1. Via Console SQL

1. Faça backup do seu banco de dados atual
2. Execute o script `migracao_completa.sql` no Console SQL do Supabase
3. Execute `SELECT migrate_data_to_new_structure();` para migrar os dados

### 2. Via App (Recomendado)

1. Atualize para a nova versão do código
2. Abra o app e siga as instruções do componente de migração
3. A migração será realizada automaticamente

## Testes Pós-Migração

Após a migração, verifique:

1. Todos os dados foram transferidos corretamente
2. As alterações são sincronizadas em tempo real
3. O app funciona corretamente ao voltar do segundo plano
4. Múltiplos usuários podem editar dados simultaneamente sem conflitos

## Estrutura do Banco de Dados

### Tabela `expenses`
- Armazena despesas com valores, datas e categorias
- Cada despesa tem um proprietário (`owner_id`)
- Campos para versão e controle de modificações

### Tabela `projects`
- Armazena projetos com cliente, local, datas e valores
- Status do projeto e informações de faturamento
- Campos para versão e controle de modificações

### Tabela `stock_items`
- Armazena itens de estoque com quantidade e unidade
- Referência opcional para projeto (`project_id`)
- Campos para versão e controle de modificações

### Tabela `employees`
- Armazena funcionários com função, taxa diária e datas trabalhadas
- Semana de trabalho e dias trabalhados
- Campos para versão e controle de modificações

### Tabela `sync_control`
- Controla a sincronização global
- Armazena valores do Will (taxa base e bônus)
- Versão global para controle de alterações

## Fluxo de Sincronização

1. Cliente gera ID de sessão único ao iniciar
2. Ao modificar um registro:
   - Incrementa a versão do registro
   - Adiciona seu ID de sessão como `last_modified_by`
   - Envia a alteração para o servidor
3. Supabase Realtime notifica outros clientes sobre a alteração
4. Clientes verificam se a alteração não foi feita por eles mesmos
5. Clientes aplicam a alteração se a versão for mais recente

## Suporte

Para problemas de migração ou dúvidas, consulte o `GUIA_MIGRACAO.md` ou entre em contato com o suporte.
