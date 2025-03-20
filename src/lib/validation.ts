import { Expense, Project, StockItem, Employee } from '../types';

export const validation = {
  expense: (expense: Partial<Expense>): string | null => {
    console.log("Validando despesa:", expense);
    if (!expense.description?.trim()) {
      return 'Descrição é obrigatória';
    }
    if (!expense.amount || expense.amount <= 0) {
      return 'Valor deve ser maior que zero';
    }
    if (!expense.date) {
      return 'Data é obrigatória';
    }
    console.log("Despesa válida");
    return null;
  },

  project: (project: Partial<Project>): string | null => {
    console.log("Validando projeto:", project);
    if (!project.name?.trim()) {
      return 'Nome do projeto é obrigatório';
    }
    if (!project.client?.trim()) {
      return 'Nome do cliente é obrigatório';
    }
    if (!project.startDate) {
      return 'Data de início é obrigatória';
    }
    console.log("Projeto válido");
    return null;
  },

  stockItem: (item: Partial<StockItem>): string | null => {
    console.log("Validando item de estoque:", item);
    if (!item.name?.trim()) {
      return 'Nome do item é obrigatório';
    }
    if (!item.quantity || item.quantity < 0) {
      return 'Quantidade deve ser maior ou igual a zero';
    }
    console.log("Item de estoque válido");
    return null;
  },

  employee: (employee: Partial<Employee>): string | null => {
    console.log("Validando funcionário:", employee);
    if (!employee.name?.trim()) {
      return 'Nome do funcionário é obrigatório';
    }
    if (!employee.dailyRate || employee.dailyRate <= 0) {
      return 'Valor por dia deve ser maior que zero';
    }
    console.log("Funcionário válido");
    return null;
  }
};

/**
 * Normaliza um valor monetário para o formato adequado
 * Aceita valores como "1,347.05" ou "1.347,05"
 * @param value Valor monetário em string
 * @returns Valor como número
 */
export function normalizeMonetaryValue(value: string): number {
  if (!value) return 0;
  
  // Remove espaços em branco
  let normalizedValue = value.trim();
  
  // Verifica se temos o formato com ponto e vírgula (ex: 1,347.05)
  if (normalizedValue.includes(',') && normalizedValue.includes('.')) {
    // Verifica qual vem primeiro: a vírgula ou o ponto
    const commaIndex = normalizedValue.indexOf(',');
    const dotIndex = normalizedValue.indexOf('.');
    
    if (commaIndex < dotIndex) {
      // Formato americano 1,347.05 - Remove as vírgulas
      normalizedValue = normalizedValue.replace(/,/g, '');
    } else {
      // Formato europeu 1.347,05 - Remove os pontos e substitui a vírgula por ponto
      normalizedValue = normalizedValue.replace(/\./g, '').replace(',', '.');
    }
  } else if (normalizedValue.includes(',')) {
    // Verifica se a vírgula está sendo usada como separador decimal ou de milhar
    const parts = normalizedValue.split(',');
    if (parts[1] && parts[1].length <= 2) {
      // Vírgula como separador decimal (ex: 1347,05)
      normalizedValue = normalizedValue.replace(',', '.');
    } else {
      // Vírgula como separador de milhar (ex: 1,347)
      normalizedValue = normalizedValue.replace(/,/g, '');
    }
  }
  
  // Converte para número
  const numericValue = parseFloat(normalizedValue);
  
  // Retorna 0 se não for um número válido
  return isNaN(numericValue) ? 0 : numericValue;
} 