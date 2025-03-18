import { useCallback } from 'react';
import { Project } from '../types';
import { format } from 'date-fns';

// Função para formatar uma data para o formato ISO (YYYY-MM-DD)
export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Hook para gerenciar os projetos
export function useProjects(projects: Project[]) {
  // Filtra os projetos por intervalo de datas
  const filterByDateRange = useCallback((startDate: Date, endDate: Date): Project[] => {
    // Converte as datas para o formato ISO para comparação
    const start = formatDateISO(startDate);
    const end = formatDateISO(endDate);
    
    // Filtra os projetos que estão dentro do intervalo de datas
    // ou que têm data de início anterior ao fim da semana
    return projects.filter(project => {
      const projectStartDate = project.startDate;
      const projectEndDate = project.endDate;
      
      // Mostrar projetos que começam antes ou durante a semana selecionada
      const startsBeforeOrDuringWeek = projectStartDate <= end;
      
      // Verificar se a data de início do projeto está dentro do intervalo
      const startInRange = projectStartDate >= start && projectStartDate <= end;
      
      // Verificar se a data de fim do projeto está dentro do intervalo
      const endInRange = projectEndDate && projectEndDate >= start && projectEndDate <= end;
      
      // Verificar se o projeto abrange todo o intervalo
      const spansRange = projectStartDate <= start && projectEndDate && projectEndDate >= end;
      
      return startsBeforeOrDuringWeek || startInRange || endInRange || spansRange;
    });
  }, [projects]);

  return { filterByDateRange };
} 