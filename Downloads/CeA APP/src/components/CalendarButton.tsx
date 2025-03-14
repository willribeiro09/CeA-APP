import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

interface CalendarButtonProps {
  date: Date;
  onClick: () => void;
}

export function CalendarButton({ date, onClick }: CalendarButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
    >
      <CalendarIcon className="w-5 h-5 text-gray-500" />
      <span className="text-gray-700">{format(date, 'dd/MM/yyyy')}</span>
    </button>
  );
} 