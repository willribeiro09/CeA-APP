import { format } from 'date-fns';
import { Check, Trash, Edit } from 'lucide-react';
import { Expense } from '../types';

interface ExpenseItemProps {
  expense: Expense;
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

export function ExpenseItem({ expense, onTogglePaid, onDelete, onEdit }: ExpenseItemProps) {
  // Convertendo a string de data para objeto Date
  const dueDate = expense.date ? new Date(expense.date) : new Date();
  
  const isNearDue = !expense.is_paid &&
    Math.abs(new Date().getTime() - dueDate.getTime()) <= 3 * 24 * 60 * 60 * 1000;

  return (
    <div className={`flex items-center p-4 rounded-lg ${
      expense.is_paid ? 'bg-[#e8f5e9]' : isNearDue ? 'bg-[#fff3cd]' : 'bg-white'
    } border border-gray-100 transition-colors duration-300`}>
      <button
        onClick={() => onTogglePaid(expense.id)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
          ${expense.is_paid
            ? 'border-[#5ABB37] bg-[#5ABB37]'
            : 'border-gray-300'
          }`}
      >
        {expense.is_paid && <Check className="w-4 h-4 text-white" />}
      </button>

      <div className="flex-1 ml-4">
        <h3 className="font-medium text-gray-900">{expense.description}</h3>
        <p className="text-gray-600 text-sm">
          Due on {format(dueDate, 'MMMM d')}
        </p>
      </div>

      <div className="text-right flex items-center space-x-2">
        <span className="font-medium text-[#5ABB37]">
          ${expense.amount.toFixed(2)}
        </span>
        <button 
          onClick={() => onEdit(expense)} 
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <Edit size={16} />
        </button>
        <button 
          onClick={() => onDelete(expense.id)} 
          className="p-1 text-gray-500 hover:text-red-500"
        >
          <Trash size={16} />
        </button>
      </div>
    </div>
  );
}