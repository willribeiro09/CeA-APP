// Tipos para despesas
export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  is_paid: boolean;
  category?: string;
  photo_url?: string;
  project_id?: string;
  owner_id?: string;
}

// Tipos para projetos
export interface Project {
  id: string;
  name: string;
  client?: string;
  startDate?: string;
  endDate?: string;
  status?: 'in_progress' | 'completed';
  location?: string;
  value?: number;
  projectNumber?: string;
  description?: string;
  invoiceOk?: boolean;
  start_date?: string;
  end_date?: string;
  project_number?: string;
  invoice_ok?: boolean;
}

// Tipos para funcionários
export interface Employee {
  id: string;
  name: string;
  role?: string;
  weekStartDate?: string;
  daysWorked?: number;
  dailyRate?: number;
  workedDates?: string[];
  week_start?: string;
  daily_rate?: number;
  days_worked?: number;
  worked_dates?: any;
}

// Tipos para itens de estoque
export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  project_id?: string;
  description?: string;
  price?: number;
  category?: string;
}

// Tipos para UI
export type Category = 'expenses' | 'projects' | 'stock' | 'employees' | 'will';
export type ListName = 'Carlos' | 'Diego' | 'C&A';
export type EmployeeName = 'Matheus' | 'Will' | 'Carlos' | 'Diego' | string;

// Tipo para controle de sincronização
export interface SyncControl {
  id: string;
  table_name: string;
  will_base_rate?: number;
  will_bonus?: number;
  global_version?: number;
  last_sync?: string;
}

// Tipos para armazenamento
export interface StorageItems {
  expenses: Record<string, Expense[]>;
  projects: Project[];
  employees: Record<string, Employee[]>;
  stock: StockItem[];
  willBaseRate: number;
  willBonus: number;
  lastSync?: number;
}

// Tipo para itens genéricos (usado em componentes de edição)
export type Item = Expense | Project | StockItem | Employee; 