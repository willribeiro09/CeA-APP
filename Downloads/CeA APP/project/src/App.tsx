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
import { ChevronDown, X, Calendar as CalendarIcon } from 'lucide-react';
import { storage } from './lib/storage';
import { validation } from './lib/validation';
import { syncService, loadInitialData, saveData, saveItem, isReady, CHANGE_TYPE } from './lib/sync';
import { isSupabaseConfigured, initSyncTable } from './lib/supabase';
import { ConnectionStatus } from './components/ConnectionStatus';
import { getData } from './lib/storage';
import { format } from 'date-fns';
import { SwipeableItem } from './components/SwipeableItem';
import * as Dialog from '@radix-ui/react-dialog';
import { WillItemFixed } from './components/WillItemFixed';
import { Button } from './components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import 'react-day-picker/dist/style.css';
import { WeekSelector } from './components/WeekSelector';
import { ProjectWeekSelector } from './components/ProjectWeekSelector';
import { normalizeDate, formatDateToISO } from './lib/dateUtils';
import { WorkedDaysCalendar } from './components/WorkedDaysCalendar';
import { EmployeeReceipt } from './components/EmployeeReceipt';

type ListName = 'Carlos' | 'Diego' | 'C&A';

const initialExpenses: Record<ListName, Expense[]> = {
  'Carlos': [],
  'Diego': [],
  'C&A': []
};

const initialEmployees: Record<string, Employee[]> = {};

// Função para obter a terça-feira atual ou anterior mais próxima
const getProjectWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay(); // 0 = domingo, 1 = segunda, 2 = terça, ...
  const daysToSubtract = day === 2 ? 0 : day < 2 ? day + 5 : day - 2;
  
  result.setDate(result.getDate() - daysToSubtract);
  result.setHours(0, 0, 0, 0);
  return result;
};

// Função para obter a segunda-feira seguinte
const getProjectWeekEnd = (date: Date): Date => {
  const weekStart = getProjectWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 6); // 6 dias após terça = segunda
  result.setHours(23, 59, 59, 999);
  return result;
};

// Funções para cálculo de datas para Employees (segunda a sábado)
const getEmployeeWeekStart = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  // 1 = segunda-feira (já é um dia válido da semana)
  const diff = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getEmployeeWeekEnd = (date: Date): Date => {
  const weekStart = getEmployeeWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 5); // 5 dias após segunda = sábado (sábado também é um dia válido)
  result.setHours(23, 59, 59, 999);
  return result;
};

const formatDateRange = (start: Date, end: Date): string => {
  // Mostrar apenas dia e mês para economizar espaço
  return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}`;
};

// Função auxiliar para determinar a função correta com base na categoria
const getWeekStart = (date: Date, category: 'Expenses' | 'Projects' | 'Stock' | 'Employees' = 'Projects'): Date => {
  return category === 'Employees' ? getEmployeeWeekStart(date) : getProjectWeekStart(date);
};

const getWeekEnd = (date: Date, category: 'Expenses' | 'Projects' | 'Stock' | 'Employees' = 'Projects'): Date => {
  return category === 'Employees' ? getEmployeeWeekEnd(date) : getProjectWeekEnd(date);
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
  const [isWorkedDaysCalendarOpen, setIsWorkedDaysCalendarOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);

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

      // Configurar sincronização em tempo real
      syncService.init();
      const cleanup = syncService.setupRealtimeUpdates((data) => {
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
    console.log('Salvando alterações...', JSON.stringify(newData));
    setIsSaving(true);
    
    try {
      // Salvar dados localmente primeiro para resposta imediata
      localStorage.setItem('expenses-app-data', JSON.stringify(newData));
      
      // Verificar se houve mudanças nos valores do Will
      if (willBaseRate !== newData.willBaseRate || willBonus !== newData.willBonus) {
        await saveItem('willSettings', {
          willBaseRate: newData.willBaseRate,
          willBonus: newData.willBonus
        }, CHANGE_TYPE.UPDATE);
        
        // Atualizar estado local
        setWillBaseRate(newData.willBaseRate || 200);
        setWillBonus(newData.willBonus || 0);
      }
      
      console.log('Dados salvos com sucesso');
      setShowFeedback({ show: true, message: 'Dados salvos com sucesso!', type: 'success' });
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      setShowFeedback({ show: true, message: 'Erro ao salvar dados!', type: 'error' });
    } finally {
      setIsSaving(false);
      // Esconder o feedback após 3 segundos
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
            // Criar uma cópia da despesa e inverter o status de pago
            const updatedExpense = { ...list[index], paid: !list[index].paid };
            // Atualizar a lista com a despesa atualizada
            newExpenses[listName as ListName] = [
              ...list.slice(0, index),
              updatedExpense,
              ...list.slice(index + 1)
            ];
            
            // Salvar a alteração usando o novo sistema de sincronização
            saveItem(
              'expense', 
              updatedExpense, 
              CHANGE_TYPE.UPDATE, 
              listName as ListName
            ).catch(error => {
              console.error('Erro ao salvar alteração de status de pagamento:', error);
            });
          }
        });
        
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
          // Encontrar o item antes de removê-lo
          const itemToDelete = newExpenses[listName as ListName].find(
            expense => expense.id === id
          );
          
          // Remover do estado local
          newExpenses[listName as ListName] = newExpenses[listName as ListName].filter(
            expense => expense.id !== id
          );
          
          // Se o item foi encontrado e removido, sincronizar a alteração
          if (itemToDelete) {
            saveItem(
              'expense',
              itemToDelete,
              CHANGE_TYPE.DELETE,
              listName as ListName
            ).catch(error => {
              console.error('Erro ao sincronizar exclusão da despesa:', error);
            });
          }
        });
        
        return newExpenses;
      });
    } else if (category === 'Projects') {
      setProjects(prevProjects => {
        // Encontrar o projeto a ser excluído
        const projectToDelete = prevProjects.find(project => project.id === id);
        
        // Filtrar o projeto do estado local
        const newProjects = prevProjects.filter(project => project.id !== id);
        
        // Se o projeto foi encontrado e removido, sincronizar a alteração
        if (projectToDelete) {
          saveItem(
            'project',
            projectToDelete,
            CHANGE_TYPE.DELETE
          ).catch(error => {
            console.error('Erro ao sincronizar exclusão do projeto:', error);
          });
        }
        
        return newProjects;
      });
    } else if (category === 'Stock') {
      setStockItems(prevStockItems => {
        // Encontrar o item de estoque a ser excluído
        const stockItemToDelete = prevStockItems.find(item => item.id === id);
        
        // Filtrar o item do estado local
        const newStockItems = prevStockItems.filter(item => item.id !== id);
        
        // Se o item foi encontrado e removido, sincronizar a alteração
        if (stockItemToDelete) {
          saveItem(
            'stock',
            stockItemToDelete,
            CHANGE_TYPE.DELETE
          ).catch(error => {
            console.error('Erro ao sincronizar exclusão do item de estoque:', error);
          });
        }
        
        return newStockItems;
      });
    } else if (category === 'Employees') {
      setEmployees(prevEmployees => {
        const newEmployees = { ...prevEmployees };
        
        // Procurar e remover o funcionário em todas as semanas
        Object.keys(newEmployees).forEach(weekStartDate => {
          // Encontrar o funcionário antes de removê-lo
          const employeeToDelete = newEmployees[weekStartDate].find(
            employee => employee.id === id
          );
          
          // Remover do estado local
          newEmployees[weekStartDate] = newEmployees[weekStartDate].filter(
            employee => employee.id !== id
          );
          
          // Se o funcionário foi encontrado e removido, sincronizar a alteração
          if (employeeToDelete) {
            saveItem(
              'employee',
              employeeToDelete,
              CHANGE_TYPE.DELETE,
              weekStartDate
            ).catch(error => {
              console.error('Erro ao sincronizar exclusão do funcionário:', error);
            });
          }
        });
        
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
      // Verificar o tipo do item usando propriedades específicas
      if ('description' in updatedItem) {
        // É uma despesa
        setExpenses(prevExpenses => {
          const newExpenses = { ...prevExpenses };
          
          // Procurar e atualizar a despesa em todas as listas
          Object.keys(newExpenses).forEach(listName => {
            const index = newExpenses[listName as ListName].findIndex(expense => expense.id === updatedItem.id);
            if (index !== -1) {
              // Atualizar o estado local
              newExpenses[listName as ListName][index] = updatedItem as Expense;
              
              // Sincronizar a alteração
              saveItem(
                'expense', 
                updatedItem as Expense, 
                CHANGE_TYPE.UPDATE, 
                listName as ListName
              ).catch(error => {
                console.error('Erro ao sincronizar atualização da despesa:', error);
              });
            }
          });
          
          return newExpenses;
        });
      } else if ('client' in updatedItem) {
        // É um projeto
        setProjects(prevProjects => {
          try {
            console.log("Updating project, pre-check:", updatedItem);
            
            // Verificar se o ID existe
            const index = prevProjects.findIndex(project => project.id === updatedItem.id);
            if (index === -1) {
              console.error("Project not found with ID:", updatedItem.id);
              return prevProjects;
            }
            
            // Garantir que todos os campos obrigatórios estejam presentes
            const existingProject = prevProjects[index];
            
            // Criar uma cópia do projeto com todos os campos necessários
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
            
            // Atualizar o estado local
            const newProjects = [...prevProjects];
            newProjects[index] = updatedProject;
            
            // Sincronizar a alteração
            saveItem(
              'project',
              updatedProject,
              CHANGE_TYPE.UPDATE
            ).catch(error => {
              console.error('Erro ao sincronizar atualização do projeto:', error);
            });
            
            return newProjects;
          } catch (error) {
            console.error("Error updating project:", error);
            // Garantir que retornamos o estado anterior em caso de erro
            return prevProjects;
          }
        });
      } else if ('quantity' in updatedItem) {
        // É um item de estoque
        setStockItems(prevStockItems => {
          const index = prevStockItems.findIndex(item => item.id === updatedItem.id);
          if (index === -1) return prevStockItems;
          
          // Atualizar o estado local
          const newStockItems = [...prevStockItems];
          newStockItems[index] = updatedItem as StockItem;
          
          // Sincronizar a alteração
          saveItem(
            'stock',
            updatedItem as StockItem,
            CHANGE_TYPE.UPDATE
          ).catch(error => {
            console.error('Erro ao sincronizar atualização do item de estoque:', error);
          });
          
          return newStockItems;
        });
      } else if ('employeeName' in updatedItem) {
        // É um funcionário
        setEmployees(prevEmployees => {
          // Não permitir alterações no Will através da edição normal de funcionários
          if (updatedItem.name === 'Will' || updatedItem.employeeName === 'Will') {
            console.log("Tentativa de editar Will através da edição normal de funcionários. Ignorando.");
            return prevEmployees;
          }
          
          const newEmployees = { ...prevEmployees };
          
          // Procurar e atualizar o funcionário em todas as semanas
          Object.keys(newEmployees).forEach(weekStartDate => {
            const index = newEmployees[weekStartDate].findIndex(employee => employee.id === updatedItem.id);
            if (index !== -1) {
              // Atualizar o estado local
              newEmployees[weekStartDate][index] = updatedItem as Employee;
              
              // Sincronizar a alteração
              saveItem(
                'employee',
                updatedItem as Employee,
                CHANGE_TYPE.UPDATE,
                weekStartDate
              ).catch(error => {
                console.error('Erro ao sincronizar atualização do funcionário:', error);
              });
            }
          });
          
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
      setFilterDate(date);
    }
    setIsCalendarOpen(false);
  };

  const handleAddItem = (data: Partial<Item>) => {
    const id = crypto.randomUUID();

    if (activeCategory === 'Expenses') {
      const expense = data as Expense;
      expense.id = id;
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

        // Sincronizar a alteração usando o novo sistema
        saveItem(
          'expense',
          expense,
          CHANGE_TYPE.ADD,
          selectedList as ListName
        ).catch(error => {
          console.error('Erro ao sincronizar adição de despesa:', error);
        });

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

        // Sincronizar a alteração usando o novo sistema
        saveItem(
          'project',
          project,
          CHANGE_TYPE.ADD
        ).catch(error => {
          console.error('Erro ao sincronizar adição de projeto:', error);
        });

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

        // Sincronizar a alteração usando o novo sistema
        saveItem(
          'stock',
          stockItem,
          CHANGE_TYPE.ADD
        ).catch(error => {
          console.error('Erro ao sincronizar adição de item de estoque:', error);
        });

        return newStockItems;
      });
    } else if (activeCategory === 'Employees') {
      const employee = data as Employee;
      employee.id = id;
      
      // Formatar a data da semana como string no formato yyyy-MM-dd
      const weekStartDate = format(selectedWeekStart, 'yyyy-MM-dd');
      employee.weekStartDate = weekStartDate;
      employee.daysWorked = 0; // Iniciar com zero dias trabalhados
      
      // Garantir que o dailyRate seja um número
      if (typeof employee.dailyRate === 'string') {
        employee.dailyRate = parseFloat(employee.dailyRate);
      }
      
      // Valor padrão caso não seja fornecido
      if (!employee.dailyRate || isNaN(employee.dailyRate)) {
        employee.dailyRate = 250;
      }

      console.log("Adicionando funcionário com data da semana:", weekStartDate);

      // Atualizar o estado
      setEmployees(prevEmployees => {
        console.log("Estado atual de employees:", JSON.stringify(prevEmployees));
        
        // Criar uma cópia do objeto
        const newEmployees = { ...prevEmployees };
        
        // Garantir que a chave da semana existe
        if (!newEmployees[weekStartDate]) {
          console.log(`Semana ${weekStartDate} não encontrada, inicializando...`);
          newEmployees[weekStartDate] = [];
        }

        // Adicionar o novo funcionário à semana atual
        newEmployees[weekStartDate] = [...(newEmployees[weekStartDate] || []), employee];
        
        console.log(`Funcionário adicionado à semana ${weekStartDate}:`, JSON.stringify(employee));
        console.log("Novo estado de employees:", JSON.stringify(newEmployees));

        // Sincronizar a alteração usando o novo sistema
        saveItem(
          'employee',
          employee,
          CHANGE_TYPE.ADD,
          weekStartDate
        ).catch(error => {
          console.error('Erro ao sincronizar adição de funcionário:', error);
        });

        return newEmployees;
      });
    }

    // Fechar o diálogo após adicionar o item
    setIsAddDialogOpen(false);
  };

  const handleListSelect = (value: ListName) => {
    setSelectedList(value);
    setIsDropdownOpen(false);
    
    // Não é necessário salvar nada aqui, apenas atualizar o estado local
  };

  const handleEmployeeSelect = (value: EmployeeName) => {
    setSelectedEmployee(value);
    
    // Não é necessário salvar nada aqui, apenas atualizar o estado local
  };

  const handleWorkedDatesChange = (employeeId: string, weekStartDate: string, dates: string[]) => {
    setEmployees(prevEmployees => {
      const updatedEmployees = { ...prevEmployees };
      const weekEmployees = updatedEmployees[weekStartDate] || [];
      const employeeIndex = weekEmployees.findIndex((e: Employee) => e.id === employeeId);
      
      let updatedEmployee: Employee;

      if (employeeIndex >= 0) {
        // Atualizar funcionário existente
        updatedEmployee = {
          ...weekEmployees[employeeIndex],
          daysWorked: dates.length,
          workedDates: dates
        };
        
        // Atualizar a lista de funcionários
        updatedEmployees[weekStartDate] = [
          ...weekEmployees.slice(0, employeeIndex),
          updatedEmployee,
          ...weekEmployees.slice(employeeIndex + 1)
        ];
      } else {
        // Criar novo registro para o funcionário nesta semana
        const employeeFromOtherWeek = Object.values(prevEmployees)
          .flat()
          .find((e: Employee) => e.id === employeeId);
          
        if (employeeFromOtherWeek) {
          updatedEmployee = {
            ...employeeFromOtherWeek,
            weekStartDate,
            daysWorked: dates.length,
            workedDates: dates
          };
          
          // Adicionar à lista da semana
          if (!updatedEmployees[weekStartDate]) {
            updatedEmployees[weekStartDate] = [];
          }
          updatedEmployees[weekStartDate].push(updatedEmployee);
        } else {
          // Se não encontrou o funcionário, não faz nada
          return prevEmployees;
        }
      }
      
      // Sincronizar a alteração usando o novo sistema
      saveItem(
        'employee',
        updatedEmployee,
        CHANGE_TYPE.UPDATE,
        weekStartDate
      ).catch(error => {
        console.error('Erro ao sincronizar dias trabalhados para funcionário:', error);
      });
      
      return updatedEmployees;
    });
  };

  const handleOpenWorkedDaysCalendar = (employeeId: string) => {
    setCurrentEmployeeId(employeeId);
    setIsWorkedDaysCalendarOpen(true);
  };

  const handleOpenReceipt = (employeeId: string) => {
    setCurrentEmployeeId(employeeId);
    setIsReceiptOpen(true);
  };

  const resetWillValues = () => {
    setWillBaseRate(200);
    setWillBonus(0);
    
    // Salvar dados após resetar os valores
    setTimeout(() => {
      // Sincronizar a alteração usando o novo sistema
      saveItem(
        'willSettings',
        {
          willBaseRate: 200,
          willBonus: 0
        },
        CHANGE_TYPE.UPDATE
      ).catch(error => {
        console.error('Erro ao sincronizar reset dos valores do Will:', error);
      });
    }, 0);
  };

  // Adicionar função para salvar os dados do Will
  const handleSaveWillData = () => {
    // Sincronizar a alteração usando o novo sistema
    saveItem(
      'willSettings',
      {
        willBaseRate,
        willBonus
      },
      CHANGE_TYPE.UPDATE
    ).catch(error => {
      console.error('Erro ao sincronizar dados do Will:', error);
    });
  };

  // Modificar a função que adiciona bônus ao Will
  const handleAddBonus = () => {
    setWillBonus(prev => {
      const newBonus = prev + 100;
      // Salvar dados após atualizar o bônus
      setTimeout(() => {
        // Sincronizar a alteração usando o novo sistema
        saveItem(
          'willSettings',
          {
            willBaseRate,
            willBonus: newBonus
          },
          CHANGE_TYPE.UPDATE
        ).catch(error => {
          console.error('Erro ao sincronizar novo bônus do Will:', error);
        });
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
      // Sincronizar a alteração usando o novo sistema
      saveItem(
        'willSettings',
        {
          willBaseRate: newBaseRate,
          willBonus
        },
        CHANGE_TYPE.UPDATE
      ).catch(error => {
        console.error('Erro ao sincronizar nova taxa base do Will:', error);
      });
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

  // Função para lidar com a mudança de semana
  const handleWeekChange = (startDate: Date, endDate: Date) => {
    setSelectedWeekStart(startDate);
    setSelectedWeekEnd(endDate);
  };

  // Função para verificar se um funcionário deve ser exibido na semana selecionada
  const shouldShowEmployeeInWeek = (employee: Employee, weekStart: Date, weekEnd: Date) => {
    // Se o funcionário não tem data de início, sempre mostrar
    if (!employee.startDate) return true;
    
    // Converter a data de início do funcionário para um objeto Date e resetar o horário
    const employeeStartDate = new Date(employee.startDate);
    employeeStartDate.setHours(0, 0, 0, 0);
    
    // Criar cópias das datas de início e fim da semana com horário resetado para comparação justa
    const weekStartCopy = new Date(weekStart);
    weekStartCopy.setHours(0, 0, 0, 0);
    
    const weekEndCopy = new Date(weekEnd);
    weekEndCopy.setHours(23, 59, 59, 999);
    
    // Ajustar a data de início da semana para garantir que a segunda-feira seja incluída
    // Isso é necessário porque pode haver problemas de fuso horário ou arredondamento
    const adjustedWeekStart = new Date(weekStartCopy);
    adjustedWeekStart.setHours(0, 0, 0, 0);
    
    // Verificar se a data de início do funcionário está dentro do intervalo da semana selecionada
    // (entre segunda e sábado daquela semana)
    const isInWeek = employeeStartDate >= adjustedWeekStart && employeeStartDate <= weekEndCopy;
    
    console.log(`Verificando funcionário: ${employee.name}`);
    console.log(`Data de início do funcionário: ${employeeStartDate.toISOString()}`);
    console.log(`Início da semana ajustado: ${adjustedWeekStart.toISOString()}`);
    console.log(`Fim da semana: ${weekEndCopy.toISOString()}`);
    console.log(`Está na semana? ${isInWeek}`);
    
    return isInWeek;
  };

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
    
    // Filtrar funcionários que devem ser exibidos na semana selecionada
    const filteredEmployees = allEmployees.filter(employee => 
      shouldShowEmployeeInWeek(employee, selectedWeekStart, selectedWeekEnd) && 
      didEmployeeWorkOnDate(employee)
    );
    
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

  // Função para lidar com a mudança de semana para projetos
  const handleProjectWeekChange = (startDate: Date, endDate: Date) => {
    setSelectedWeekStart(startDate);
    setSelectedWeekEnd(endDate);
  };

  // Função para atualizar as datas da semana com base na categoria
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

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <Header activeCategory={activeCategory} />
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
                <ProjectWeekSelector 
                  selectedWeekStart={selectedWeekStart}
                  onWeekChange={handleProjectWeekChange}
                />
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
            {/* Conteúdo do Stock */}
          </div>
        )}
        
        {(activeCategory === 'Employees') && (
          <div className="sticky top-[170px] left-0 right-0 px-4 z-30 bg-gray-50 mb-4">
            <div className="relative max-w-[800px] mx-auto pb-4">
              <div className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between">
                <WeekSelector 
                  selectedWeekStart={selectedWeekStart}
                  onWeekChange={handleWeekChange}
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
                    
                    // Filtrar funcionários que devem ser exibidos na semana selecionada
                    const filteredEmployees = allEmployees.filter(employee => 
                      shouldShowEmployeeInWeek(employee, selectedWeekStart, selectedWeekEnd) && 
                      didEmployeeWorkOnDate(employee)
                    );
                    
                    // Obter os funcionários específicos da semana selecionada (para dias trabalhados)
                    const weekEmployees = employees[formattedSelectedWeekStart] || [];
                    
                    const employeeElements: React.ReactNode[] = [];

                    // Will - funcionário fixo
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
                        const daysWorked = weekEmployee ? weekEmployee.daysWorked : 0;
                        const workedDates = weekEmployee ? weekEmployee.workedDates || [] : [];
                        
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
                                      onClick={() => handleOpenWorkedDaysCalendar(employee.id)}
                                      className="px-3 py-1 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors flex items-center h-8"
                                    >
                                      Days Worked
                                    </button>
                                    <button
                                      onClick={() => handleOpenReceipt(employee.id)}
                                      className="px-2.5 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors h-8"
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

      {currentEmployeeId && (
        <>
          <WorkedDaysCalendar
            isOpen={isWorkedDaysCalendarOpen}
            onOpenChange={setIsWorkedDaysCalendarOpen}
            workedDates={
              (() => {
                const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
                const weekEmployees = employees[formattedSelectedWeekStart] || [];
                const employee = weekEmployees.find(e => e.id === currentEmployeeId);
                return employee?.workedDates || [];
              })()
            }
            onDatesChange={(dates) => {
              const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
              handleWorkedDatesChange(currentEmployeeId, formattedSelectedWeekStart, dates);
            }}
            employeeName={
              (() => {
                const allEmployees = Object.values(employees).flat();
                const employee = allEmployees.find(e => e.id === currentEmployeeId);
                return employee?.name || '';
              })()
            }
          />

          <EmployeeReceipt
            isOpen={isReceiptOpen}
            onOpenChange={setIsReceiptOpen}
            employeeName={
              (() => {
                const allEmployees = Object.values(employees).flat();
                const employee = allEmployees.find(e => e.id === currentEmployeeId);
                return employee?.name || '';
              })()
            }
            dailyRate={
              (() => {
                const allEmployees = Object.values(employees).flat();
                const employee = allEmployees.find(e => e.id === currentEmployeeId);
                return employee?.dailyRate || 250;
              })()
            }
            workedDates={
              (() => {
                const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
                const weekEmployees = employees[formattedSelectedWeekStart] || [];
                const employee = weekEmployees.find(e => e.id === currentEmployeeId);
                return employee?.workedDates || [];
              })()
            }
            weekStartDate={selectedWeekStart}
          />
        </>
      )}
    </>
  );
}

// Branch Deploy: main@7cc2f34

// ... existing code ...