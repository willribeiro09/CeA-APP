import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { getNext5Weeks } from '../lib/dateUtils';

interface WeekSelectorProps {
  selectedWeekStart: Date;
  onWeekChange: (startDate: Date, endDate: Date) => void;
}

export function WeekSelector({ selectedWeekStart, onWeekChange }: WeekSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [weeks, setWeeks] = useState(getNext5Weeks());
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]);

  // Atualizar as semanas quando o componente montar
  useEffect(() => {
    const availableWeeks = getNext5Weeks();
    setWeeks(availableWeeks);
    
    // Encontrar a semana que corresponde à data selecionada
    const matchingWeek = availableWeeks.find(
      week => week.value === selectedWeekStart.toISOString().split('T')[0]
    ) || availableWeeks[0];
    
    setSelectedWeek(matchingWeek);
  }, [selectedWeekStart]);

  const handleWeekSelect = (week: typeof weeks[0]) => {
    setSelectedWeek(week);
    onWeekChange(week.startDate, week.endDate);
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between"
      >
        <div className="flex flex-col items-start">
          <span className="text-sm text-gray-500 font-medium">Week Select</span>
          <span className="text-gray-700 font-medium">
            {selectedWeek.label}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isDropdownOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>
      
      {isDropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-40">
          {weeks.map((week, index) => (
            <button
              key={week.value}
              onClick={() => handleWeekSelect(week)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                selectedWeek.value === week.value ? 'bg-gray-50 text-[#5ABB37]' : 'text-gray-700'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{week.label}</span>
                {index === 0 && (
                  <span className="text-xs text-gray-500">Semana atual</span>
                )}
                {index === 1 && (
                  <span className="text-xs text-gray-500">Próxima semana</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 