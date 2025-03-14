import React from 'react';
import { Expense } from '../types';
import { ExpenseItem } from './ExpenseItem';

interface ExpenseListProps {
  expenses: Expense[];
  onTogglePaid: (id: string) => void;
  onEditItem: (expense: Expense) => void;
  onDeleteItem: (id: string) => void;
}

export function ExpenseList({ expenses, onTogglePaid, onEditItem, onDeleteItem }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No expenses found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {expenses.map(expense => (
        <ExpenseItem
          key={expense.id}
          expense={expense}
          onTogglePaid={onTogglePaid}
          onEdit={onEditItem}
          onDelete={onDeleteItem}
        />
      ))}
    </div>
  );
} 