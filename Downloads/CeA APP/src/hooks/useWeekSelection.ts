import { useState, useCallback } from 'react';
import { formatDateBR, getWeekStartDate, getWeekEndDate, addDays } from '../utils/dateUtils';

/**
 * Hook para gerenciar a seleção de semanas
 */
export function useWeekSelection() {
  // Estado para armazenar a data de início da semana selecionada
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    // Inicializa com a data de início da semana atual
    return getWeekStartDate(new Date());
  });
  
  // Calcula a data de fim da semana selecionada
  const selectedWeekEnd = getWeekEndDate(selectedWeekStart);
  
  // Formata a label da semana (ex: "01/01/2023 - 07/01/2023")
  const weekLabel = `${formatDateBR(selectedWeekStart)} - ${formatDateBR(selectedWeekEnd)}`;
  
  // Função para ir para a semana anterior
  const previousWeek = useCallback(() => {
    setSelectedWeekStart(prevDate => {
      // Subtrai 7 dias da data atual
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  }, []);
  
  // Função para ir para a próxima semana
  const nextWeek = useCallback(() => {
    setSelectedWeekStart(prevDate => {
      // Adiciona 7 dias à data atual
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  }, []);
  
  // Função para selecionar uma data específica
  const selectDate = useCallback((date: Date) => {
    // Define a data de início da semana com base na data selecionada
    setSelectedWeekStart(getWeekStartDate(date));
  }, []);
  
  // Função para selecionar uma semana específica
  const selectWeek = useCallback((startDate: Date, endDate: Date) => {
    setSelectedWeekStart(startDate);
  }, []);
  
  return {
    selectedWeekStart,
    selectedWeekEnd,
    weekLabel,
    previousWeek,
    nextWeek,
    selectDate,
    selectWeek
  };
} 