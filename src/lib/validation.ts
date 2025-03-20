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
 * Normaliza um valor monetário, aceitando diferentes formatos (vírgulas e pontos)
 * e retornando um número
 * @param value String com o valor monetário (ex: "1,347.05" ou "1.347,05")
 * @returns number
 */
export function normalizeMonetaryValue(value: string): number {
  if (!value) return 0;
  
  // Remove espaços em branco
  let normalizedValue = value.trim();
  
  // Verifica o formato: se tem vírgula como decimal (1.347,05) ou ponto como decimal (1,347.05)
  if (normalizedValue.indexOf(',') > normalizedValue.indexOf('.') && normalizedValue.indexOf('.') !== -1) {
    // Formato americano: 1,347.05
    // Remove as vírgulas
    normalizedValue = normalizedValue.replace(/,/g, '');
  } else {
    // Formato brasileiro: 1.347,05
    // Substitui pontos por nada e vírgulas por pontos
    normalizedValue = normalizedValue.replace(/\./g, '').replace(',', '.');
  }
  
  // Converte para número e garante que não seja NaN
  const result = parseFloat(normalizedValue);
  return isNaN(result) ? 0 : result;
} 