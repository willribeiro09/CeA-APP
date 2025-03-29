import { format, addDays, startOfDay, addWeeks, getDay } from 'date-fns';

// Função para normalizar uma data, removendo o componente de tempo e garantindo que
// a data seja tratada como UTC para evitar problemas de fuso horário
export function normalizeDate(date: Date): Date {
  // Criar uma nova data usando apenas os componentes de ano, mês e dia
  // Isso evita problemas de fuso horário ao converter para ISO string
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Criar uma nova data com o horário zerado (12:00 ao meio-dia para evitar problemas de fuso)
  const normalized = new Date(year, month, day, 12, 0, 0, 0);
  
  console.log(`Data original: ${date.toISOString()}`);
  console.log(`Data normalizada: ${normalized.toISOString()}`);
  
  return normalized;
}

// Função para formatar uma data como string ISO sem componente de tempo
export function formatDateToISO(date: Date): string {
  const normalized = normalizeDate(date);
  // Usar o formato YYYY-MM-DD para evitar problemas de fuso horário
  return normalized.toISOString().split('T')[0];
}

// Função para obter o início da semana (segunda-feira)
export function getEmployeeWeekStart(date: Date): Date {
  const currentDate = startOfDay(date);
  // Calcular o dia da semana (0 = domingo, 1 = segunda, etc.)
  const day = currentDate.getDay();
  // Calcular a diferença para a segunda-feira
  const diff = day === 1 ? 0 : day === 0 ? 6 : day - 1;
  
  const result = new Date(currentDate);
  result.setDate(result.getDate() - diff);
  
  // Garantir que o horário seja zerado
  result.setHours(0, 0, 0, 0);
  
  console.log(`Data original: ${date.toISOString()}`);
  console.log(`Início da semana calculado: ${result.toISOString()}`);
  
  return normalizeDate(result);
}

// Função para obter o fim da semana (sábado)
export function getEmployeeWeekEnd(date: Date): Date {
  const weekStart = getEmployeeWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 5); // 5 dias após segunda = sábado
  
  // Garantir que o horário seja o final do dia
  result.setHours(23, 59, 59, 999);
  
  console.log(`Data original: ${date.toISOString()}`);
  console.log(`Fim da semana calculado: ${result.toISOString()}`);
  
  return normalizeDate(result);
}

// Função para obter o início da semana para projetos (quarta-feira)
export function getProjectWeekStart(date: Date): Date {
  const currentDate = startOfDay(date);
  const day = getDay(currentDate); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  // 3 = quarta-feira
  const diff = day === 3 ? 0 : day < 3 ? day + 4 : day - 3;
  const result = new Date(currentDate);
  result.setDate(result.getDate() - diff);
  return normalizeDate(result);
}

// Função para obter o fim da semana para projetos (terça-feira)
export function getProjectWeekEnd(date: Date): Date {
  const weekStart = getProjectWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 6); // 6 dias após quarta = terça
  return normalizeDate(result);
}

// Função para formatar um intervalo de datas
export function formatWeekRange(startDate: Date, endDate: Date): string {
  const formattedStart = format(startDate, 'dd/MM');
  const formattedEnd = format(endDate, 'dd/MM');
  return `${formattedStart} - ${formattedEnd}`;
}

// Função para gerar as semanas disponíveis (anterior + atual + próxima)
export function getWeeks(currentDate: Date = new Date()): Array<{ startDate: Date; endDate: Date; label: string; value: string; }> {
  const weeks: Array<{ startDate: Date; endDate: Date; label: string; value: string; }> = [];
  
  // Obter o início da semana atual (segunda-feira)
  let weekStart = getEmployeeWeekStart(currentDate);
  
  // Adicionar a semana anterior
  const previousWeekStart = addWeeks(weekStart, -1);
  weeks.push({
    startDate: previousWeekStart,
    endDate: getEmployeeWeekEnd(previousWeekStart),
    label: formatWeekRange(previousWeekStart, getEmployeeWeekEnd(previousWeekStart)),
    value: formatDateToISO(previousWeekStart)
  });
  
  // Adicionar a semana atual
  weeks.push({
    startDate: weekStart,
    endDate: getEmployeeWeekEnd(weekStart),
    label: formatWeekRange(weekStart, getEmployeeWeekEnd(weekStart)),
    value: formatDateToISO(weekStart)
  });
  
  // Adicionar a próxima semana
  const nextWeekStart = addWeeks(weekStart, 1);
  weeks.push({
    startDate: nextWeekStart,
    endDate: getEmployeeWeekEnd(nextWeekStart),
    label: formatWeekRange(nextWeekStart, getEmployeeWeekEnd(nextWeekStart)),
    value: formatDateToISO(nextWeekStart)
  });
  
  return weeks;
} 