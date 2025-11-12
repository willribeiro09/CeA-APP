import { addDays, addMonths, addWeeks, differenceInDays } from 'date-fns';
import { Expense, ExpenseInstallment } from '../types';
import { getRecurrenceType } from './recurringUtils';

export type CardExpenseEntry = {
  description: string;
  amount: number;
  daysOverdue: number; // 0 for due soon
  projectName: string;
  dueDate?: string; // ISO string for original due date (used for display)
};

/**
 * Constrói listas para o card "To Pay" refletindo exatamente a lógica da lista:
 * - Considera exclusivamente a lista "C&A"
 * - Overdue: parcelas não pagas com data < hoje (vermelho)
 * - Due soon: parcelas não pagas com data em 0-3 dias (amarelo)
 * - Só considera itens do mês atual para "devido no mês", mas inclui atrasados anteriores não pagos
 */
export function buildCardExpensesFromCA(
  expenses: Record<string, Expense[]>
): { overdue: CardExpenseEntry[]; dueSoon: CardExpenseEntry[] } {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue: CardExpenseEntry[] = [];
  const dueSoon: CardExpenseEntry[] = [];

  const listCA = (expenses['C&A'] || []) as Expense[];

  const buildInstallments = (expense: Expense): ExpenseInstallment[] => {
    const recType = getRecurrenceType(expense);
    const arr: ExpenseInstallment[] = [];

    if (recType === 'none') {
      arr.push({
        id: expense.id,
        dueDate: expense.date,
        amount: expense.amount,
        isPaid: !!(expense.is_paid || expense.paid),
        paidDate: (expense.is_paid || expense.paid) ? expense.date : undefined,
      });
      return arr;
    }

    const original = new Date(expense.date);
    // parcela do mês atual
    const currentMonthDue = new Date(now.getFullYear(), now.getMonth(), original.getDate());
    arr.push({
      id: `${expense.id}-current`,
      dueDate: currentMonthDue.toISOString(),
      amount: expense.amount,
      isPaid: !!(expense.is_paid || expense.paid),
      paidDate: (expense.is_paid || expense.paid) ? expense.date : undefined,
    });
    return arr;
  };

  listCA.forEach((expense) => {
    if (expense.is_paid || expense.paid) return;

    const installments = buildInstallments(expense);

    // considerar somente parcela do mês atual
    const relevant = installments.filter((inst) => {
      const d = new Date(inst.dueDate);
      const inCurrent = d >= monthStart && d <= monthEnd;
      return inCurrent;
    });

    const unpaid = relevant
      .filter((r) => !r.isPaid)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    if (unpaid.length === 0) return;

    const firstUnpaid = unpaid[0].dueDate;
    const diffDays = differenceInDays(new Date(firstUnpaid), todayMid);

    if (diffDays < 0) {
      overdue.push({
        description: expense.description || 'No description',
        amount: expense.amount || 0,
        daysOverdue: Math.abs(diffDays),
        projectName: expense.project || 'General',
        dueDate: firstUnpaid,
      });
    } else if (diffDays <= 3) {
      dueSoon.push({
        description: expense.description || 'No description',
        amount: expense.amount || 0,
        daysOverdue: 0,
        projectName: expense.project || 'General',
        dueDate: firstUnpaid,
      });
    }
  });

  return {
    overdue: overdue.sort((a, b) => b.daysOverdue - a.daysOverdue),
    dueSoon,
  };
}

