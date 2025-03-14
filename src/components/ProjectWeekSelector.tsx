import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { format, addWeeks } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface ProjectWeekSelectorProps {
  selectedWeekStart: Date;
  onWeekChange: (startDate: Date, endDate: Date) => void;
}

// Função para obter as próximas 5 semanas começando na terça-feira
const getNext5ProjectWeeks = () => {
  // Obter a data atual
  const today = new Date();
  
  // Encontrar a terça-feira atual ou anterior mais próxima
  const currentDay = today.getDay(); // 0 = domingo, 1 = segunda, 2 = terça, ...
  const daysToSubtract = currentDay === 2 ? 0 : currentDay < 2 ? currentDay + 5 : currentDay - 2;
  
  const currentTuesday = new Date(today);
  currentTuesday.setDate(today.getDate() - daysToSubtract);
  currentTuesday.setHours(0, 0, 0, 0);
  
  // Gerar as próximas 5 semanas
  const weeks = [];
  
  for (let i = 0; i < 5; i++) {
    const startDate = new Date(currentTuesday);
    startDate.setDate(startDate.getDate() + (i * 7));
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // 6 dias depois da terça = segunda
    endDate.setHours(23, 59, 59, 999);
    
    // Formatar as datas no estilo "March 11 to 17"
    const formattedStartDate = format(startDate, 'MMMM d', { locale: enUS });
    const formattedEndDate = format(endDate, 'd');
    const label = `${formattedStartDate} to ${formattedEndDate}`;
    
    weeks.push({
      value: startDate.toISOString().split('T')[0],
      label: label,
      startDate,
      endDate
    });
  }
  
  return weeks;
};

export function ProjectWeekSelector({ selectedWeekStart, onWeekChange }: ProjectWeekSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [weeks, setWeeks] = useState(getNext5ProjectWeeks());
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]);

  // Atualizar as semanas quando o componente montar
  useEffect(() => {
    const availableWeeks = getNext5ProjectWeeks();
    setWeeks(availableWeeks);
    
    // Encontrar a semana que corresponde à data selecionada
    const matchingWeek = availableWeeks.find(
      week => {
        const weekStartStr = week.startDate.toISOString().split('T')[0];
        const selectedStartStr = selectedWeekStart.toISOString().split('T')[0];
        return weekStartStr === selectedStartStr;
      }
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
        className="flex items-center space-x-1"
      >
        <span className="text-gray-700 font-medium text-sm">Week:</span>
        <div className="flex items-center px-2 py-1 bg-gradient-to-r from-white to-[#f9fcf7] border border-[#e0f0d8] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
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
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-40 min-w-[200px]">
          {weeks.map((week, index) => (
            <button
              key={week.value}
              onClick={() => handleWeekSelect(week)}
              className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                selectedWeek.value === week.value ? 'bg-gray-50 text-[#5ABB37]' : 'text-gray-700'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium text-sm">{week.label}</span>
                {index === 0 && (
                  <span className="text-xs text-gray-500">Current week</span>
                )}
                {index === 1 && (
                  <span className="text-xs text-gray-500">Next week</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 