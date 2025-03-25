# Solução para Problemas de Sincronização

## Problema Original

O app estava enfrentando um problema crítico de sincronização onde as alterações feitas pelo usuário A eram sobrescritas pelo usuário B quando este voltava do segundo plano ou inatividade. Isso causava perda de dados e inconsistências.

## Causa Raiz do Problema

Após análise detalhada, identificamos os seguintes problemas:

1. **Estrutura inadequada do banco de dados**: Todos os dados estavam sendo armazenados em uma única tabela `sync_data` como JSONB, misturando diferentes tipos de entidades (despesas, projetos, funcionários, estoque).

2. **Sobrescrição completa**: O sistema estava substituindo todo o documento ao invés de fazer alterações granulares.

3. **Ausência de controle de versão**: Não havia forma de determinar qual versão dos dados era mais recente ou detectar conflitos.

4. **Sincronização incompleta**: A sincronização não era feita de forma adequada quando o app voltava do segundo plano.

## Solução Implementada

Nossa solução reorganiza completamente a estrutura de dados e o mecanismo de sincronização:

### 1. Nova Estrutura de Banco de Dados

Substituímos a tabela única `sync_data` por tabelas específicas para cada tipo de entidade:

- `expenses`: Armazena todas as despesas
- `projects`: Armazena todos os projetos
- `stock_items`: Armazena itens de estoque
- `employees`: Armazena funcionários
- `sync_control`: Controle de sincronização (incluindo valores do Will)

Cada tabela inclui:
- Identificador único (UUID)
- Timestamps de criação e atualização
- Versão (para controle de conflitos)
- Campo `last_modified_by` para identificar quem fez a alteração
- Campos específicos para cada tipo de entidade

### 2. Sistema de Versionamento

Cada registro em cada tabela possui um número de versão que é incrementado a cada alteração. Isso permite:

- Detectar qual versão é mais recente
- Sincronizar apenas as alterações necessárias
- Identificar quando ocorrem conflitos

### 3. Sincronização em Tempo Real

Implementamos um sistema de sincronização que:

- Observa alterações em cada tabela usando o Supabase Realtime
- Ignora alterações feitas pelo próprio cliente (usando SESSION_ID)
- Atualiza apenas o que foi modificado, não o documento inteiro

### 4. Sincronização ao Voltar do Segundo Plano

O sistema agora detecta quando o app:
- Retorna do segundo plano
- Recebe a primeira interação do usuário após carregar
- Precisa de sincronização periódica

Em todos esses casos, ele verifica alterações no servidor e sincroniza apenas o necessário.

## Como Implementar a Solução

### 1. Configuração do Banco de Dados

Execute o script `setup_database.sql` no Console SQL do Supabase. Este script:

- Faz backup dos dados existentes
- Cria as novas tabelas com a estrutura adequada
- Configura triggers para atualização automática de timestamps
- Habilita Realtime para todas as tabelas
- Configura políticas de segurança (RLS)
- Cria uma função para migrar dados existentes

### 2. Substituição do Código de Sincronização

Substitua os arquivos de código relacionados à sincronização:

1. Novo serviço de sincronização: `src/lib/syncService.ts`
2. Estrutura do banco de dados: `src/lib/databaseStructure.ts`

### 3. Migração de Dados

A migração pode ser feita de duas formas:

1. **Automática via SQL**: Execute `SELECT migrate_data_to_new_structure();` no Console SQL
2. **Via código**: O novo sistema detectará dados na tabela antiga e os migrará automaticamente

## Benefícios da Nova Solução

- **Prevenção de perda de dados**: O controle de versão previne sobrescritas acidentais
- **Sincronização eficiente**: Apenas os dados alterados são transmitidos
- **Detecção de conflitos**: O sistema identifica quando dois usuários alteram o mesmo item
- **Sincronização em tempo real**: Alterações são propagadas imediatamente
- **Estrutura organizada**: Cada tipo de entidade tem sua própria tabela
- **Facilidade de manutenção**: Código mais organizado e menos propenso a erros

## Próximos Passos

1. Execute o script SQL para configurar o banco de dados
2. Teste a migração de dados em um ambiente controlado
3. Atualize o código do app para usar o novo sistema de sincronização
4. Faça testes extensivos com múltiplos usuários

## Considerações Importantes

- Esta solução é compatível com a versão atual do app
- A migração preserva todos os dados existentes
- O novo sistema é mais eficiente em termos de uso de rede e processamento
- É recomendado fazer um backup completo antes de implementar as mudanças

---

## Explicação Técnica do Funcionamento

### Funcionamento da Sincronização

1. Cada cliente gera um ID de sessão único (SESSION_ID)
2. Quando um registro é modificado:
   - O cliente incrementa a versão do registro
   - Adiciona seu SESSION_ID como `last_modified_by`
   - Envia a alteração para o servidor

3. Quando uma alteração é recebida pelo Realtime:
   - O cliente verifica se não foi ele mesmo que fez a alteração (SESSION_ID)
   - Compara a versão recebida com a versão local
   - Aplica a alteração se for mais recente

4. Ao retornar do segundo plano:
   - O cliente obtém todas as alterações desde a última sincronização
   - Aplica as alterações na ordem correta de versão
   - Atualiza a UI para refletir as mudanças 