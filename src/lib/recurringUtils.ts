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
    
    // Se foi paga, fica verde (independente do mês)
    if (isPaid) {
      // Formatar data como MM/DD
      const formattedDate = `${String(dueDate.getMonth() + 1).padStart(2, '0')}/${String(dueDate.getDate()).padStart(2, '0')}`;
      
      // Calcular próxima data de vencimento para itens pagos
      const recurrenceType = getRecurrenceType(expense);
      let nextDueDate = new Date(dueDate);
      
      // Calculate next due date based on recurrence type
      if (recurrenceType === 'monthly') {
        // Para mensal, sempre calcular a próxima data baseada na data original de vencimento
        // Calcular o próximo mês mantendo o dia original
        const nextMonth = dueDate.getMonth() + 1;
        const nextYear = dueDate.getFullYear();
        const originalDay = dueDate.getDate();
        
        // Criar a data do próximo mês
        nextDueDate = new Date(nextYear, nextMonth, originalDay);
        
        // Se o dia não existe no próximo mês (ex: 31 de janeiro → 31 de fevereiro)
        // ajustar para o último dia do mês
        if (nextDueDate.getDate() !== originalDay) {
          nextDueDate = new Date(nextYear, nextMonth + 1, 0); // Último dia do mês
        }
        
      } else if (recurrenceType === 'biweekly') {
        // Para quinzenal, sempre calcular a próxima data baseada na data original
        nextDueDate = new Date(dueDate);
        nextDueDate.setDate(nextDueDate.getDate() + 14);
      } else if (recurrenceType === 'weekly') {
        // Para semanal, sempre calcular a próxima data baseada na data original
        nextDueDate = new Date(dueDate);
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      }
      
      // Formatar nome do mês
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const nextMonthName = monthNames[nextDueDate.getMonth()];
      
      return {
        status: 'paid-this-month',
        class: 'bg-green-50 border-l-4 border-green-500',
        text: `${formattedDate} Paid`,
        nextDueDate,
        nextDueText: `Next due in ${nextMonthName} ${nextDueDate.getDate()}`
      };
    }
    
    // Se não foi paga, verificar se está vencida
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      // Overdue - mostrar "Due since [data]"
      const formattedDate = `${String(dueDate.getMonth() + 1).padStart(2, '0')}/${String(dueDate.getDate()).padStart(2, '0')}`;
      
      return {
        status: 'overdue-recurring',
        class: 'bg-red-50 border-l-4 border-red-500',
        text: `Due since ${formattedDate}`,
        overdueDate: dueDate
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
