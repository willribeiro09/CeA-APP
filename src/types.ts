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

// =================================================================
// Types for the new event-based synchronization system
// =================================================================

export const CHANGE_TYPE = {
  ADD: 'add',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;
export type ChangeType = (typeof CHANGE_TYPE)[keyof typeof CHANGE_TYPE];

export const ITEM_TYPE = {
  EXPENSES: 'expenses',
  PROJECTS: 'projects',
  STOCK: 'stock',
  EMPLOYEES: 'employees',
  WILL_SETTINGS: 'willSettings',
} as const;
export type ItemType = (typeof ITEM_TYPE)[keyof typeof ITEM_TYPE];

export interface ItemChange {
  id: string; // UUID for the change event itself
  item_id: string; // ID of the item that was changed
  item_type: ItemType;
  change_type: ChangeType;
  data: any; // The full data of the item after the change
  timestamp: number; // Unix timestamp (ms) of when the change occurred
  session_id: string; // ID of the browser session that made the change
  list_name?: string | null; // Optional: for categorized items like expenses
}
