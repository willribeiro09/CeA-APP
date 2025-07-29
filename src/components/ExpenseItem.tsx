import { format } from 'date-fns';
import { Check, Trash2 } from 'lucide-react';
import { Expense } from '../types';
import { SwipeableItem } from './SwipeableItem';

interface ExpenseItemProps {
  expense: Expense;
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

export function ExpenseItem({ expense, onTogglePaid, onDelete, onEdit }: ExpenseItemProps) {
  // Convertendo a string de data para objeto Date
  const dueDate = expense.date ? new Date(expense.date) : new Date();
  const today = new Date();
  
  // Calcular a diferença em dias
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Determinar o status
  let statusClass = '';
  const isPaid = expense.is_paid || expense.paid;
  
  if (isPaid) {
    statusClass = 'bg-green-50 border-l-4 border-green-500';
  } else if (diffDays < 0) {
    // Atrasado
    statusClass = 'bg-red-50 border-l-4 border-red-500';
  } else if (diffDays <= 3) {
    // Próximo do vencimento (3 dias ou menos)
    statusClass = 'bg-yellow-50 border-l-4 border-yellow-500';
  }

  return (
    <SwipeableItem
      onEdit={() => onEdit(expense)}
      onDelete={() => onDelete(expense.id)}
    >
      <div 
        className={`flex items-center p-4 ${statusClass} transition-colors duration-300`}
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
          <h3 className="font-medium text-gray-900">{expense.description}</h3>
          <p className="text-gray-600 text-sm">
            Due on {format(dueDate, 'MMMM d')}
          </p>
        </div>

        <div className="text-right mr-2">
          <span className="font-medium text-[#5ABB37]">
            ${expense.amount.toFixed(2)}
          </span>
          <p className="text-xs text-gray-500">
            {isPaid ? 'Paid' : diffDays < 0 ? 'Overdue' : `Due in ${diffDays} days`}
          </p>
        </div>
        {/* Botão de deletar sempre visível */}
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete(expense.id);
          }}
          className="ml-2 p-1 text-gray-400 hover:text-red-600 focus:outline-none"
          title="Deletar"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </SwipeableItem>
  );
}