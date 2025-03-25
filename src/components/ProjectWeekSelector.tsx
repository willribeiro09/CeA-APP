import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { format, addWeeks } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface ProjectWeekSelectorProps {
  selectedWeekStart: Date;
  onWeekChange: (startDate: Date, endDate: Date) => void;
  category?: 'Projects' | 'Employees';
}

// Função para obter a semana anterior e as próximas 5 semanas começando na quarta-feira (para Projects)
const getProjectWeeks = () => {
  // Obter a data atual
  const today = new Date();
  
  // Encontrar a quarta-feira atual ou anterior mais próxima
  const currentDay = today.getDay(); // 0 = domingo, 1 = segunda, 2 = terça, 3 = quarta, ...
  const daysToSubtract = currentDay === 3 ? 0 : currentDay < 3 ? currentDay + 4 : currentDay - 3;
  
  const currentWednesday = new Date(today);
  currentWednesday.setDate(today.getDate() - daysToSubtract);
  currentWednesday.setHours(0, 0, 0, 0);
  
  // Gerar a semana anterior e as próximas 5 semanas
  const weeks = [];
  
  // Adicionar a semana anterior
  const previousStartDate = new Date(currentWednesday);
  previousStartDate.setDate(previousStartDate.getDate() - 7);
  
  const previousEndDate = new Date(previousStartDate);
  previousEndDate.setDate(previousStartDate.getDate() + 6); // 6 dias depois da quarta = terça
  previousEndDate.setHours(23, 59, 59, 999);
  
  // Formatar as datas da semana anterior
  const formattedPreviousStartDate = format(previousStartDate, 'MMMM d', { locale: enUS });
  const formattedPreviousEndDate = format(previousEndDate, 'd');
  const previousLabel = `${formattedPreviousStartDate} to ${formattedPreviousEndDate}`;
  
  weeks.push({
    value: previousStartDate.toISOString().split('T')[0],
    label: previousLabel,
    startDate: previousStartDate,
    endDate: previousEndDate
  });
  
  // Adicionar a semana atual e as próximas 4 semanas
  for (let i = 0; i < 5; i++) {
    const startDate = new Date(currentWednesday);
    startDate.setDate(startDate.getDate() + (i * 7));
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // 6 dias depois da quarta = terça
    endDate.setHours(23, 59, 59, 999);
    
    // Formatar as datas no estilo "March 19 to 25"
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

// Função para obter a semana anterior e as próximas 5 semanas começando na segunda-feira (para Employees)
const getEmployeeWeeks = () => {
  // Obter a data atual
  const today = new Date();
  
  // Encontrar a segunda-feira atual ou anterior mais próxima
  const currentDay = today.getDay(); // 0 = domingo, 1 = segunda, ...
  const daysToSubtract = currentDay === 1 ? 0 : currentDay === 0 ? 6 : currentDay - 1;
  
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysToSubtract);
  currentMonday.setHours(0, 0, 0, 0);
  
  // Gerar a semana anterior e as próximas 5 semanas
  const weeks = [];
  
  // Adicionar a semana anterior
  const previousStartDate = new Date(currentMonday);
  previousStartDate.setDate(previousStartDate.getDate() - 7);
  
  const previousEndDate = new Date(previousStartDate);
  previousEndDate.setDate(previousStartDate.getDate() + 5); // 5 dias depois da segunda = sábado
  previousEndDate.setHours(23, 59, 59, 999);
  
  // Formatar as datas da semana anterior
  const formattedPreviousStartDate = format(previousStartDate, 'MMMM d', { locale: enUS });
  const formattedPreviousEndDate = format(previousEndDate, 'd');
  const previousLabel = `${formattedPreviousStartDate} to ${formattedPreviousEndDate}`;
  
  weeks.push({
    value: previousStartDate.toISOString().split('T')[0],
    label: previousLabel,
    startDate: previousStartDate,
    endDate: previousEndDate
  });
  
  // Adicionar a semana atual e as próximas 4 semanas
  for (let i = 0; i < 5; i++) {
    const startDate = new Date(currentMonday);
    startDate.setDate(startDate.getDate() + (i * 7));
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 5); // 5 dias depois da segunda = sábado
    endDate.setHours(23, 59, 59, 999);
    
    // Formatar as datas no estilo "March 17 to 22"
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

export function ProjectWeekSelector({ selectedWeekStart, onWeekChange, category = 'Projects' }: ProjectWeekSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [weeks, setWeeks] = useState(category === 'Employees' ? getEmployeeWeeks() : getProjectWeeks());
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]);

  // Atualizar as semanas quando o componente montar ou a categoria mudar
  useEffect(() => {
    const availableWeeks = category === 'Employees' ? getEmployeeWeeks() : getProjectWeeks();
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
  }, [selectedWeekStart, category]);

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
                  <span className="text-xs text-gray-500">Semana anterior</span>
                )}
                {index === 1 && (
                  <span className="text-xs text-gray-500">Semana atual</span>
                )}
                {index === 2 && (
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