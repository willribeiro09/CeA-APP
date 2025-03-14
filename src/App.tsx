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
import * as Dialog from '@radix-ui/react-dialog';
import { WillItemFixed } from './components/WillItemFixed';
import { Button } from './components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import 'react-day-picker/dist/style.css';
import { WeekSelector } from './components/WeekSelector';
import { ProjectWeekSelector } from './components/ProjectWeekSelector';

type ListName = 'Carlos' | 'Diego' | 'C&A';

const initialExpenses: Record<ListName, Expense[]> = {
  'Carlos': [],
  'Diego': [],
  'C&A': []
};

const initialEmployees: Record<string, Employee[]> = {};

// Fun├º├úo para obter a ter├ºa-feira atual ou anterior mais pr├│xima
const getProjectWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay(); // 0 = domingo, 1 = segunda, 2 = ter├ºa, ...
  const daysToSubtract = day === 2 ? 0 : day < 2 ? day + 5 : day - 2;
  
  result.setDate(result.getDate() - daysToSubtract);
  result.setHours(0, 0, 0, 0);
  return result;
};

// Fun├º├úo para obter a segunda-feira seguinte
const getProjectWeekEnd = (date: Date): Date => {
  const weekStart = getProjectWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 6); // 6 dias ap├│s ter├ºa = segunda
  result.setHours(23, 59, 59, 999);
  return result;
};

// Fun├º├Áes para c├ílculo de datas para Employees (segunda a s├íbado)
const getEmployeeWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = s├íbado
  // 1 = segunda-feira (j├í ├® um dia v├ílido da semana)
  const diff = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getEmployeeWeekEnd = (date: Date): Date => {
  const weekStart = getEmployeeWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 5); // 5 dias ap├│s segunda = s├íbado (s├íbado tamb├®m ├® um dia v├ílido)
  result.setHours(23, 59, 59, 999);
  return result;
};

const formatDateRange = (start: Date, end: Date): string => {
  // Mostrar apenas dia e m├¬s para economizar espa├ºo
  return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}`;
};

// Fun├º├úo auxiliar para determinar a fun├º├úo correta com base na categoria
const getWeekStart = (date: Date, category: 'Expenses' | 'Projects' | 'Stock' | 'Employees' = 'Projects'): Date => {
  return category === 'Employees' ? getEmployeeWeekStart(date) : getProjectWeekStart(date);
};

const getWeekEnd = (date: Date, category: 'Expenses' | 'Projects' | 'Stock' | 'Employees' = 'Projects'): Date => {
  return category === 'Employees' ? getEmployeeWeekEnd(date) : getProjectWeekEnd(date);
};

export default function App() {
  console.log('Iniciando renderiza├º├úo do App');
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

  useEffect(() => {
    const initializeData = async () => {
      console.log('Inicializando dados...');
      
      // Inicializar tabela de sincroniza├º├úo se necess├írio
      if (isSupabaseConfigured()) {
        console.log('Supabase configurado, inicializando tabela de sincroniza├º├úo');
        await initSyncTable();
      } else {
        console.warn('Supabase n├úo configurado corretamente. Usando apenas armazenamento local.');
      }
      
      // Carregar dados iniciais
      const localData = await loadInitialData();

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

      // Configurar sincroniza├º├úo em tempo real
      syncService.init();
      const cleanup = syncService.setupRealtimeUpdates((data) => {
        console.log('Recebida atualiza├º├úo em tempo real:', {
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
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    };

    initializeData();
  }, []);

  // Adicionar um efeito para detectar quando o aplicativo volta do segundo plano
  useEffect(() => {
    // Fun├º├úo para sincronizar dados quando o aplicativo volta do segundo plano
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Aplicativo voltou para o primeiro plano, sincronizando dados...');
        
        // Mostrar indicador de sincroniza├º├úo
        setIsSaving(true);
        
        try {
          // For├ºar sincroniza├º├úo com o servidor
          if (isSupabaseConfigured()) {
            // Usar a fun├º├úo forceSyncNow do syncService
            const updatedData = await syncService.forceSyncNow();
            
            if (updatedData) {
              console.log('Dados atualizados recebidos do servidor:', {
                expenses: Object.keys(updatedData.expenses || {}).length + ' listas',
                projects: (updatedData.projects || []).length + ' projetos',
                stock: (updatedData.stock || []).length + ' itens',
                employees: Object.keys(updatedData.employees || {}).length + ' listas'
              });
              
              // Atualizar o estado com os dados mais recentes
              setExpenses(updatedData.expenses || {});
              setProjects(updatedData.projects || []);
              setStockItems(updatedData.stock || []);
              setEmployees(updatedData.employees || {});
              
              // Atualizar dados do Will se existirem
              if (updatedData.willBaseRate !== undefined) {
                setWillBaseRate(updatedData.willBaseRate);
              }
              if (updatedData.willBonus !== undefined) {
                setWillBonus(updatedData.willBonus);
              }
              
              // Mostrar feedback de sucesso
              setShowFeedback({
                show: true,
                message: 'Dados sincronizados com sucesso',
                type: 'success'
              });
              
              // Esconder feedback ap├│s 3 segundos
              setTimeout(() => {
                setShowFeedback({ show: false, message: '', type: 'success' });
              }, 3000);
            }
          }
        } catch (error) {
          console.error('Erro ao sincronizar dados:', error);
          
          // Mostrar feedback de erro
          setShowFeedback({
            show: true,
            message: 'Erro ao sincronizar dados',
            type: 'error'
          });
          
          // Esconder feedback ap├│s 3 segundos
          setTimeout(() => {
            setShowFeedback({ show: false, message: '', type: 'success' });
          }, 3000);
        } finally {
          // Esconder indicador de sincroniza├º├úo
          setIsSaving(false);
        }
      }
    };
    
    // Adicionar listener para detectar mudan├ºas de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Limpar listener quando o componente for desmontado
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Adicione este useEffect para calcular o total dos projetos na semana selecionada
  useEffect(() => {
    if (projects.length === 0) return;
    
    const startTime = selectedWeekStart.getTime();
    const endTime = selectedWeekEnd.getTime();
    
    let total = 0;
    
    projects.forEach(project => {
      const projectDate = new Date(project.startDate).getTime();
      // Incluir projetos que come├ºam na ter├ºa-feira (startTime) at├® a segunda-feira (endTime)
      if (projectDate >= startTime && projectDate <= endTime) {
        total += project.value || 0;
      }
    });
    
    setWeekTotalValue(total);
  }, [projects, selectedWeekStart, selectedWeekEnd]);

  // Fun├º├úo para salvar altera├º├Áes
  const saveChanges = async (newData: StorageItems) => {
    console.log('Salvando altera├º├Áes...', JSON.stringify(newData));
    setIsSaving(true);
    try {
      // Salvar dados
      await saveData(newData);
      console.log('Dados salvos com sucesso');
      setShowFeedback({ show: true, message: 'Dados salvos com sucesso!', type: 'success' });
      
      // Garantir que o estado local seja atualizado mesmo se houver problemas com o Supabase
      localStorage.setItem('expenses-app-data', JSON.stringify(newData));
    } catch (error) {
      console.error('Erro ao salvar altera├º├Áes:', error);
      setShowFeedback({ show: true, message: 'Erro ao salvar dados!', type: 'error' });
      
      // Mesmo com erro, atualizar o estado local para evitar perda de dados
      localStorage.setItem('expenses-app-data', JSON.stringify(newData));
    } finally {
      setIsSaving(false);
      // Esconder o feedback ap├│s 3 segundos
      setTimeout(() => {
        setShowFeedback({ show: false, message: '', type: 'success' });
      }, 3000);
    }
  };

  const handleTogglePaid = (id: string) => {
    if (activeCategory === 'Expenses') {
      setExpenses(prevExpenses => {
        const newExpenses = { ...prevExpenses };
        
        // Encontrar a despesa em todas as listas
        Object.keys(newExpenses).forEach(listName => {
          const list = newExpenses[listName as ListName];
          const index = list.findIndex(expense => expense.id === id);
          
          if (index !== -1) {
            // Criar uma c├│pia da despesa e inverter o status de pago
            const updatedExpense = { ...list[index], paid: !list[index].paid };
            // Atualizar a lista com a despesa atualizada
            newExpenses[listName as ListName] = [
              ...list.slice(0, index),
              updatedExpense,
              ...list.slice(index + 1)
            ];
          }
        });
        
        const storageData: StorageItems = {
          expenses: newExpenses,
          projects,
          stock: stockItems,
          employees,
          lastSync: Date.now()
        };
        
        // Usar saveChanges para salvar os dados
        saveChanges(storageData);
        
        return newExpenses;
      });
    }
  };

  const handleDeleteItem = (id: string, category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => {
    console.log(`Deletando item ${id} da categoria ${category}`);
    
    if (category === 'Expenses') {
      setExpenses(prevExpenses => {
        const newExpenses = { ...prevExpenses };
        
        // Procurar e remover a despesa em todas as listas
        Object.keys(newExpenses).forEach(listName => {
          newExpenses[listName as ListName] = newExpenses[listName as ListName].filter(
            expense => expense.id !== id
          );
        });
        
        // Salvar as altera├º├Áes
        const storageData: StorageItems = {
          expenses: newExpenses,
          projects,
          stock: stockItems,
          employees,
          lastSync: Date.now()
        };
        
        // Salvar no Supabase e localmente
        saveChanges(storageData);
        
        return newExpenses;
      });
    } else if (category === 'Projects') {
      setProjects(prevProjects => {
        const newProjects = prevProjects.filter(project => project.id !== id);
        
        // Salvar as altera├º├Áes
        const storageData: StorageItems = {
          expenses,
          projects: newProjects,
          stock: stockItems,
          employees,
          lastSync: Date.now()
        };
        
        // Salvar no Supabase e localmente
        saveChanges(storageData);
        
        return newProjects;
      });
    } else if (category === 'Stock') {
      setStockItems(prevStockItems => {
        const newStockItems = prevStockItems.filter(item => item.id !== id);
        
        // Salvar as altera├º├Áes
        const storageData: StorageItems = {
          expenses,
          projects,
          stock: newStockItems,
          employees,
          lastSync: Date.now()
        };
        
        // Salvar no Supabase e localmente
        saveChanges(storageData);
        
        return newStockItems;
      });
    } else if (category === 'Employees') {
      setEmployees(prevEmployees => {
        const newEmployees = { ...prevEmployees };
        
        // Procurar e remover o funcion├írio em todas as semanas
        Object.keys(newEmployees).forEach(weekStartDate => {
          newEmployees[weekStartDate] = newEmployees[weekStartDate].filter(
            employee => employee.id !== id
          );
        });
        
        // Salvar as altera├º├Áes
        const storageData: StorageItems = {
          expenses,
          projects,
          stock: stockItems,
          employees: newEmployees,
          lastSync: Date.now()
        };
        
        // Salvar no Supabase e localmente
        saveChanges(storageData);
        
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
      // Verificar o tipo do item usando propriedades espec├¡ficas
      if ('description' in updatedItem) {
        // ├ë uma despesa
        setExpenses(prevExpenses => {
          const newExpenses = { ...prevExpenses };
          
          // Procurar e atualizar a despesa em todas as listas
          Object.keys(newExpenses).forEach(listName => {
            const index = newExpenses[listName as ListName].findIndex(expense => expense.id === updatedItem.id);
            if (index !== -1) {
              newExpenses[listName as ListName][index] = updatedItem as Expense;
            }
          });
          
          // Salvar as altera├º├Áes
          const storageData: StorageItems = {
            expenses: newExpenses,
            projects,
            stock: stockItems,
            employees,
            willBaseRate,  // Preservar o valor original
            willBonus,     // Preservar o valor original
            lastSync: Date.now()
          };
          
          // Salvar no Supabase e localmente
          saveChanges(storageData);
          
          return newExpenses;
        });
      } else if ('client' in updatedItem) {
        // ├ë um projeto
        setProjects(prevProjects => {
          try {
            console.log("Updating project, pre-check:", updatedItem);
            
            // Verificar se o ID existe
            const index = prevProjects.findIndex(project => project.id === updatedItem.id);
            if (index === -1) {
              console.error("Project not found with ID:", updatedItem.id);
              return prevProjects;
            }
            
            // Garantir que todos os campos obrigat├│rios estejam presentes
            const existingProject = prevProjects[index];
            
            // Criar uma c├│pia do projeto com todos os campos necess├írios
            const updatedProject: Project = {
              id: updatedItem.id || existingProject.id,
              name: updatedItem.name || existingProject.name,
              description: updatedItem.description || existingProject.description,
              client: updatedItem.client || existingProject.client,
              startDate: updatedItem.startDate || existingProject.startDate,
              status: updatedItem.status || existingProject.status,
              location: updatedItem.location || existingProject.location || '',
              value: updatedItem.value !== undefined ? updatedItem.value : existingProject.value || 0,
              invoiceOk: updatedItem.invoiceOk !== undefined ? updatedItem.invoiceOk : existingProject.invoiceOk
            };
            
            console.log("Project data prepared for update:", updatedProject);
            
            const newProjects = [...prevProjects];
            newProjects[index] = updatedProject;
            
            // Salvar as altera├º├Áes com os valores de Will preservados
            const storageData: StorageItems = {
              expenses,
              projects: newProjects,
              stock: stockItems,
              employees,
              willBaseRate, // Preservar o valor original
              willBonus,    // Preservar o valor original
              lastSync: Date.now()
            };
            
            console.log("Storage data for projects update:", storageData);
            
            // Salvar no Supabase e localmente
            saveChanges(storageData);
            
            return newProjects;
          } catch (error) {
            console.error("Error updating project:", error);
            // Garantir que retornamos o estado anterior em caso de erro
            return prevProjects;
          }
        });
      } else if ('quantity' in updatedItem) {
        // ├ë um item de estoque
        setStockItems(prevStockItems => {
          const index = prevStockItems.findIndex(item => item.id === updatedItem.id);
          if (index === -1) return prevStockItems;
          
          const newStockItems = [...prevStockItems];
          newStockItems[index] = updatedItem as StockItem;
          
          // Salvar as altera├º├Áes
          const storageData: StorageItems = {
            expenses,
            projects,
            stock: newStockItems,
            employees,
            willBaseRate, // Preservar o valor original
            willBonus,    // Preservar o valor original
            lastSync: Date.now()
          };
          
          // Salvar no Supabase e localmente
          saveChanges(storageData);
          
          return newStockItems;
        });
      } else if ('employeeName' in updatedItem) {
        // ├ë um funcion├írio
        setEmployees(prevEmployees => {
          // N├úo permitir altera├º├Áes no Will atrav├®s da edi├º├úo normal de funcion├írios
          if (updatedItem.name === 'Will' || updatedItem.employeeName === 'Will') {
            console.log("Tentativa de editar Will atrav├®s da edi├º├úo normal de funcion├írios. Ignorando.");
            return prevEmployees;
          }
          
          const newEmployees = { ...prevEmployees };
          
          // Procurar e atualizar o funcion├írio em todas as semanas
          Object.keys(newEmployees).forEach(weekStartDate => {
            const index = newEmployees[weekStartDate].findIndex(employee => employee.id === updatedItem.id);
            if (index !== -1) {
              newEmployees[weekStartDate][index] = updatedItem as Employee;
            }
          });
          
          // Salvar as altera├º├Áes
          const storageData: StorageItems = {
            expenses,
            projects,
            stock: stockItems,
            employees: newEmployees,
            willBaseRate,  // Preservar o valor original
            willBonus,     // Preservar o valor original
            lastSync: Date.now()
          };
          
          console.log("Saving employees with Will data preserved:", storageData.willBaseRate, storageData.willBonus);
          
          // Salvar no Supabase e localmente
          saveChanges(storageData);
          
          return newEmployees;
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      // Garantir que o di├ílogo seja fechado mesmo em caso de erro
      setIsEditDialogOpen(false);
    } finally {
      // Fechar o di├ílogo ap├│s atualizar o item
      setIsEditDialogOpen(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setFilterDate(date);
    }
    setIsCalendarOpen(false);
  };

  const handleAddItem = (data: Partial<Item>) => {
    console.log("Fun├º├úo handleAddItem chamada com dados:", JSON.stringify(data));
    console.log("Lista selecionada:", selectedList);
    console.log("Data da semana selecionada:", format(selectedWeekStart, 'yyyy-MM-dd'));

    // Gerar um ID ├║nico para o novo item
    const id = crypto.randomUUID();

    if (activeCategory === 'Expenses') {
      const expense = data as Expense;
      expense.id = id;
      expense.paid = expense.paid || false;

      // Atualizar o estado
      setExpenses(prevExpenses => {
        console.log("Estado atual de expenses:", JSON.stringify(prevExpenses));
        
        // Criar uma c├│pia do objeto com tipagem correta
        const newExpenses: Record<string, Expense[]> = { ...prevExpenses };
        
        // Verificar se a lista existe
        if (!newExpenses[selectedList]) {
          console.log(`Lista ${selectedList} n├úo encontrada, inicializando...`);
          newExpenses[selectedList] = [];
        }
        
        // Adicionar a nova despesa ├á lista selecionada
        newExpenses[selectedList] = [...(newExpenses[selectedList] || []), expense];
        console.log(`Despesa adicionada ├á lista ${selectedList}:`, JSON.stringify(expense));
        console.log("Novo estado de expenses:", JSON.stringify(newExpenses));

        // Salvar as altera├º├Áes
        const storageData: StorageItems = {
          expenses: newExpenses,
          projects,
          stock: stockItems,
          employees,
          lastSync: Date.now()
        };

        console.log("Dados a serem salvos:", JSON.stringify(storageData));
        
        // Salvar no Supabase e localmente
        saveChanges(storageData);

        return newExpenses;
      });
    } else if (activeCategory === 'Projects') {
      const project = data as Project;
      project.id = id;

      // Atualizar o estado
      setProjects(prevProjects => {
        console.log("Estado atual de projects:", JSON.stringify(prevProjects));
        
        const newProjects = [...prevProjects, project];
        console.log("Projeto adicionado:", JSON.stringify(project));
        console.log("Novo estado de projects:", JSON.stringify(newProjects));

        // Salvar as altera├º├Áes
        const storageData: StorageItems = {
          expenses,
          projects: newProjects,
          stock: stockItems,
          employees,
          lastSync: Date.now()
        };

        console.log("Dados a serem salvos:", JSON.stringify(storageData));
        
        // Salvar no Supabase e localmente
        saveChanges(storageData);

        return newProjects;
      });
    } else if (activeCategory === 'Stock') {
      const stockItem = data as StockItem;
      stockItem.id = id;

      // Atualizar o estado
      setStockItems(prevStockItems => {
        console.log("Estado atual de stockItems:", JSON.stringify(prevStockItems));
        
        const newStockItems = [...prevStockItems, stockItem];
        console.log("Item de estoque adicionado:", JSON.stringify(stockItem));
        console.log("Novo estado de stockItems:", JSON.stringify(newStockItems));

        // Salvar as altera├º├Áes
        const storageData: StorageItems = {
          expenses,
          projects,
          stock: newStockItems,
          employees,
          lastSync: Date.now()
        };

        console.log("Dados a serem salvos:", JSON.stringify(storageData));
        
        // Salvar no Supabase e localmente
        saveChanges(storageData);

        return newStockItems;
      });
    } else if (activeCategory === 'Employees') {
      const employee = data as Employee;
      employee.id = id;
      
      // Formatar a data da semana como string no formato yyyy-MM-dd
      const weekStartDate = format(selectedWeekStart, 'yyyy-MM-dd');
      employee.weekStartDate = weekStartDate;
      employee.daysWorked = 0; // Iniciar com zero dias trabalhados
      
      // Garantir que o dailyRate seja um n├║mero
      if (typeof employee.dailyRate === 'string') {
        employee.dailyRate = parseFloat(employee.dailyRate);
      }
      
      // Valor padr├úo caso n├úo seja fornecido
      if (!employee.dailyRate || isNaN(employee.dailyRate)) {
        employee.dailyRate = 250;
      }

      console.log("Adicionando funcion├írio com data da semana:", weekStartDate);

      // Atualizar o estado
      setEmployees(prevEmployees => {
        console.log("Estado atual de employees:", JSON.stringify(prevEmployees));
        
        // Criar uma c├│pia do objeto
        const newEmployees = { ...prevEmployees };
        
        // Garantir que a chave da semana existe
        if (!newEmployees[weekStartDate]) {
          console.log(`Semana ${weekStartDate} n├úo encontrada, inicializando...`);
          newEmployees[weekStartDate] = [];
        }

        // Adicionar o novo funcion├írio ├á semana atual
        newEmployees[weekStartDate] = [...(newEmployees[weekStartDate] || []), employee];
        
        console.log(`Funcion├írio adicionado ├á semana ${weekStartDate}:`, JSON.stringify(employee));
        console.log("Novo estado de employees:", JSON.stringify(newEmployees));

        // Salvar as altera├º├Áes
        const storageData: StorageItems = {
          expenses,
          projects,
          stock: stockItems,
          employees: newEmployees,
          lastSync: Date.now()
        };

        console.log("Dados a serem salvos:", JSON.stringify(storageData));
        
        // Salvar no Supabase e localmente
        saveChanges(storageData);

        return newEmployees;
      });
    }

    // Fechar o di├ílogo ap├│s adicionar o item
    setIsAddDialogOpen(false);
  };

  const handleListSelect = (value: ListName) => {
    setSelectedList(value);
    setIsDropdownOpen(false);
    
    const storageData = getData();
    storageData.expenses = expenses;
    storageData.projects = projects;
    storageData.stock = stockItems;
    storageData.employees = employees;
    
    saveChanges(storageData);
  };

  const handleEmployeeSelect = (value: EmployeeName) => {
    setSelectedEmployee(value);
    
    const storageData = getData();
    storageData.expenses = expenses;
    storageData.projects = projects;
    storageData.stock = stockItems;
    storageData.employees = employees;
    
    saveChanges(storageData);
  };

  const handleAddDay = (employeeId: string, weekStartDate: string) => {
    const updatedEmployees = { ...employees };
    const weekEmployees = updatedEmployees[weekStartDate] || [];
    const employeeIndex = weekEmployees.findIndex((e: Employee) => e.id === employeeId);
    const today = format(new Date(), 'yyyy-MM-dd');

    if (employeeIndex >= 0) {
      weekEmployees[employeeIndex] = {
        ...weekEmployees[employeeIndex],
        daysWorked: weekEmployees[employeeIndex].daysWorked + 1,
        workedDates: [...(weekEmployees[employeeIndex].workedDates || []), today]
      };
    } else {
      const employeeFromWeek = weekEmployees.find((e: Employee) => e.id === employeeId);
      if (employeeFromWeek) {
        weekEmployees.push({
          ...employeeFromWeek,
          weekStartDate,
          daysWorked: 1,
          workedDates: [today]
        });
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

  const handleResetEmployee = (employeeId: string, weekStartDate: string) => {
    console.log(`Resetando dias para funcion├írio ${employeeId} na semana ${weekStartDate}`);
    
    setEmployees(prevEmployees => {
      const newEmployees = { ...prevEmployees };
      
      // Verificar se a semana existe
      if (!newEmployees[weekStartDate]) {
        console.error(`Semana ${weekStartDate} n├úo encontrada`);
        return prevEmployees;
      }
      
      // Encontrar o funcion├írio na semana
      const employeeIndex = newEmployees[weekStartDate].findIndex(e => e.id === employeeId);
      
      if (employeeIndex === -1) {
        console.error(`Funcion├írio com ID ${employeeId} n├úo encontrado na semana ${weekStartDate}`);
        return prevEmployees;
      }
      
      // Resetar os dias trabalhados
      const updatedEmployee = { ...newEmployees[weekStartDate][employeeIndex] };
      updatedEmployee.daysWorked = 0;
      
      // Atualizar a lista de funcion├írios
      newEmployees[weekStartDate] = [
        ...newEmployees[weekStartDate].slice(0, employeeIndex),
        updatedEmployee,
        ...newEmployees[weekStartDate].slice(employeeIndex + 1)
      ];
      
      // Salvar no Supabase e localmente
      const storageData = getData();
      if (storageData) {
        const updatedStorageData = {
          ...storageData,
          employees: newEmployees,
          willBaseRate: storageData.willBaseRate,  // Preservar o valor original
          willBonus: storageData.willBonus  // Preservar o valor original
        };
        saveChanges(updatedStorageData);
      }
      
      return newEmployees;
    });
  };

  const resetWillValues = () => {
    setWillBaseRate(200);
    setWillBonus(0);
    
    // Salvar dados ap├│s resetar os valores
    setTimeout(() => {
      const storageData = getData();
      storageData.willBaseRate = 200;
      storageData.willBonus = 0;
      saveChanges(storageData);
    }, 0);
  };

  // Adicionar fun├º├úo para salvar os dados do Will
  const handleSaveWillData = () => {
    const storageData = getData();
    // Adicionar os dados do Will ao objeto de armazenamento
    storageData.willBaseRate = willBaseRate;
    storageData.willBonus = willBonus;
    
    // Salvar todas as altera├º├Áes
    saveChanges(storageData);
  };

  // Modificar a fun├º├úo que adiciona b├┤nus ao Will
  const handleAddBonus = () => {
    setWillBonus(prev => {
      const newBonus = prev + 100;
      // Salvar dados ap├│s atualizar o b├┤nus
      setTimeout(() => {
        const storageData = getData();
        storageData.willBaseRate = willBaseRate;
        storageData.willBonus = newBonus;
        console.log('Salvando b├┤nus atualizado:', newBonus);
        saveChanges(storageData);
      }, 0);
      return newBonus;
    });
  };

  // Modificar a fun├º├úo que altera o sal├írio base do Will
  const handleWillRateChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const newBaseRate = parseFloat(formData.get('baseRate') as string) || 200;
    
    setWillBaseRate(newBaseRate);
    setIsRateDialogOpen(false);
    
    // Salvar dados ap├│s atualizar o sal├írio base
    setTimeout(() => {
      const storageData = getData();
      storageData.willBaseRate = newBaseRate;
      storageData.willBonus = willBonus;
      console.log('Salvando taxa base atualizada:', newBaseRate);
      saveChanges(storageData);
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

  // Efeito para gerenciar a classe 'dialog-open' para o di├ílogo de alerta
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

  // Efeito para gerenciar a classe 'dialog-open' para o di├ílogo de ajuste de sal├írio
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

  // Fun├º├úo para lidar com a mudan├ºa de semana
  const handleWeekChange = (startDate: Date, endDate: Date) => {
    setSelectedWeekStart(startDate);
    setSelectedWeekEnd(endDate);
  };

  // Fun├º├úo para verificar se um funcion├írio deve ser exibido na semana selecionada
  const shouldShowEmployeeInWeek = (employee: Employee, weekStart: Date, weekEnd: Date) => {
    // Se o funcion├írio n├úo tem data de in├¡cio, sempre mostrar
    if (!employee.startDate) return true;
    
    // Converter a data de in├¡cio do funcion├írio para um objeto Date e resetar o hor├írio
    const employeeStartDate = new Date(employee.startDate);
    employeeStartDate.setHours(0, 0, 0, 0);
    
    // Criar c├│pias das datas de in├¡cio e fim da semana com hor├írio resetado para compara├º├úo justa
    const weekStartCopy = new Date(weekStart);
    weekStartCopy.setHours(0, 0, 0, 0);
    
    const weekEndCopy = new Date(weekEnd);
    weekEndCopy.setHours(23, 59, 59, 999);
    
    // Ajustar a data de in├¡cio da semana para garantir que a segunda-feira seja inclu├¡da
    // Isso ├® necess├írio porque pode haver problemas de fuso hor├írio ou arredondamento
    const adjustedWeekStart = new Date(weekStartCopy);
    adjustedWeekStart.setHours(0, 0, 0, 0);
    
    // Verificar se a data de in├¡cio do funcion├írio est├í dentro do intervalo da semana selecionada
    // (entre segunda e s├íbado daquela semana)
    const isInWeek = employeeStartDate >= adjustedWeekStart && employeeStartDate <= weekEndCopy;
    
    console.log(`Verificando funcion├írio: ${employee.name}`);
    console.log(`Data de in├¡cio do funcion├írio: ${employeeStartDate.toISOString()}`);
    console.log(`In├¡cio da semana ajustado: ${adjustedWeekStart.toISOString()}`);
    console.log(`Fim da semana: ${weekEndCopy.toISOString()}`);
    console.log(`Est├í na semana? ${isInWeek}`);
    
    return isInWeek;
  };

  const calculateEmployeesTotal = () => {
    let total = 0;
    
    // Obter todos os funcion├írios de todas as semanas
    const allEmployees: Employee[] = [];
    Object.keys(employees).forEach(weekKey => {
      employees[weekKey].forEach(employee => {
        // Verificar se o funcion├írio j├í est├í na lista (evitar duplicatas)
        if (!allEmployees.some(e => e.id === employee.id)) {
          allEmployees.push(employee);
        }
      });
    });
    
    // Filtrar funcion├írios que devem ser exibidos na semana selecionada
    const filteredEmployees = allEmployees.filter(employee => 
      shouldShowEmployeeInWeek(employee, selectedWeekStart, selectedWeekEnd)
    );
    
    // Obter os funcion├írios espec├¡ficos da semana selecionada (para dias trabalhados)
    const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
    const weekEmployees = employees[formattedSelectedWeekStart] || [];
    
    // Calcular o total
    filteredEmployees.forEach(employee => {
      // Encontrar o registro espec├¡fico do funcion├írio para a semana selecionada
      const weekEmployee = weekEmployees.find(e => e.id === employee.id);
      const daysWorked = weekEmployee ? weekEmployee.daysWorked : 0;
      
      // Adicionar ao total
      total += (employee.dailyRate || 250) * daysWorked;
    });
    
    // Adicionar o valor do Will (valor fixo semanal + b├┤nus)
    // Will recebe 200 pela semana toda (n├úo ├® por dia)
    total += willBaseRate + willBonus;
    
    return total;
  };

  // Fun├º├úo para lidar com a mudan├ºa de semana para projetos
  const handleProjectWeekChange = (startDate: Date, endDate: Date) => {
    setSelectedWeekStart(startDate);
    setSelectedWeekEnd(endDate);
  };

  // Fun├º├úo para atualizar as datas da semana com base na categoria
  const updateWeekDatesForCategory = (category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => {
    const today = new Date();
    const weekStart = getWeekStart(today, category);
    const weekEnd = getWeekEnd(today, category);
    setSelectedWeekStart(weekStart);
    setSelectedWeekEnd(weekEnd);
  };

  // Atualizar as datas da semana quando a categoria mudar
  useEffect(() => {
    updateWeekDatesForCategory(activeCategory);
  }, [activeCategory]);

  // Atualizar as datas da semana na inicializa├º├úo
  useEffect(() => {
    updateWeekDatesForCategory(activeCategory);
  }, []);

  // Fun├º├úo para ordenar despesas por data de vencimento (mais atrasadas primeiro)
  const sortExpensesByDueDate = (expenseList: Expense[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Definir o limite para "pr├│ximo do vencimento" (7 dias)
    const upcomingLimit = new Date(today);
    upcomingLimit.setDate(today.getDate() + 7);
    
    return [...expenseList].sort((a, b) => {
      // Primeiro crit├®rio: status de pagamento (pagas primeiro)
      if (a.paid !== b.paid) {
        return a.paid ? -1 : 1;
      }
      
      // Se ambas est├úo pagas ou ambas n├úo est├úo pagas, continuar com os outros crit├®rios
      const dueDateA = new Date(a.date);
      const dueDateB = new Date(b.date);
      
      // Para itens n├úo pagos, verificar status de vencimento
      if (!a.paid) {
        // Verificar se as datas est├úo atrasadas (antes de hoje)
        const isOverdueA = dueDateA < today;
        const isOverdueB = dueDateB < today;
        
        // Verificar se as datas est├úo pr├│ximas do vencimento (entre hoje e o limite)
        const isUpcomingA = !isOverdueA && dueDateA <= upcomingLimit;
        const isUpcomingB = !isOverdueB && dueDateB <= upcomingLimit;
        
        // Categorizar por status de vencimento
        const categoryA = isOverdueA ? 1 : (isUpcomingA ? 2 : 3); // 1=atrasada, 2=pr├│xima, 3=futura
        const categoryB = isOverdueB ? 1 : (isUpcomingB ? 2 : 3);
        
        // Se est├úo em categorias diferentes, ordenar por categoria
        if (categoryA !== categoryB) {
          return categoryA - categoryB;
        }
      }
      
      // Se est├úo na mesma categoria ou ambas pagas, ordenar por data
      return dueDateA.getTime() - dueDateB.getTime();
    });
  };

  // Fun├º├úo para verificar se um item est├í relacionado ├á data selecionada
  const isItemFromSelectedDate = (item: any): boolean => {
    // Se n├úo houver filtro de data, mostrar todos
    if (!filterDate) return true;

    // Para projetos, ignorar o filtro do calend├írio
    if ('client' in item) {
      const projectDate = new Date(item.startDate);
      return projectDate >= selectedWeekStart && projectDate <= selectedWeekEnd;
    }

    // Para outros itens, manter a l├│gica do filtro por data
    const itemDate = new Date(
      'date' in item ? item.date : 
      'startDate' in item ? item.startDate : 
      new Date()
    );

    return itemDate.toDateString() === filterDate.toDateString();
  };

  // Fun├º├úo para verificar se um funcion├írio trabalhou na data selecionada
  const didEmployeeWorkOnDate = (employee: Employee): boolean => {
    // Will deve sempre aparecer
    if (employee.name === 'Will') return true;
    
    // Se n├úo houver filtro de data, mostrar todos
    if (!filterDate) return true;
    
    // Verificar se o funcion├írio trabalhou na data selecionada
    const formattedDate = format(filterDate, 'yyyy-MM-dd');
    return employee.workedDates?.includes(formattedDate) || false;
  };

  // Fun├º├úo para abrir o calend├írio
  const handleOpenCalendar = () => {
    setIsCalendarOpen(true);
  };

  // Fun├º├úo para limpar o filtro
  const clearDateFilter = () => {
    setFilterDate(null);
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <Header activeCategory={activeCategory} />
      <ConnectionStatus />
      
      {/* Overlay de sincroniza├º├úo */}
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-[300px] w-full flex flex-col items-center">
            <div className="w-16 h-16 mb-4">
              <div className="w-full h-full border-4 border-[#5ABB37] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
              Sincronizando Dados
            </h2>
            <p className="text-gray-600 text-center text-sm mb-4">
              Aguarde enquanto sincronizamos os dados mais recentes...
            </p>
          </div>
        </div>
      )}

      {/* Feedback de sucesso ou erro */}
      {showFeedback.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          showFeedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <p className="font-medium">{showFeedback.message}</p>
        </div>
      )}
      
      <Navigation
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      
      <div className="pt-[170px]">
        {(activeCategory === 'Expenses') && (
          <div className="sticky top-[170px] left-0 right-0 px-4 z-30 bg-gray-50">
            <div className="relative max-w-[800px] mx-auto pb-2">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
            
            {isDropdownOpen && (
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
          <div className="sticky top-[170px] left-0 right-0 px-4 z-30 bg-gray-50 mb-4">
            <div className="relative max-w-[800px] mx-auto pb-4">
              <div className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-gray-700 font-medium mr-2">Total:</span>
                  <span className="text-[#5ABB37] text-xl font-bold">
                    ${weekTotalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {(activeCategory === 'Stock') && (
          <div className="sticky top-[170px] left-0 right-0 px-4 z-30 bg-gray-50">
            {/* Conte├║do do Stock */}
          </div>
        )}
        
        {(activeCategory === 'Employees') && (
          <div className="sticky top-[170px] left-0 right-0 px-4 z-30 bg-gray-50 mb-4">
            <div className="relative max-w-[800px] mx-auto pb-4">
              <div className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between">
                <ProjectWeekSelector 
                  selectedWeekStart={selectedWeekStart}
                  onWeekChange={handleProjectWeekChange}
                />
                <div className="flex items-center">
                  <span className="text-gray-700 font-medium mr-2">Total:</span>
                  <span className="text-[#5ABB37] text-xl font-bold">
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

            <ul className="flex flex-col space-y-[8px] m-0 p-0">
              {activeCategory === 'Expenses' && sortExpensesByDueDate(expenses[selectedList] || [])
                .filter(isItemFromSelectedDate)
                .map(expense => (
                  <li key={expense.id} className="list-none">
            <ExpenseItem
              expense={expense}
              onTogglePaid={handleTogglePaid}
                      onDelete={(id) => handleDeleteItem(id, 'Expenses')}
                      onEdit={(expense) => handleEditItem(expense)}
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
                      onDelete={() => handleDeleteItem(project.id, 'Projects')}
                      onEdit={() => handleEditItem(project)}
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
                    onDelete={() => handleDeleteItem(item.id, 'Stock')}
                    onEdit={() => handleEditItem(item)}
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
                    
                    // Obter todos os funcion├írios de todas as semanas
                    const allEmployees: Employee[] = [];
                    Object.keys(employees).forEach(weekKey => {
                      employees[weekKey].forEach(employee => {
                        // Verificar se o funcion├írio j├í est├í na lista (evitar duplicatas)
                        if (!allEmployees.some(e => e.id === employee.id)) {
                          allEmployees.push(employee);
                        }
                      });
                    });
                    
                    // Filtrar funcion├írios que devem ser exibidos na semana selecionada
                    const filteredEmployees = allEmployees.filter(employee => 
                      shouldShowEmployeeInWeek(employee, selectedWeekStart, selectedWeekEnd) && 
                      didEmployeeWorkOnDate(employee)
                    );
                    
                    // Obter os funcion├írios espec├¡ficos da semana selecionada (para dias trabalhados)
                    const weekEmployees = employees[formattedSelectedWeekStart] || [];
                    
                    const employeeElements = [];

                    // Will - funcion├írio fixo
                    employeeElements.push(
                      <li key="will-fixed" className="list-none">
                        <WillItemFixed
                          key="will-fixed"
                          willBaseRate={willBaseRate}
                          willBonus={willBonus}
                          onReset={resetWillValues}
                          onLayoff={() => setShowLayoffAlert(true)}
                          onIncreaseRate={() => setIsRateDialogOpen(true)}
                          onAddBonus={handleAddBonus}
                        />
                      </li>
                    );

                    // Verificar se h├í funcion├írios filtrados (excluindo Will)
                    if (filteredEmployees.length === 0) {
                      employeeElements.push(
                        <li key="no-employees" className="list-none">
                          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                            <p className="text-gray-500">No employees started this week.</p>
                          </div>
                        </li>
                      );
                    } else {
                      // Outros funcion├írios
                      filteredEmployees.forEach(employee => {
                        // Encontrar o registro espec├¡fico do funcion├írio para a semana selecionada
                        const weekEmployee = weekEmployees.find(e => e.id === employee.id);
                        const daysWorked = weekEmployee ? weekEmployee.daysWorked : 0;
                        
                        employeeElements.push(
                          <li key={employee.id} className="list-none">
                            <SwipeableItem 
                              onDelete={() => handleDeleteItem(employee.id, 'Employees')}
                              onEdit={() => handleEditItem(employee)}
                            >
                              <div className="bg-white p-2.5 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between mb-1.5">
                                  <h3 className="text-xl font-bold text-gray-800">{employee.name}</h3>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleAddDay(employee.id, formattedSelectedWeekStart)}
                                      className="px-3 py-1 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors flex items-center h-8"
                                    >
                                      +1 Day
                                    </button>
                                    <button
                                      onClick={() => handleResetEmployee(employee.id, formattedSelectedWeekStart)}
                                      className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors h-8"
                                    >
                                      Reset
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
                                      $ {((daysWorked * (employee.dailyRate || 250))).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
    {activeCategory !== 'Stock' && (
      <CalendarButton onClick={handleOpenCalendar} />
    )}
    <AddButton onClick={() => setIsAddDialogOpen(true)} />

      <AddItemDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        category={activeCategory}
        onSubmit={handleAddItem}
      selectedWeekStart={selectedWeekStart}
    />

    <EditItemDialog
      isOpen={isEditDialogOpen}
      onOpenChange={setIsEditDialogOpen}
      item={itemToEdit}
      onSubmit={handleUpdateItem}
      selectedWeekStart={selectedWeekStart}
    />

    {isSupabaseConfigured() && <ConnectionStatus />}

    <Dialog.Root open={showLayoffAlert} onOpenChange={setShowLayoffAlert}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-[2px]" />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-8 shadow-xl w-[90%] max-w-md z-50"
          onOpenAutoFocus={(e: React.FocusEvent) => e.preventDefault()}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
    </div>
            <div className="text-3xl font-bold text-red-500 mb-2 animate-bounce">IMPOSSIBLE!</div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    <Dialog.Root open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-[2px]" />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-md z-50"
          onOpenAutoFocus={(e: React.FocusEvent) => e.preventDefault()}
        >
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
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
      isOpen={isCalendarOpen}
      onOpenChange={setIsCalendarOpen}
    />
    </>
  );
}

// Branch Deploy: main@7cc2f34
