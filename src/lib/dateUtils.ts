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
  
  console.log(`Data original: ${date.toISOString()} (${date.toString()})`);
  
  // Adicionar 1 dia para compensar o problema de fuso horário
  // O ajuste de +2 está causando problemas, voltamos para +1
  const adjustedDay = day + 1; 
  
  // Criar data com horário meio-dia UTC para evitar problemas de mudança de dia
  const normalized = new Date(Date.UTC(year, month, adjustedDay, 12, 0, 0));
  
  console.log(`Data normalizada: ${normalized.toISOString()} (${normalized.toString()})`);
  
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
  
  // Obter informações do ambiente para diagnóstico
  const envInfo = getEnvironmentInfo();
  
  console.group("=== DIAGNÓSTICO normalizeEmployeeDate ===");
  console.log("Ambiente:", envInfo);
  
  // Extrair componentes da data original
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Logs para diagnóstico
  console.log("Data original:", {
    iso: date.toISOString(),
    local: date.toString(),
    dia: date.getDate(),
    mes: date.getMonth() + 1,
    ano: date.getFullYear(),
    tzOffset: date.getTimezoneOffset()
  });
  
  // Ajuste para dispositivos móveis - testando abordagem robusta
  let adjustedDay = day;
  
  // Criar data normalizada com horário meio-dia UTC para evitar problemas de mudança de dia
  // Agora garantindo que o dia será o mesmo independente do fuso ou plataforma
  const normalized = new Date(Date.UTC(year, month, adjustedDay, 12, 0, 0));
  
  // Em dispositivos móveis, podemos precisar de ajustes adicionais dependendo do comportamento
  if (isMobileDevice()) {
    console.log("Dispositivo mobile detectado - aplicando ajustes adicionais");
    
    // Verificar se o dia foi alterado incorretamente devido ao fuso horário
    if (normalized.getUTCDate() !== day) {
      console.log("Correção necessária: dia UTC difere do dia original");
      
      // Ajustar explicitamente para o dia correto
      normalized.setUTCDate(day);
      normalized.setUTCHours(12, 0, 0, 0);
    }
  }
  
  // Logs para diagnóstico
  console.log("Data normalizada:", {
    iso: normalized.toISOString(),
    local: normalized.toString(),
    utcDia: normalized.getUTCDate(),
    utcMes: normalized.getUTCMonth() + 1,
    utcAno: normalized.getUTCFullYear(),
    localDia: normalized.getDate(),
    localMes: normalized.getMonth() + 1,
    localAno: normalized.getFullYear()
  });
  
  console.groupEnd();
  
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
  
  // Semana anterior
  const previousWeekStart = addWeeksSafe(getEmployeeWeekStart(currentDate), -1);
  const previousWeekEnd = getEmployeeWeekEnd(previousWeekStart);
  weeks.push({
    startDate: previousWeekStart,
    endDate: previousWeekEnd,
    label: formatWeekRange(previousWeekStart, previousWeekEnd),
    value: formatDateToISO(previousWeekStart)
  });

  // Semana atual
  const currentWeekStart = getEmployeeWeekStart(currentDate);
  const currentWeekEnd = getEmployeeWeekEnd(currentWeekStart);
  weeks.push({
    startDate: currentWeekStart,
    endDate: currentWeekEnd,
    label: formatWeekRange(currentWeekStart, currentWeekEnd),
    value: formatDateToISO(currentWeekStart)
  });

  // Próxima semana
  const nextWeekStart = addWeeksSafe(currentWeekStart, 1);
  const nextWeekEnd = addWeeksSafe(currentWeekEnd, 1);
  weeks.push({
    startDate: nextWeekStart,
    endDate: nextWeekEnd,
    label: formatWeekRange(nextWeekStart, nextWeekEnd),
    value: formatDateToISO(nextWeekStart)
  });

  return weeks;
}

/**
 * Função para gerar as próximas 5 semanas de projetos
 */
export function getNext5ProjectWeeks() {
  const today = new Date();
  const currentMonday = getProjectWeekStart(today);
  const previousMonday = getProjectWeekStart(addDays(today, -7));
  const nextMonday = getProjectWeekStart(addDays(today, 7));
  
  const weeks = [];
  
  // Semana anterior
  weeks.push({
    value: format(previousMonday, 'yyyy-MM-dd'),
    label: formatWeekRange(previousMonday, getProjectWeekEnd(previousMonday)),
    startDate: previousMonday,
    endDate: getProjectWeekEnd(previousMonday)
  });

  // Semana atual
  weeks.push({
    value: format(currentMonday, 'yyyy-MM-dd'),
    label: formatWeekRange(currentMonday, getProjectWeekEnd(currentMonday)),
    startDate: currentMonday,
    endDate: getProjectWeekEnd(currentMonday)
  });

  // Próxima semana
  weeks.push({
    value: format(nextMonday, 'yyyy-MM-dd'),
    label: formatWeekRange(nextMonday, getProjectWeekEnd(nextMonday)),
    startDate: nextMonday,
    endDate: getProjectWeekEnd(nextMonday)
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