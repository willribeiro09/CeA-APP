import { Expense, Project, StockItem, Employee, ValidationResult } from '../types';

// Funções de validação para cada tipo de item
const validateExpense = (expense: Partial<Expense>): string | null => {
  if (!expense.description || expense.description.trim() === '') {
    return 'A descrição é obrigatória';
  }
  
  if (!expense.amount || isNaN(expense.amount) || expense.amount <= 0) {
    return 'O valor deve ser maior que zero';
  }
  
  if (!expense.date) {
    return 'A data é obrigatória';
  }
  
  return null;
};

const validateProject = (project: Partial<Project>): string | null => {
  if (!project.name || project.name.trim() === '') {
    return 'O nome do projeto é obrigatório';
  }
  
  if (!project.client || project.client.trim() === '') {
    return 'O cliente é obrigatório';
  }
  
  if (!project.startDate) {
    return 'A data de início é obrigatória';
  }
  
  return null;
};

const validateStockItem = (item: Partial<StockItem>): string | null => {
  if (!item.name || item.name.trim() === '') {
    return 'O nome do item é obrigatório';
  }
  
  if (item.quantity === undefined || isNaN(item.quantity) || item.quantity < 0) {
    return 'A quantidade deve ser um número não negativo';
  }
  
  if (!item.unit || item.unit.trim() === '') {
    return 'A unidade é obrigatória';
  }
  
  return null;
};

const validateEmployee = (employee: Partial<Employee>): string | null => {
  if (!employee.name || employee.name.trim() === '') {
    return 'O nome do funcionário é obrigatório';
  }
  
  if (!employee.dailyRate || isNaN(employee.dailyRate) || employee.dailyRate <= 0) {
    return 'A diária deve ser maior que zero';
  }
  
  return null;
};

// Objeto de validação exportado
export const validation = {
  expense: validateExpense,
  project: validateProject,
  stockItem: validateStockItem,
  employee: validateEmployee
}; 