import { format } from 'date-fns';
import { Check, Trash2, Repeat } from 'lucide-react';
import { useMemo } from 'react';
import { Expense } from '../types';
import { SwipeableItem } from './SwipeableItem';
import { isRecurringExpense, getExpenseStatus } from '../lib/recurringUtils';

interface ExpenseItemProps {
  expense: Expense;
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

export function ExpenseItem({ expense, onTogglePaid, onDelete, onEdit }: ExpenseItemProps) {
  // Usar useMemo para evitar recálculos desnecessários
  const dueDate = useMemo(() => expense.date ? new Date(expense.date) : new Date(), [expense.date]);
  const status = useMemo(() => getExpenseStatus(expense), [expense]);
  const isPaid = useMemo(() => expense.is_paid || expense.paid, [expense.is_paid, expense.paid]);
  const isRecurring = useMemo(() => isRecurringExpense(expense), [expense]);
  const cleanDescription = useMemo(() => expense.description.replace(/\*[MBW]$/, ''), [expense.description]);
  const formattedAmount = useMemo(() => expense.amount.toFixed(2), [expense.amount]);
  const formattedDueDate = useMemo(() => format(dueDate, 'MMMM d'), [dueDate]);
  const nextDueFormatted = useMemo(() => status.nextDueDate ? format(status.nextDueDate, 'MMM d') : '', [status.nextDueDate]);

  return (
    <SwipeableItem
      onEdit={() => onEdit(expense)}
      onDelete={() => onDelete(expense.id)}
    >
      <div 
        className={`flex items-center p-4 ${status.class} transition-colors duration-300`}
        onClick={() => onTogglePaid(expense.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePaid(expense.id);
          }}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
            ${isPaid
              ? 'border-[#5ABB37] bg-[#5ABB37]'
              : 'border-gray-300'
            }`}
        >
          {isPaid && <Check className="w-4 h-4 text-white" />}
        </button>

        <div className="flex-1 ml-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">
              {cleanDescription}
            </h3>
            {isRecurring && (
              <Repeat className="w-4 h-4 text-gray-400" title="Recurring expense" />
            )}
          </div>
          <p className="text-gray-600 text-sm">
            Due on {formattedDueDate}
          </p>
          {status.overdueDate && status.nextDueDate && (
            <p className="text-xs text-blue-600">
              Next due: {nextDueFormatted}
            </p>
          )}
          {status.nextDueDate && !status.overdueDate && (
            <p className="text-xs text-blue-600">
              Next: {nextDueFormatted}
            </p>
          )}
        </div>

        <div className="text-right mr-2">
          <span className="font-medium text-[#5ABB37]">
            ${formattedAmount}
          </span>
          <p className="text-xs text-gray-500">
            {status.text}
          </p>
        </div>
      </div>
    </SwipeableItem>
  );
}