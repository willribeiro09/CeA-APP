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

type ListName = 'Carlos' | 'Diego' | 'C&A';

const initialExpenses: Record<ListName, Expense[]> = {
  'Carlos': [],
  'Diego': [],
  'C&A': []
};

const initialEmployees: Record<string, Employee[]> = {};

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
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [showFeedback, setShowFeedback] = useState({ show: false, message: '', type: 'success' });
  const [willBaseRate, setWillBaseRate] = useState(200);
  const [willBonus, setWillBonus] = useState(0);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [showLayoffAlert, setShowLayoffAlert] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      console.log('Inicializando dados...');
      
      // Carregar dados iniciais
      const localData = await loadInitialData();

      if (localData) {
        console.log('Dados carregados do armazenamento local');
        setExpenses(localData.expenses || {});
        setProjects(localData.projects || []);
        setStockItems(localData.stock || []);
        setEmployees(localData.employees || {});
      } else {
        console.log('Nenhum dado encontrado no armazenamento local');
      }

      // Configurar sincronização em tempo real
      syncService.init();
      const cleanup = syncService.setupRealtimeUpdates((data) => {
        console.log('Recebida atualização em tempo real:', data);
        if (data) {
          setExpenses(data.expenses || {});
          setProjects(data.projects || []);
          setStockItems(data.stock || []);
          setEmployees(data.employees || {});
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

  // Função para salvar alterações
  const saveChanges = async (newData: StorageItems) => {
    console.log('Salvando alterações...', JSON.stringify(newData));
    setIsSaving(true);
    try {
      // Salvar dados
      await saveData(newData);
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
        
        // Salvar as alterações
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
        
        // Salvar as alterações
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
        
        // Salvar as alterações
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
        
        // Procurar e remover o funcionário em todas as semanas
        Object.keys(newEmployees).forEach(weekStartDate => {
          newEmployees[weekStartDate] = newEmployees[weekStartDate].filter(
            employee => employee.id !== id
          );
        });
        
        // Salvar as alterações
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
    
    // Verificar o tipo do item usando propriedades específicas
    if ('description' in updatedItem) {
      // É uma despesa
      setExpenses(prevExpenses => {
        const newExpenses = { ...prevExpenses };
        
        // Procurar e atualizar a despesa em todas as listas
        Object.keys(newExpenses).forEach(listName => {
          const index = newExpenses[listName as ListName].findIndex(expense => expense.id === updatedItem.id);
          if (index !== -1) {
            newExpenses[listName as ListName][index] = updatedItem as Expense;
          }
        });
        
        // Salvar as alterações
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
    } else if ('client' in updatedItem) {
      // É um projeto
      setProjects(prevProjects => {
        const index = prevProjects.findIndex(project => project.id === updatedItem.id);
        if (index === -1) return prevProjects;
        
        const newProjects = [...prevProjects];
        newProjects[index] = updatedItem as Project;
        
        // Salvar as alterações
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
    } else if ('quantity' in updatedItem) {
      // É um item de estoque
      setStockItems(prevStockItems => {
        const index = prevStockItems.findIndex(item => item.id === updatedItem.id);
        if (index === -1) return prevStockItems;
        
        const newStockItems = [...prevStockItems];
        newStockItems[index] = updatedItem as StockItem;
        
        // Salvar as alterações
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
    } else if ('employeeName' in updatedItem) {
      // É um funcionário
      setEmployees(prevEmployees => {
        const newEmployees = { ...prevEmployees };
        
        // Procurar e atualizar o funcionário em todas as semanas
        Object.keys(newEmployees).forEach(weekStartDate => {
          const index = newEmployees[weekStartDate].findIndex(employee => employee.id === updatedItem.id);
          if (index !== -1) {
            newEmployees[weekStartDate][index] = updatedItem as Employee;
          }
        });
        
        // Salvar as alterações
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

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
  };

  const handleAddItem = (data: Partial<Item>) => {
    console.log("Função handleAddItem chamada com dados:", JSON.stringify(data));
    console.log("Lista selecionada:", selectedList);
    console.log("Data da semana selecionada:", format(selectedWeekStart, 'yyyy-MM-dd'));

    // Gerar um ID único para o novo item
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

        // Salvar as alterações
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

        // Salvar as alterações
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

        // Salvar as alterações
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

        // Salvar as alterações
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

    // Fechar o diálogo após adicionar o item
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
    console.log(`Adicionando dia para funcionário ${employeeId} na semana ${weekStartDate}`);
    
    setEmployees(prevEmployees => {
      const newEmployees = { ...prevEmployees };
      
      // Verificar se a semana existe
      if (!newEmployees[weekStartDate]) {
        console.error(`Semana ${weekStartDate} não encontrada`);
        return prevEmployees;
      }
      
      // Encontrar o funcionário na semana
      const employeeIndex = newEmployees[weekStartDate].findIndex(e => e.id === employeeId);
      
      if (employeeIndex === -1) {
        console.error(`Funcionário com ID ${employeeId} não encontrado na semana ${weekStartDate}`);
        return prevEmployees;
      }
      
      // Atualizar os dias trabalhados
      const updatedEmployee = { ...newEmployees[weekStartDate][employeeIndex] };
      updatedEmployee.daysWorked += 1;
      
      // Atualizar a lista de funcionários
      newEmployees[weekStartDate] = [
        ...newEmployees[weekStartDate].slice(0, employeeIndex),
        updatedEmployee,
        ...newEmployees[weekStartDate].slice(employeeIndex + 1)
      ];
      
      console.log(`Funcionário ${updatedEmployee.name} atualizado: ${updatedEmployee.daysWorked} dias trabalhados`);
      
      // Salvar as alterações
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
  };

  const handleResetEmployee = (employeeId: string, weekStartDate: string) => {
    console.log(`Resetando dias para funcionário ${employeeId} na semana ${weekStartDate}`);
    
    setEmployees(prevEmployees => {
      const newEmployees = { ...prevEmployees };
      
      // Verificar se a semana existe
      if (!newEmployees[weekStartDate]) {
        console.error(`Semana ${weekStartDate} não encontrada`);
        return prevEmployees;
      }
      
      // Encontrar o funcionário na semana
      const employeeIndex = newEmployees[weekStartDate].findIndex(e => e.id === employeeId);
      
      if (employeeIndex === -1) {
        console.error(`Funcionário com ID ${employeeId} não encontrado na semana ${weekStartDate}`);
        return prevEmployees;
      }
      
      // Resetar os dias trabalhados
      const updatedEmployee = { ...newEmployees[weekStartDate][employeeIndex] };
      updatedEmployee.daysWorked = 0;
      
      // Atualizar a lista de funcionários
      newEmployees[weekStartDate] = [
        ...newEmployees[weekStartDate].slice(0, employeeIndex),
        updatedEmployee,
        ...newEmployees[weekStartDate].slice(employeeIndex + 1)
      ];
      
      console.log(`Funcionário ${updatedEmployee.name} resetado: ${updatedEmployee.daysWorked} dias trabalhados`);
      
      // Salvar as alterações
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
  };

  const resetWillValues = () => {
    setWillBaseRate(200);
    setWillBonus(0);
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
            <div className="sticky top-[170px] left-0 right-0 px-4 z-30 bg-gray-50 mb-4">
              <div className="relative max-w-[800px] mx-auto pb-4">
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
          
          {(activeCategory === 'Employees') && (
            <div className="sticky top-[170px] left-0 right-0 px-4 z-30 bg-gray-50 mb-4">
              <div className="relative max-w-[800px] mx-auto pb-4">
                <div className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between">
                  <span className="text-gray-700 font-medium">
                    Week Starting:
                  </span>
                  <input
                    type="date"
                    value={selectedWeekStart.toISOString().split('T')[0]}
                    onChange={(e) => setSelectedWeekStart(new Date(e.target.value))}
                    className="border-gray-300 rounded-md shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
          </div>
        </div>
      )}
      
      <main className="px-4 pb-20">
            <div className="space-y-2 max-w-[800px] mx-auto relative z-0">
              {activeCategory === 'Expenses' && expenses[selectedList]?.map(expense => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              onTogglePaid={handleTogglePaid}
                  onDelete={(id) => handleDeleteItem(id, 'Expenses')}
                  onEdit={(expense) => handleEditItem(expense)}
            />
          ))}
              {activeCategory === 'Projects' && projects.map(project => (
                <SwipeableItem 
                  key={project.id}
                  onDelete={() => handleDeleteItem(project.id, 'Projects')}
                  onEdit={() => handleEditItem(project)}
                >
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{project.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-gray-500">
                        Start: {new Date(project.startDate).toLocaleDateString('en-US')}
                      </span>
                      <span className={`text-sm px-2 py-0.5 rounded ${
                        project.status === 'completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status === 'completed' ? 'Completed' :
                         project.status === 'in_progress' ? 'In Progress' :
                         'Pending'}
                      </span>
                    </div>
                  </div>
                </SwipeableItem>
              ))}
              {activeCategory === 'Stock' && stockItems.map(item => (
                <SwipeableItem 
                  key={item.id}
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
              ))}
              {activeCategory === 'Employees' && (
                <>
                  {(() => {
                    const formattedSelectedWeekStart = format(selectedWeekStart, 'yyyy-MM-dd');
                    const weekEmployees = employees[formattedSelectedWeekStart] || [];
                    const employeeElements = [];

                    // Will - funcionário fixo
                    employeeElements.push(
                      <SwipeableItem 
                        key="will-fixed"
                        onDelete={resetWillValues}
                        onEdit={() => {
                          setShowLayoffAlert(true);
                        }}
                        showEditButton={true}
                        customEditButton={
                          <button
                            className="h-full w-[90px] bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center"
                          >
                            Lay off
                          </button>
                        }
                        isWill={true}
                      >
                        <div className="bg-white p-2.5 rounded-lg shadow-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <h3 className="text-xl font-bold text-gray-800">Will</h3>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setIsRateDialogOpen(true)}
                                className="px-4 py-1 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors flex items-center h-8"
                              >
                                Increase
                              </button>
                              <button
                                onClick={() => setWillBonus(prev => prev + 100)}
                                className="px-2.5 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors h-8"
                              >
                                BONUS
                              </button>
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 text-sm">Dias Trabalhados:</span>
                              <span className="text-xl font-bold text-gray-900">7</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 text-sm">Valor a Receber:</span>
                              <span className="text-xl font-bold text-[#5ABB37]">
                                $ {(willBaseRate + willBonus).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {willBonus > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-sm">Bônus:</span>
                                <span className="text-sm font-semibold text-blue-500">
                                  $ {willBonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </SwipeableItem>
                    );

                    // Outros funcionários
                    weekEmployees.forEach(employee => {
                      employeeElements.push(
                        <SwipeableItem 
                          key={employee.id}
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
                                <span className="text-gray-700 text-sm">Dias Trabalhados:</span>
                                <span className="text-xl font-bold text-gray-900">{employee.daysWorked}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-sm">Valor a Receber:</span>
                                <span className="text-xl font-bold text-[#5ABB37]">
                                  $ {((employee.daysWorked * (employee.dailyRate || 250))).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-sm">Valor por Dia:</span>
                                <span className="text-sm text-gray-600">
                                  $ {(employee.dailyRate || 250).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </SwipeableItem>
                      );
                    });

                    return employeeElements;
                  })()}

                  <Dialog.Root open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
                    <Dialog.Portal>
                      <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                      <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-md z-50">
                        <div className="flex justify-between items-center mb-4">
                          <Dialog.Title className="text-lg font-semibold">
                            Ajustar Valor Base
                          </Dialog.Title>
                          <Dialog.Close className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                          </Dialog.Close>
                        </div>
                        
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target as HTMLFormElement);
                            const newBaseRate = parseFloat(formData.get('baseRate') as string);
                            if (!isNaN(newBaseRate) && newBaseRate >= 200) {
                              setWillBaseRate(newBaseRate);
                              setIsRateDialogOpen(false);
                            } else {
                              alert('Por favor, insira um valor maior ou igual a $200');
                            }
                          }} 
                          className="space-y-4"
                        >
                          <div>
                            <label htmlFor="baseRate" className="block text-sm font-medium text-gray-700">
                              Novo Valor Base (mínimo $200)
                            </label>
                            <input
                              type="number"
                              id="baseRate"
                              name="baseRate"
                              defaultValue={willBaseRate}
                              min="200"
                              step="1"
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                            />
                          </div>
                          
                          <div className="flex justify-end gap-3 mt-6">
                            <Dialog.Close className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800">
                              Cancelar
                            </Dialog.Close>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-[#5ABB37] text-white rounded-md text-sm font-medium hover:bg-[#4a9e2e] transition-colors"
                            >
                              Confirmar
                            </button>
                          </div>
                        </form>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                </>
              )}
            </div>
          </main>
        </div>

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
      </div>

      <Dialog.Root open={showLayoffAlert} onOpenChange={setShowLayoffAlert}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-8 shadow-xl w-[90%] max-w-md z-50">
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
    </>
  );
}