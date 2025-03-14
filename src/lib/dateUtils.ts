import { format, addDays, startOfDay, addWeeks, isMonday, previousMonday, nextSaturday, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';

// Fun├º├úo para normalizar uma data, removendo o componente de tempo e garantindo que
// a data seja tratada como UTC para evitar problemas de fuso hor├írio
export function normalizeDate(date: Date): Date {
  // Criar uma nova data usando apenas os componentes de ano, m├¬s e dia
  // Isso evita problemas de fuso hor├írio ao converter para ISO string
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Criar uma nova data com o hor├írio zerado (12:00 ao meio-dia para evitar problemas de fuso)
  const normalized = new Date(year, month, day, 12, 0, 0, 0);
  
  console.log(`Data original: ${date.toISOString()}`);
  console.log(`Data normalizada: ${normalized.toISOString()}`);
  
  return normalized;
}

// Fun├º├úo para converter uma string de data ISO para uma data normalizada
export function parseISODate(isoString: string): Date {
  const date = new Date(isoString);
  return normalizeDate(date);
}

// Fun├º├úo para formatar uma data como string ISO sem componente de tempo
export function formatDateToISO(date: Date): string {
  const normalized = normalizeDate(date);
  // Usar o formato YYYY-MM-DD para evitar problemas de fuso hor├írio
  return normalized.toISOString().split('T')[0];
}

// Fun├º├úo para obter o in├¡cio da semana (segunda-feira)
export function getEmployeeWeekStart(date: Date): Date {
  const currentDate = startOfDay(date);
  // Garantir que retornamos a segunda-feira da semana atual
  // isMonday verifica se a data ├® segunda-feira
  // previousMonday retorna a segunda-feira anterior (ou a pr├│pria data se j├í for segunda)
  const result = isMonday(currentDate) ? currentDate : previousMonday(currentDate);
  
  // Garantir que o hor├írio seja zerado
  result.setHours(0, 0, 0, 0);
  
  console.log(`Data original: ${date.toISOString()}`);
  console.log(`In├¡cio da semana calculado: ${result.toISOString()}`);
  
  return normalizeDate(result);
}

// Fun├º├úo para obter o fim da semana (s├íbado)
export function getEmployeeWeekEnd(date: Date): Date {
  const weekStart = getEmployeeWeekStart(date);
  // nextSaturday retorna o pr├│ximo s├íbado (ou a pr├│pria data se j├í for s├íbado)
  const result = nextSaturday(weekStart);
  
  // Garantir que o hor├írio seja definido para o final do dia
  result.setHours(23, 59, 59, 999);
  
  console.log(`In├¡cio da semana: ${weekStart.toISOString()}`);
  console.log(`Fim da semana calculado: ${result.toISOString()}`);
  
  return result;
}

// Fun├º├úo para obter o in├¡cio da semana para projetos (quarta-feira)
export function getProjectWeekStart(date: Date): Date {
  const currentDate = startOfDay(date);
  const day = getDay(currentDate); // 0 = domingo, 1 = segunda, ..., 6 = s├íbado
  // 3 = quarta-feira
  const diff = day === 3 ? 0 : day < 3 ? day + 4 : day - 3;
  const result = new Date(currentDate);
  result.setDate(result.getDate() - diff);
  return normalizeDate(result);
}

// Fun├º├úo para obter o fim da semana para projetos (ter├ºa-feira)
export function getProjectWeekEnd(date: Date): Date {
  const weekStart = getProjectWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 6); // 6 dias ap├│s quarta = ter├ºa
  return normalizeDate(result);
}

// Fun├º├úo para formatar a data no formato "March 10 to 15"
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

// Fun├º├úo para gerar as pr├│ximas 5 semanas
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
      value: formatDateToISO(weekStart)
    });
  }
  
  return weeks;
} 
