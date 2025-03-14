/**
 * Formata uma data no padrão brasileiro (DD/MM/YYYY)
 */
export function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Retorna a data de início da semana (domingo) para uma data específica
 */
export function getWeekStartDate(date: Date): Date {
  const newDate = new Date(date);
  const day = newDate.getDay(); // 0 = domingo, 1 = segunda, etc.
  
  // Ajusta para o domingo anterior
  newDate.setDate(newDate.getDate() - day);
  
  // Zera as horas, minutos, segundos e milissegundos
  newDate.setHours(0, 0, 0, 0);
  
  return newDate;
}

/**
 * Retorna a data de fim da semana (sábado) para uma data específica
 */
export function getWeekEndDate(date: Date): Date {
  const startDate = getWeekStartDate(date);
  const endDate = new Date(startDate);
  
  // Adiciona 6 dias para chegar ao sábado
  endDate.setDate(endDate.getDate() + 6);
  
  // Define para o final do dia
  endDate.setHours(23, 59, 59, 999);
  
  return endDate;
}

/**
 * Adiciona um número específico de dias a uma data
 */
export function addDays(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}

/**
 * Verifica se uma data está dentro de um intervalo
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Converte uma string de data no formato DD/MM/YYYY para um objeto Date
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Mês em JS é 0-indexed
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  const date = new Date(year, month, day);
  return date;
}

/**
 * Formata uma data para o formato ISO (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
} 