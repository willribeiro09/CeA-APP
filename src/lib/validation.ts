import { Expense, Project, StockItem, Employee } from '../types';

export const validation = {
  expense: (expense: Partial<Expense>): string | null => {
    if (!expense.description?.trim()) {
      return 'Descrição é obrigatória';
    }
    if (!expense.amount || expense.amount <= 0) {
      return 'Valor deve ser maior que zero';
    }
    if (!expense.date) {
      return 'Data é obrigatória';
    }
    return null;
  },

  project: (project: Partial<Project>): string | null => {
    if (!project.name?.trim()) {
      return 'Nome do projeto é obrigatório';
    }
    if (!project.client?.trim()) {
      return 'Nome do cliente é obrigatório';
    }
    if (!project.startDate) {
      return 'Data de início é obrigatória';
    }
    return null;
  },

  stockItem: (item: Partial<StockItem>): string | null => {
    if (!item.name?.trim()) {
      return 'Nome do item é obrigatório';
    }
    if (!item.quantity || item.quantity < 0) {
      return 'Quantidade deve ser maior ou igual a zero';
    }
    return null;
  },

  employee: (employee: Partial<Employee>): string | null => {
    if (!employee.name?.trim()) {
      return 'Nome do funcionário é obrigatório';
    }
    if (!employee.role?.trim()) {
      return 'Função é obrigatória';
    }
    return null;
  }
}; 