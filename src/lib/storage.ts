import { Expense, Project, StockItem, Employee, EmployeeName } from '../types';

type ListName = 'Carlos' | 'Diego' | 'C&A';

const STORAGE_KEY = 'expenses_app_data';

export interface StorageData {
  items: {
    expenses: Record<ListName, Expense[]>;
    projects: Project[];
    stock: StockItem[];
    employees: Record<EmployeeName, Employee[]>;
  };
}

export const storage = {
  getData(): StorageData {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return { 
          items: { 
            expenses: {
              'Carlos': [],
              'Diego': [],
              'C&A': []
            },
            projects: [],
            stock: [],
            employees: {}
          } 
        };
      }

      const parsedData = JSON.parse(data) as StorageData;

      // Converter datas em Expenses
      Object.values(parsedData.items.expenses).forEach(expenses => {
        (expenses as Expense[]).forEach(expense => {
          expense.dueDate = new Date(expense.dueDate);
        });
      });

      // Converter datas em Projects
      parsedData.items.projects.forEach(project => {
        project.startDate = new Date(project.startDate);
      });

      // Converter datas em Employees
      if (parsedData.items.employees) {
        Object.values(parsedData.items.employees).forEach(employees => {
          (employees as Employee[]).forEach(employee => {
            employee.weekStartDate = new Date(employee.weekStartDate);
          });
        });
      }

      return parsedData;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return { 
        items: { 
          expenses: {
            'Carlos': [],
            'Diego': [],
            'C&A': []
          },
          projects: [],
          stock: [],
          employees: {}
        } 
      };
    }
  },

  saveData(data: StorageData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      throw new Error('Não foi possível salvar os dados. Verifique o espaço disponível no navegador.');
    }
  },

  clearData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
    }
  }
}; 