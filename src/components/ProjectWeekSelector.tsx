import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { getProjectWeeks, formatDateToISO } from '../lib/dateUtils';

interface ProjectWeekSelectorProps {
  selectedWeekStart: Date;
  onWeekChange: (startDate: Date, endDate: Date) => void;
  projectsData?: any[];
}

export function ProjectWeekSelector({ selectedWeekStart, onWeekChange, projectsData }: ProjectWeekSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Obter semanas (fonte de verdade)
  const weeks = useMemo(() => getProjectWeeks(new Date(), projectsData), [projectsData]);

  // Detecção robusta de semana atual baseada no "now" entre start/end
  const now = useMemo(() => new Date(), []);
  const currentWeek = useMemo(() => {
    const containsNow = (w: typeof weeks[number]) => now >= w.startDate && now <= w.endDate;
    return weeks.find(containsNow) || weeks.find(w => w.isCurrent) || weeks[0];
  }, [weeks, now]);

  // Ordenar com a atual primeiro e as passadas depois
  const orderedWeeks = useMemo(() => {
    if (!currentWeek) return weeks;
    const rest = weeks.filter(w => w !== currentWeek);
    return [currentWeek, ...rest];
  }, [weeks, currentWeek]);
  
  const [selectedWeek, setSelectedWeek] = useState(() => currentWeek);

  // Atualizar seleção ao montar ou quando a prop selectedWeekStart mudar
  useEffect(() => {
    const matchingWeek = orderedWeeks.find(
      week => week.value === formatDateToISO(selectedWeekStart)
    ) || currentWeek;
    setSelectedWeek(matchingWeek);
  }, [selectedWeekStart, orderedWeeks, currentWeek]);

  const handleWeekSelect = useCallback((week: typeof weeks[0]) => {
    setSelectedWeek(week);
    onWeekChange(week.startDate, week.endDate);
    setIsDropdownOpen(false);
  }, [onWeekChange]);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen(!isDropdownOpen);
  }, [isDropdownOpen]);

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
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
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-40 min-w-[200px] max-h-60 overflow-y-auto">
          {orderedWeeks.map((week) => (
            <button
              key={week.value}
              onClick={() => handleWeekSelect(week)}
              className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                selectedWeek.value === week.value ? 'bg-gray-50 text-[#5ABB37]' : 'text-gray-700'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium text-sm">{week.label}</span>
                {week === currentWeek && (
                  <span className="text-xs text-[#5ABB37] font-medium">Current week</span>
                )}
                {week !== currentWeek && (
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