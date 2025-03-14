import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { format, addWeeks, startOfWeek } from 'date-fns';

interface WeekSelectorProps {
  selectedWeekStart: Date;
  onWeekChange: (startDate: Date, endDate: Date) => void;
}

// Função para gerar as próximas 5 semanas a partir da data atual
const getNext5Weeks = (currentDate: Date = new Date()): Array<{ startDate: Date; endDate: Date; label: string; value: string; }> => {
  const weeks: Array<{ startDate: Date; endDate: Date; label: string; value: string; }> = [];
  
  // Obter o início da semana atual (segunda-feira)
  let weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  
  // Gerar as próximas 5 semanas
  for (let i = 0; i < 5; i++) {
    const startDate = addWeeks(weekStart, i);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // 6 dias após o início = fim da semana
    
    // Formatação de datas simplificada para evitar problemas com locale
    const formattedStart = format(startDate, 'dd/MM');
    const formattedEnd = format(endDate, 'dd/MM');
    
    weeks.push({
      startDate,
      endDate,
      label: `${formattedStart} - ${formattedEnd}`,
      value: startDate.toISOString()
    });
  }
  
  return weeks;
};

export function WeekSelector({ selectedWeekStart, onWeekChange }: WeekSelectorProps) {
  // ... resto do código ...
} 