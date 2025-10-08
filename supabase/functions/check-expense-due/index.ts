import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('[check-expense-due] Iniciando verificação de despesas...')

    // Buscar todos os dados de sync
    const { data: syncData, error: syncError } = await supabaseClient
      .from('sync_data')
      .select('data')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (syncError) {
      console.error('Erro ao buscar sync_data:', syncError)
      throw syncError
    }

    if (!syncData || syncData.length === 0) {
      console.log('Nenhum dado encontrado em sync_data')
      return new Response(
        JSON.stringify({ message: 'Nenhum dado encontrado', notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const appData = syncData[0].data
    console.log('[check-expense-due] Dados carregados:', JSON.stringify(appData).substring(0, 200))

    // Extrair todas as despesas de todas as listas
    const allExpenses: any[] = []
    const listNames = ['carlos', 'diego', 'ceA']

    for (const listName of listNames) {
      const listKey = listName === 'carlos' ? 'Carlos' : listName === 'diego' ? 'Diego' : 'C&A'
      const expenses = appData?.expenses?.[listKey] || []
      
      for (const expense of expenses) {
        allExpenses.push({
          ...expense,
          listName: listKey
        })
      }
    }

    console.log(`[check-expense-due] Total de despesas encontradas: ${allExpenses.length}`)

    // Verificar vencimentos
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    let notificationsSent = 0
    const notificationsLog: any[] = []

    for (const expense of allExpenses) {
      const dueDate = new Date(expense.due_date)
      dueDate.setHours(0, 0, 0, 0)

      const diffTime = dueDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      console.log(`[check-expense-due] Despesa: ${expense.description}, Vencimento: ${expense.due_date}, Dias até vencer: ${diffDays}`)

      // Notificar se vence em 3 dias
      if (diffDays === 3) {
        console.log(`🔔 Despesa vence em 3 dias: ${expense.description}`)
        const notificationResult = await sendNotification(
          expense,
          expense.listName,
          3,
          expense.value || 0
        )
        notificationsLog.push({
          expense: expense.description,
          type: '3_days',
          success: notificationResult
        })
        if (notificationResult) notificationsSent++
      }

      // Notificar se vence hoje
      if (diffDays === 0) {
        console.log(`🔔 Despesa vence HOJE: ${expense.description}`)
        const notificationResult = await sendNotification(
          expense,
          expense.listName,
          0,
          expense.value || 0
        )
        notificationsLog.push({
          expense: expense.description,
          type: 'today',
          success: notificationResult
        })
        if (notificationResult) notificationsSent++
      }
    }

    console.log(`[check-expense-due] Notificações enviadas: ${notificationsSent}`)
    console.log('[check-expense-due] Log de notificações:', JSON.stringify(notificationsLog, null, 2))

    return new Response(
      JSON.stringify({
        message: 'Verificação concluída',
        notificationsSent,
        expensesChecked: allExpenses.length,
        log: notificationsLog
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[check-expense-due] Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function sendNotification(
  expense: any,
  listName: string,
  daysUntilDue: number,
  amount: number
): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const title = daysUntilDue === 0 ? '🔔 Vencimento Hoje!' : '🔔 Vencimento Próximo'
    const body = daysUntilDue === 0
      ? `${expense.description} - R$ ${amount.toFixed(2)}\nVence HOJE!`
      : `${expense.description} - R$ ${amount.toFixed(2)}\nVence em ${daysUntilDue} dias`

    const data = {
      type: 'expense',
      expenseId: expense.id,
      listName: listName,
      action: 'view'
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-expense-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ title, body, data })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Erro ao enviar notificação: ${response.status} - ${errorText}`)
      return false
    }

    console.log(`✅ Notificação enviada para: ${expense.description}`)
    return true

  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    return false
  }
}

