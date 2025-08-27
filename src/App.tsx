import React, { useState, useEffect, useCallback } from 'react';
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
import { basicSyncService, loadData, saveData } from './lib/basicSync';
import { isSupabaseConfigured, initSyncTable } from './lib/supabase';
import { ConnectionStatus } from './components/ConnectionStatus';
import { getData } from './lib/storage';
import { format, addDays, startOfDay, getDay, addWeeks } from 'date-fns';
import { SwipeableItem } from './components/SwipeableItem';
import * as Dialog from '@radix-ui/react-dialog';
import { WillItemFixed } from './components/WillItemFixed';
import { Button } from './components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import 'react-day-picker/dist/style.css';
import { ProjectWeekSelector } from './components/ProjectWeekSelector';
import { WeekSelector } from './components/WeekSelector';
import EmployeeReceipt from './components/EmployeeReceipt';
import WorkDaysCalendar from './components/WorkDaysCalendar';
import { ConflictNotification } from './components/ConflictNotification';
import { v4 as uuidv4 } from 'uuid';
import { 
  formatDateToISO, 
  parseISODate, 
  getEmployeeWeekStart, 
  getEmployeeWeekEnd,
  getProjectWeekStart, 
  getProjectWeekEnd,
  normalizeDate,
  testWeekRanges 
} from './lib/dateUtils';
import { isMobileDevice, isPwaInstalled, getEnvironmentInfo } from './lib/deviceUtils';

type ListName = 'Carlos' | 'Diego' | 'C&A';

const initialExpenses: Record<ListName, Expense[]> = {
  'Carlos': [],
  'Diego': [],
  'C&A': []
};

const initialEmployees: Record<string, Employee[]> = {};

const formatDateRange = (start: Date, end: Date): string => {
  // Mostrar apenas dia e mês para economizar espaço
  return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}`;
};

// Função auxiliar para criar o objeto StorageItems
const createStorageData = (data: Partial<StorageItems>): StorageItems => ({
  expenses: data.expenses || {},
  projects: data.projects || [],
  stock: data.stock || [],
  employees: data.employees || {},
  deletedIds: data.deletedIds || [],
  lastSync: new Date().toISOString(),
  willBaseRate: data.willBaseRate,
  willBonus: data.willBonus
});

// Função auxiliar para encontrar funcionário em outras semanas
const findEmployeeInOtherWeeks = (employeeId: string, employeesData: Record<string, Employee[]>): Employee | null => {
  for (const weekKey of Object.keys(employeesData)) {
    const weekEmployees = employeesData[weekKey] || [];
    const found = weekEmployees.find(e => e.id === employeeId);
    if (found) {
      return found;
    }
  }
  return null;
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
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getProjectWeekStart(new Date()));
  const [selectedWeekEnd, setSelectedWeekEnd] = useState<Date>(getProjectWeekEnd(new Date()));
  const [weekTotalValue, setWeekTotalValue] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showFeedback, setShowFeedback] = useState({ show: false, message: '', type: 'success' });
  const [willBaseRate, setWillBaseRate] = useState(200);
  const [willBonus, setWillBonus] = useState(0);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [showLayoffAlert, setShowLayoffAlert] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<EmployeeName>('Matheus');
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [receiptEmployee, setReceiptEmployee] = useState<Employee | null>(null);
  // Adicionar estado para deletedIds
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  // Estado para sincronização de retorno do segundo plano
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      console.log('Inicializando dados...');
      
      // Inicializar tabela de sincronização se necessário
      if (isSupabaseConfigured()) {
        console.log('Supabase configurado, inicializando tabela de sincronização');
        await initSyncTable();
      } else {
        console.warn('Supabase não configurado corretamente. Usando apenas armazenamento local.');
      }
      
      // Inicializar sincronização simples
      await basicSyncService.init();
      
      // Carregar dados iniciais
      const localData = await loadData();

      if (localData) {
        console.log('Dados carregados com sucesso:', {
          expenses: Object.keys(localData.expenses || {}).length + ' listas',
          projects: (localData.projects || []).length + ' projetos',
          stock: (localData.stock || []).length + ' itens',
          employees: Object.keys(localData.employees || {}).length + ' listas'
        });
        
        setExpenses(localData.expenses || {});
        setProjects(localData.projects || []);
        setStockItems(localData.stock || []);
        setEmployees(localData.employees || {});
        
        // Carregar dados do Will se existirem
        if (localData.willBaseRate !== undefined) {
          setWillBaseRate(localData.willBaseRate);
        }
        if (localData.willBonus !== undefined) {
          setWillBonus(localData.willBonus);
        }
      } else {
        console.log('Nenhum dado encontrado no armazenamento local');
      }

      // Configurar listeners para sincronização de segundo plano
      const handleSyncReturnStarted = () => {
        console.log('🔄 UI: Sincronização de retorno iniciada');
        setIsBackgroundSyncing(true);
      };

      const handleSyncReturnCompleted = () => {
        console.log('✅ UI: Sincronização de retorno concluída');
        setIsBackgroundSyncing(false);
      };

      // Registrar eventos de sincronização de segundo plano
      window.addEventListener('syncReturnStarted', handleSyncReturnStarted);
      window.addEventListener('syncReturnCompleted', handleSyncReturnCompleted);

      // Configurar sincronização em tempo real
      const cleanup = basicSyncService.setupRealtimeUpdates((data) => {
        console.log('Recebida atualização em tempo real:', {
          expenses: Object.keys(data.expenses || {}).length + ' listas',
          projects: (data.projects || []).length + ' projetos',
          stock: (data.stock || []).length + ' itens',
          employees: Object.keys(data.employees || {}).length + ' listas'
        });
        
        if (data) {
          setExpenses(data.expenses || {});
          setProjects(data.projects || []);
          setStockItems(data.stock || []);
          setEmployees(data.employees || {});
          
          // Atualizar dados do Will se existirem
          if (data.willBaseRate !== undefined) {
            setWillBaseRate(data.willBaseRate);
          }
          if (data.willBonus !== undefined) {
            setWillBonus(data.willBonus);
          }
        }
      });

      return () => {
        // Limpar listeners de sincronização
        window.removeEventListener('syncReturnStarted', handleSyncReturnStarted);
        window.removeEventListener('syncReturnCompleted', handleSyncReturnCompleted);
        
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    };

    initializeData();
  }, []);

  // Adicione este useEffect para calcular o total dos projetos na semana selecionada
  useEffect(() => {
    if (projects.length === 0) return;
    
    const startTime = selectedWeekStart.getTime();
    const endTime = selectedWeekEnd.getTime();
    
    let total = 0;
    
    projects.forEach(project => {
      const projectDate = new Date(project.startDate).getTime();
      // Incluir projetos que começam na terça-feira (startTime) até a segunda-feira (endTime)
      if (projectDate >= startTime && projectDate <= endTime) {
        total += project.value || 0;
      }
    });
    
    setWeekTotalValue(total);
  }, [projects, selectedWeekStart, selectedWeekEnd]);

  // Função para salvar alterações
  const saveChanges = async (newData: StorageItems) => {
    console.log('Salvando alterações...');
    
    // Deep clone para evitar problemas de referência
    const dataCopy = JSON.parse(JSON.stringify(newData));
    
    // Verificar se os projetos estão presentes
    if (!dataCopy.projects || !Array.isArray(dataCopy.projects)) {
      console.error('Erro: projects não está definido ou não é um array', dataCopy);
      dataCopy.projects = [];
    }
    
    // Verificar projetos com dados incompletos
    dataCopy.projects.forEach((project: any, index: number) => {
      if (!project.id) {
        console.error(`Projeto ${index} sem ID:`, project);
        // Tenta corrigir o problema
        project.id = uuidv4();
        console.log(`ID gerado para projeto sem ID: ${project.id}`);
      }
    });
    
    console.log('Número de projetos a salvar:', dataCopy.projects.length);
    console.log('IDs dos projetos:', dataCopy.projects.map((p: any) => p.id).join(', '));
    
    setIsSaving(true);
    
    // Definir um contador de tentativas
    let attempts = 0;
    const maxAttempts = 3;
    
    const attemptSave = async (): Promise<boolean> => {
      try {
        // Salvar dados
        const result = await saveData(dataCopy);
        
        if (result) {
          console.log('Dados salvos com sucesso');
          setShowFeedback({ show: true, message: 'Dados salvos com sucesso!', type: 'success' });
          return true;
        } else {
          throw new Error('Falha na sincronização');
        }
      } catch (error) {
        console.error(`Tentativa ${attempts+1}/${maxAttempts} falhou:`, error);
        
        if (attempts < maxAttempts - 1) {
          attempts++;
          console.log(`Tentando novamente em 1 segundo... (${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptSave();
        }
        
        console.error('Todas as tentativas falharam. Salvando apenas localmente.');
        setShowFeedback({ show: true, message: 'Erro ao sincronizar com o servidor!', type: 'error' });
        
        // Mesmo com erro, atualizar o estado local para evitar perda de dados
        localStorage.setItem('expenses-app-data', JSON.stringify(dataCopy));
        return false;
      }
    };
    
    try {
      const success = await attemptSave();
      
      // Garantir que o estado de projetos seja atualizado mesmo em caso de falha
      setProjects(dataCopy.projects);
      
      setIsSaving(false);
    } catch (finalError) {
      console.error('Erro fatal ao salvar:', finalError);
      setIsSaving(false);
    }
  };

  const handleTogglePaid = (id: string) => {
    const selectedExpenses = [...expenses[selectedList]];
    const index = selectedExpenses.findIndex(expense => expense.id === id);
    
    if (index !== -1) {
      const updatedExpenses = [...selectedExpenses];
      updatedExpenses[index] = {
        ...updatedExpenses[index],
        is_paid: !updatedExpenses[index].is_paid
      };
      
      const newExpenses = {
        ...expenses,
        [selectedList]: updatedExpenses
      };
      
      setExpenses(newExpenses);
      
      // Salvar alterações
      const storageData: StorageItems = {
        expenses: newExpenses,
        projects,
        stock: stockItems,
        employees,
        willBaseRate,
        willBonus,
        lastSync: Date.now()
      };
      
      // Verificar se há alterações pendentes
      saveChanges(storageData);
    }
  };

  const handleDeleteItem = (id: string, category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => {
    setDeletedIds(prev => {
      if (!prev.includes(id)) {
        return [...prev, id];
      }
      return prev;
    });

    if (category === 'Expenses') {
      setExpenses(prevExpenses => {
        const newExpenses = { ...prevExpenses };
        Object.keys(newExpenses).forEach(listName => {
          newExpenses[listName as ListName] = newExpenses[listName as ListName].filter(
            expense => expense.id !== id
          );
        });
        saveChanges(createStorageData({
          expenses: newExpenses,
          projects,
          stock: stockItems,
          employees,
          deletedIds: [...deletedIds, id]
        }));
        return newExpenses;
      });
    } else if (category === 'Projects') {
      setProjects(prevProjects => {
        const newProjects = prevProjects.filter(project => project.id !== id);
        saveChanges(createStorageData({
          expenses,
          projects: newProjects,
          stock: stockItems,
          employees,
          deletedIds: [...deletedIds, id]
        }));
        return newProjects;
      });
    } else if (category === 'Stock') {
      setStockItems(prevStockItems => {
        const newStockItems = prevStockItems.filter(item => item.id !== id);
        saveChanges(createStorageData({
          expenses,
          projects,
          stock: newStockItems,
          employees,
          deletedIds: [...deletedIds, id]
        }));
        return newStockItems;
      });
    } else if (category === 'Employees') {
      setEmployees(prevEmployees => {
        const newEmployees = { ...prevEmployees };
        Object.keys(newEmployees).forEach(weekStartDate => {
          newEmployees[weekStartDate] = newEmployees[weekStartDate].filter(
            employee => employee.id !== id
          );
        });
        saveChanges(createStorageData({
          expenses,
          projects,
          stock: stockItems,
          employees: newEmployees,
          deletedIds: [...deletedIds, id]
        }));
        return newEmployees;
      });
    }
  };

  const handleEditItem = (item: Item) => {
    console.log(`Editando item:`, item);
    setItemToEdit(item);
    setIsEditDialogOpen(true);
  };

  const handleUpdateItem = (updatedItem: Partial<Item>) => {
    console.log(`Atualizando item:`, updatedItem);
    
    try {
      // Item básico para edição
      const itemWithTimestamp = updatedItem;
      // Verificar o tipo do item usando propriedades específicas
      if ('description' in itemWithTimestamp) {
        // É uma despesa
        setExpenses(prevExpenses => {
          const newExpenses = { ...prevExpenses };
          
          // Procurar e atualizar a despesa em todas as listas
          Object.keys(newExpenses).forEach(listName => {
            const index = newExpenses[listName as ListName].findIndex(expense => expense.id === itemWithTimestamp.id);
            if (index !== -1) {
              newExpenses[listName as ListName][index] = itemWithTimestamp as Expense;
            }
          });
          
          // Salvar as alterações
          saveChanges(createStorageData({
            expenses: newExpenses,
            projects,
            stock: stockItems,
            employees
          }));
          
          return newExpenses;
        });
      } else if ('client' in itemWithTimestamp) {
        // É um projeto
        setProjects(prevProjects => {
          try {
            console.log("Atualizando projeto, dados recebidos:", JSON.stringify(itemWithTimestamp));
            
            // Verificar se o ID existe
            if (!itemWithTimestamp.id) {
              console.error("ID do projeto não encontrado nos dados de atualização");
              return prevProjects;
            }
            
            const index = prevProjects.findIndex(project => project.id === itemWithTimestamp.id);
            console.log(`Procurando projeto com ID ${itemWithTimestamp.id}, índice encontrado: ${index}`);
            
            if (index === -1) {
              console.error("Projeto não encontrado com ID:", itemWithTimestamp.id);
              return prevProjects;
            }
            
            // Garantir que todos os campos obrigatórios estejam presentes
            const existingProject = prevProjects[index];
            console.log("Projeto existente:", JSON.stringify(existingProject));
            
            // Criar uma cópia do projeto com todos os campos necessários
            const updatedProject: Project = {
              id: itemWithTimestamp.id || existingProject.id,
              name: itemWithTimestamp.name || existingProject.name,
              description: itemWithTimestamp.description || existingProject.description,
              client: itemWithTimestamp.client || existingProject.client,
              startDate: itemWithTimestamp.startDate || existingProject.startDate,
              status: itemWithTimestamp.status || existingProject.status,
              location: itemWithTimestamp.location || existingProject.location || '',
              value: itemWithTimestamp.value !== undefined ? itemWithTimestamp.value : existingProject.value || 0,
              invoiceOk: itemWithTimestamp.invoiceOk !== undefined ? itemWithTimestamp.invoiceOk : existingProject.invoiceOk,
              lastModified: itemWithTimestamp.lastModified,
              deviceId: itemWithTimestamp.deviceId
            };
            
            console.log("Dados do projeto preparados para atualização:", JSON.stringify(updatedProject));
            
            // Criar um novo array para evitar mutação direta
            const newProjects = [...prevProjects];
            newProjects[index] = updatedProject;
            
            // Salvar as alterações
            saveChanges(createStorageData({
              expenses,
              projects: newProjects,
              stock: stockItems,
              employees
            }));
            
            console.log("Projetos após atualização:", JSON.stringify(newProjects));
            return newProjects;
          } catch (error) {
            console.error("Erro ao atualizar projeto:", error);
            // Garantir que retornamos o estado anterior em caso de erro
            return prevProjects;
          }
        });
      } else if ('quantity' in itemWithTimestamp) {
        // É um item de estoque
        setStockItems(prevStockItems => {
          const index = prevStockItems.findIndex(item => item.id === itemWithTimestamp.id);
          if (index === -1) return prevStockItems;
          
          const newStockItems = [...prevStockItems];
          newStockItems[index] = itemWithTimestamp as StockItem;
          
          // Salvar as alterações
          saveChanges(createStorageData({
            expenses,
            projects,
            stock: newStockItems,
            employees
          }));
          
          return newStockItems;
        });
      } else if ('employeeName' in itemWithTimestamp) {
        // É um funcionário
        setEmployees(prevEmployees => {
          if (itemWithTimestamp.name === 'Will' || itemWithTimestamp.employeeName === 'Will') {
            console.log("Tentativa de editar Will através da edição normal de funcionários. Ignorando.");
            return prevEmployees;
          }
          
          const newEmployees = { ...prevEmployees };
          
          // Procurar e atualizar o funcionário em todas as semanas
          Object.keys(newEmployees).forEach(weekStartDate => {
            const index = newEmployees[weekStartDate].findIndex(employee => employee.id === itemWithTimestamp.id);
            if (index !== -1) {
              newEmployees[weekStartDate][index] = itemWithTimestamp as Employee;
            }
          });
          
          saveChanges(createStorageData({
            expenses,
            projects,
            stock: stockItems,
            employees: newEmployees,
            willBaseRate,
            willBonus
          }));
          
          return newEmployees;
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      // Garantir que o diálogo seja fechado mesmo em caso de erro
      setIsEditDialogOpen(false);
    } finally {
      // Fechar o diálogo após atualizar o item
      setIsEditDialogOpen(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Normalizar a data para evitar problemas de fuso horário
      const normalizedDate = normalizeDate(date);
      setSelectedDate(normalizedDate);
    } else {
      setSelectedDate(undefined);
    }
    setIsCalendarOpen(false);
  };

  const handleAddItem = async (item: any) => {
    try {
      console.log("Função handleAddItem chamada com:", item);
      
      // Verificar se o item já tem um ID, caso contrário, criar um novo
      if (!item.id) {
        item.id = uuidv4();
      }
      
      // Item básico sem timestamp complexo
      const newItem = { ...item, id: item.id };
      console.log("ID gerado para o novo item:", newItem.id);
      
      if (activeCategory === 'Expenses') {
        const expense = newItem as Expense;
        expense.paid = expense.paid || false;

        // Atualizar o estado
        setExpenses(prevExpenses => {
          console.log("Estado atual de expenses:", JSON.stringify(prevExpenses));
          
          // Criar uma cópia do objeto com tipagem correta
          const newExpenses: Record<string, Expense[]> = { ...prevExpenses };
          
          // Verificar se a lista existe
          if (!newExpenses[selectedList]) {
            console.log(`Lista ${selectedList} não encontrada, inicializando...`);
            newExpenses[selectedList] = [];
          }
          
          // Adicionar a nova despesa à lista selecionada
          newExpenses[selectedList] = [...(newExpenses[selectedList] || []), expense];
          console.log(`Despesa adicionada à lista ${selectedList}:`, JSON.stringify(expense));
          console.log("Novo estado de expenses:", JSON.stringify(newExpenses));

          // Salvar as alterações
          saveChanges(createStorageData({
            expenses: newExpenses,
            projects,
            stock: stockItems,
            employees
          }));

          return newExpenses;
        });
      } else if (activeCategory === 'Projects') {
        console.log("Adicionando projeto:", newItem);
        
        // Garantir que o projeto esteja formatado corretamente
        const project = newItem as Project;
        
        // Garantir ID único
        if (!project.id) {
          project.id = uuidv4();
          console.log("Novo ID gerado para o projeto:", project.id);
        }
        
        // Garantir que campos obrigatórios existam
        if (!project.client) project.client = "Cliente";
        if (!project.name) project.name = project.client;
        if (!project.startDate) project.startDate = new Date().toISOString();
        if (!project.status) project.status = "in_progress";
        if (!project.location) project.location = "";
        if (project.value === undefined) project.value = 0;
        
        console.log("Projeto formatado para adicionar:", project);
        console.log("Lista atual de projetos:", projects);

        // Atualizar o estado
        setProjects(prevProjects => {
          console.log("Estado atual de projects:", prevProjects);
          
          // Clone profundo para evitar problemas de referência
          const existingProjects = JSON.parse(JSON.stringify(prevProjects));
          
          // Verificar se o projeto já existe
          const existingIndex = existingProjects.findIndex((p: Project) => p.id === project.id);
          
          let newProjects;
          if (existingIndex >= 0) {
            // Atualizar projeto existente
            newProjects = [...existingProjects];
            newProjects[existingIndex] = project;
            console.log("Projeto atualizado na posição:", existingIndex);
          } else {
            // Adicionar novo projeto
            newProjects = [...existingProjects, project];
            console.log("Novo projeto adicionado à lista");
          }
          
          console.log("Lista de projetos atualizada:", newProjects);
          
          // Salvar as alterações
          saveChanges(createStorageData({
            expenses,
            projects: newProjects,
            stock: stockItems,
            employees
          }));
          
          return newProjects;
        });
      } else if (activeCategory === 'Stock') {
        const stockItem = newItem as StockItem;
        stockItem.id = uuidv4();

        // Atualizar o estado
        setStockItems(prevStockItems => {
          console.log("Estado atual de stockItems:", JSON.stringify(prevStockItems));
          
          const newStockItems = [...prevStockItems, stockItem];
          console.log("Item de estoque adicionado:", JSON.stringify(stockItem));
          console.log("Novo estado de stockItems:", JSON.stringify(newStockItems));

          // Salvar as alterações
          saveChanges(createStorageData({
            expenses,
            projects,
            stock: newStockItems,
            employees
          }));

          return newStockItems;
        });
      } else if (activeCategory === 'Employees') {
        const employee = newItem as Employee;
        
        // Normalizar a data de início da semana para evitar problemas de fuso horário
        const normalizedWeekStart = normalizeDate(selectedWeekStart);
        const weekStartDate = formatDateToISO(normalizedWeekStart);
        
        // Inicializar os campos importantes do funcionário
        employee.workedDates = [];
        employee.weekStartDate = weekStartDate;
        employee.daysWorked = 0;
        
        // Garantir que o dailyRate seja um número
        if (typeof employee.dailyRate === 'string') {
          employee.dailyRate = parseFloat(employee.dailyRate);
        }
        if (!employee.dailyRate || isNaN(employee.dailyRate)) {
          employee.dailyRate = 250;
        }
        
        // Verificar se já existe este funcionário em alguma semana
        let employeeExists = false;
        const employeeId = employee.id;
        
        // Procurar o funcionário em todas as semanas
        Object.keys(employees).forEach(weekKey => {
          if (employees[weekKey].some(e => e.name === employee.name)) {
            employeeExists = true;
          }
        });
        
        // Se o funcionário já existe, mostrar um alerta
        if (employeeExists) {
          alert(`Funcionário "${employee.name}" já existe.`);
          return;
        }
        
        // Adicionar o funcionário à semana selecionada
        setEmployees(prevEmployees => {
          const weekEmployees = prevEmployees[weekStartDate] || [];
          const updatedEmployees = {
            ...prevEmployees,
            [weekStartDate]: [...weekEmployees, employee]
          };
          
          // Salvar as alterações
          saveChanges(createStorageData({
            expenses,
            projects,
            stock: stockItems,
            employees: updatedEmployees
          }));
          
          return updatedEmployees;
        });
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleListSelect = (value: ListName) => {
    setSelectedList(value);
    setIsDropdownOpen(false);
    
    const storageData = getData();
    storageData.expenses = expenses;
    storageData.projects = projects;
    storageData.stock = stockItems;
    storageData.employees = employees;
    
    saveChanges(createStorageData(storageData));
  };

  const handleEmployeeSelect = (value: EmployeeName) => {
    setSelectedEmployeeName(value);
    
    const storageData = getData();
    storageData.expenses = expenses;
    storageData.projects = projects;
    storageData.stock = stockItems;
    storageData.employees = employees;
    
    saveChanges(createStorageData(storageData));
  };

  const handleResetEmployee = (employeeId: string, weekStartDate: string) => {
    console.log(`Resetando todos os dias para funcionário ${employeeId}`);
    
    setEmployees(prevEmployees => {
      const newEmployees = { ...prevEmployees };
      
      // Resetar o funcionário em todas as semanas
      Object.keys(newEmployees).forEach(weekKey => {
        const employeeIndex = newEmployees[weekKey].findIndex(e => e.id === employeeId);
        
        if (employeeIndex !== -1) {
          // Resetar os dias trabalhados
          const updatedEmployee = { ...newEmployees[weekKey][employeeIndex] };
          updatedEmployee.daysWorked = 0;
          updatedEmployee.workedDates = [];
          
          // Atualizar a lista de funcionários
          newEmployees[weekKey] = [
            ...newEmployees[weekKey].slice(0, employeeIndex),
            updatedEmployee,
            ...newEmployees[weekKey].slice(employeeIndex + 1)
          ];
        }
      });
      
      // Salvar no Supabase e localmente
      const storageData = getData();
      if (storageData) {
        const updatedStorageData = {
          ...storageData,
          employees: newEmployees,
          willBaseRate: storageData.willBaseRate,
          willBonus: storageData.willBonus
        };
        saveChanges(createStorageData(updatedStorageData));
      }
      
      return newEmployees;
    });
  };

  const resetWillValues = () => {
    setWillBaseRate(200);
    setWillBonus(0);
    
    // Salvar dados após resetar os valores
    setTimeout(() => {
      const storageData = getData();
      storageData.willBaseRate = 200;
      storageData.willBonus = 0;
      saveChanges(createStorageData(storageData));
    }, 0);
  };

  // Adicionar função para salvar os dados do Will
  const handleSaveWillData = () => {
    const storageData = getData();
    // Adicionar os dados do Will ao objeto de armazenamento
    storageData.willBaseRate = willBaseRate;
    storageData.willBonus = willBonus;
    
    // Salvar todas as alterações
    saveChanges(createStorageData(storageData));
  };

  // Modificar a função que adiciona bônus ao Will
  const handleAddBonus = () => {
    setWillBonus(prev => {
      const newBonus = prev + 100;
      // Salvar dados após atualizar o bônus
      setTimeout(() => {
        const storageData = getData();
        storageData.willBaseRate = willBaseRate;
        storageData.willBonus = newBonus;
        console.log('Salvando bônus atualizado:', newBonus);
        saveChanges(createStorageData({
          expenses: storageData.expenses,
          projects: storageData.projects,
          stock: storageData.stock,
          employees: storageData.employees,
          willBaseRate,
          willBonus: newBonus
        }));
      }, 0);
      return newBonus;
    });
  };

  // Modificar a função que altera o salário base do Will
  const handleWillRateChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const newBaseRate = parseFloat(formData.get('baseRate') as string) || 200;
    
    setWillBaseRate(newBaseRate);
    setIsRateDialogOpen(false);
    
    // Salvar dados após atualizar o salário base
    setTimeout(() => {
      const storageData = getData();
      storageData.willBaseRate = newBaseRate;
      storageData.willBonus = willBonus;
      console.log('Salvando taxa base atualizada:', newBaseRate);
      saveChanges(createStorageData({
        expenses: storageData.expenses,
        projects: storageData.projects,
        stock: storageData.stock,
        employees: storageData.employees,
        willBaseRate: newBaseRate,
        willBonus
      }));
    }, 0);
  };

  // Adicionar gerenciamento de foco para inputs de data
  const handleInputFocus = () => {
    document.body.classList.add('input-focused');
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    document.body.classList.remove('input-focused');
    setIsInputFocused(false);
  };

  // Efeito para gerenciar a classe 'dialog-open' para o diálogo de alerta
  useEffect(() => {
    if (showLayoffAlert) {
      document.body.classList.add('dialog-open');
    } else {
      document.body.classList.remove('dialog-open');
    }
    
    return () => {
      document.body.classList.remove('dialog-open');
    };
  }, [showLayoffAlert]);

  // Efeito para gerenciar a classe 'dialog-open' para o diálogo de ajuste de salário
  useEffect(() => {
    if (isRateDialogOpen) {
      document.body.classList.add('dialog-open');
    } else {
      document.body.classList.remove('dialog-open');
    }
    
    return () => {
      document.body.classList.remove('dialog-open');
    };
  }, [isRateDialogOpen]);

  /**
   * Manipulador para mudança de semana para funcionários
   */
  const handleWeekChange = (startDate: Date, endDate: Date) => {
    setSelectedWeekStart(startDate);
    setSelectedWeekEnd(endDate);
    console.log("Employee Week Changed:", {
      start: startDate.toISOString(), 
      end: endDate.toISOString(),
      formattedStart: format(startDate, 'yyyy-MM-dd')
    });
  };

  /**
   * Manipulador para mudança de semana para projetos
   */
  const handleProjectWeekChange = (startDate: Date, endDate: Date) => {
    setSelectedWeekStart(startDate);
    setSelectedWeekEnd(endDate);
    console.log("Project Week Changed:", {
      start: startDate.toISOString(), 
      end: endDate.toISOString(),
      formattedStart: format(startDate, 'yyyy-MM-dd')
    });
  };

  // Função para verificar se um funcionário deve ser exibido na semana selecionada
  const shouldShowEmployeeInWeek = () => true;

  const calculateEmployeesTotal = () => {
    let total = 0;
    
    // Obter todos os funcionários de todas as semanas
    const allEmployees: Employee[] = [];
    Object.keys(employees).forEach(weekKey => {
      employees[weekKey].forEach(employee => {
        // Verificar se o funcionário já está na lista (evitar duplicatas)
        if (!allEmployees.some(e => e.id === employee.id)) {
          allEmployees.push(employee);
        }
      });
    });
    
    // Não filtra mais por semana, mostra todos os funcionários
    const filteredEmployees = allEmployees;
    
    // Obter os funcionários específicos da semana selecionada (para dias trabalhados)
    const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
    const weekEmployees = employees[formattedSelectedWeekStart] || [];

    // Calcular o total
    filteredEmployees.forEach(employee => {
      // Encontrar o registro específico do funcionário para a semana selecionada
      const weekEmployee = weekEmployees.find(e => e.id === employee.id);
      const daysWorked = weekEmployee ? weekEmployee.daysWorked : 0;
      
      // Adicionar ao total
      total += (employee.dailyRate || 250) * daysWorked;
    });
    
    // Adicionar o valor do Will (valor fixo semanal + bônus)
    // Will recebe 200 pela semana toda (não é por dia)
    total += willBaseRate + willBonus;
    
    return total;
  };

  // Função para atualizar as datas da semana com base na categoria
  const updateWeekDatesForCategory = (category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => {
    const today = new Date();
    const weekStart = getProjectWeekStart(today);
    const weekEnd = getProjectWeekEnd(today);
    setSelectedWeekStart(weekStart);
    setSelectedWeekEnd(weekEnd);
  };

  // Atualizar as datas da semana quando a categoria mudar
  useEffect(() => {
    updateWeekDatesForCategory(activeCategory);
  }, [activeCategory]);

  // Atualizar as datas da semana na inicialização
  useEffect(() => {
    updateWeekDatesForCategory(activeCategory);
  }, []);

  // Função para ordenar despesas por data de vencimento (mais atrasadas primeiro)
  const sortExpensesByDueDate = (expenseList: Expense[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Definir o limite para "próximo do vencimento" (7 dias)
    const upcomingLimit = new Date(today);
    upcomingLimit.setDate(today.getDate() + 7);
    
    return [...expenseList].sort((a, b) => {
      // Primeiro critério: status de pagamento (pagas primeiro)
      if (a.paid !== b.paid) {
        return a.paid ? -1 : 1;
      }
      
      // Se ambas estão pagas ou ambas não estão pagas, continuar com os outros critérios
      const dueDateA = new Date(a.date);
      const dueDateB = new Date(b.date);
      
      // Para itens não pagos, verificar status de vencimento
      if (!a.paid) {
        // Verificar se as datas estão atrasadas (antes de hoje)
        const isOverdueA = dueDateA < today;
        const isOverdueB = dueDateB < today;
        
        // Verificar se as datas estão próximas do vencimento (entre hoje e o limite)
        const isUpcomingA = !isOverdueA && dueDateA <= upcomingLimit;
        const isUpcomingB = !isOverdueB && dueDateB <= upcomingLimit;
        
        // Categorizar por status de vencimento
        const categoryA = isOverdueA ? 1 : (isUpcomingA ? 2 : 3); // 1=atrasada, 2=próxima, 3=futura
        const categoryB = isOverdueB ? 1 : (isUpcomingB ? 2 : 3);
        
        // Se estão em categorias diferentes, ordenar por categoria
        if (categoryA !== categoryB) {
          return categoryA - categoryB;
        }
      }
      
      // Se estão na mesma categoria ou ambas pagas, ordenar por data
      return dueDateA.getTime() - dueDateB.getTime();
    });
  };

  // Função para verificar se um item está relacionado à data selecionada
  const isItemFromSelectedDate = (item: any): boolean => {
    // Se não houver filtro de data, mostrar todos
    if (!filterDate) return true;

    // Para projetos, ignorar o filtro do calendário
    if ('client' in item) {
      const projectDate = new Date(item.startDate);
      return projectDate >= selectedWeekStart && projectDate <= selectedWeekEnd;
    }

    // Para outros itens, manter a lógica do filtro por data
    const itemDate = new Date(
      'date' in item ? item.date : 
      'startDate' in item ? item.startDate : 
      new Date()
    );

    return itemDate.toDateString() === filterDate.toDateString();
  };

  // Função para verificar se um funcionário trabalhou na data selecionada
  const didEmployeeWorkOnDate = (employee: Employee): boolean => {
    // Will deve sempre aparecer
    if (employee.name === 'Will') return true;
    
    // Se não houver filtro de data, mostrar todos
    if (!filterDate) return true;
    
    // Verificar se o funcionário trabalhou na data selecionada
    const formattedDate = format(filterDate, 'yyyy-MM-dd');
    return employee.workedDates?.includes(formattedDate) || false;
  };

  // Função para abrir o calendário
  const handleOpenCalendar = () => {
    setIsCalendarOpen(true);
  };

  // Função para limpar o filtro
  const clearDateFilter = () => {
    setFilterDate(null);
  };

  // Adicionar função para atualizar as datas trabalhadas
  const handleUpdateWorkedDates = (employeeId: string, dates: string[]) => {
    setEmployees(prevEmployees => {
      const newEmployees = { ...prevEmployees };
      const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
      
      // Verificar se a semana existe, se não, criá-la
      if (!newEmployees[formattedSelectedWeekStart]) {
        newEmployees[formattedSelectedWeekStart] = [];
      }
      
      // Encontrar o funcionário na semana
      let employeeIndex = newEmployees[formattedSelectedWeekStart].findIndex(e => e.id === employeeId);
      
      // Se não encontrar o funcionário na semana atual, precisamos criá-lo
      if (employeeIndex === -1) {
        console.log(`Funcionário com ID ${employeeId} não encontrado na semana ${formattedSelectedWeekStart}. Procurando em outras semanas...`);
        
        // Procurar o funcionário em todas as semanas
        let employeeFromOtherWeek: Employee | undefined;
        
        Object.keys(newEmployees).forEach(weekKey => {
          const found = newEmployees[weekKey].find(e => e.id === employeeId);
          if (found && !employeeFromOtherWeek) {
            employeeFromOtherWeek = found;
          }
        });
        
        if (employeeFromOtherWeek) {
          console.log(`Funcionário encontrado em outra semana. Copiando para a semana atual.`);
          
          // Criar uma cópia do funcionário para a semana atual
          const newEmployee: Employee = {
            ...employeeFromOtherWeek,
            weekStartDate: formattedSelectedWeekStart,
            workedDates: [], // Inicializar com array vazio
            daysWorked: 0    // Inicializar com zero dias trabalhados
          };
          
          // Adicionar o funcionário à semana atual
          newEmployees[formattedSelectedWeekStart].push(newEmployee);
          
          // Atualizar o índice do funcionário
          employeeIndex = newEmployees[formattedSelectedWeekStart].length - 1;
        } else {
          console.error(`Funcionário com ID ${employeeId} não encontrado em nenhuma semana.`);
          return prevEmployees;
        }
      }
      
      // Atualizar as datas trabalhadas e o número de dias
      const updatedEmployee = { ...newEmployees[formattedSelectedWeekStart][employeeIndex] };
      updatedEmployee.workedDates = dates;
      updatedEmployee.daysWorked = dates.length;
      
      // Atualizar a lista de funcionários
      newEmployees[formattedSelectedWeekStart] = [
        ...newEmployees[formattedSelectedWeekStart].slice(0, employeeIndex),
        updatedEmployee,
        ...newEmployees[formattedSelectedWeekStart].slice(employeeIndex + 1)
      ];
      
      // Salvar no Supabase e localmente
      const storageData = getData();
      if (storageData) {
        const updatedStorageData = {
          ...storageData,
          employees: newEmployees,
          willBaseRate: storageData.willBaseRate,
          willBonus: storageData.willBonus
        };
        saveChanges(createStorageData(updatedStorageData));
      }
      
      return newEmployees;
    });
  };

  // Função para abrir o calendário de dias trabalhados
  const openWorkDaysCalendar = (employee: Employee) => {
    // Encontrar as datas trabalhadas do funcionário na semana atual
    const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
    const weekEmployees = employees[formattedSelectedWeekStart] || [];
    const weekEmployee = weekEmployees.find(e => e.id === employee.id);
    
    // Se o funcionário não tem registro para esta semana, verificar em outras semanas
    if (!weekEmployee) {
      // Procurar o funcionário em outras semanas
      const foundEmployee = findEmployeeInOtherWeeks(employee.id, employees);
      
      if (foundEmployee) {
        // Criar uma cópia do funcionário para a semana atual com propriedades explícitas
        const newEmployee: Employee = {
          id: foundEmployee.id,
          name: foundEmployee.name,
          dailyRate: foundEmployee.dailyRate || 250,
          weekStartDate: formattedSelectedWeekStart,
          daysWorked: 0,
          workedDates: [],
          category: 'Employees'
        };
        
        // Adicionar o funcionário à semana atual
        setEmployees(prevEmployees => {
          return {
            ...prevEmployees,
            [formattedSelectedWeekStart]: [...(prevEmployees[formattedSelectedWeekStart] || []), newEmployee]
          };
        });
        
        // Usar o funcionário recém-criado
        setSelectedEmployee(newEmployee);
        setIsCalendarDialogOpen(true);
        return;
      }
    }
    
    // Se o funcionário já tem registro para esta semana, ou não foi encontrado em nenhuma outra
    const employeeToUse = weekEmployee || {
      id: employee.id || "",
      name: employee.name || "",
      dailyRate: employee.dailyRate || 250,
      employeeName: employee.name || "",
      weekStartDate: formattedSelectedWeekStart,
      daysWorked: 0,
      workedDates: [],
      category: 'Employees' as const
    };
    
    setSelectedEmployee(employeeToUse);
    setIsCalendarDialogOpen(true);
  };

  // Função para abrir o recibo
  const openReceipt = (employee: Employee) => {
    // Encontrar as datas trabalhadas do funcionário na semana atual 
    const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
    const weekEmployees = employees[formattedSelectedWeekStart] || [];
    const weekEmployee = weekEmployees.find(e => e.id === employee.id);
    
    // Se o funcionário já tem dias trabalhados específicos para esta semana
    if (weekEmployee && weekEmployee.workedDates && weekEmployee.workedDates.length > 0) {
      setReceiptEmployee({
        ...weekEmployee,
        // Garantir que temos a data de início da semana correta
        weekStartDate: formattedSelectedWeekStart
      });
    } else {
      // Se não tem registro específico, filtrar datas trabalhadas que estão na semana atual
      let workedDatesInWeek: string[] = [];
      
      if (employee.workedDates) {
        const weekStart = selectedWeekStart;
        const weekEnd = selectedWeekEnd;
        
        workedDatesInWeek = employee.workedDates.filter(dateStr => {
          const date = new Date(dateStr);
          return date >= weekStart && date <= weekEnd;
        });
      }
      
      // Criar uma cópia do funcionário com apenas as datas desta semana
      const employeeWithWeekDates = {
        ...employee,
        workedDates: workedDatesInWeek,
        daysWorked: workedDatesInWeek.length,
        // Garantir que temos a data de início da semana correta
        weekStartDate: formattedSelectedWeekStart
      };
      
      setReceiptEmployee(employeeWithWeekDates);
    }
    
    // Certifique-se de usar a semana atualmente selecionada
    setIsReceiptDialogOpen(true);
  };

  // Adicionar esta função para formatar a data no formato MM/DD
  const formatWeekRangeMMDD = (startDate: Date, endDate: Date) => {
    // Usar o formato MM/dd que é consistente com o resto da aplicação
    const start = format(startDate, 'MM/dd');
    const end = format(endDate, 'MM/dd');
    return `${start} - ${end}`;
  };

  // Função para alternar uma data trabalhada do funcionário
  const handleToggleEmployeeWorkedDate = (employeeId: string, date: string) => {
    // Log detalhado para diagnóstico
    console.log(`Alterando data ${date} para funcionário ${employeeId}`);
    
    // Encontrar o funcionário na semana atual
    const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
    const weekEmployees = employees[formattedSelectedWeekStart] || [];
    const employeeIndex = weekEmployees.findIndex(e => e.id === employeeId);
    
    if (employeeIndex === -1) {
      console.error(`Funcionário com ID ${employeeId} não encontrado na semana ${formattedSelectedWeekStart}`);
      return;
    }
    
    // Obter os dados do funcionário
    const employee = weekEmployees[employeeIndex];
    const workedDates = employee.workedDates || [];
    
    // Verificar se a data já está marcada como trabalhada
    const isDateWorked = workedDates.includes(date);
    
    // Criar a nova lista de datas trabalhadas com segurança (clone para evitar referências)
    const newWorkedDates = isDateWorked
      ? workedDates.filter(d => d !== date)
      : [...workedDates, date];
    
    console.log(`Status anterior: ${isDateWorked ? 'Marcado' : 'Não marcado'}`);
    console.log(`Nova condição: ${isDateWorked ? 'Removendo' : 'Adicionando'}`);
    console.log('Datas anteriores:', workedDates);
    console.log('Novas datas:', newWorkedDates);
    
    // Criar uma cópia do estado para trabalhar
    setEmployees(prevEmployees => {
      const updatedEmployees = { ...prevEmployees };
      
      // Garantir que a semana existe
      if (!updatedEmployees[formattedSelectedWeekStart]) {
        updatedEmployees[formattedSelectedWeekStart] = [];
      }
      
      // Verificar novamente se o funcionário existe (pode ter mudado desde a verificação anterior)
      const currentEmployeeIndex = updatedEmployees[formattedSelectedWeekStart].findIndex(e => e.id === employeeId);
      
      if (currentEmployeeIndex === -1) {
        console.error(`Funcionário não encontrado na atualização. Tentando recuperar.`);
        // Tentar encontrar o funcionário em outras semanas
        let employeeData: Employee | undefined;
        Object.values(updatedEmployees).forEach(weekEmps => {
          const found = weekEmps.find(e => e.id === employeeId);
          if (found) employeeData = found;
        });
        
        if (!employeeData) {
          console.error(`Não foi possível encontrar dados do funcionário.`);
          return prevEmployees;
        }
        
        // Criar novo registro para este funcionário nesta semana
        const newEmployee: Employee = {
          ...employeeData,
          weekStartDate: formattedSelectedWeekStart,
          daysWorked: newWorkedDates.length,
          workedDates: newWorkedDates
        };
        
        updatedEmployees[formattedSelectedWeekStart].push(newEmployee);
      } else {
        // Atualizar funcionário existente
        updatedEmployees[formattedSelectedWeekStart][currentEmployeeIndex] = {
          ...updatedEmployees[formattedSelectedWeekStart][currentEmployeeIndex],
          daysWorked: newWorkedDates.length,
          workedDates: newWorkedDates
        };
      }
      
      // Salvar no armazenamento local imediatamente
      const storageData = getData();
      if (storageData) {
        try {
          const updatedStorageData = {
            ...storageData,
            employees: updatedEmployees
          };
          saveChanges(createStorageData(updatedStorageData));
          
          // Log para confirmar salvamento
          console.log('Datas atualizadas e salvas com sucesso');
        } catch (error) {
          console.error('Erro ao salvar alterações:', error);
        }
      }
      
      return updatedEmployees;
    });
  };

  // Forçar atualização do service worker/PWA quando o aplicativo iniciar
  useEffect(() => {
    const envInfo = getEnvironmentInfo();
    console.log("Informações do ambiente:", envInfo);
    
    // Registrar funções para atualização do service worker
    if ('serviceWorker' in navigator) {
      // Limpar cache e forçar atualização
      const clearCacheAndUpdate = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          for (const registration of registrations) {
            // Enviar mensagem para limpar o cache
            if (registration.active) {
              console.log('Enviando comando para limpar cache');
              registration.active.postMessage({ type: 'CLEAR_CACHE' });
              
              // Verificar atualizações
              registration.update();
            }
          }
          
          // Atualizar dados locais
          console.log('Verificando dados locais');
          const storageData = getData();
          if (storageData) {
            // Verificar por inconsistências nos dados
            if (typeof storageData.lastSync !== 'number') {
              console.log('Corrigindo timestamp de sincronização');
              storageData.lastSync = Date.now();
              saveChanges(storageData);
            }
            
            // Limpar qualquer dado temporário potencialmente inconsistente
            localStorage.removeItem('temp_employee_data');
            sessionStorage.clear();
            
            console.log('Dados locais verificados e atualizados');
          }
        } catch (error) {
          console.error('Erro ao atualizar aplicação:', error);
        }
      };
      
      // Executar limpeza e atualização
      clearCacheAndUpdate();
      
      // Adicionar listener para detectar quando há uma nova versão disponível
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log("Nova versão detectada, recarregando aplicativo...");
          window.location.reload();
        }
      });
    }
    
    // Definir mecanismo de persistência para o IndexedDB
    if ('indexedDB' in window && 'persist' in navigator.storage) {
      navigator.storage.persist().then(isPersisted => {
        console.log(`Persistência de armazenamento ${isPersisted ? 'concedida' : 'negada'}`);
      });
    }
  }, []);
  
  // Verificar problemas de fuso horário
  useEffect(() => {
    console.group("Diagnóstico de data/hora");
    console.log("Data/hora atual (local):", new Date().toString());
    console.log("Data/hora atual (ISO):", new Date().toISOString());
    console.log("Fuso horário:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("Offset do fuso (minutos):", new Date().getTimezoneOffset());
    console.groupEnd();
  }, []);

  // Adicionar na função App ou em algum efeito
  useEffect(() => {
    // Executar teste das semanas
    testWeekRanges();
  }, []);

  // Atualizar deletedIds ao receber dados do servidor
  useEffect(() => {
    const handleDataUpdate = (event: CustomEvent<StorageItems>) => {
      if (event.detail.deletedIds) {
        setDeletedIds(event.detail.deletedIds);
      }
    };

    window.addEventListener('dataUpdated', handleDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate as EventListener);
    };
  }, []);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Header activeCategory={activeCategory} />
        <Navigation
          activeCategory={activeCategory}
          onCategoryChange={isBackgroundSyncing ? () => {} : setActiveCategory}
          disabled={isBackgroundSyncing}
        />
        
        {/* Overlay de bloqueio durante sincronização */}
        {isBackgroundSyncing && (
          <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-xl flex items-center gap-4 mx-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-gray-800">
                <div className="font-medium">Sincronizando dados...</div>
                <div className="text-sm text-gray-600">Aguarde, não feche o aplicativo</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Notificações de conflito */}
        <ConflictNotification />
        
        <div className="pt-[170px]">
          {(activeCategory === 'Expenses') && (
            <div className="sticky top-[170px] left-0 right-0 px-4 z-30 bg-gray-50">
              <div className="relative max-w-[800px] mx-auto pb-2">
                <button
                  onClick={isBackgroundSyncing ? () => {} : () => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isBackgroundSyncing}
                  className={`w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm flex items-center justify-between ${
                    isBackgroundSyncing 
                      ? 'bg-gray-100 cursor-not-allowed opacity-70' 
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                    <span className="text-gray-700 font-medium">
                      {selectedList}
                    </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      isDropdownOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                
                {isDropdownOpen && !isBackgroundSyncing && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-35">
                    <button
                      onClick={() => handleListSelect('Carlos')}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedList === 'Carlos' ? 'bg-gray-50 text-[#5ABB37]' : 'text-gray-700'
                      }`}
                    >
                      Carlos
                    </button>
                    <button
                      onClick={() => handleListSelect('Diego')}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedList === 'Diego' ? 'bg-gray-50 text-[#5ABB37]' : 'text-gray-700'
                      }`}
                    >
                      Diego
                    </button>
                    <button
                      onClick={() => handleListSelect('C&A')}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedList === 'C&A' ? 'bg-gray-50 text-[#5ABB37]' : 'text-gray-700'
                      }`}
                    >
                      C&A
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {(activeCategory === 'Projects') && (
            <div className="sticky top-[170px] left-0 right-0 px-2 z-30 bg-gray-50 mb-3">
              <div className="relative max-w-[800px] mx-auto pb-2">
                <div className={`w-full px-2 py-2 border border-gray-200 rounded-lg shadow-sm flex items-center justify-between ${
                  isBackgroundSyncing ? 'bg-gray-100 opacity-70' : 'bg-white'
                }`}>
                  {!isBackgroundSyncing ? (
                    <ProjectWeekSelector 
                      selectedWeekStart={selectedWeekStart}
                      onWeekChange={handleProjectWeekChange}
                    />
                  ) : (
                    <div className="text-gray-600 text-sm">Aguarde sincronização...</div>
                  )}
                  <div className="flex items-center">
                    <span className="text-gray-700 font-medium text-xs">Total:</span>
                    <span className="text-[#5ABB37] text-base font-bold ml-1">
                      ${weekTotalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {(activeCategory === 'Stock') && (
            <div className="sticky top-[170px] left-0 right-0 px-2 z-30 bg-gray-50">
              {/* Conteúdo do Stock */}
            </div>
          )}
          
          {(activeCategory === 'Employees') && (
            <div className="sticky top-[170px] left-0 right-0 px-2 z-30 bg-gray-50 mb-3">
              <div className="relative max-w-[800px] mx-auto pb-2">
                <div className={`w-full px-2 py-2 border border-gray-200 rounded-lg shadow-sm flex items-center justify-between ${
                  isBackgroundSyncing ? 'bg-gray-100 opacity-70' : 'bg-white'
                }`}>
                  {!isBackgroundSyncing ? (
                    <WeekSelector 
                      selectedWeekStart={selectedWeekStart}
                      onWeekChange={handleWeekChange}
                    />
                  ) : (
                    <div className="text-gray-600 text-sm">Aguarde sincronização...</div>
                  )}
                  <div className="flex items-center">
                    <span className="text-gray-700 font-medium text-xs">Total:</span>
                    <span className="text-[#5ABB37] text-base font-bold ml-1">
                      ${calculateEmployeesTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <main className="px-4 pb-20">
          <div 
            className="max-w-[800px] mx-auto relative z-0 hide-scrollbar main-list-container" 
          >
            {/* Indicador de filtro ativo */}
            {filterDate && (
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg mb-4 flex items-center justify-between">
                <span className="text-sm">
                  Filtrando por: {filterDate.toLocaleDateString('pt-BR')}
                </span>
                <button 
                  onClick={clearDateFilter}
                  className="text-blue-700 hover:text-blue-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <ul className={`flex flex-col space-y-[8px] m-0 p-0 ${isBackgroundSyncing ? 'pointer-events-none opacity-70' : ''}`}>
              {activeCategory === 'Expenses' && sortExpensesByDueDate(expenses[selectedList] || [])
                .filter(isItemFromSelectedDate)
                .map(expense => (
                  <li key={expense.id} className="list-none">
            <ExpenseItem
              expense={expense}
              onTogglePaid={isBackgroundSyncing ? () => {} : handleTogglePaid}
                      onDelete={isBackgroundSyncing ? () => {} : (id) => handleDeleteItem(id, 'Expenses')}
                      onEdit={isBackgroundSyncing ? () => {} : (expense) => handleEditItem(expense)}
                    />
                  </li>
                ))}
              
              {activeCategory === 'Projects' && projects
                .filter(project => {
                  const projectDate = new Date(project.startDate);
                  return projectDate >= selectedWeekStart && projectDate <= selectedWeekEnd;
                })
                .map(project => (
                  <li key={project.id} className="list-none">
                    <SwipeableItem 
                      onDelete={isBackgroundSyncing ? () => {} : () => handleDeleteItem(project.id, 'Projects')}
                      onEdit={isBackgroundSyncing ? () => {} : () => handleEditItem(project)}
                    >
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{project.client}</h3>
                            {project.projectNumber && (
                              <p className="text-gray-600 text-sm">Number: {project.projectNumber}</p>
                            )}
                            <p className="text-gray-600 text-sm">Location: {project.location || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[#5ABB37]">$ {(project.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(project.startDate).toLocaleDateString('en-US')}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <div></div>
                          <div className="flex items-center space-x-2">
                            {project.invoiceOk && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                                Invoice OK
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              project.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {project.status === 'completed' ? 'Completed' : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </SwipeableItem>
                  </li>
                ))}
              
              {activeCategory === 'Stock' && stockItems.map(item => (
                <li key={item.id} className="list-none">
                  <SwipeableItem 
                    onDelete={isBackgroundSyncing ? () => {} : () => handleDeleteItem(item.id, 'Stock')}
                    onEdit={isBackgroundSyncing ? () => {} : () => handleEditItem(item)}
                  >
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">{item.name}</h3>
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>
                  </SwipeableItem>
                </li>
              ))}
              
              {activeCategory === 'Employees' && (
                <>
                  {(() => {
                    const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
                    
                    // Obter todos os funcionários de todas as semanas
                    const allEmployees: Employee[] = [];
                    Object.keys(employees).forEach(weekKey => {
                      employees[weekKey].forEach(employee => {
                        // Verificar se o funcionário já está na lista (evitar duplicatas)
                        if (!allEmployees.some(e => e.id === employee.id)) {
                          allEmployees.push(employee);
                        }
                      });
                    });
                    
                    // Não filtra mais por semana, mostra todos os funcionários
                    const filteredEmployees = allEmployees;
                    
                    // Obter os funcionários específicos da semana selecionada (para dias trabalhados)
                    const weekEmployees = employees[formattedSelectedWeekStart] || [];
                    
                    const employeeElements = [];

                    // Will - funcionário fixo
                    employeeElements.push(
                      <li key="will-fixed" className="list-none">
                        <WillItemFixed
                          key="will-fixed"
                          willBaseRate={willBaseRate}
                          willBonus={willBonus}
                          onReset={isBackgroundSyncing ? () => {} : resetWillValues}
                          onLayoff={isBackgroundSyncing ? () => {} : () => setShowLayoffAlert(true)}
                          onIncreaseRate={isBackgroundSyncing ? () => {} : () => setIsRateDialogOpen(true)}
                          onAddBonus={isBackgroundSyncing ? () => {} : handleAddBonus}
                          disabled={isBackgroundSyncing}
                        />
                      </li>
                    );

                    // Verificar se há funcionários filtrados (excluindo Will)
                    if (filteredEmployees.length === 0) {
                      employeeElements.push(
                        <li key="no-employees" className="list-none">
                          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                            <p className="text-gray-500">No employees started this week.</p>
                          </div>
                        </li>
                      );
                    } else {
                      // Outros funcionários
                      filteredEmployees.forEach(employee => {
                        // Encontrar o registro específico do funcionário para a semana selecionada
                        const weekEmployee = weekEmployees.find(e => e.id === employee.id);
                        
                        // Calcular dias trabalhados para a semana atual
                        let daysWorked = 0;
                        let workedDatesInWeek: string[] = [];
                        
                        if (weekEmployee) {
                          // Se o funcionário tem registro para esta semana, usar os dados desse registro
                          daysWorked = weekEmployee.daysWorked || 0;
                          workedDatesInWeek = weekEmployee.workedDates || [];
                        } else if (employee.workedDates) {
                          // Se não tem registro específico, filtrar datas trabalhadas que estão na semana atual
                          const weekStart = selectedWeekStart;
                          const weekEnd = selectedWeekEnd;
                          
                          workedDatesInWeek = employee.workedDates.filter(dateStr => {
                            const date = new Date(dateStr);
                            return date >= weekStart && date <= weekEnd;
                          });
                          
                          daysWorked = workedDatesInWeek.length;
                        }
                        
                        employeeElements.push(
                          <li key={employee.id} className="list-none">
                            <SwipeableItem 
                              onDelete={isBackgroundSyncing ? () => {} : () => handleDeleteItem(employee.id, 'Employees')}
                              onEdit={isBackgroundSyncing ? () => {} : () => handleEditItem(employee)}
                            >
                              <div className="bg-white p-2.5 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between mb-1.5">
                                  <h3 className="text-xl font-bold text-gray-800">{employee.name}</h3>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={isBackgroundSyncing ? () => {} : () => {
                                        // Usar a função para abrir o calendário
                                        openWorkDaysCalendar(employee);
                                      }}
                                      disabled={isBackgroundSyncing}
                                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center h-8 ${
                                        isBackgroundSyncing 
                                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                          : 'bg-green-500 text-white hover:bg-green-600'
                                      }`}
                                    >
                                      Days Worked
                                    </button>
                                    <button
                                      onClick={isBackgroundSyncing ? () => {} : () => {
                                        // Usar a função para abrir o recibo
                                        openReceipt({
                                          ...employee,
                                          daysWorked,
                                          workedDates: workedDatesInWeek
                                        });
                                      }}
                                      disabled={isBackgroundSyncing}
                                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors h-8 ${
                                        isBackgroundSyncing 
                                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                          : 'bg-blue-500 text-white hover:bg-blue-600'
                                      }`}
                                    >
                                      Receipt
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-700 text-sm">Days Worked:</span>
                                    <span className="text-xl font-bold text-gray-900">{daysWorked}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-700 text-sm">Amount to Receive:</span>
                                    <span className="text-xl font-bold text-[#5ABB37]">
                                      $ {(daysWorked * (employee.dailyRate || 250)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-700 text-sm">Daily Rate:</span>
                                    <span className="text-sm text-gray-600">
                                      $ {(employee.dailyRate || 250).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </SwipeableItem>
                          </li>
                        );
                      });
                    }

                    return employeeElements;
                  })()}
                </>
              )}
            </ul>
          </div>
        </main>
      </div>

      {/* Mostrar o CalendarButton apenas nos menus relevantes */}
      {activeCategory !== 'Stock' && !isBackgroundSyncing && (
        <CalendarButton onClick={handleOpenCalendar} />
      )}
      {!isBackgroundSyncing && (
        <AddButton onClick={() => setIsAddDialogOpen(true)} />
      )}

      <AddItemDialog
        isOpen={isAddDialogOpen && !isBackgroundSyncing}
        onOpenChange={(open) => {
          if (!isBackgroundSyncing) {
            setIsAddDialogOpen(open);
          }
        }}
        category={activeCategory}
        onSubmit={handleAddItem}
        selectedWeekStart={selectedWeekStart}
      />
  
      <EditItemDialog
        isOpen={isEditDialogOpen && !isBackgroundSyncing}
        onOpenChange={(open) => {
          if (!isBackgroundSyncing) {
            setIsEditDialogOpen(open);
          }
        }}
        item={itemToEdit}
        onSubmit={handleUpdateItem}
        selectedWeekStart={selectedWeekStart}
      />

      {isSupabaseConfigured() && <ConnectionStatus />}

      <Dialog.Root 
        open={showLayoffAlert && !isBackgroundSyncing} 
        onOpenChange={(open) => {
          if (!isBackgroundSyncing) {
            setShowLayoffAlert(open);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-8 shadow-xl w-[90%] max-w-md z-[100]"
            onOpenAutoFocus={(e: React.FocusEvent) => e.preventDefault()}
            aria-labelledby="layoff-alert-title"
            aria-describedby="layoff-alert-description"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div id="layoff-alert-title" className="text-3xl font-bold text-red-500 mb-2 animate-bounce">IMPOSSIBLE!</div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root 
        open={isRateDialogOpen && !isBackgroundSyncing} 
        onOpenChange={(open) => {
          if (!isBackgroundSyncing) {
            setIsRateDialogOpen(open);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-md z-[100]"
            onOpenAutoFocus={(e: React.FocusEvent) => e.preventDefault()}
            aria-labelledby="rate-dialog-title"
            aria-describedby="rate-dialog-description"
          >
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title id="rate-dialog-title" className="text-lg font-semibold">
                Adjust New Salary
              </Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            
            <form 
              onSubmit={handleWillRateChange} 
              className="space-y-4"
            >
              <div>
                <label htmlFor="baseRate" className="block text-sm font-medium text-gray-700">
                  New Salary
                </label>
                <input
                  type="number"
                  id="baseRate"
                  name="baseRate"
                  defaultValue={willBaseRate}
                  min="200"
                  step="1"
                  required
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Dialog.Close className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800">
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5ABB37] text-white rounded-md text-sm font-medium hover:bg-[#4a9e2e] transition-colors"
                >
                  Confirm
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      
      <Calendar
        selectedDate={filterDate || undefined}
        onSelect={handleDateSelect}
        isOpen={isCalendarOpen && !isBackgroundSyncing}
        onOpenChange={(open) => {
          if (!isBackgroundSyncing) {
            setIsCalendarOpen(open);
          }
        }}
      />

      {/* Adicionar modal para o calendário de dias trabalhados */}
      {selectedEmployee && (
        <Dialog.Root 
          open={isCalendarDialogOpen && !isBackgroundSyncing} 
          onOpenChange={(open) => {
            if (!isBackgroundSyncing) {
              setIsCalendarDialogOpen(open);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content 
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-md w-[95%] z-[100]"
              onOpenAutoFocus={(e: React.FocusEvent) => e.preventDefault()}
              aria-labelledby="calendar-dialog-title"
              aria-describedby="calendar-dialog-description"
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 id="calendar-dialog-title" className="text-lg font-semibold">
                    Work Days: {selectedEmployee.name}
                  </h2>
                  <button onClick={() => setIsCalendarDialogOpen(false)} className="text-gray-500 hover:text-gray-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <WorkDaysCalendar
                  employeeId={selectedEmployee.id}
                  initialWorkedDates={selectedEmployee.workedDates || []}
                  onDateToggle={(date) => handleToggleEmployeeWorkedDate(selectedEmployee.id, date)}
                  onClose={() => setIsCalendarDialogOpen(false)}
                  onReset={handleResetEmployee}
                  weekStartDate={selectedEmployee.weekStartDate}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* Adicionar modal para o recibo */}
      {receiptEmployee && (
        <Dialog.Root 
          open={isReceiptDialogOpen && !isBackgroundSyncing} 
          onOpenChange={(open) => {
            if (!isBackgroundSyncing) {
              setIsReceiptDialogOpen(open);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content 
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-4 shadow-xl w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto z-[100]"
              onOpenAutoFocus={(e: React.FocusEvent) => e.preventDefault()}
              aria-labelledby="receipt-dialog-title"
              aria-describedby="receipt-dialog-description"
            >
              <div className="flex justify-between items-center mb-2 sticky top-0 bg-white z-10 pb-2 border-b">
                <Dialog.Title id="receipt-dialog-title" className="text-lg font-semibold">
                  Payment Receipt - {receiptEmployee.name}
                </Dialog.Title>
                <Dialog.Close className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </Dialog.Close>
              </div>
              
              <EmployeeReceipt
                employee={{
                  ...receiptEmployee,
                  workedDates: receiptEmployee.workedDates || []
                }}
                weekRange={formatWeekRangeMMDD(selectedWeekStart, selectedWeekEnd)}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
}

// Branch Deploy: main@7cc2f34
