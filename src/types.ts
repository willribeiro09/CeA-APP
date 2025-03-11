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
  is_paid?: boolean;
  paid?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  client: string;
  projectNumber?: string;
  startDate: string;
  endDate?: string;
  status: 'completed' | 'in_progress';
  notes?: string;
  location?: string;
  value?: number;
  invoiceOk?: boolean;
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
  employeeName: string;
  role?: string;
  startDate: string;
  weekStartDate: string;
  daysWorked: number;
  dailyRate: number;
  phone?: string;
  email?: string;
  notes?: string;
}

export type Item = Expense | Project | StockItem | Employee;

export interface StorageItems {
  expenses: Record<string, Expense[]>;
  projects: Project[];
  stock: StockItem[];
  employees: Record<string, Employee[]>;
  lastSync: number | string;
  willBaseRate?: number;
  willBonus?: number;
}

export type SyncData = StorageItems;

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