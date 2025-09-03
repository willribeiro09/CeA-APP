import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ExpenseItem } from './components/ExpenseItem';
import { Navigation } from './components/Navigation';
import { CalendarButton } from './components/CalendarButton';
import { AddButton } from './components/AddButton';
import { Calendar } from './components/Calendar';
import { AddItemDialog } from './components/AddItemDialog';
import { EditItemDialog } from './components/EditItemDialog';
import { Expense, Item, Project, StockItem, Employee, EmployeeName, StorageItems, SyncData, ProjectPhoto } from './types';
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
import ProjectSummaryDialog from './components/ProjectSummaryDialog';
import ImageEditor from './components/ImageEditor';
import { PhotoService } from './lib/photoService';
import { v4 as uuidv4 } from 'uuid';
import { SyncOverlay, useSyncStatus } from './components/SyncOverlay';
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
  // Estados para resumo do projeto e editor de imagens
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectSummaryOpen, setIsProjectSummaryOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);

  // NOVO: Hook para controlar o status de sincronização
  const { isBlocked: isSyncBlocked, message: syncMessage, executeWhenUnblocked } = useSyncStatus();

  useEffect(() => {
    const initializeData = async () => {
      // Inicializar tabela de sincronização se necessário
      if (isSupabaseConfigured()) {
        await initSyncTable();
      } else {
        console.warn('Supabase não configurado corretamente. Usando apenas armazenamento local.');
      }
      
      // Inicializar sincronização simples
      await basicSyncService.init();
      
      // Carregar dados iniciais
      const localData = await loadData();

      if (localData) {
        setExpenses(localData.expenses || {});
        
        // Carregar projetos e sincronizar fotos
        const projects = localData.projects || [];
        setProjects(projects);
        
        // Sincronizar fotos para cada projeto em background
        if (isSupabaseConfigured() && projects.length > 0) {
          syncProjectPhotos(projects);
        }
        
        setStockItems(localData.stock || []);
        setEmployees(localData.employees || {});
        
        // Carregar dados do Will se existirem
        if (localData.willBaseRate !== undefined) {
          setWillBaseRate(localData.willBaseRate);
        }
        if (localData.willBonus !== undefined) {
          setWillBonus(localData.willBonus);
        }
      }

      // Configurar listeners para sincronização de segundo plano
      const handleSyncReturnStarted = () => {
        setIsBackgroundSyncing(true);
      };

      const handleSyncReturnCompleted = () => {
        setIsBackgroundSyncing(false);
      };

      // Registrar eventos de sincronização de segundo plano
      window.addEventListener('syncReturnStarted', handleSyncReturnStarted);
      window.addEventListener('syncReturnCompleted', handleSyncReturnCompleted);

      // Configurar sincronização em tempo real
      const cleanup = basicSyncService.setupRealtimeUpdates((data) => {
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
      }
    });
    
    setIsSaving(true);
    
    // Definir um contador de tentativas
    let attempts = 0;
    const maxAttempts = 3;
    
    const attemptSave = async (): Promise<boolean> => {
      try {
        // Salvar dados
        const result = await saveData(dataCopy);
        
        if (result) {
          setShowFeedback({ show: true, message: 'Dados salvos com sucesso!', type: 'success' });
          return true;
        } else {
          throw new Error('Falha na sincronização');
        }
      } catch (error) {
        console.error(`Tentativa ${attempts+1}/${maxAttempts} falhou:`, error);
        
        if (attempts < maxAttempts - 1) {
          attempts++;
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

  // Função para sincronizar fotos dos projetos
  const syncProjectPhotos = async (projects: Project[]) => {
    try {
      for (const project of projects) {
        const serverPhotos = await PhotoService.syncProjectPhotos(project.id);
        if (serverPhotos.length > 0) {
          // Atualizar o projeto com as fotos do servidor
          setProjects(prevProjects => 
            prevProjects.map(p => 
              p.id === project.id 
                ? { ...p, photos: serverPhotos }
                : p
            )
          );
        }
      }
    } catch (error) {
      console.error('Erro na sincronização de fotos:', error);
    }
  };

  // Funções para lidar com fotos dos projetos
  const handleOpenProjectSummary = (project: Project) => {
    setSelectedProject(project);
    setIsProjectSummaryOpen(true);
  };

  const handleProjectPhotosChange = (projectId: string, photos: ProjectPhoto[]) => {
    setProjects(prevProjects => {
      const updatedProjects = prevProjects.map(p => 
        p.id === projectId ? { ...p, photos } : p
      );
      
      // Salvar no storage
      saveChanges(createStorageData({
        expenses,
        projects: updatedProjects,
        stock: stockItems,
        employees
      }));
      
      return updatedProjects;
    });
    
    // Atualizar o projeto selecionado se for o mesmo
    if (selectedProject && selectedProject.id === projectId) {
      setSelectedProject({ ...selectedProject, photos });
    }
  };

  const handleOpenPhotoEditor = (photo: ProjectPhoto) => {
    setSelectedPhoto(photo);
    setIsImageEditorOpen(true);
  };

  const handleSaveEditedPhoto = (editedPhoto: ProjectPhoto) => {
    if (!selectedProject) return;
    
    const updatedPhotos = [...(selectedProject.photos || []), editedPhoto];
    handleProjectPhotosChange(selectedProject.id, updatedPhotos);
    setIsImageEditorOpen(false);
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
      console.log('🗑️ Tentando deletar funcionário:', id, 'da semana:', format(selectedWeekStart, 'yyyy-MM-dd'));
      
      setEmployees(prevEmployees => {
        const newEmployees = { ...prevEmployees };
        const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
        
        console.log('📅 Semana selecionada:', formattedSelectedWeekStart);
        console.log('👥 Funcionários antes da deleção:', newEmployees[formattedSelectedWeekStart]?.length || 0);
        
        // Deletar apenas da semana selecionada, não de todas as semanas
        if (newEmployees[formattedSelectedWeekStart]) {
          const beforeCount = newEmployees[formattedSelectedWeekStart].length;
          newEmployees[formattedSelectedWeekStart] = newEmployees[formattedSelectedWeekStart].filter(
            employee => employee.id !== id
          );
          const afterCount = newEmployees[formattedSelectedWeekStart].length;
          
          console.log('✅ Funcionário deletado! Antes:', beforeCount, 'Depois:', afterCount);
        } else {
          console.log('❌ Semana não encontrada:', formattedSelectedWeekStart);
        }
        
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
    setItemToEdit(item);
    setIsEditDialogOpen(true);
  };

  const handleUpdateItem = (updatedItem: Partial<Item>) => {
    // PROTEÇÃO: Executar apenas quando app não estiver bloqueado
    executeWhenUnblocked(() => {
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
             // Verificar se o ID existe
             if (!itemWithTimestamp.id) {
               console.error("ID do projeto não encontrado nos dados de atualização");
               return prevProjects;
             }
             
             const index = prevProjects.findIndex(project => project.id === itemWithTimestamp.id);
             
             if (index === -1) {
               console.error("Projeto não encontrado com ID:", itemWithTimestamp.id);
               return prevProjects;
             }
             
             // Garantir que todos os campos obrigatórios estejam presentes
             const existingProject = prevProjects[index];
             
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
    });
  };;

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
    // PROTEÇÃO: Executar apenas quando app não estiver bloqueado
    executeWhenUnblocked(async () => {
      try {
      // Verificar se o item já tem um ID, caso contrário, criar um novo
      if (!item.id) {
        item.id = uuidv4();
      }
      
      // Item básico sem timestamp complexo
      const newItem = { ...item, id: item.id };
      
      if (activeCategory === 'Expenses') {
        const expense = newItem as Expense;
        expense.paid = expense.paid || false;

                 // Atualizar o estado
         setExpenses(prevExpenses => {
           // Criar uma cópia do objeto com tipagem correta
           const newExpenses: Record<string, Expense[]> = { ...prevExpenses };
           
           // Verificar se a lista existe
           if (!newExpenses[selectedList]) {
             newExpenses[selectedList] = [];
           }
           
           // Adicionar a nova despesa à lista selecionada
           newExpenses[selectedList] = [...(newExpenses[selectedList] || []), expense];

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
         // Garantir que o projeto esteja formatado corretamente
         const project = newItem as Project;
         
         // Garantir ID único
         if (!project.id) {
           project.id = uuidv4();
         }
         
         // Garantir que campos obrigatórios existam
         if (!project.client) project.client = "Cliente";
         if (!project.name) project.name = project.client;
         if (!project.startDate) project.startDate = new Date().toISOString();
         if (!project.status) project.status = "in_progress";
         if (!project.location) project.location = "";
         if (project.value === undefined) project.value = 0;

                 // Atualizar o estado
         setProjects(prevProjects => {
           // Clone profundo para evitar problemas de referência
           const existingProjects = JSON.parse(JSON.stringify(prevProjects));
           
           // Verificar se o projeto já existe
           const existingIndex = existingProjects.findIndex((p: Project) => p.id === project.id);
           
           let newProjects;
           if (existingIndex >= 0) {
             // Atualizar projeto existente
             newProjects = [...existingProjects];
             newProjects[existingIndex] = project;
           } else {
             // Adicionar novo projeto
             newProjects = [...existingProjects, project];
           }
          
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
           const newStockItems = [...prevStockItems, stockItem];

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
    });
  };;

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
  };

  /**
   * Manipulador para mudança de semana para projetos
   */
  const handleProjectWeekChange = (startDate: Date, endDate: Date) => {
    setSelectedWeekStart(startDate);
    setSelectedWeekEnd(endDate);
  };

  // Função para verificar se um funcionário deve ser exibido na semana selecionada
  const shouldShowEmployeeInWeek = () => true;

  const calculateEmployeesTotal = () => {
    let total = 0;

    // Obter TODOS os funcionários de todas as semanas
    const allEmployees: Employee[] = [];
    Object.keys(employees).forEach(weekKey => {
      employees[weekKey].forEach(employee => {
        if (!allEmployees.some(e => e.id === employee.id)) {
          allEmployees.push(employee);
        }
      });
    });

    // Calcular total baseado nos dias trabalhados na semana selecionada
    allEmployees.forEach((employee) => {
      if (employee.name !== 'Will') { // Excluir Will do cálculo por dias trabalhados
        // Calcular dias trabalhados especificamente para a semana selecionada
        let daysWorkedInWeek = 0;
        
        if (employee.workedDates && employee.workedDates.length > 0) {
          const weekStart = selectedWeekStart;
          const weekEnd = selectedWeekEnd;
          
          daysWorkedInWeek = employee.workedDates.filter(dateStr => {
            const workedDate = new Date(dateStr);
            return workedDate >= weekStart && workedDate <= weekEnd;
          }).length;
        }
        
        const dailyRate = typeof employee?.dailyRate === 'number' && !isNaN(employee.dailyRate)
          ? employee.dailyRate
          : 250;
        total += dailyRate * daysWorkedInWeek;
      }
    });

    // Adicionar valor fixo do Will + bônus
    total += willBaseRate + willBonus;

    return total;
  };

  // Função para atualizar as datas da semana com base na categoria
  const updateWeekDatesForCategory = (category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => {
    const today = new Date();
    if (category === 'Employees') {
      const weekStart = getEmployeeWeekStart(today);
      const weekEnd = getEmployeeWeekEnd(today);
      setSelectedWeekStart(weekStart);
      setSelectedWeekEnd(weekEnd);
    } else {
      const weekStart = getProjectWeekStart(today);
      const weekEnd = getProjectWeekEnd(today);
      setSelectedWeekStart(weekStart);
      setSelectedWeekEnd(weekEnd);
    }
  };

  // Atualizar as datas da semana quando a categoria mudar
  useEffect(() => {
    updateWeekDatesForCategory(activeCategory);
  }, [activeCategory]);

  // Atualizar as datas da semana na inicialização
  useEffect(() => {
    updateWeekDatesForCategory(activeCategory);
  }, []);

  // Rollover automático específico de Employees: quando acabar o sábado, vira para nova semana
  useEffect(() => {
    if (activeCategory !== 'Employees') return;
    const now = new Date();
    const currentEnd = getEmployeeWeekEnd(now); // sábado 23:59:59.999
    const delay = currentEnd.getTime() - now.getTime() + 1;

    if (delay <= 0) {
      updateWeekDatesForCategory('Employees');
      return;
    }

    const timer = setTimeout(() => {
      updateWeekDatesForCategory('Employees');
    }, delay);

    return () => clearTimeout(timer);
  }, [activeCategory]); // Removido selectedWeekStart e selectedWeekEnd para evitar loop

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
         // Procurar o funcionário em todas as semanas
         let employeeFromOtherWeek: Employee | undefined;
         
         Object.keys(newEmployees).forEach(weekKey => {
           const found = newEmployees[weekKey].find(e => e.id === employeeId);
           if (found && !employeeFromOtherWeek) {
             employeeFromOtherWeek = found;
           }
         });
         
         if (employeeFromOtherWeek) {
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
          workedDates: [], // ← SEMPRE iniciar com array vazio para nova semana
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
      workedDates: [], // ← SEMPRE iniciar com array vazio para nova semana
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
    
    // SEMPRE filtrar pelos dias da semana selecionada, independente de ter registro específico
    let workedDatesInWeek: string[] = [];
    
    if (weekEmployee && weekEmployee.workedDates && weekEmployee.workedDates.length > 0) {
      // Se tem registro específico para esta semana, filtrar pelos dias da semana selecionada
      const weekStart = selectedWeekStart;
      const weekEnd = selectedWeekEnd;
      
      workedDatesInWeek = weekEmployee.workedDates.filter(dateStr => {
        const date = new Date(dateStr);
        return date >= weekStart && date <= weekEnd;
      });
    } else if (employee.workedDates) {
      // Se não tem registro específico, filtrar datas trabalhadas que estão na semana selecionada
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
    // Encontrar o funcionário em qualquer semana
    let employeeData: Employee | undefined;
    let foundWeekKey: string | undefined;
    
    Object.keys(employees).forEach(weekKey => {
      const found = employees[weekKey].find(e => e.id === employeeId);
      if (found && !employeeData) {
        employeeData = found;
        foundWeekKey = weekKey;
      }
    });
    
    if (!employeeData) {
      console.error(`Funcionário com ID ${employeeId} não encontrado em nenhuma semana`);
      return;
    }
    
    // Obter os dados do funcionário
    const workedDates = employeeData.workedDates || [];
    
    // Verificar se a data já está marcada como trabalhada
    const isDateWorked = workedDates.includes(date);
    
    // Criar a nova lista de datas trabalhadas
    const newWorkedDates = isDateWorked
      ? workedDates.filter(d => d !== date)
      : [...workedDates, date];
    
    // Atualizar o funcionário em todas as semanas onde ele existe
    setEmployees(prevEmployees => {
      const updatedEmployees = { ...prevEmployees };
      
      // Atualizar o funcionário em todas as semanas onde ele existe
      Object.keys(updatedEmployees).forEach(weekKey => {
        const employeeIndex = updatedEmployees[weekKey].findIndex(e => e.id === employeeId);
        if (employeeIndex !== -1) {
          updatedEmployees[weekKey][employeeIndex] = {
            ...updatedEmployees[weekKey][employeeIndex],
            workedDates: newWorkedDates,
            daysWorked: newWorkedDates.length
          };
        }
      });
      
      // Salvar no armazenamento local imediatamente
      const storageData = getData();
      if (storageData) {
        try {
          const updatedStorageData = {
            ...storageData,
            employees: updatedEmployees
          };
          saveChanges(createStorageData(updatedStorageData));
        } catch (error) {
          console.error('Erro ao salvar alterações:', error);
        }
      }
      
      return updatedEmployees;
    });
  };

  // Forçar atualização do service worker/PWA quando o aplicativo iniciar
  useEffect(() => {
    // Registrar funções para atualização do service worker
    if ('serviceWorker' in navigator) {
      // Limpar cache e forçar atualização
      const clearCacheAndUpdate = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          for (const registration of registrations) {
            // Enviar mensagem para limpar o cache
            if (registration.active) {
              registration.active.postMessage({ type: 'CLEAR_CACHE' });
              
              // Verificar atualizações
              registration.update();
            }
          }
          
          // Atualizar dados locais
          const storageData = getData();
          if (storageData) {
            // Verificar por inconsistências nos dados
            if (typeof storageData.lastSync !== 'number') {
              storageData.lastSync = Date.now();
              saveChanges(storageData);
            }
            
            // Limpar qualquer dado temporário potencialmente inconsistente
            localStorage.removeItem('temp_employee_data');
            sessionStorage.clear();
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
          window.location.reload();
        }
      });
    }
    
    // Definir mecanismo de persistência para o IndexedDB
    if ('indexedDB' in window && 'persist' in navigator.storage) {
      navigator.storage.persist().then(isPersisted => {
        // Silenciosamente verificar persistência
      });
    }
  }, []);
  
  // Verificar problemas de fuso horário
  useEffect(() => {
    // Silenciosamente verificar fuso horário
  }, []);

  // Adicionar na função App ou em algum efeito
  useEffect(() => {
    // Silenciosamente executar teste das semanas
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

  // Log de sincronização que executa apenas uma vez ao montar o componente
  useEffect(() => {
    console.log('✅ UI: Sincronização de retorno concluída');
  }, []); // [] garante execução única

  // Garantir que, ao abrir o app, estejamos sempre na current week (Projects)
  useEffect(() => {
    if (activeCategory === 'Projects') {
      const now = new Date();
      const start = getProjectWeekStart(now);
      const end = getProjectWeekEnd(now);
      setSelectedWeekStart(start);
      setSelectedWeekEnd(end);
    }
  }, [activeCategory]);

  // Rollover automático: quando acabar a terça-feira (fim da semana), vira para a nova current week
  useEffect(() => {
    // agendar apenas quando estivermos em Projects (para evitar atualizações desnecessárias)
    if (activeCategory !== 'Projects') return;
    
    const now = new Date();
    const currentWeekEnd = getProjectWeekEnd(now); // termina na terça às 23:59:59.999 UTC
    const delay = currentWeekEnd.getTime() - now.getTime() + 1; // próximo ms vira nova semana

    if (delay <= 0) {
      // já passou; atualiza imediatamente para a nova semana
      const nextStart = getProjectWeekStart(new Date());
      const nextEnd = getProjectWeekEnd(new Date());
      setSelectedWeekStart(nextStart);
      setSelectedWeekEnd(nextEnd);
      return;
    }

    const timer = setTimeout(() => {
      const nextStart = getProjectWeekStart(new Date());
      const nextEnd = getProjectWeekEnd(new Date());
      setSelectedWeekStart(nextStart);
      setSelectedWeekEnd(nextEnd);
    }, delay);

    return () => clearTimeout(timer);
  }, [activeCategory]); // Removido selectedWeekStart e selectedWeekEnd para evitar loop

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Header activeCategory={activeCategory} />
        <Navigation
          activeCategory={activeCategory}
          onCategoryChange={isBackgroundSyncing ? () => {} : setActiveCategory}
          disabled={isBackgroundSyncing}
        />
        

        
        {/* Notificações de conflito */}
        <ConflictNotification />
        
        <div className="pt-[170px]">
          {(activeCategory === 'Expenses') && (
            <div className="sticky top-[170px] left-0 right-0 px-4 z-30 bg-gray-50">
              <div className="relative max-w-[800px] mx-auto pb-2">
                <button
                  onClick={isBackgroundSyncing ? () => {} : () => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isBackgroundSyncing}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between"
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
                <div className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between">
                  <ProjectWeekSelector 
                    selectedWeekStart={selectedWeekStart}
                    onWeekChange={isBackgroundSyncing ? () => {} : handleProjectWeekChange}
                  />
                  <div className="flex items-center">
                    <span className="text-gray-700 font-medium text-xs">Total:</span>
                    <span className="text-[#5ABB37] text-base font-bold ml-1">
                      ${weekTotalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <div className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between">
                  <WeekSelector 
                    selectedWeekStart={selectedWeekStart}
                    onWeekChange={isBackgroundSyncing ? () => {} : handleWeekChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <main className="px-4 pb-28">
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

            <ul className={`flex flex-col space-y-[8px] m-0 p-0 ${isBackgroundSyncing ? 'pointer-events-none' : ''}`}>
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
                      <div 
                        className="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={isBackgroundSyncing ? () => {} : () => handleOpenProjectSummary(project)}
                      >
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
                          <div className="flex items-center gap-2">
                            {project.photos && project.photos.length > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                {project.photos.length} foto{project.photos.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
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
                    
                    // Obter TODOS os funcionários de todas as semanas
                    const allEmployees: Employee[] = [];
                    Object.keys(employees).forEach(weekKey => {
                      employees[weekKey].forEach(employee => {
                        // Evitar duplicatas baseado no ID
                        if (!allEmployees.some(e => e.id === employee.id)) {
                          allEmployees.push(employee);
                        }
                      });
                    });
                    
                    // Mostrar TODOS os funcionários (exceto Will que é fixo)
                    const employeesInSelectedWeek = allEmployees.filter(employee => employee.name !== 'Will');
                    
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

                    // Verificar se há funcionários (excluindo Will)
                    const otherEmployees = employeesInSelectedWeek;
                    
                    if (otherEmployees.length === 0) {
                      employeeElements.push(
                        <li key="no-employees" className="list-none">
                          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                            <p className="text-gray-500">No employees added yet.</p>
                          </div>
                        </li>
                      );
                    } else {
                      // Todos os funcionários (mostrar sempre, independente de terem dias marcados)
                      otherEmployees.forEach(employee => {
                        // Calcular dias trabalhados especificamente para a semana selecionada
                        let daysWorkedInWeek = 0;
                        let workedDatesInWeek: string[] = [];
                        
                        if (employee.workedDates && employee.workedDates.length > 0) {
                          const weekStart = selectedWeekStart;
                          const weekEnd = selectedWeekEnd;
                          
                          workedDatesInWeek = employee.workedDates.filter(dateStr => {
                            const workedDate = new Date(dateStr);
                            return workedDate >= weekStart && workedDate <= weekEnd;
                          });
                          
                          daysWorkedInWeek = workedDatesInWeek.length;
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
                                      className="px-3 py-1 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors flex items-center h-8"
                                    >
                                      Days Worked
                                    </button>
                                    <button
                                      onClick={isBackgroundSyncing ? () => {} : () => {
                                        // Usar a função para abrir o recibo - passar o funcionário original
                                        openReceipt(employee);
                                      }}
                                      disabled={isBackgroundSyncing}
                                      className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors h-8"
                                    >
                                      Receipt
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-700 text-sm">Days Worked:</span>
                                    <span className="text-xl font-bold text-gray-900">{daysWorkedInWeek}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-700 text-sm">Amount to Receive:</span>
                                    <span className="text-xl font-bold text-[#5ABB37]">
                                      $ {(daysWorkedInWeek * (employee.dailyRate || 250)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
            
            {/* Espaçamento para evitar que os botões flutuantes cubram o último item */}
            <div className="list-bottom-spacing"></div>
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

      {/* Overlay de sincronização obrigatória */}
      <SyncOverlay isVisible={isSyncBlocked} message={syncMessage} />

      <Dialog.Root 
        open={showLayoffAlert && !isBackgroundSyncing} 
        onOpenChange={(open: boolean) => {
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
        onOpenChange={(open: boolean) => {
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
          onOpenChange={(open: boolean) => {
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
                  onReset={() => handleResetEmployee(selectedEmployee.id, selectedEmployee.weekStartDate)}
                  weekStartDate={selectedWeekStart}
                  onWeekChange={(startDate, endDate) => {
                    // Atualizar a semana exibida ao navegar no calendário, mantendo alinhado ao selector
                    setSelectedWeekStart(startDate);
                    setSelectedWeekEnd(endDate);
                  }}
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
          onOpenChange={(open: boolean) => {
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

      {/* Pop-up de resumo do projeto */}
      <ProjectSummaryDialog
        project={selectedProject}
        open={isProjectSummaryOpen && !isBackgroundSyncing}
        onOpenChange={(open) => {
          if (!isBackgroundSyncing) {
            setIsProjectSummaryOpen(open);
            if (!open) setSelectedProject(null);
          }
        }}
        onPhotosChange={handleProjectPhotosChange}
        onOpenEditor={handleOpenPhotoEditor}
      />

      {/* Editor de imagens */}
      <ImageEditor
        photo={selectedPhoto}
        open={isImageEditorOpen && !isBackgroundSyncing}
        onOpenChange={(open) => {
          if (!isBackgroundSyncing) {
            setIsImageEditorOpen(open);
            if (!open) setSelectedPhoto(null);
          }
        }}
        onSave={handleSaveEditedPhoto}
      />
    </>
  );
}

// Branch Deploy: main@7cc2f34
