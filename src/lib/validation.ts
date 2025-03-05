import { Item, ValidationResult, Expense, Project, StockItem, Employee } from '../types';

const MAX_FUTURE_DAYS = 365; // 1 ano no futuro
const MIN_PAST_DAYS = -365; // 1 ano no passado

function isValidDate(date: Date | undefined, allowPast: boolean = true): boolean {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + MAX_FUTURE_DAYS);

  const minDate = new Date();
  minDate.setDate(today.getDate() + MIN_PAST_DAYS);

  if (!allowPast && date < today) {
    return false;
  }

  return date >= minDate && date <= maxDate;
}

export const validation = {
  validateExpense(data: Partial<Expense>): ValidationResult {
    const errors = [];

    if (!data.name?.trim()) {
      errors.push({ field: 'name', message: 'Nome é obrigatório' });
    } else if (data.name.length > 100) {
      errors.push({ field: 'name', message: 'Nome deve ter no máximo 100 caracteres' });
    }

    if (typeof data.amount !== 'number') {
      errors.push({ field: 'amount', message: 'Valor é obrigatório' });
    } else if (data.amount <= 0) {
      errors.push({ field: 'amount', message: 'Valor deve ser maior que zero' });
    } else if (data.amount > 1000000) {
      errors.push({ field: 'amount', message: 'Valor deve ser menor que 1.000.000' });
    }

    if (!isValidDate(data.dueDate as Date)) {
      errors.push({ 
        field: 'dueDate', 
        message: 'Data de vencimento deve estar entre 1 ano no passado e 1 ano no futuro' 
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  validateProject(data: Partial<Project>): ValidationResult {
    const errors = [];

    if (!data.name?.trim()) {
      errors.push({ field: 'name', message: 'Nome é obrigatório' });
    } else if (data.name.length > 100) {
      errors.push({ field: 'name', message: 'Nome deve ter no máximo 100 caracteres' });
    }

    if (!data.description?.trim()) {
      errors.push({ field: 'description', message: 'Descrição é obrigatória' });
    } else if (data.description.length > 500) {
      errors.push({ field: 'description', message: 'Descrição deve ter no máximo 500 caracteres' });
    }

    if (!isValidDate(data.startDate as Date, false)) {
      errors.push({ 
        field: 'startDate', 
        message: 'Data de início não pode estar no passado e deve ser no máximo 1 ano no futuro' 
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  validateStockItem(data: Partial<StockItem>): ValidationResult {
    const errors = [];

    if (!data.name?.trim()) {
      errors.push({ field: 'name', message: 'Nome é obrigatório' });
    } else if (data.name.length > 100) {
      errors.push({ field: 'name', message: 'Nome deve ter no máximo 100 caracteres' });
    }

    if (typeof data.quantity !== 'number') {
      errors.push({ field: 'quantity', message: 'Quantidade é obrigatória' });
    } else if (data.quantity < 0) {
      errors.push({ field: 'quantity', message: 'Quantidade deve ser maior ou igual a zero' });
    } else if (data.quantity > 1000000) {
      errors.push({ field: 'quantity', message: 'Quantidade deve ser menor que 1.000.000' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  validateEmployee(data: Partial<Employee>): ValidationResult {
    const errors = [];

    if (!data.name?.trim()) {
      errors.push({ field: 'name', message: 'Nome é obrigatório' });
    } else if (data.name.length > 100) {
      errors.push({ field: 'name', message: 'Nome deve ter no máximo 100 caracteres' });
    }

    if (typeof data.daysWorked !== 'number') {
      errors.push({ field: 'daysWorked', message: 'Dias trabalhados é obrigatório' });
    } else if (data.daysWorked < 0) {
      errors.push({ field: 'daysWorked', message: 'Dias trabalhados deve ser maior ou igual a zero' });
    } else if (data.daysWorked > 7) {
      errors.push({ field: 'daysWorked', message: 'Dias trabalhados deve ser no máximo 7' });
    }

    if (!isValidDate(data.weekStartDate as Date)) {
      errors.push({ 
        field: 'weekStartDate', 
        message: 'Data de início da semana deve estar entre 1 ano no passado e 1 ano no futuro' 
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  validateItem(item: Partial<Item>): ValidationResult {
    if (!item.category) {
      return {
        isValid: false,
        errors: [{ field: 'category', message: 'Categoria é obrigatória' }]
      };
    }

    switch (item.category) {
      case 'Expenses':
        return this.validateExpense(item as Partial<Expense>);
      case 'Projects':
        return this.validateProject(item as Partial<Project>);
      case 'Stock':
        return this.validateStockItem(item as Partial<StockItem>);
      case 'Employees':
        return this.validateEmployee(item as Partial<Employee>);
      default:
        return {
          isValid: false,
          errors: [{ field: 'category', message: 'Categoria inválida' }]
        };
    }
  }
}; 