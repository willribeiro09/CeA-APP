
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMonthDays, isToday, isSameMonth, formatDate } from '@/utils/dateUtils';
import { CalorieEntry, CalorieStatus } from '@/types';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  entries: CalorieEntry[];
  dailyGoal: number;
}

const getCalorieStatus = (calories: number, goal: number): CalorieStatus => {
  if (calories === 0) return 'under';
  if (calories < goal * 0.8) return 'under';
  if (calories <= goal * 1.2) return 'optimal';
  return 'over';
};

const statusColors = {
  under: 'bg-gray-50 text-gray-600 border-gray-200',
  optimal: 'bg-green-50 text-green-700 border-green-200', 
  over: 'bg-red-50 text-red-700 border-red-200'
};

export const Calendar: React.FC<CalendarProps> = ({ 
  selectedDate, 
  onDateSelect, 
  entries,
  dailyGoal 
}) => {
  const [currentDate, setCurrentDate] = React.useState(selectedDate);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthDays = getMonthDays(year, month);
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  const getEntryForDate = (date: Date) => {
    return entries.find(entry => entry.date === formatDate(date));
  };
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-soft p-6 animate-fade-in border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateMonth('prev')}
          className="h-9 w-9 rounded-full hover:bg-gray-50 text-gray-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        
        <Button
          variant="ghost" 
          size="icon"
          onClick={() => navigateMonth('next')}
          className="h-9 w-9 rounded-full hover:bg-gray-50 text-gray-600"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((date, index) => {
          const entry = getEntryForDate(date);
          const isCurrentMonth = isSameMonth(date, month, year);
          const isSelected = formatDate(date) === formatDate(selectedDate);
          const todayDate = isToday(date);
          const status = entry ? getCalorieStatus(entry.total, dailyGoal) : 'under';
          
          return (
            <button
              key={index}
              onClick={() => onDateSelect(date)}
              disabled={!isCurrentMonth}
              className={`
                relative h-11 w-full rounded-lg text-sm font-medium transition-all duration-200
                ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
                ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
                ${todayDate ? 'bg-primary text-white hover:bg-primary/90' : ''}
                ${entry && isCurrentMonth && !todayDate ? statusColors[status] : ''}
                ${!entry && isCurrentMonth && !todayDate ? 'hover:bg-gray-50' : ''}
              `}
            >
              <span className="block">
                {date.getDate()}
              </span>
              {entry && isCurrentMonth && (
                <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 text-xs font-normal">
                  {entry.total}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
