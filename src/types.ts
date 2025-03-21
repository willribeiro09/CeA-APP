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
  dailyRate: number;
  employeeName?: string;
  weekStartDate: string;
  daysWorked: number;
  workedDates?: string[];
  category: 'Employees';
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
  updatedAt?: number;
  version?: number;
  pendingChanges?: PendingChange[];
  isOffline?: boolean;
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

/**
 * Tipo para mudanças pendentes quando offline
 */
export interface PendingChange {
  id: string;
  timestamp: string;
  syncStatus: 'pending' | 'failed' | 'completed';
  type: 'add' | 'update' | 'delete';
  entity: 'expenses' | 'projects' | 'stock' | 'employees';
  data: any;
  lastAttempt?: string;
}
