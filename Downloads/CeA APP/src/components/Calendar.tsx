import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface CalendarProps {
  selectedDate?: Date;
  onSelect: (date?: Date) => void;
}

export function Calendar({ selectedDate, onSelect }: CalendarProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={onSelect}
        locale={ptBR}
        className="border-none"
        classNames={{
          day_selected: 'bg-[#5ABB37] text-white',
          day_today: 'text-[#5ABB37] font-bold',
        }}
        footer={
          selectedDate ? (
            <p className="mt-4 text-center text-sm text-gray-500">
              Data selecionada: {format(selectedDate, 'dd/MM/yyyy')}
            </p>
          ) : null
        }
      />
    </div>
  );
} 