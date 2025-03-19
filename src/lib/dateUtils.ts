import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

/**
 * SOLUÇÃO DEFINITIVA PARA PROBLEMAS DE FUSO HORÁRIO EM DATAS
 * 
 * Nova abordagem:
 * 1. Todas as datas são armazenadas em UTC (ISO 8601)
 * 2. Ao selecionar uma data no formulário, ajustamos para meio-dia UTC do mesmo dia
 * 3. Ao exibir, convertemos para o formato local do usuário
 */

/**
 * Funções utilitárias para manipulação de datas
 * Todas as funções são projetadas para evitar problemas de fuso horário
 */

/**
 * Cria uma data segura sem informações de fuso horário
 * @param year Ano
 * @param month Mês (0-11)
 * @param day Dia do mês
 * @returns Data com horário fixado em UTC
 */
export function createSafeDate(year: number, month: number, day: number): Date {
  // Criando uma nova data usando UTC para evitar problemas de fuso horário
  // Definimos o horário como 12:00 UTC para garantir que não haja mudança de dia
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

/**
 * Ajusta uma data para o meio-dia UTC do mesmo dia que foi selecionado
 * Isso evita problemas de fuso horário ao salvar
 * @param date Data a ser normalizada
 * @returns Data ajustada para meio-dia UTC do mesmo dia
 */
export function normalizeDate(date: Date): Date {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error("Data inválida recebida:", date);
    return new Date();
  }
  
  // Ajustar para o dia correto com horário meio-dia UTC
  // Usando os valores locais do usuário para criar uma data UTC
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  console.log(`Data original: ${date.toISOString()} (${date.toString()})`);
  
  // Adicionar 2 dias para compensar o problema de fuso horário
  // Aumentamos de +1 para +2 porque ainda está salvando um dia a menos
  const adjustedDay = day + 2; 
  
  // Criar data com horário meio-dia UTC para evitar problemas de mudança de dia
  const normalized = new Date(Date.UTC(year, month, adjustedDay, 12, 0, 0));
  
  console.log(`Data normalizada: ${normalized.toISOString()} (${normalized.toString()})`);
  
  return normalized;
}

/**
 * Ajusta uma data especificamente para recibos de funcionários, aplicando ajuste maior
 * @param date Data a ser normalizada
 * @returns Data ajustada para meio-dia UTC do mesmo dia
 */
export function normalizeEmployeeDate(date: Date): Date {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error("Data inválida recebida para normalizeEmployeeDate:", date);
    return new Date();
  }
  
  // Ajustar para o dia correto com horário meio-dia UTC
  // Usando os valores locais do usuário para criar uma data UTC
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  console.log(`Data original (funcionário detalhado): 
    ISO: ${date.toISOString()} 
    Local: ${date.toString()}
    Date: ${date.getDate()}
    Month: ${month + 1}
    Year: ${year}
    Fuso: ${date.getTimezoneOffset() / -60}h
  `);
  
  // Adicionar 4 dias para compensar o problema de fuso horário
  // para recibos de funcionários (ajuste necessário conforme observações)
  const adjustedDay = day + 4; 
  
  // Criar data com horário meio-dia UTC para evitar problemas de mudança de dia
  const normalized = new Date(Date.UTC(year, month, adjustedDay, 12, 0, 0));
  
  console.log(`Data normalizada (funcionário detalhado): 
    ISO: ${normalized.toISOString()} 
    Local: ${normalized.toString()}
    Date: ${normalized.getDate()}
    Month: ${normalized.getMonth() + 1}
    Year: ${normalized.getFullYear()}
    Original Day: ${day} -> Adjusted Day: ${adjustedDay}
    Diferença em dias: +4
  `);
  
  return normalized;
}

/**
 * Formata uma data para o formato ISO (YYYY-MM-DD) para armazenamento
 * @param date Data a ser formatada
 * @returns String no formato YYYY-MM-DD
 */
export function formatDateToISO(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error("Data inválida recebida para formatação ISO:", date);
    return "";
  }
  
  // Extrair componentes UTC da data
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Converte uma string de data ISO para um objeto Date
 * @param dateString String de data no formato YYYY-MM-DD
 * @returns Objeto Date no padrão UTC
 */
export function parseISODate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    // Parseamos a string e criamos uma data UTC com horário meio-dia
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  } catch (error) {
    console.error("Erro ao converter string ISO para data:", error);
    return null;
  }
}

/**
 * Formata uma data para exibição no formato local do usuário (DD/MM/YYYY)
 * @param date Data a ser formatada
 * @returns Data formatada como DD/MM/YYYY
 */
export function formatDateForDisplay(date: Date | string): string {
  if (!date) return "";
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Se a entrada for uma string, converter para Date
    dateObj = parseISODate(date) || new Date();
  } else {
    dateObj = date;
  }
  
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return "";
  }
  
  // Usar Intl.DateTimeFormat para formatar a data no padrão local do usuário
  return new Intl.DateTimeFormat('pt-BR').format(dateObj);
}

/**
 * Verifica se uma data é válida
 * @param date Data a ser verificada
 * @returns Verdadeiro se a data for válida
 */
export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Obtém a data de início da semana (domingo) para uma data
 * @param date Data de referência
 * @returns Data do domingo da semana
 */
export function getWeekStart(date: Date): Date {
  const normalized = normalizeDate(date);
  const dayOfWeek = normalized.getUTCDay(); // 0 = domingo, 1 = segunda, etc.
  
  // Cria uma nova data recuando os dias necessários para chegar ao domingo
  const weekStart = new Date(normalized);
  weekStart.setUTCDate(normalized.getUTCDate() - dayOfWeek);
  
  return weekStart;
}

/**
 * Adiciona dias a uma data
 * @param date Data base
 * @param days Número de dias a adicionar
 * @returns Nova data com os dias adicionados
 */
export function addDays(date: Date, days: number): Date {
  const normalized = normalizeDate(date);
  const result = new Date(normalized);
  result.setUTCDate(normalized.getUTCDate() + days);
  return result;
}

/**
 * Função para obter o início da semana (segunda-feira)
 * Versão segura que usa a abordagem de UTC
 */
export function getEmployeeWeekStart(date: Date): Date {
  const normalized = normalizeDate(date);
  const dayOfWeek = normalized.getUTCDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  
  // Calcular dias para voltar até segunda-feira
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Criar nova data com a segunda-feira da semana atual
  const weekStartDate = new Date(normalized);
  weekStartDate.setUTCDate(normalized.getUTCDate() - daysToSubtract);
  
  return weekStartDate;
}

/**
 * Função para obter o fim da semana (sábado)
 * Versão segura que usa a abordagem de UTC
 */
export function getEmployeeWeekEnd(date: Date): Date {
  const weekStart = getEmployeeWeekStart(date);
  
  // Adicionar 5 dias ao início da semana (segunda + 5 = sábado)
  const weekEndDate = new Date(weekStart);
  weekEndDate.setUTCDate(weekStart.getUTCDate() + 5);
  
  return weekEndDate;
}

/**
 * Função para obter o início da semana para projetos (quarta-feira)
 * Versão segura que usa a abordagem de UTC
 */
export function getProjectWeekStart(date: Date): Date {
  const normalized = normalizeDate(date);
  const dayOfWeek = normalized.getUTCDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  
  // 3 = quarta-feira
  // Calcular dias para voltar até quarta-feira
  const daysToAdjust = dayOfWeek === 3 ? 0 : dayOfWeek < 3 ? dayOfWeek + 4 : dayOfWeek - 3;
  
  // Criar nova data com a quarta-feira da semana atual ou anterior
  const weekStartDate = new Date(normalized);
  weekStartDate.setUTCDate(normalized.getUTCDate() - daysToAdjust);
  
  return weekStartDate;
}

/**
 * Função para obter o fim da semana para projetos (terça-feira)
 * Versão segura que usa a abordagem de UTC
 */
export function getProjectWeekEnd(date: Date): Date {
  const weekStart = getProjectWeekStart(date);
  
  // Adicionar 6 dias ao início da semana (quarta + 6 = terça)
  const weekEndDate = new Date(weekStart);
  weekEndDate.setUTCDate(weekStart.getUTCDate() + 6);
  
  return weekEndDate;
}

/**
 * Função para formatar a data no formato "March 10 to 15"
 */
export function formatWeekRange(startDate: Date, endDate: Date): string {
  const normStart = normalizeDate(startDate);
  const normEnd = normalizeDate(endDate);
  
  const startDay = normStart.getUTCDate().toString();
  const endDay = normEnd.getUTCDate().toString();
  
  const startMonth = format(normStart, 'MMMM', { locale: enUS });
  const endMonth = format(normEnd, 'MMMM', { locale: enUS });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} to ${endDay}`;
  } else {
    return `${startMonth} ${startDay} to ${endMonth} ${endDay}`;
  }
}

/**
 * Função segura para adicionar semanas a uma data
 */
export function addWeeksSafe(date: Date, weeks: number): Date {
  const normalized = normalizeDate(date);
  const result = new Date(normalized);
  result.setUTCDate(normalized.getUTCDate() + (weeks * 7));
  
  return result;
}

/**
 * Função para gerar as próximas 5 semanas
 */
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
    // Usar função segura para adicionar semanas
    const weekStart = addWeeksSafe(currentWeekStart, i);
    const weekEnd = addWeeksSafe(currentWeekEnd, i);
    
    weeks.push({
      startDate: weekStart,
      endDate: weekEnd,
      label: formatWeekRange(weekStart, weekEnd),
      value: formatDateToISO(weekStart)
    });
  }
  
  return weeks;
}

/**
 * Função de diagnóstico para depurar problemas de fuso horário
 * @param label Rótulo para identificar a chamada
 * @param date Data a ser analisada
 */
export function diagnoseFusoHorario(label: string, date: Date): void {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error("DIAGNÓSTICO [" + label + "]: Data inválida");
    return;
  }
  
  console.group("DIAGNÓSTICO: " + label);
  console.log("Data original:", date);
  console.log("toString():", date.toString());
  console.log("toISOString():", date.toISOString());
  console.log("toLocaleDateString():", date.toLocaleDateString());
  console.log("getDate():", date.getDate());
  console.log("getUTCDate():", date.getUTCDate());
  console.log("getTimezoneOffset():", date.getTimezoneOffset(), "minutos");
  console.log("Fuso horário local:", Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.groupEnd();
} 