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
        data,
        deviceId
      }
    });

    if (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }

    console.log('Notificação enviada:', result);
    return true;
  } catch (error) {
    console.error('Erro ao chamar Edge Function:', error);
    return false;
  }
};

export const checkExpiredExpenses = async (
  expenses: Record<string, Expense[]>
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expiredCount = 0;
    const expiredDetails: string[] = [];

    Object.entries(expenses).forEach(([listName, expenseList]) => {
      expenseList.forEach((expense) => {
        if (expense.dueDate) {
          const dueDate = new Date(expense.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate <= today && !expense.paid) {
            expiredCount++;
            expiredDetails.push(`${expense.description} (${listName})`);
          }
        }
      });
    });

    if (expiredCount > 0) {
      const title = `${expiredCount} overdue expense${expiredCount > 1 ? 's' : ''}`;
      const body = expiredDetails.slice(0, 3).join(', ') +
                   (expiredCount > 3 ? ` and ${expiredCount - 3} more...` : '');
      await sendExpenseNotification(title, body);
    }
  } catch (error) {
    console.error('Erro ao verificar despesas vencidas:', error);
  }
};

export const sendTestNotification = async (): Promise<boolean> => {
  return await sendExpenseNotification(
    'Test Notification',
    'Automatic notification system is working correctly!'
  );
};

export const notifyUpcomingExpense = async (expense: Expense, daysUntilDue: number) => {
  const title = `Expense due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`;
  const body = `${expense.description} - $${expense.value.toFixed(2)}`;
  await sendExpenseNotification(title, body);
};

export const notifyDataConflict = async () => {
  const title = 'Data Conflict Detected';
  const body = 'Your data was updated on another device. Please review.';
  await sendExpenseNotification(title, body);
};

export const notifySyncCompleted = async (itemsCount: number) => {
  const title = 'Sync Completed';
  const body = `${itemsCount} item${itemsCount > 1 ? 's' : ''} synced successfully`;
  await sendExpenseNotification(title, body);
};

export const notifyExpenseDueSoon = async (
  expense: Expense,
  listName: string,
  daysUntilDue: number,
  amount: number
): Promise<boolean> => {
  const title = `Upcoming Payment`;
  const body = `${expense.description} - $${amount.toFixed(2)} — due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`;

  const data = {
    type: 'expense',
    expenseId: expense.id,
    listName,
    action: 'view'
  };

  return await sendExpenseNotification(title, body, data);
};

export const notifyExpenseDueToday = async (
  expense: Expense,
  listName: string,
  amount: number
): Promise<boolean> => {
  const title = 'Payment Due Today';
  const body = `${expense.description} - $${amount.toFixed(2)}`;

  const data = {
    type: 'expense',
    expenseId: expense.id,
    listName,
    action: 'view'
  };

  return await sendExpenseNotification(title, body, data);
};

export const notifyNewProject = async (project: Project): Promise<boolean> => {
  const title = 'New Project Added';
  const location = project.location ? ` — ${project.location.substring(0, 30)}` : '';
  const value = project.value ? ` — $${project.value.toFixed(2)}` : '';
  const body = `Client: ${project.client}${location}${value}`;

  const data = {
    type: 'project',
    projectId: project.id,
    action: 'view'
  };

  return await sendExpenseNotification(title, body, data);
};

export const notifyProjectStatusChange = async (
  project: Project,
  oldStatus: string,
  newStatus: string
): Promise<boolean> => {
  const statusMap: Record<string, string> = {
    'pending': 'Pending',
    'in_progress': 'In Progress',
    'completed': 'Completed'
  };

  const statusText = statusMap[newStatus] || newStatus;
  const title = `Project ${statusText}`;
  const location = project.location ? ` — ${project.location.substring(0, 30)}` : '';
  const value = project.value ? ` — $${project.value.toFixed(2)}` : '';
  const body = `Client: ${project.client}${location}${value}`;

  const data = {
    type: 'project',
    projectId: project.id,
    action: 'view',
    oldStatus,
    newStatus
  };

  return await sendExpenseNotification(title, body, data);
};

export const notifyEmployeeReminder = async (): Promise<boolean> => {
  const title = 'Daily Reminder';
  const body = 'Update employee work days for today';

  const data = {
    type: 'employee_reminder',
    action: 'navigate',
    category: 'Employees'
  };

  return await sendExpenseNotification(title, body, data);
};
