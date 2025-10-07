import { supabase } from './supabase';
import { Expense, Project } from '../types';

/**
 * Envia notificação via Edge Function do Supabase
 */
export const sendExpenseNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>,
  deviceId?: string
): Promise<boolean> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-expense-notification', {
      body: {
        title,
        body,
        data, // Dados extras para deep link
        deviceId // Se não passar, envia para todos os dispositivos
      }
    });

    if (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }

    console.log('✅ Notificação enviada:', result);
    return true;
  } catch (error) {
    console.error('Erro ao chamar Edge Function:', error);
    return false;
  }
};

/**
 * Verifica despesas vencidas e envia notificações
 */
export const checkExpiredExpenses = async (
  expenses: Record<string, Expense[]>
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expiredCount = 0;
    const expiredDetails: string[] = [];

    // Verificar todas as listas
    Object.entries(expenses).forEach(([listName, expenseList]) => {
      expenseList.forEach((expense) => {
        if (expense.dueDate) {
          const dueDate = new Date(expense.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          // Verificar se venceu hoje ou está atrasada
          if (dueDate <= today && !expense.paid) {
            expiredCount++;
            expiredDetails.push(`${expense.description} (${listName})`);
          }
        }
      });
    });

    // Se houver despesas vencidas, enviar notificação
    if (expiredCount > 0) {
      const title = `⚠️ ${expiredCount} despesa(s) vencida(s)`;
      const body = expiredDetails.slice(0, 3).join(', ') + 
                   (expiredCount > 3 ? ` e mais ${expiredCount - 3}...` : '');

      await sendExpenseNotification(title, body);
      
      console.log(`🔔 Notificação enviada para ${expiredCount} despesas vencidas`);
    }
  } catch (error) {
    console.error('Erro ao verificar despesas vencidas:', error);
  }
};

/**
 * Envia notificação de teste
 */
export const sendTestNotification = async (): Promise<boolean> => {
  return await sendExpenseNotification(
    '🧪 Notificação de Teste',
    'Sistema de notificações automáticas funcionando perfeitamente!'
  );
};

/**
 * Notifica quando uma despesa está próxima do vencimento
 */
export const notifyUpcomingExpense = async (expense: Expense, daysUntilDue: number) => {
  const title = `📅 Despesa vence em ${daysUntilDue} dia(s)`;
  const body = `${expense.description} - R$ ${expense.value.toFixed(2)}`;
  
  await sendExpenseNotification(title, body);
};

/**
 * Notifica quando há conflito de dados
 */
export const notifyDataConflict = async () => {
  const title = '⚠️ Conflito Detectado';
  const body = 'Seus dados foram atualizados em outro dispositivo. Por favor, revise.';
  
  await sendExpenseNotification(title, body);
};

/**
 * Notifica quando sincronização é concluída
 */
export const notifySyncCompleted = async (itemsCount: number) => {
  const title = '✅ Sincronização Concluída';
  const body = `${itemsCount} item(ns) sincronizado(s) com sucesso`;
  
  await sendExpenseNotification(title, body);
};

/**
 * Notifica despesa vencendo em X dias
 */
export const notifyExpenseDueSoon = async (
  expense: Expense,
  listName: string,
  daysUntilDue: number,
  amount: number
): Promise<boolean> => {
  const title = `🔔 Vencimento Próximo`;
  const body = `${expense.description} - R$ ${amount.toFixed(2)}\nVence em ${daysUntilDue} dias`;
  
  const data = {
    type: 'expense',
    expenseId: expense.id,
    listName: listName,
    action: 'view'
  };
  
  return await sendExpenseNotification(title, body, data);
};

/**
 * Notifica despesa vencendo HOJE
 */
export const notifyExpenseDueToday = async (
  expense: Expense,
  listName: string,
  amount: number
): Promise<boolean> => {
  const title = `⚠️ Despesa Vence Hoje!`;
  const body = `${expense.description} - R$ ${amount.toFixed(2)}\nVencimento: HOJE`;
  
  const data = {
    type: 'expense',
    expenseId: expense.id,
    listName: listName,
    action: 'view'
  };
  
  return await sendExpenseNotification(title, body, data);
};

/**
 * Notifica quando novo projeto é criado
 */
export const notifyNewProject = async (project: Project): Promise<boolean> => {
  const title = `🆕 Novo Projeto Adicionado`;
  const location = project.location ? `\n${project.location.substring(0, 30)}...` : '';
  const value = project.value ? `\nValor: R$ ${project.value.toFixed(2)}` : '';
  const body = `Cliente: ${project.client}${location}${value}`;
  
  const data = {
    type: 'project',
    projectId: project.id,
    action: 'view'
  };
  
  return await sendExpenseNotification(title, body, data);
};

/**
 * Notifica quando status do projeto muda
 */
export const notifyProjectStatusChange = async (
  project: Project,
  oldStatus: string,
  newStatus: string
): Promise<boolean> => {
  // Mapear status para texto em português
  const statusMap: Record<string, { emoji: string; text: string }> = {
    'pending': { emoji: '⏳', text: 'Pendente' },
    'in_progress': { emoji: '🚧', text: 'Em Andamento' },
    'completed': { emoji: '✅', text: 'Concluído' }
  };
  
  const statusInfo = statusMap[newStatus] || { emoji: '📊', text: newStatus };
  const title = `${statusInfo.emoji} Projeto ${statusInfo.text}`;
  
  const location = project.location ? `\n${project.location.substring(0, 30)}...` : '';
  const value = project.value ? `\nValor: R$ ${project.value.toFixed(2)}` : '';
  const body = `Cliente: ${project.client}${location}${value}`;
  
  const data = {
    type: 'project',
    projectId: project.id,
    action: 'view',
    oldStatus,
    newStatus
  };
  
  return await sendExpenseNotification(title, body, data);
};

/**
 * Envia lembrete para atualizar dias trabalhados dos funcionários
 */
export const notifyEmployeeReminder = async (): Promise<boolean> => {
  const title = `⏰ Hora de Atualizar!`;
  const body = `Atualize os dias trabalhados dos funcionários`;
  
  const data = {
    type: 'employee_reminder',
    action: 'navigate',
    category: 'Employees'
  };
  
  return await sendExpenseNotification(title, body, data);
};
