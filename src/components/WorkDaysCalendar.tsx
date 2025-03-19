import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { normalizeEmployeeDate, formatDateToISO } from '../lib';

interface WorkDaysCalendarProps {
  employeeId: string;
  initialWorkedDates: string[];
  onDateToggle: (date: string) => void;
  onClose?: () => void;
}

const WorkDaysCalendar: React.FC<WorkDaysCalendarProps> = ({
  employeeId,
  initialWorkedDates,
  onDateToggle,
  onClose
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
    // Diagnosticar a data original
    console.log("Data selecionada no calendário: ", format(date, 'yyyy-MM-dd'));
    
    // Normalizar a data usando a função específica para funcionários
    const normalizedDate = normalizeEmployeeDate(date);
    console.log("Data normalizada: ", normalizedDate.toISOString());
    
    // CORREÇÃO: Agora estamos usando a data normalizada para formatação
    // Formatamos usando a função formatDateToISO do nosso módulo dateUtils
    const formattedDate = formatDateToISO(normalizedDate);
    console.log("Data formatada para toggle após normalização: ", formattedDate);
    
    const newDates = workedDates.includes(formattedDate)
      ? workedDates.filter(d => d !== formattedDate)
      : [...workedDates, formattedDate];
    
    setWorkedDates(newDates);
    onDateToggle(formattedDate);
  };

  // Função para confirmar todas as datas selecionadas
  const handleConfirm = () => {
    // Fechar o calendário automaticamente
    if (onClose) {
      onClose();
    }
  };

  // Função para resetar todas as datas
  const handleReset = () => {
    // Para cada data trabalhada, chamar onDateToggle para removê-la
    [...workedDates].forEach(date => {
      onDateToggle(date);
    });
    
    // Limpar o estado local
    setWorkedDates([]);
  };

  // Gerar os dias do mês atual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Nomes dos dias da semana em inglês
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: enUS })}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            &lt;
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
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
          // CORREÇÃO: Normalizar cada data do calendário antes de comparar com as datas trabalhadas
          const normalizedDay = normalizeEmployeeDate(day);
          const formattedDate = formatDateToISO(normalizedDay);
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

      {/* Botões de Confirm e Reset */}
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default WorkDaysCalendar; 