# Melhorias no Sistema de Sincronização

Este documento descreve as melhorias implementadas no sistema de sincronização do aplicativo CeA APP para resolver os problemas de sincronização em tempo real com o Supabase.

## Problemas Anteriores

O sistema anterior apresentava os seguintes problemas:

1. **Sincronização em espelho**: O sistema forçava todos os dispositivos a terem listas idênticas, substituindo listas inteiras em vez de sincronizar apenas as mudanças.
2. **Sobrescrita de dados**: Quando um usuário abria o app desatualizado e interagia com a lista, ele podia sobrescrever as alterações feitas por outros usuários.
3. **Falta de sincronização automática**: Quando o app estava em segundo plano e o usuário voltava a usá-lo, não havia sincronização imediata.

## Nova Solução

A nova implementação adota uma abordagem baseada em eventos para sincronização:

1. **Sincronização baseada em alterações individuais**: Cada alteração (adição, edição, exclusão) é registrada como um evento separado.
2. **Sem sobrescrita de dados**: As alterações são aplicadas de forma incremental, respeitando as alterações feitas por outros usuários.
3. **Sincronização automática**: Quando o app volta ao primeiro plano, ocorre uma sincronização automática para obter as alterações mais recentes.

## Requisitos para Configuração

### 1. Configuração do Banco de Dados Supabase

Execute o script SQL contido no arquivo `setup-table.sql` no seu banco de dados Supabase para:

- Criar a tabela `item_changes` para registrar eventos de alteração
- Configurar índices para melhorar o desempenho
- Estabelecer políticas de segurança para acesso à tabela
- Criar uma função para limpeza periódica de registros antigos

### 2. Configuração do Aplicativo

O novo código já está integrado ao aplicativo. Não são necessárias configurações adicionais no lado do cliente.

## Como Funciona

### Eventos de Alteração

Cada vez que um item é adicionado, atualizado ou excluído, o sistema:

1. Aplica a alteração localmente
2. Publica um evento de alteração para o Supabase
3. Os outros dispositivos recebem o evento em tempo real
4. A alteração é aplicada apenas para o item específico, não para a lista inteira

### Detecção de Visibilidade

O sistema detecta quando o aplicativo volta ao primeiro plano e inicia automaticamente uma sincronização, garantindo que o usuário sempre veja os dados mais recentes.

### Compatibilidade com Versões Anteriores

A nova implementação mantém compatibilidade com o sistema anterior para evitar problemas durante a transição.

## Monitoramento e Manutenção

### Limpeza de Dados

A função `cleanup_old_changes()` deve ser configurada para execução periódica no Supabase para evitar o crescimento excessivo da tabela de eventos. Recomendamos configurar uma tarefa programada para executá-la semanalmente.

### Monitoramento

O sistema registra informações detalhadas no console do navegador para facilitar a depuração. Em caso de problemas, verifique os logs para identificar possíveis falhas de sincronização.

## Funções Principais para Integração

### Criando Itens

```typescript
// Para adicionar um novo item
saveItem('expense', novaDepesa, CHANGE_TYPE.ADD, 'C&A');
saveItem('project', novoProjeto, CHANGE_TYPE.ADD);
saveItem('stock', novoItemEstoque, CHANGE_TYPE.ADD);
saveItem('employee', novoFuncionario, CHANGE_TYPE.ADD, 'Matheus');
```

### Atualizando Itens

```typescript
// Para atualizar um item existente
saveItem('expense', despesaAtualizada, CHANGE_TYPE.UPDATE, 'C&A');
saveItem('project', projetoAtualizado, CHANGE_TYPE.UPDATE);
```

### Excluindo Itens

```typescript
// Para excluir um item
saveItem('expense', despesaParaExcluir, CHANGE_TYPE.DELETE, 'C&A');
saveItem('project', projetoParaExcluir, CHANGE_TYPE.DELETE);
```

### Forçando Sincronização

```typescript
// Para forçar uma sincronização imediata
syncService.forceSyncNow();
``` 