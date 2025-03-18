import { format, startOfDay, endOfDay, isMonday, previousMonday, nextSaturday, getDay, addWeeks } from 'date-fns';
import { enUS } from 'date-fns/locale';

/**
 * Função utilitária para criar uma data consistente sem problemas de fuso horário
 * Sempre usa 12:00 UTC para evitar deslocamentos de dia
 */
export function createConsistentDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

/**
 * Função utilitária para criar uma data consistente a partir de um objeto Date existente
 * Preserva o dia, mês e ano, mas padroniza o horário para 12:00 UTC
 */
export function normalizeToConsistentDate(date: Date): Date {
  return createConsistentDate(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Normaliza uma data para UTC para evitar problemas de fuso horário
 */
export function normalizeDate(date: Date): Date {
  return normalizeToConsistentDate(date);
}

/**
 * Verifica se duas datas têm o mesmo dia, mês e ano,
 * independente do horário. Retorna um objeto com o resultado
 * da verificação e detalhes sobre qualquer inconsistência.
 */
export function verifyDateConsistency(
  originalDate: Date,
  processedDate: Date,
  operationName: string = 'Operação não especificada'
): { 
  isConsistent: boolean;
  details: string;
  originalComponents: { year: number; month: number; day: number };
  processedComponents: { year: number; month: number; day: number };
} {
  // Extrair componentes da data original usando UTC
  const originalYear = originalDate.getUTCFullYear();
  const originalMonth = originalDate.getUTCMonth() + 1;
  const originalDay = originalDate.getUTCDate();

  // Extrair componentes da data processada usando UTC
  const processedYear = processedDate.getUTCFullYear();
  const processedMonth = processedDate.getUTCMonth() + 1;
  const processedDay = processedDate.getUTCDate();

  // Verificar consistência
  const isConsistent = 
    originalYear === processedYear && 
    originalMonth === processedMonth && 
    originalDay === processedDay;

  // Gerar detalhes da verificação
  const details = isConsistent
    ? `[CONSISTÊNCIA-OK] ${operationName}: As datas mantêm o mesmo dia, mês e ano.`
    : `[CONSISTÊNCIA-ERRO] ${operationName}: Detectado deslocamento de data!
       Original: ${originalDay}/${originalMonth}/${originalYear}
       Processada: ${processedDay}/${processedMonth}/${processedYear}
       Diferenças encontradas:
       ${originalYear !== processedYear ? `- Ano: ${originalYear} -> ${processedYear}` : ''}
       ${originalMonth !== processedMonth ? `- Mês: ${originalMonth} -> ${processedMonth}` : ''}
       ${originalDay !== processedDay ? `- Dia: ${originalDay} -> ${processedDay}` : ''}`;

  console.log(`[DEBUG-CONSISTENCY] Verificação de consistência para: ${operationName}
    Data original: ${originalDate.toISOString()}
    Data processada: ${processedDate.toISOString()}
    Componentes originais:
    - Ano: ${originalYear}
    - Mês: ${originalMonth}
    - Dia: ${originalDay}
    Componentes processados:
    - Ano: ${processedYear}
    - Mês: ${processedMonth}
    - Dia: ${processedDay}
    Resultado: ${isConsistent ? 'CONSISTENTE' : 'INCONSISTENTE'}`);

  return {
    isConsistent,
    details,
    originalComponents: { year: originalYear, month: originalMonth, day: originalDay },
    processedComponents: { year: processedYear, month: processedMonth, day: processedDay }
  };
}

/**
 * Formata uma data no padrão brasileiro (DD/MM/YYYY)
 */
export function formatDateBR(date: Date): string {
  const normalizedDate = normalizeToConsistentDate(date);
  return `${normalizedDate.getUTCDate().toString().padStart(2, '0')}/${(normalizedDate.getUTCMonth() + 1).toString().padStart(2, '0')}/${normalizedDate.getUTCFullYear()}`;
}

/**
 * Formata uma data para o formato ISO (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  const normalizedDate = normalizeToConsistentDate(date);
  return `${normalizedDate.getUTCFullYear()}-${(normalizedDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${normalizedDate.getUTCDate().toString().padStart(2, '0')}`;
}

/**
 * Converte uma data para o formato 'yyyy-MM-dd'
 */
export function formatDateYYYYMMDD(date: Date): string {
  const normalizedDate = normalizeToConsistentDate(date);
  return format(normalizedDate, 'yyyy-MM-dd');
}

/**
 * Obtém o início da semana (segunda-feira)
 */
export function getWeekStartDate(date: Date): Date {
  const normalizedDate = normalizeToConsistentDate(date);
  const day = normalizedDate.getDay(); // 0 = domingo, 1 = segunda, etc.
  
  // Ajusta para a segunda-feira anterior
  const startDate = new Date(normalizedDate);
  startDate.setDate(startDate.getDate() - (day === 0 ? 6 : day - 1));
  
  return normalizeToConsistentDate(startDate);
}

/**
 * Obtém o fim da semana (domingo)
 */
export function getWeekEndDate(date: Date): Date {
  const startDate = getWeekStartDate(date);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  
  return normalizeToConsistentDate(endDate);
}

/**
 * Adiciona um número específico de dias a uma data
 */
export function addDays(date: Date, days: number): Date {
  const normalizedDate = normalizeToConsistentDate(date);
  const newDate = new Date(normalizedDate);
  newDate.setDate(newDate.getDate() + days);
  return normalizeToConsistentDate(newDate);
}

/**
 * Verifica se uma data está dentro de um intervalo
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const normalizedDate = normalizeToConsistentDate(date);
  const normalizedStart = normalizeToConsistentDate(startDate);
  const normalizedEnd = normalizeToConsistentDate(endDate);
  
  return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
}

/**
 * Formata um intervalo de datas como "March 10 to 15" ou "March 25 to April 1"
 */
export function formatWeekRange(startDate: Date, endDate: Date): string {
  const normalizedStart = normalizeToConsistentDate(startDate);
  const normalizedEnd = normalizeToConsistentDate(endDate);
  
  const startDay = format(normalizedStart, 'd');
  const endDay = format(normalizedEnd, 'd');
  const startMonth = format(normalizedStart, 'MMMM', { locale: enUS });
  const endMonth = format(normalizedEnd, 'MMMM', { locale: enUS });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} to ${endDay}`;
  } else {
    return `${startMonth} ${startDay} to ${endMonth} ${endDay}`;
  }
}

/**
 * Gera as próximas 5 semanas a partir da data atual
 */
export function getNext5Weeks(currentDate: Date = new Date()): Array<{
  startDate: Date;
  endDate: Date;
  label: string;
  value: string;
}> {
  const weeks = [];
  const weekStart = getWeekStartDate(currentDate);
  
  for (let i = 0; i < 5; i++) {
    const startDate = addWeeks(weekStart, i);
    const endDate = getWeekEndDate(startDate);
    
    weeks.push({
      startDate,
      endDate,
      label: formatWeekRange(startDate, endDate),
      value: formatDateYYYYMMDD(startDate)
    });
  }
  
  return weeks;
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
  
  // Usando a função createConsistentDate para garantir horário padronizado
  return createConsistentDate(year, month, day);
}

/**
 * Verifica se uma data está no passado, considerando apenas o dia
 * (ignora horas, minutos e segundos para evitar problemas de timezone)
 */
export function isPastDate(date: Date): boolean {
  // Normaliza a data de entrada e a data atual para 12:00 UTC
  const normalizedDate = normalizeToConsistentDate(date);
  const normalizedToday = normalizeToConsistentDate(new Date());
  
  console.log(`[DEBUG-PAST] Verificando se data está no passado:
    Data original: ${date.toISOString()}
    Data normalizada: ${normalizedDate.toISOString()}
    Hoje original: ${new Date().toISOString()}
    Hoje normalizado: ${normalizedToday.toISOString()}
    Componentes da data:
    - Ano: ${normalizedDate.getUTCFullYear()}
    - Mês: ${normalizedDate.getUTCMonth() + 1}
    - Dia: ${normalizedDate.getUTCDate()}
    Componentes de hoje:
    - Ano: ${normalizedToday.getUTCFullYear()}
    - Mês: ${normalizedToday.getUTCMonth() + 1}
    - Dia: ${normalizedToday.getUTCDate()}`);
  
  // Compara as datas normalizadas
  const isPast = normalizedDate < normalizedToday;
  
  console.log(`[DEBUG-PAST] Resultado: ${isPast ? 'Está no passado' : 'Não está no passado'}`);
  
  return isPast;
} 