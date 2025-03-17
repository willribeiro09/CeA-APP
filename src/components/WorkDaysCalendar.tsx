import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkDaysCalendarProps {
  employeeId: string;
  initialWorkedDates: string[];
  onDateToggle: (date: string) => void;
}

const WorkDaysCalendar: React.FC<WorkDaysCalendarProps> = ({
  employeeId,
  initialWorkedDates,
  onDateToggle
}) => {
  // Sempre iniciar com o mês atual
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Garantir que workedDates seja sempre um array, mesmo que initialWorkedDates seja undefined
  const [workedDates, setWorkedDates] = useState<string[]>(initialWorkedDates || []);

  // Atualizar as datas trabalhadas quando as props mudarem
  useEffect(() => {
    setWorkedDates(initialWorkedDates || []);
  }, [initialWorkedDates]);

  const handleDateClick = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const newDates = workedDates.includes(formattedDate)
      ? workedDates.filter(d => d !== formattedDate)
      : [...workedDates, formattedDate];
    
    setWorkedDates(newDates);
    onDateToggle(formattedDate);
  };

  // Gerar os dias do mês atual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Nomes dos dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map(day => {
          const formattedDate = format(day, 'yyyy-MM-dd');
          // Garantir que workedDates existe antes de chamar includes
          const isWorked = Array.isArray(workedDates) && workedDates.includes(formattedDate);
          
          return (
            <button
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              className={`
                h-10 w-full rounded-md flex items-center justify-center text-sm font-medium
                ${isToday(day) ? 'border-2 border-blue-500' : ''}
                ${isWorked 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'hover:bg-gray-100 text-gray-700'}
                transition-colors duration-200
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WorkDaysCalendar; 