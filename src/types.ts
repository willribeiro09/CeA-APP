export interface BaseItem {
  id: string;
  name: string;
  category: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
}

export interface Expense extends BaseItem {
  category: 'Expenses';
  amount: number;
  dueDate: Date;
  paid: boolean;
  date: Date;
}

export interface Project extends BaseItem {
  category: 'Projects';
  description: string;
  startDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface StockItem extends BaseItem {
  category: 'Stock';
  quantity: number;
}

export interface Employee extends BaseItem {
  category: 'Employees';
  employeeName: string;
  daysWorked: number;
  weekStartDate: Date;
  dailyRate: number;
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

export type EmployeeName = string;