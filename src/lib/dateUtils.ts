import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { isMobileDevice, getEnvironmentInfo } from './deviceUtils';

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
  
  // Não adicionar dias - manter o dia original
  const adjustedDay = day; 
  
  // Criar data com horário meio-dia UTC para evitar problemas de mudança de dia
  const normalized = new Date(Date.UTC(year, month, adjustedDay, 12, 0, 0));
  
  return normalized;
}

/**
 * Ajusta uma data especificamente para recibos de funcionários, aplicando ajuste maior
 * Versão melhorada para suportar melhor dispositivos móveis e diferentes fusos horários
 * @param date Data a ser normalizada
 * @returns Data ajustada para meio-dia UTC do mesmo dia
 */
export function normalizeEmployeeDate(date: Date): Date {
  // Verificar se a data é válida
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error("Data inválida recebida:", date);
    return new Date();
  }
  
  // Extrair componentes da data original
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Ajuste para dispositivos móveis - testando abordagem robusta
  let adjustedDay = day;
  
  // Criar data normalizada com horário meio-dia UTC para evitar problemas de mudança de dia
  // Agora garantindo que o dia será o mesmo independente do fuso ou plataforma
  const normalized = new Date(Date.UTC(year, month, adjustedDay, 12, 0, 0));
  
  // Em dispositivos móveis, podemos precisar de ajustes adicionais dependendo do comportamento
  if (isMobileDevice()) {
    // Verificar se o dia foi alterado incorretamente devido ao fuso horário
    if (normalized.getUTCDate() !== day) {
      // Ajustar explicitamente para o dia correto
      normalized.setUTCDate(day);
      normalized.setUTCHours(12, 0, 0, 0);
    }
  }
  
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
  
  // Para funcionários, a semana começa na segunda-feira
  // Se for domingo (0), voltar 6 dias para a segunda anterior
  // Se for outro dia, voltar até a segunda desta semana
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Criar nova data com a segunda-feira
  const weekStartDate = new Date(normalized);
  weekStartDate.setUTCDate(normalized.getUTCDate() - daysToSubtract);
  weekStartDate.setUTCHours(12, 0, 0, 0); // Meio-dia UTC
  
  return weekStartDate;
}

/**
 * Função para obter o fim da semana (sábado)
 * Versão segura que usa a abordagem de UTC
 */
export function getEmployeeWeekEnd(date: Date): Date {
  const weekStart = getEmployeeWeekStart(date);
  
  // Para funcionários, a semana termina no sábado (5 dias após a segunda)
  const weekEndDate = new Date(weekStart);
  weekEndDate.setUTCDate(weekStart.getUTCDate() + 5);
  weekEndDate.setUTCHours(23, 59, 59, 999);
  
  return weekEndDate;
}

/**
 * Função para obter o início da semana para projetos (quarta-feira)
 * Versão segura que usa a abordagem de UTC
 */
export function getProjectWeekStart(date: Date): Date {
  // Usar data "segura" no próprio dia (sem deslocamento de +1)
  const safe = createSafeDate(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = safe.getUTCDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  
  // Para projetos, a semana começa na quarta-feira
  let daysToAdjust;
  if (dayOfWeek === 3) {
    daysToAdjust = 0;
  } else if (dayOfWeek < 3) {
    daysToAdjust = dayOfWeek + 4; // Voltar para quarta anterior
  } else {
    daysToAdjust = dayOfWeek - 3; // Voltar para quarta desta semana
  }
  
  const weekStartDate = new Date(safe);
  weekStartDate.setUTCDate(safe.getUTCDate() - daysToAdjust);
  weekStartDate.setUTCHours(12, 0, 0, 0); // Meio-dia UTC
  
  return weekStartDate;
}

/**
 * Função para obter o fim da semana para projetos (terça-feira)
 * Versão segura que usa a abordagem de UTC
 */
export function getProjectWeekEnd(date: Date): Date {
  const weekStart = getProjectWeekStart(date);
  
  // Para projetos, a semana termina na terça-feira (6 dias após a quarta)
  const weekEndDate = new Date(weekStart);
  weekEndDate.setUTCDate(weekStart.getUTCDate() + 6);
  weekEndDate.setUTCHours(23, 59, 59, 999);
  
  return weekEndDate;
}

/**
 * Função para formatar a data no formato "March 19 to 25"
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
 * Função para gerar semanas para employees: Current week primeiro, depois Last week
 * Formato: "MM/DD To MM/DD"
 */
export function getWeeks(currentDate: Date = new Date()): Array<{
  startDate: Date;
  endDate: Date;
  label: string;
  value: string;
  isCurrent: boolean;
  isPast: boolean;
}> {
  const today = createSafeDate(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const currentWeekMonday = findCurrentWeekMonday(today);

  // Construir Current (i=0) e Last (i=-1) nesta ordem
  const indices = [0, -1];
  const now = new Date();
  const weeks = indices.map(i => {
    const weekMonday = new Date(currentWeekMonday);
    weekMonday.setUTCDate(currentWeekMonday.getUTCDate() + (i * 7));

    const weekStart = new Date(weekMonday);
    weekStart.setUTCHours(12, 0, 0, 0);

    const weekEnd = new Date(weekMonday);
    weekEnd.setUTCDate(weekMonday.getUTCDate() + 5); // sábado
    weekEnd.setUTCHours(23, 59, 59, 999);

    const isCurrent = now >= weekStart && now <= weekEnd;
    const isPast = now > weekEnd;

    return {
      startDate: weekStart,
      endDate: weekEnd,
      label: formatWeekLabel(weekStart, weekEnd),
      value: formatDateToISO(weekStart),
      isCurrent,
      isPast
    };
  });

  return weeks;
}

/**
 * Encontra a segunda-feira da semana atual baseada em uma data de referência
 * Se a data for domingo, retorna a segunda-feira da semana anterior
 * Se a data for segunda a sábado, retorna a segunda-feira da semana atual
 */
function findCurrentWeekMonday(date: Date): Date {
  const normalized = normalizeDate(date);
  const dayOfWeek = normalized.getUTCDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  
  let daysToMonday;
  
  if (dayOfWeek === 1) {
    // Já é segunda-feira
    daysToMonday = 0;
  } else if (dayOfWeek === 0) {
    // Domingo - voltar para segunda-feira da semana anterior
    daysToMonday = -6;
  } else {
    // Terça (2) a Sábado (6) - voltar para segunda-feira desta semana
    daysToMonday = -(dayOfWeek - 1);
  }
  
  const monday = new Date(normalized);
  monday.setUTCDate(normalized.getUTCDate() + daysToMonday);
  monday.setUTCHours(12, 0, 0, 0);
  
  return monday;
}

/**
 * Encontra a quarta-feira da semana atual baseada em uma data de referência
 * Se a data for domingo, segunda ou terça, retorna a quarta-feira da semana anterior
 * Se a data for quarta, quinta, sexta ou sábado, retorna a quarta-feira da semana atual
 */
function findCurrentWeekWednesday(date: Date): Date {
  // Usar data "segura" no próprio dia (sem deslocamento de +1)
  const safe = createSafeDate(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = safe.getUTCDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  
  let daysToWednesday;
  if (dayOfWeek === 3) {
    daysToWednesday = 0;
  } else if (dayOfWeek < 3) {
    daysToWednesday = -(dayOfWeek + 4); // voltar para quarta anterior
  } else {
    daysToWednesday = -(dayOfWeek - 3); // voltar para quarta desta semana
  }
  
  const wednesday = new Date(safe);
  wednesday.setUTCDate(safe.getUTCDate() + daysToWednesday);
  wednesday.setUTCHours(12, 0, 0, 0);
  
  return wednesday;
}

/**
 * Formata o label da semana no formato "08/27 To 09/02"
 */
function formatWeekLabel(startDate: Date, endDate: Date): string {
  const startMonth = (startDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const startDay = startDate.getUTCDate().toString().padStart(2, '0');
  
  const endMonth = (endDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const endDay = endDate.getUTCDate().toString().padStart(2, '0');
  
  return `${startMonth}/${startDay} To ${endMonth}/${endDay}`;
}



/**
 * Função para gerar semanas para projetos: Current week e Last week
 * Formato: "MM/DD To MM/DD"
 * Semanas começam na quarta-feira e terminam na terça-feira
 */
export function getProjectWeeks(currentDate: Date = new Date()): Array<{
  startDate: Date;
  endDate: Date;
  label: string;
  value: string;
  isCurrent: boolean;
  isPast: boolean;
}> {
  const today = createSafeDate(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const currentWeekWednesday = findCurrentWeekWednesday(today);

  // Construir Current (i=0) e Last (i=-1) nesta ordem
  const indices = [0, -1];
  const now = new Date();
  const weeks = indices.map(i => {
    const weekWednesday = new Date(currentWeekWednesday);
    weekWednesday.setUTCDate(currentWeekWednesday.getUTCDate() + (i * 7));

    const weekStart = new Date(weekWednesday);
    weekStart.setUTCHours(12, 0, 0, 0);

    const weekEnd = new Date(weekWednesday);
    weekEnd.setUTCDate(weekWednesday.getUTCDate() + 6); // Terça
    weekEnd.setUTCHours(23, 59, 59, 999);

    const isCurrent = now >= weekStart && now <= weekEnd;
    const isPast = now > weekEnd;

    return {
      startDate: weekStart,
      endDate: weekEnd,
      label: formatWeekLabel(weekStart, weekEnd),
      value: formatDateToISO(weekStart),
      isCurrent,
      isPast
    };
  });

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

/**
 * Função de teste para verificar a correção das datas
 * Use esta função para testar se o ajuste está funcionando corretamente
 */
export function testarAjusteData(dataOriginal: Date): void {
  console.group("TESTE DE AJUSTE DE DATA");
  console.log("Data Original:", dataOriginal.toISOString(), "Local:", dataOriginal.toString());
  
  // Testar normalizeDate (adiciona +1 dia para compensar fuso)
  const dataNormalizada = normalizeDate(dataOriginal);
  console.log("Após normalizeDate (+1 dia):", dataNormalizada.toISOString(), "Local:", dataNormalizada.toString());
  
  // Testar normalizeEmployeeDate (mantém o mesmo dia, só ajusta para UTC)
  const dataFuncionario = normalizeEmployeeDate(dataOriginal);
  console.log("Após normalizeEmployeeDate (sem ajuste):", dataFuncionario.toISOString(), "Local:", dataFuncionario.toString());
  
  // Formatar para ISO (armazenamento)
  const dataISO = formatDateToISO(dataNormalizada);
  console.log("Formato ISO para armazenamento (normalizeDate):", dataISO);
  
  // Formatar para ISO (armazenamento de funcionário)
  const dataISOFuncionario = formatDateToISO(dataFuncionario);
  console.log("Formato ISO para armazenamento (normalizeEmployeeDate):", dataISOFuncionario);
  
  console.log("\nResumo importante:");
  console.log("- Dia original: " + dataOriginal.getDate());
  console.log("- Dia após normalizeDate: " + dataNormalizada.getUTCDate());
  console.log("- Dia após normalizeEmployeeDate: " + dataFuncionario.getUTCDate());
  console.log("- Dia no formato ISO (normalizeDate): " + dataISO.split("-")[2]);
  console.log("- Dia no formato ISO (normalizeEmployeeDate): " + dataISOFuncionario.split("-")[2]);
  
  console.groupEnd();
}

/**
 * Ajusta a string ISO retornada do banco de dados para exibição na interface
 * O formato string ISO "YYYY-MM-DD" é convertido para uma data sem problema de fuso
 * Versão robusta para múltiplos fusos horários e dispositivos
 * @param dateString String de data no formato ISO (YYYY-MM-DD)
 * @returns Data ajustada para o fuso local
 */
export function adjustEmployeeDateDisplay(dateString: string): Date {
  // Verificar se a data é válida
  if (!dateString || typeof dateString !== 'string') {
    console.error("String de data inválida recebida:", dateString);
    return new Date();
  }
  
  console.group("adjustEmployeeDateDisplay");
  const envInfo = getEnvironmentInfo();
  console.log("Ambiente:", envInfo);
  
  // Extrair dia, mês e ano da string
  const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
  
  // Adicionar horário ao final para garantir o mesmo dia - abordagem robusta
  // Criando a data diretamente com os componentes extraídos e fixando o horário em 12:00 UTC
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  
  console.log("adjustEmployeeDateDisplay:", {
    original: dateString,
    yearPart: year,
    monthPart: month,
    dayPart: day,
    resultado: date.toISOString(),
    diaLocal: date.getDate(),
    diaUTC: date.getUTCDate()
  });
  
  // Em dispositivos móveis, podemos precisar de verificações extras
  if (isMobileDevice() && date.getUTCDate() !== day) {
    console.log("Correção para mobile: ajustando dia explicitamente");
    date.setUTCDate(day);
    date.setUTCHours(12, 0, 0, 0);
  }
  
  console.groupEnd();
  
  return date;
}

/**
 * Formata uma data para exibição em interface do usuário
 * @param date Data a ser formatada
 * @param format Formato desejado
 * @returns String formatada
 */
export function formatEmployeeDateForDisplay(date: Date | string, formatString: string = 'dd/MM/yyyy'): string {
  try {
    // Se for string, converter para Date usando nosso método de ajuste
    const dateObj = typeof date === 'string' ? adjustEmployeeDateDisplay(date) : date;
    
    // Verificar se a data é válida
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return '';
    }
    
    // Formatar a data usando date-fns
    return format(dateObj, formatString, { locale: enUS });
  } catch (error) {
    console.error("Erro ao formatar data para exibição:", error);
    return '';
  }
}

/**
 * Função de teste para verificar se as semanas estão sendo geradas corretamente
 */
export function testWeekRanges(): void {
  console.group("=== TESTE DE GERAÇÃO DE SEMANAS ===");
  
  // Testar semanas de funcionários (segunda a sábado)
  const employeeWeeks = getWeeks();
  console.log("Semanas de Funcionários (segunda a sábado):");
  employeeWeeks.forEach((week, index) => {
    const start = week.startDate;
    const end = week.endDate;
    const startDay = start.getUTCDay(); // 0 = domingo, 1 = segunda, ...
    const endDay = end.getUTCDay(); // 0 = domingo, 1 = segunda, ...
    console.log(`Week ${index}:`, {
      label: week.label,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      startDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startDay],
      endDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][endDay],
      isStartMonday: startDay === 1,
      isEndSaturday: endDay === 6
    });
  });
  
  // Testar semanas de projetos (quarta a terça)
  const projectWeeks = getProjectWeeks();
  console.log("\nSemanas de Projetos (quarta a terça):");
  projectWeeks.forEach((week, index) => {
    const start = week.startDate;
    const end = week.endDate;
    const startDay = start.getUTCDay(); // 0 = domingo, 1 = segunda, ...
    const endDay = end.getUTCDay(); // 0 = domingo, 1 = segunda, ...
    console.log(`Week ${index}:`, {
      label: week.label,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      startDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startDay],
      endDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][endDay],
      isStartWednesday: startDay === 3,
      isEndTuesday: endDay === 2
    });
  });
  
  console.groupEnd();
} 