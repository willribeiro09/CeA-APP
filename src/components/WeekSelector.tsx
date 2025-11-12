import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { getWeeks, formatDateToISO } from '../lib/dateUtils';

interface WeekSelectorProps {
  selectedWeekStart: Date;
  onWeekChange: (startDate: Date, endDate: Date) => void;
  employeesData?: Record<string, any[]>;
}

export function WeekSelector({ selectedWeekStart, onWeekChange, employeesData }: WeekSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Usar useMemo para evitar recálculo desnecessário das semanas
  const weeks = useMemo(() => getWeeks(new Date(), employeesData), [employeesData]);
  
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const allWeeks = getWeeks();
    return allWeeks.find(w => w.isCurrent) || allWeeks[allWeeks.length - 1];
  });

  // Atualizar as semanas quando o componente montar ou quando selectedWeekStart mudar
  useEffect(() => {
    // Encontrar a semana que corresponde à data selecionada
    const selectedWeekValue = formatDateToISO(selectedWeekStart);
    const matchingWeek = weeks.find(week => week.value === selectedWeekValue);
    
    if (matchingWeek) {
      setSelectedWeek(matchingWeek);
    } else {
      // Se não encontrar uma semana correspondente, usar a current week
      const currentWeek = weeks.find(w => w.isCurrent);
      if (currentWeek) {
        setSelectedWeek(currentWeek);
      }
    }
  }, [selectedWeekStart, weeks]);

  // Usar useCallback para evitar recriação da função a cada renderização
  const handleWeekSelect = useCallback((week: typeof weeks[0]) => {
    setSelectedWeek(week);
    onWeekChange(week.startDate, week.endDate);
    setIsDropdownOpen(false);
  }, [onWeekChange]);

  // Usar useCallback para evitar recriação da função a cada renderização
  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen(!isDropdownOpen);
  }, [isDropdownOpen]);

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-1"
      >
        <span className="text-white font-medium text-sm">Week:</span>
        <div className="flex items-center px-2 py-1 bg-gradient-to-r from-white to-[#f9fcf7] border border-transparent rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
          <Calendar className="w-3 h-3 text-[#5ABB37] mr-1" />
          <span className="text-[#5ABB37] font-medium text-sm">
            {selectedWeek.label}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#5ABB37] ml-1 transition-transform ${
              isDropdownOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>
      
      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-40 min-w-[200px] max-h-60 overflow-y-auto">
          {weeks.map((week) => (
            <button
              key={week.value}
              onClick={() => handleWeekSelect(week)}
              className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                selectedWeek.value === week.value ? 'bg-gray-50 text-[#5ABB37]' : 'text-gray-700'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium text-sm">{week.label}</span>
                {week.isCurrent && (
                  <span className="text-xs text-[#5ABB37] font-medium">Current week</span>
                )}
                {week.isPast && (
                  <span className="text-xs text-gray-500">Last week</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 