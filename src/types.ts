export interface BaseItem {
  id: string;
  name: string;
  category: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  lastModified?: number; // Timestamp para sincronização
  deviceId?: string; // ID do dispositivo que criou/modificou
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
  lastModified?: number; // Timestamp para sincronização
  deviceId?: string; // ID do dispositivo que criou/modificou
}

export interface ProjectPhoto {
  id: string;
  projectId: string;
  filename?: string;
  path: string;
  url: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
  editedAt?: string;
  deviceId?: string;
  isEdited?: boolean;
  originalPhotoId?: string;
  metadata?: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  client: string;
  clientType?: 'Power' | 'Private'; // Novo campo para categorizar projetos
  projectNumber?: string;
  startDate: string;
  endDate?: string;
  status: 'completed' | 'in_progress';
  notes?: string;
  location?: string;
  value?: number;
  invoiceOk?: boolean;
  photos?: ProjectPhoto[];
  lastModified?: number; // Timestamp para sincronização
  deviceId?: string; // ID do dispositivo que criou/modificou
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minimumQuantity?: number;
  notes?: string;
  lastModified?: number; // Timestamp para sincronização
  deviceId?: string; // ID do dispositivo que criou/modificou
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
  lastModified?: number; // Timestamp para sincronização
  deviceId?: string; // ID do dispositivo que criou/modificou
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
  deletedIds?: string[];
  version?: number; // Adicionando propriedade version opcional
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
