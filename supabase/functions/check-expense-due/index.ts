import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Normaliza uma data para meia-noite UTC (ignora timezone e horário de verão)
 * Retorna o timestamp em ms correspondente a 00:00:00 UTC do dia
 */
function toUTCMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/**
 * Calcula a diferença em dias entre duas datas, usando UTC puro
 * Retorna número inteiro de dias (positivo = futuro, negativo = passado, 0 = hoje)
 */
function diffDaysUTC(fromDate: Date, toDate: Date): number {
  const fromUTC = toUTCMidnight(fromDate)
  const toUTC = toUTCMidnight(toDate)
  const diffMs = toUTC - fromUTC
  // Usar Math.floor para garantir dias completos
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
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
      .select('expenses, projects, employees')
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

    const appData = syncData[0]
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

    // Data de hoje (para logs e cálculos)
    const today = new Date()
    const todayUTC = toUTCMidnight(today)
    console.log(`[check-expense-due] Hoje (UTC midnight): ${new Date(todayUTC).toISOString()}`)

    let notificationsSent = 0
    let skippedPaid = 0
    const notificationsLog: any[] = []

    for (const expense of allExpenses) {
      const description = expense.description || ''
      
      // ========================================
      // CORREÇÃO 1: Verificar se está paga ANTES de qualquer processamento
      // ========================================
      const isPaid = expense.is_paid === true || expense.paid === true
      
      if (isPaid) {
        console.log(`[SKIP-PAID] Despesa "${description}" está marcada como PAGA. Pulando notificação.`)
        skippedPaid++
        continue // Pula completamente esta despesa
      }

      // Detectar tipo de recorrência pela descrição
      const isMonthly = description.endsWith('*M')
      const isBiweekly = description.endsWith('*B')
      const isWeekly = description.endsWith('*W')
      const isRecurring = isMonthly || isBiweekly || isWeekly

      // Obter a data base
      if (!expense.date) {
        console.log(`[check-expense-due] Despesa sem data: ${description}`)
        continue
      }

      const originalDate = new Date(expense.date)

      let dueDate: Date

      if (isRecurring) {
        // Para despesas recorrentes, calcular a próxima data de vencimento
        // Usar UTC para evitar problemas de timezone
        const currentMonth = today.getUTCMonth()
        const currentYear = today.getUTCFullYear()
        const originalDay = originalDate.getUTCDate()
        
        if (isMonthly) {
          // Calcular data do mês atual (em UTC)
          dueDate = new Date(Date.UTC(currentYear, currentMonth, originalDay))
          
          // Se já passou neste mês, avançar para o próximo mês
          if (toUTCMidnight(dueDate) < todayUTC) {
            dueDate = new Date(Date.UTC(currentYear, currentMonth + 1, originalDay))
          }
        } else if (isBiweekly || isWeekly) {
          // Para biweekly e weekly, calcular a próxima ocorrência
          dueDate = new Date(Date.UTC(
            originalDate.getUTCFullYear(),
            originalDate.getUTCMonth(),
            originalDate.getUTCDate()
          ))
          const daysToAdd = isBiweekly ? 14 : 7
          
          while (toUTCMidnight(dueDate) < todayUTC) {
            dueDate.setUTCDate(dueDate.getUTCDate() + daysToAdd)
          }
        } else {
          dueDate = originalDate
        }
      } else {
        // Despesa única, usar a data original
        dueDate = originalDate
      }

      // ========================================
      // CORREÇÃO 2: Calcular diffDays usando UTC puro
      // ========================================
      const diffDays = diffDaysUTC(today, dueDate)
      
      // Log detalhado para debug
      console.log(`[check-expense-due] Despesa: "${description}"`)
      console.log(`  - Data Original: ${expense.date}`)
      console.log(`  - Data Venc (UTC): ${dueDate.toISOString()}`)
      console.log(`  - Hoje (UTC): ${new Date(todayUTC).toISOString()}`)
      console.log(`  - diffDays: ${diffDays}`)
      console.log(`  - Recorrente: ${isRecurring ? (isMonthly ? 'Mensal' : isBiweekly ? 'Quinzenal' : 'Semanal') : 'Não'}`)
      console.log(`  - is_paid: ${expense.is_paid}, paid: ${expense.paid}`)

      // Notificar se vence em 3 dias
      if (diffDays === 3) {
        console.log(`🔔 Despesa vence em 3 dias: ${description}`)
        const notificationResult = await sendNotification(
          expense,
          expense.listName,
          3,
          expense.amount || 0
        )
        notificationsLog.push({
          expense: description,
          dueDate: dueDate.toISOString(),
          type: '3_days',
          success: notificationResult
        })
        if (notificationResult) notificationsSent++
      }

      // Notificar se vence hoje
      if (diffDays === 0) {
        console.log(`🔔 Despesa vence HOJE: ${description}`)
        const notificationResult = await sendNotification(
          expense,
          expense.listName,
          0,
          expense.amount || 0
        )
        notificationsLog.push({
          expense: description,
          dueDate: dueDate.toISOString(),
          type: 'today',
          success: notificationResult
        })
        if (notificationResult) notificationsSent++
      }
    }

    console.log(`[check-expense-due] === RESUMO ===`)
    console.log(`[check-expense-due] Total de despesas: ${allExpenses.length}`)
    console.log(`[check-expense-due] Despesas puladas (pagas): ${skippedPaid}`)
    console.log(`[check-expense-due] Notificações enviadas: ${notificationsSent}`)
    console.log('[check-expense-due] Log de notificações:', JSON.stringify(notificationsLog, null, 2))

    return new Response(
      JSON.stringify({
        message: 'Verificação concluída',
        notificationsSent,
        expensesChecked: allExpenses.length,
        skippedPaid,
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
