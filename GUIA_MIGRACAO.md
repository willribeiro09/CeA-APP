# Guia de Migração para Nova Estrutura de Sincronização

Este guia descreve os passos necessários para implementar a nova solução de sincronização que resolve os problemas de perda de dados e conflitos.

## Pré-requisitos

- Acesso ao Console SQL do Supabase
- Código-fonte do projeto atualizado

## Etapas da Migração

### 1. Backup dos Dados Atuais

Antes de fazer qualquer alteração, **faça um backup completo do seu banco de dados** no Supabase:

1. Acesse o painel do Supabase
2. Vá em "Database" > "Backups"
3. Solicite um novo backup completo

### 2. Executar Script de Migração SQL

1. Acesse o Console SQL do Supabase
2. Cole o conteúdo do arquivo `migracao_completa.sql` no editor
3. Execute o script completo
4. Importante: O script fará:
   - Backup da tabela `sync_data` para `sync_data_backup`
   - Criação de novas tabelas (`expenses`, `projects`, `stock_items`, `employees`, `sync_control`)
   - Configuração de gatilhos (triggers) para atualização automática
   - Habilitação de recursos em tempo real (realtime)
   - Configuração de políticas de segurança (RLS)
   - Criação de funções auxiliares

### 3. Migrar os Dados

Após a criação das tabelas, execute a função de migração:

```sql
SELECT migrate_data_to_new_structure();
```

Esta função transferirá os dados da tabela `sync_data` para as novas tabelas estruturadas.

### 4. Verificar a Migração

Para confirmar que a migração foi bem-sucedida, conte os registros nas novas tabelas:

```sql
SELECT count_records_in_new_tables();
```

Você deve ver um resultado JSON com a contagem de registros em cada tabela.

### 5. Atualizar o Código do App

1. Substitua os seguintes arquivos no seu projeto:
   - `src/types/index.ts` - Novos tipos alinhados com a estrutura do banco de dados
   - `src/lib/syncService.ts` - Nova implementação do serviço de sincronização
   - `src/lib/databaseStructure.ts` - Estrutura do banco de dados e funções de migração
   - `src/components/DatabaseMigration.tsx` - Componente para gerenciar migração

2. Atualize o arquivo `src/App.tsx` para integrar o componente de migração

### 6. Testar o App

1. Execute o app em um ambiente de teste
2. Verifique se o componente de migração é exibido
3. Complete o processo de migração pelo app
4. Teste as operações de sincronização:
   - Adicionar/editar/excluir dados
   - Colocar o app em segundo plano e retornar
   - Testar em múltiplos dispositivos simultâneos

## Solução de Problemas

### Se o script SQL falhar:

1. Execute o script em partes menores, na seguinte ordem:
   - Criação da tabela de backup
   - Backup dos dados
   - Criação de tabelas na ordem: projects, expenses, stock_items, employees, sync_control
   - Funções e triggers
   - Configurações de Realtime e RLS

### Se a migração de dados falhar:

1. Verifique os logs no console SQL
2. Execute a migração diretamente pelo app usando o componente `DatabaseMigration`

### Se o app não sincronizar corretamente:

1. Verifique se o Realtime está habilitado no Supabase
2. Confirme que as tabelas têm os campos necessários
3. Verifique os logs do console do navegador para erros

## Benefícios da Nova Estrutura

- **Prevenção de perda de dados**: O sistema de versionamento impede sobrescritas acidentais
- **Sincronização eficiente**: Apenas dados modificados são sincronizados
- **Estrutura organizada**: Cada tipo de entidade tem sua própria tabela
- **Atualizações em tempo real**: As alterações são propagadas instantaneamente
- **Melhor desempenho**: Redução significativa no tráfego de rede e processamento

## Próximos Passos

Após a migração bem-sucedida, você pode:

1. Acompanhar o desempenho do novo sistema
2. Adicionar recursos adicionais como histórico de alterações
3. Melhorar a interface do usuário com indicadores de sincronização

## Suporte

Se precisar de ajuda durante a migração, entre em contato através do [canal de suporte]. 