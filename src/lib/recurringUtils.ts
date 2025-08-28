import { Expense } from '../types';

/**
 * Supported recurrence types
 */
export type RecurrenceType = 'monthly' | 'biweekly' | 'weekly' | 'none';

/**
 * Detects if an expense is recurring and what type based on description
 * Conventions: 
 * - "*M" = monthly
 * - "*B" = biweekly  
 * - "*W" = weekly
 */
export function getRecurrenceType(expense: Expense): RecurrenceType {
  const desc = expense.description;
  if (desc.endsWith('*M')) return 'monthly';
  if (desc.endsWith('*B')) return 'biweekly';
  if (desc.endsWith('*W')) return 'weekly';
  return 'none';
}

/**
 * Detecta se uma despesa é recorrente (qualquer tipo)
 */
export function isRecurringExpense(expense: Expense): boolean {
  return getRecurrenceType(expense) !== 'none';
}

/**
 * Obtém o status de uma despesa considerando lógica recorrente
 */
export function getExpenseStatus(expense: Expense) {
  const today = new Date();
  const dueDate = new Date(expense.date);
  const isPaid = expense.is_paid || expense.paid;
  
  // Se é recorrente, verificar se foi paga este mês
  if (isRecurringExpense(expense)) {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const dueMonth = dueDate.getMonth();
    const dueYear = dueDate.getFullYear();
    
    // Se é do mês atual e foi paga, fica verde
    if (currentMonth === dueMonth && currentYear === dueYear && isPaid) {
      return {
        status: 'paid-this-month',
        class: 'bg-green-50 border-l-4 border-green-500',
        text: 'Paid this month'
      };
    }
    
    // Se não foi paga ou é de mês anterior, fica vermelha
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      // Overdue - show when it was due and next due date
      const recurrenceType = getRecurrenceType(expense);
      let nextDueDate = new Date(dueDate);
      
      // Calculate next due date based on recurrence type
      if (recurrenceType === 'monthly') {
        nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDate.getDate());
        if (nextDueDate <= today) {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }
      } else if (recurrenceType === 'biweekly') {
        nextDueDate = new Date(dueDate);
        while (nextDueDate <= today) {
          nextDueDate.setDate(nextDueDate.getDate() + 14);
        }
      } else if (recurrenceType === 'weekly') {
        nextDueDate = new Date(dueDate);
        while (nextDueDate <= today) {
          nextDueDate.setDate(nextDueDate.getDate() + 7);
        }
      }
      
      return {
        status: 'overdue-recurring',
        class: 'bg-red-50 border-l-4 border-red-500',
        text: `Overdue since ${dueDate.getDate()}/${dueDate.getMonth() + 1}`,
        overdueDate: dueDate,
        nextDueDate
      };
    }
    
    return {
      status: 'due-soon',
      class: diffDays <= 3 ? 'bg-yellow-50 border-l-4 border-yellow-500' : '',
      text: diffDays === 0 ? 'Due today' : diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays} days`
    };
  }
  
  // Lógica normal para despesas não recorrentes
  if (isPaid) {
    return {
      status: 'paid',
      class: 'bg-green-50 border-l-4 border-green-500',
      text: 'Paid'
    };
  }
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      status: 'overdue',
      class: 'bg-red-50 border-l-4 border-red-500',
      text: 'Overdue'
    };
  }
  
  if (diffDays <= 3) {
    return {
      status: 'due-soon',
      class: 'bg-yellow-50 border-l-4 border-yellow-500',
      text: diffDays === 0 ? 'Due today' : diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays} days`
    };
  }
  
  return {
    status: 'normal',
    class: '',
    text: `Due in ${diffDays} days`
  };
}

/**
 * Função que pode ser chamada no início do mês para resetar despesas recorrentes
 * Retorna uma lista de despesas que precisam ser atualizadas
 */
export function getMonthlyResetUpdates(expenses: Expense[]): { expense: Expense, newExpense: Expense }[] {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const updates: { expense: Expense, newExpense: Expense }[] = [];
  
  expenses.forEach(expense => {
    if (!isRecurringExpense(expense)) return;
    
    const dueDate = new Date(expense.date);
    const expenseMonth = dueDate.getMonth();
    const expenseYear = dueDate.getFullYear();
    
    // Se a despesa é de mês anterior e foi paga
    if ((expenseYear < currentYear || (expenseYear === currentYear && expenseMonth < currentMonth)) && 
        (expense.is_paid || expense.paid)) {
      
      // Criar nova data para este mês
      const newDueDate = new Date(currentYear, currentMonth, dueDate.getDate());
      
      const newExpense: Expense = {
        ...expense,
        date: newDueDate.toISOString(),
        is_paid: false,
        paid: false
      };
      
      updates.push({ expense, newExpense });
    }
  });
  
  return updates;
}
