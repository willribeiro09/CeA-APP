export interface BaseItem {
  id: string;
  name: string;
  category: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate?: string;
  status: 'Em Andamento' | 'Concluído' | 'Cancelado';
  notes?: string;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minimumQuantity?: number;
  notes?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  startDate: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export type Item = Expense | Project | StockItem | Employee;

export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
}

export interface NavItem {
  label: string;
  icon: string;
  category: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
}

export type EmployeeName = 'Matheus' | 'João' | 'Pedro' | 'Lucas';