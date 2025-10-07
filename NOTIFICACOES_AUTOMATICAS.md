# 🔔 Sistema de Notificações Automáticas - CeA APP

## ✅ O que foi implementado:

### 1. **Edge Function no Supabase**
- Nome: `send-expense-notification`
- Envia notificações push via Firebase Cloud Messaging
- Pode enviar para um dispositivo específico ou todos

### 2. **Funções Helper no Frontend** (`src/lib/expenseNotifications.ts`)
- `sendTestNotification()` - Envia notificação de teste
- `checkExpiredExpenses()` - Verifica despesas vencidas
- `notifyUpcomingExpense()` - Notifica despesas próximas do vencimento
- `notifyDataConflict()` - Notifica conflitos de sincronização
- `notifySyncCompleted()` - Notifica quando sync termina

### 3. **Botão de Teste no Header**
- Ícone de sino 🔔 no canto superior direito
- Clique para enviar notificação de teste
- Animação quando está enviando

---

## 🚀 Como Testar AGORA (Método Rápido):

### **ATENÇÃO:** A Edge Function precisa da Firebase Server Key para funcionar!

### Passo 1: Obter Firebase Server Key

1. Acesse: https://console.firebase.google.com
2. Selecione: **cea-gutters-app-b8a3d**
3. Clique em ⚙️ → **Configurações do projeto**
4. Aba **"Cloud Messaging"**
5. Role até **"Cloud Messaging API (Legacy)"**
6. Se não aparecer a chave:
   - Clique em "Gerenciar API no Google Cloud Console"
   - Habilite a "Firebase Cloud Messaging API (Legacy)"
   - Volte para o Firebase Console
7. Copie a **"Chave do servidor"** (Server Key)

### Passo 2: Atualizar a Edge Function

Depois de obter a chave, você precisa:

**Opção A:** Me passar a chave e eu atualizo a função

**Opção B:** Atualizar manualmente no código da Edge Function

---

## 🧪 TESTE ALTERNATIVO (Sem Server Key):

Enquanto você não tem a Server Key, use o **Firebase Console** para testar:

### Teste via Firebase Console:

1. Acesse: https://console.firebase.google.com
2. Projeto: **cea-gutters-app-b8a3d**
3. Menu: **"Messaging"** (ou "Envio de mensagens")
4. Clique: **"Nova campanha"** → **"Mensagens de notificação do Firebase"**
5. Preencha:
   - **Título**: "⚠️ Despesa Vencida!"
   - **Texto**: "Você tem despesas vencidas hoje"
6. Clique em **"Enviar mensagem de teste"**
7. Cole seu token FCM:
   ```
   enLa1sT-9E9zJ2TL768Fyq:APA91bGMrbbUQSx_Sibq8JjFiDYdcXOnNsvHmBGJ_ijyGI_4NSvKqeUFP_dTqAivYOpQ-GqP2Tq0NoVpmiWaErESUGRPE_kaUJX4g2T4nQ2nZJi5xlbHTIE
   ```
8. Clique **"Testar"**

**Você vai receber a notificação imediatamente!** ✅

---

## 🤖 Como Automatizar (Futuro):

### Opção 1: Verificação Manual
```typescript
// Em algum lugar do seu código (App.tsx por exemplo)
useEffect(() => {
  // Verificar despesas vencidas a cada 1 hora
  const interval = setInterval(async () => {
    await checkExpiredExpenses(expenses);
  }, 60 * 60 * 1000); // 1 hora

  return () => clearInterval(interval);
}, [expenses]);
```

### Opção 2: Supabase Cron Job (Recomendado)
Criar um cron job no Supabase que roda todo dia às 8h da manhã:

```sql
-- No Supabase Dashboard → Database → Cron Jobs
SELECT cron.schedule(
  'check-expired-expenses',
  '0 8 * * *', -- Todo dia às 8h
  $$
  SELECT 
    net.http_post(
      url:='https://mnucrulwdurskwofsgwp.supabase.co/functions/v1/send-expense-notification',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:='{"title": "⚠️ Verificar Despesas", "body": "Você tem despesas vencidas"}'::jsonb
    );
  $$
);
```

### Opção 3: Trigger no Banco
Criar trigger quando uma despesa vence:

```sql
CREATE OR REPLACE FUNCTION notify_expense_due()
RETURNS trigger AS $$
BEGIN
  -- Chamar Edge Function quando detectar vencimento
  PERFORM net.http_post(
    url := 'https://mnucrulwdurskwofsgwp.supabase.co/functions/v1/send-expense-notification',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'title', '⚠️ Despesa Vencida',
      'body', NEW.description || ' venceu hoje!'
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Cenários de Uso:

### 1. **Despesa Vence Hoje**
```typescript
// Verificação diária automática
const today = new Date();
expenses.forEach(expense => {
  if (expense.dueDate === today && !expense.paid) {
    notifyUpcomingExpense(expense, 0);
  }
});
```

### 2. **Lembrete 3 dias antes**
```typescript
const in3Days = new Date();
in3Days.setDate(in3Days.getDate() + 3);

expenses.forEach(expense => {
  if (expense.dueDate === in3Days && !expense.paid) {
    notifyUpcomingExpense(expense, 3);
  }
});
```

### 3. **Conflito Detectado**
```typescript
// No seu código de sync
if (hasConflict) {
  await notifyDataConflict();
}
```

### 4. **Sync Concluído**
```typescript
// Após sincronização bem-sucedida
await notifySyncCompleted(itemsSynced);
```

---

## 🎯 Próximos Passos:

1. ✅ Obter Firebase Server Key
2. ✅ Atualizar Edge Function com a chave
3. ✅ Clicar no botão 🔔 no app para testar
4. ✅ Implementar verificação automática de vencimentos
5. ✅ (Opcional) Criar cron job no Supabase

---

## 💡 Dica:

Por enquanto, teste usando o **Firebase Console** (método descrito acima). É a forma mais rápida de ver as notificações funcionando!

