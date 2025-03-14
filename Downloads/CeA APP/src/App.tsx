import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ExpenseItem } from './components/ExpenseItem';
import { Navigation } from './components/Navigation';
import { CalendarButton } from './components/CalendarButton';
import { AddButton } from './components/AddButton';
import { Calendar } from './components/Calendar';
import { AddItemDialog } from './components/AddItemDialog';
import { EditItemDialog } from './components/EditItemDialog';
import { Expense, Item, Project, StockItem, Employee, EmployeeName, StorageItems, SyncData } from './types';
import { ChevronDown, X } from 'lucide-react';
import { storage } from './lib/storage';
import { validation } from './lib/validation';
import { syncService, loadInitialData, saveData } from './lib/sync';
import { isSupabaseConfigured, initSyncTable } from './lib/supabase';
import { ConnectionStatus } from './components/ConnectionStatus';
import { getData } from './lib/storage';
import { format } from 'date-fns';
import { SwipeableItem } from './components/SwipeableItem';
import { 
  DialogRoot, 
  DialogPortal, 
  DialogOverlay, 
  DialogContent, 
  DialogClose, 
  DialogTitle, 
  DialogDescription 
} from './components/DialogWrapper';
import { WillItemFixed } from './components/WillItemFixed';
import { Button } from './components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import 'react-day-picker/dist/style.css';
import { normalizeDate, formatDateToISO } from './lib/dateUtils';

type ListName = 'Carlos' | 'Diego' | 'C&A';

const initialExpenses: Record<ListName, Expense[]> = {
  'Carlos': [],
  'Diego': [],
  'C&A': []
};

const initialEmployees: Record<string, Employee[]> = {};

// Após as importações no topo do arquivo, adicione estas funções auxiliares para cálculo de datas

const getWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  // 3 = quarta-feira (0 é domingo, 1 é segunda, etc.)
  const diff = day >= 3 ? day - 3 : day + 4;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getWeekEnd = (date: Date): Date => {
  const weekStart = getWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
};

// Função para salvar alterações
const saveChanges = async (newData: StorageItems) => {
  console.log('Salvando alterações...', JSON.stringify(newData));
  try {
    // Salvar dados no localStorage
    localStorage.setItem('expenses-app-data', JSON.stringify(newData));
    console.log('Dados salvos com sucesso');
  } catch (error) {
    console.error('Erro ao salvar alterações:', error);
    
    // Mesmo com erro, tentar atualizar o estado local para evitar perda de dados
    localStorage.setItem('expenses-app-data', JSON.stringify(newData));
  }
};

export default function App() {
  console.log('Iniciando renderização do App');
  const [expenses, setExpenses] = useState<Record<ListName, Expense[]>>(initialExpenses);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee[]>>(initialEmployees);
  const [activeCategory, setActiveCategory] = useState<'Expenses' | 'Projects' | 'Stock' | 'Employees'>('Expenses');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [selectedList, setSelectedList] = useState<ListName>('C&A');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeName>('Matheus');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [selectedWeekEnd, setSelectedWeekEnd] = useState<Date>(getWeekEnd(new Date()));
  const [weekTotalValue, setWeekTotalValue] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showFeedback, setShowFeedback] = useState({ show: false, message: '', type: 'success' });
  const [showLayoffAlert, setShowLayoffAlert] = useState(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [willBaseRate, setWillBaseRate] = useState<number>(200);
  const [willBonus, setWillBonus] = useState<number>(0);

  const handleAddDay = (employeeId: string, weekStartDate: string) => {
    const updatedEmployees = { ...employees };
    const weekEmployees = updatedEmployees[weekStartDate] || [];
    const employeeIndex = weekEmployees.findIndex((e: Employee) => e.id === employeeId);
    
    // Usar a função formatDateToISO para garantir consistência no formato da data
    const today = formatDateToISO(normalizeDate(new Date()));
    
    console.log(`Adicionando dia trabalhado: ${today} para funcionário ${employeeId}`);

    if (employeeIndex >= 0) {
      // Verificar se a data já existe para evitar duplicatas
      const existingDates = weekEmployees[employeeIndex].workedDates || [];
      if (!existingDates.includes(today)) {
        weekEmployees[employeeIndex] = {
          ...weekEmployees[employeeIndex],
          daysWorked: weekEmployees[employeeIndex].daysWorked + 1,
          workedDates: [...existingDates, today]
        };
        console.log(`Dia adicionado com sucesso. Total de dias: ${weekEmployees[employeeIndex].daysWorked}`);
      } else {
        console.log(`Data ${today} já registrada para este funcionário.`);
        return; // Não fazer nada se a data já existir
      }
    } else {
      const employeeFromWeek = weekEmployees.find((e: Employee) => e.id === employeeId);
      if (employeeFromWeek) {
        weekEmployees.push({
          ...employeeFromWeek,
          weekStartDate,
          daysWorked: 1,
          workedDates: [today]
        });
        console.log(`Funcionário adicionado à semana com 1 dia trabalhado.`);
      }
    }

    updatedEmployees[weekStartDate] = weekEmployees;
    setEmployees(updatedEmployees);
    
    const storageData: StorageItems = {
      expenses,
      projects,
      stock: stockItems,
      employees: updatedEmployees,
      willBaseRate,
      willBonus,
      lastSync: Date.now()
    };
    
    saveChanges(storageData);
  };

  // Resto do código do App.tsx...
} 