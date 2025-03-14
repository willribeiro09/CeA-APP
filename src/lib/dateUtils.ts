import { format, addDays, startOfDay, addWeeks, isMonday, previousMonday, nextSaturday, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';

// Função para obter o início da semana (segunda-feira)
export function getEmployeeWeekStart(date: Date): Date {
  const currentDate = startOfDay(date);
  // Garantir que retornamos a segunda-feira da semana atual
  // isMonday verifica se a data é segunda-feira
  // previousMonday retorna a segunda-feira anterior (ou a própria data se já for segunda)
  const result = isMonday(currentDate) ? currentDate : previousMonday(currentDate);
  
  // Garantir que o horário seja zerado
  result.setHours(0, 0, 0, 0);
  
  console.log(`Data original: ${date.toISOString()}`);
  console.log(`Início da semana calculado: ${result.toISOString()}`);
  
  return result;
}

// Função para obter o fim da semana (sábado)
export function getEmployeeWeekEnd(date: Date): Date {
  const weekStart = getEmployeeWeekStart(date);
  // nextSaturday retorna o próximo sábado (ou a própria data se já for sábado)
  const result = nextSaturday(weekStart);
  
  // Garantir que o horário seja definido para o final do dia
  result.setHours(23, 59, 59, 999);
  
  console.log(`Início da semana: ${weekStart.toISOString()}`);
  console.log(`Fim da semana calculado: ${result.toISOString()}`);
  
  return result;
}

// Função para obter o início da semana para projetos (quarta-feira)
export function getProjectWeekStart(date: Date): Date {
  const currentDate = startOfDay(date);
  const day = getDay(currentDate); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  // 3 = quarta-feira
  const diff = day === 3 ? 0 : day < 3 ? day + 4 : day - 3;
  const result = new Date(currentDate);
  result.setDate(result.getDate() - diff);
  return result;
}

// Função para obter o fim da semana para projetos (terça-feira)
export function getProjectWeekEnd(date: Date): Date {
  const weekStart = getProjectWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 6); // 6 dias após quarta = terça
  return result;
}

// Função para formatar a data no formato "March 10 to 15"
export function formatWeekRange(startDate: Date, endDate: Date): string {
  const startDay = format(startDate, 'd');
  const endDay = format(endDate, 'd');
  const startMonth = format(startDate, 'MMMM', { locale: enUS });
  const endMonth = format(endDate, 'MMMM', { locale: enUS });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} to ${endDay}`;
  } else {
    return `${startMonth} ${startDay} to ${endMonth} ${endDay}`;
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