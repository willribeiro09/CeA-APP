import { format, addDays, startOfDay, addWeeks, isWednesday, previousWednesday, nextTuesday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Função para obter o início da semana (quarta-feira)
export function getEmployeeWeekStart(date: Date): Date {
  const currentDate = startOfDay(date);
  return isWednesday(currentDate) ? currentDate : previousWednesday(currentDate);
}

// Função para obter o fim da semana (terça-feira)
export function getEmployeeWeekEnd(date: Date): Date {
  const weekStart = getEmployeeWeekStart(date);
  return nextTuesday(weekStart);
}

// Função para obter o início da semana para projetos (quarta-feira)
export function getProjectWeekStart(date: Date): Date {
  const currentDate = startOfDay(date);
  return isWednesday(currentDate) ? currentDate : previousWednesday(currentDate);
}

// Função para obter o fim da semana para projetos (terça-feira)
export function getProjectWeekEnd(date: Date): Date {
  const weekStart = getProjectWeekStart(date);
  return nextTuesday(weekStart);
}

// Função para formatar a data no formato "12 to 18 March"
export function formatWeekRange(startDate: Date, endDate: Date): string {
  const startDay = format(startDate, 'd');
  const endDay = format(endDate, 'd');
  const startMonth = format(startDate, 'MMMM', { locale: ptBR });
  const endMonth = format(endDate, 'MMMM', { locale: ptBR });
  
  if (startMonth === endMonth) {
    return `${startDay} a ${endDay} de ${startMonth}`;
  } else {
    return `${startDay} de ${startMonth} a ${endDay} de ${endMonth}`;
  }
}

// Função para gerar as próximas 5 semanas
export function getNext5Weeks(currentDate: Date = new Date()): Array<{
  startDate: Date;
  endDate: Date;
  label: string;
  value: string;
}> {
  const weeks = [];
  
  // Semana atual
  const currentWeekStart = getEmployeeWeekStart(currentDate);
  const currentWeekEnd = getEmployeeWeekEnd(currentWeekStart);
  
  for (let i = 0; i < 5; i++) {
    const weekStart = addWeeks(currentWeekStart, i);
    const weekEnd = addWeeks(currentWeekEnd, i);
    
    weeks.push({
      startDate: weekStart,
      endDate: weekEnd,
      label: formatWeekRange(weekStart, weekEnd),
      value: format(weekStart, 'yyyy-MM-dd')
    });
  }
  
  return weeks;
} 