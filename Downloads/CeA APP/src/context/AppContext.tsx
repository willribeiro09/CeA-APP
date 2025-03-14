import React, { createContext, useContext, ReactNode } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import { useProjects } from '../hooks/useProjects';
import { useEmployees } from '../hooks/useEmployees';
import { useStock } from '../hooks/useStock';
import { useUI } from '../hooks/useUI';
import { useSync } from '../hooks/useSync';
import { useWeekSelection } from '../hooks/useWeekSelection';

// Interface para o contexto da aplicação
interface AppContextType {
  expenses: ReturnType<typeof useExpenses>;
  projects: ReturnType<typeof useProjects>;
  employees: ReturnType<typeof useEmployees>;
  stock: ReturnType<typeof useStock>;
  ui: ReturnType<typeof useUI>;
  sync: ReturnType<typeof useSync>;
  weekSelection: ReturnType<typeof useWeekSelection>;
}

// Criação do contexto
const AppContext = createContext<AppContextType | null>(null);

// Hook personalizado para acessar o contexto
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext deve ser usado dentro de um AppProvider');
  }
  return context;
}

// Propriedades do provedor
interface AppProviderProps {
  children: ReactNode;
}

// Componente provedor do contexto
export function AppProvider({ children }: AppProviderProps) {
  // Inicializar os hooks
  const expenses = useExpenses();
  const projects = useProjects();
  const employees = useEmployees();
  const stock = useStock();
  const ui = useUI();
  const sync = useSync();
  const weekSelection = useWeekSelection();

  // Valor do contexto
  const value: AppContextType = {
    expenses,
    projects,
    employees,
    stock,
    ui,
    sync,
    weekSelection
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
} 