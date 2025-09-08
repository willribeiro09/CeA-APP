import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

interface MonthOption {
  value: string;
  label: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}

interface MonthSelectorProps {
  selectedMonthStart: Date;
  onMonthChange: (startDate: Date, endDate: Date) => void;
}

export function MonthSelector({ selectedMonthStart, onMonthChange }: MonthSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Gerar lista de meses (começando em setembro, adicionando novos conforme o tempo passa)
  const months = useMemo(() => {
    const monthOptions: MonthOption[] = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11 (0=Jan, 8=Sep)
    const currentYear = currentDate.getFullYear();
    
    // Começar sempre em setembro (mês 8)
    const startYear = currentMonth >= 8 ? currentYear : currentYear - 1; // Se estamos antes de setembro, usar ano anterior
    
    // Se estamos em setembro ou depois, incluir do setembro atual até agora
    // Se estamos antes de setembro, incluir do setembro do ano passado até agora
    let monthsToAdd = currentMonth >= 8 ? (currentMonth - 8) + 1 : (currentMonth + 1) + (12 - 8);
    
    for (let i = 0; i < monthsToAdd; i++) {
      const monthIndex = (8 + i) % 12; // Começar em setembro (8)
      const year = startYear + Math.floor((8 + i) / 12);
      
      const monthStart = startOfMonth(new Date(year, monthIndex, 1));
      const monthEnd = endOfMonth(new Date(year, monthIndex, 1));
      const isCurrent = monthIndex === currentMonth && year === currentYear;
      
      monthOptions.push({
        value: format(monthStart, 'yyyy-MM'),
        label: format(monthStart, 'MMMM yyyy'),
        startDate: monthStart,
        endDate: monthEnd,
        isCurrent
      });
    }
    
    return monthOptions;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Encontrar o mês que corresponde à data selecionada
    const selectedValue = format(selectedMonthStart, 'yyyy-MM');
    return months.find(month => month.value === selectedValue) || months[0];
  });

  // Atualizar o mês selecionado quando selectedMonthStart mudar
  useEffect(() => {
    const selectedValue = format(selectedMonthStart, 'yyyy-MM');
    const matchingMonth = months.find(month => month.value === selectedValue);
    
    if (matchingMonth) {
      setSelectedMonth(matchingMonth);
    } else {
      // Se não encontrar o mês, usar o atual
      const currentMonth = months.find(m => m.isCurrent);
      if (currentMonth) {
        setSelectedMonth(currentMonth);
      }
    }
  }, [selectedMonthStart, months]);

  const handleMonthSelect = useCallback((month: MonthOption) => {
    setSelectedMonth(month);
    onMonthChange(month.startDate, month.endDate);
    setIsDropdownOpen(false);
  }, [onMonthChange]);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen(!isDropdownOpen);
  }, [isDropdownOpen]);

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-1"
      >
        <div className="flex items-center px-2 py-1 bg-gradient-to-r from-white to-[#f9fcf7] border border-[#e0f0d8] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
          <Calendar className="w-3 h-3 text-[#5ABB37] mr-1" />
          <span className="text-[#5ABB37] font-medium text-sm">
            {selectedMonth.label}
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
          {months.map((month) => (
            <button
              key={month.value}
              onClick={() => handleMonthSelect(month)}
              className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                selectedMonth.value === month.value ? 'bg-gray-50 text-[#5ABB37]' : 'text-gray-700'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium text-sm">{month.label}</span>
                {month.isCurrent && (
                  <span className="text-xs text-[#5ABB37] font-medium">Current month</span>
                )}
                {!month.isCurrent && (
                  <span className="text-xs text-gray-500">Previous month</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
