import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ExpenseItem } from './components/ExpenseItem';
import { Navigation } from './components/Navigation';
import { CalendarButton } from './components/CalendarButton';
import { AddButton } from './components/AddButton';
import { Calendar } from './components/Calendar';
import { AddItemDialog } from './components/AddItemDialog';
import { Expense, Item, Project, StockItem, Employee, EmployeeName, StorageItems, SyncData } from './types';
import { ChevronDown } from 'lucide-react';
import { storage } from './lib/storage';
import { validation } from './lib/validation';
import { syncService, loadInitialData, saveData } from './lib/sync';
import { isSupabaseConfigured } from './lib/supabase';
import { ConnectionStatus } from './components/ConnectionStatus';
import { getData } from './lib/storage';
import { format } from 'date-fns';

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
  const [selectedList, setSelectedList] = useState<ListName>('C&A');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeName>('Matheus');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [showFeedback, setShowFeedback] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const initializeData = async () => {
      if (isSupabaseConfigured()) {
        const supabaseData = await loadInitialData();

        if (supabaseData) {
          setExpenses(supabaseData.expenses || {});
          setProjects(supabaseData.projects || []);
          setStockItems(supabaseData.stock || []);
          setEmployees(supabaseData.employees || {});
        }

        // Configurar sincronização em tempo real
        const cleanup = syncService.setupRealtimeUpdates((data) => {
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
      } else {
        // Carregar dados do armazenamento local
        const localData = storage.load();
        if (localData) {
          setExpenses(localData.expenses || {});
          setProjects(localData.projects || []);
          setStockItems(localData.stock || []);
          setEmployees(localData.employees || {});
        }
      }
    };

    initializeData();

    // Inicializar o serviço de sincronização
    syncService.init();
  }, []);

  // Função para salvar alterações
  const saveChanges = async (newData: StorageItems) => {
    console.log('Salvando alterações...', JSON.stringify(newData));
    setIsSaving(true);
    try {
      // Garantir que estamos salvando no Supabase
      if (isSupabaseConfigured()) {
        console.log('Supabase configurado, salvando dados remotamente...');
        const success = await syncService.sync(newData);
        if (success) {
          console.log('Dados salvos com sucesso no Supabase');
          setShowFeedback({ show: true, message: 'Dados salvos com sucesso!', type: 'success' });
        } else {
          console.error('Falha ao salvar dados no Supabase');
          setShowFeedback({ show: true, message: 'Erro ao salvar dados!', type: 'error' });
        }
      } else {
        console.log('Supabase não configurado, salvando apenas localmente');
        // Salvar localmente
        saveData(newData);
        setShowFeedback({ show: true, message: 'Dados salvos localmente!', type: 'success' });
      }
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

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
  };

  const handleAddItem = (data: Partial<Item>) => {
    console.log("Função handleAddItem chamada com dados:", JSON.stringify(data));
    console.log("Lista selecionada:", selectedList);

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

      // Formatar a data da semana
      const weekStartDate = format(selectedWeekStart, 'yyyy-MM-dd');
      employee.weekStartDate = weekStartDate;

      // Atualizar o estado
      setEmployees(prevEmployees => {
        console.log("Estado atual de employees:", JSON.stringify(prevEmployees));
        
        const newEmployees = { ...prevEmployees };
        const weekKey = weekStartDate;
        const currentList = prevEmployees[weekKey] || [];

        if (!newEmployees[weekKey]) {
          console.log(`Semana ${weekKey} não encontrada, inicializando...`);
          newEmployees[weekKey] = [];
        }

        newEmployees[weekKey] = [...currentList, employee];
        console.log(`Funcionário adicionado à semana ${weekKey}:`, JSON.stringify(employee));
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
    
    const storageData = storage.getData();
    storageData.expenses = expenses;
    storageData.projects = projects;
    storageData.stock = stockItems;
    storageData.employees = employees;
    storageData.lastSync = Date.now();
    
    // Usar saveChanges para salvar os dados
    saveChanges(storageData);
  };

  const handleEmployeeSelect = (value: EmployeeName) => {
    setSelectedEmployee(value);
    
    const storageData = storage.getData();
    storageData.expenses = expenses;
    storageData.projects = projects;
    storageData.stock = stockItems;
    storageData.employees = employees;
    storageData.lastSync = Date.now();
    
    // Usar saveChanges para salvar os dados
    saveChanges(storageData);
  };

  const handleAddDay = (employeeId: string, employeeName: string) => {
    setEmployees(prevEmployees => {
      const newEmployees = { ...prevEmployees };
      let employeeFound = false;
      let updatedEmployee = null;
      
      for (const [weekStartDate, weekEmployees] of Object.entries(newEmployees)) {
        const employeeIndex = weekEmployees.findIndex(e => e.id === employeeId);
        
        if (employeeIndex !== -1) {
          updatedEmployee = { ...weekEmployees[employeeIndex] };
          updatedEmployee.daysWorked += 1;
          
          const updatedWeekEmployees = [...weekEmployees];
          updatedWeekEmployees[employeeIndex] = updatedEmployee;
          newEmployees[weekStartDate] = updatedWeekEmployees;
          
          employeeFound = true;
          break;
        }
      }
      
      if (!employeeFound) {
        console.error(`Funcionário com ID ${employeeId} não encontrado`);
        return prevEmployees;
      }
      
      const storageData = storage.getData();
      storageData.employees = newEmployees;
      storageData.lastSync = Date.now();
      
      if (isSupabaseConfigured()) {
        saveData(storageData);
      } else {
        storage.saveData(storageData);
      }
      
      return newEmployees;
    });
  };

  const handleResetEmployee = (employeeId: string, employeeName: string) => {
    setEmployees(prevEmployees => {
      const newEmployees = { ...prevEmployees };
      let employeeFound = false;
      let updatedEmployee = null;
      
      for (const [weekStartDate, weekEmployees] of Object.entries(newEmployees)) {
        const employeeIndex = weekEmployees.findIndex(e => e.id === employeeId);
        
        if (employeeIndex !== -1) {
          updatedEmployee = { ...weekEmployees[employeeIndex] };
          updatedEmployee.daysWorked = 0;
          
          const updatedWeekEmployees = [...weekEmployees];
          updatedWeekEmployees[employeeIndex] = updatedEmployee;
          newEmployees[weekStartDate] = updatedWeekEmployees;
          
          employeeFound = true;
          break;
        }
      }
      
      if (!employeeFound) {
        console.error(`Funcionário com ID ${employeeId} não encontrado`);
        return prevEmployees;
      }
      
      const storageData = storage.getData();
      storageData.employees = newEmployees;
      storageData.lastSync = Date.now();
      
      if (isSupabaseConfigured()) {
        saveData(storageData);
      } else {
        storage.saveData(storageData);
      }
      
      return newEmployees;
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Header activeCategory={activeCategory} />
        <Navigation
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        
        {(activeCategory === 'Expenses') && (
          <div className="fixed top-[170px] left-0 right-0 px-4 z-10 bg-gray-50">
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
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
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
          <div className="fixed top-[170px] left-0 right-0 px-4 z-10 bg-gray-50">
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

        <main className={`px-4 pb-20 ${
          activeCategory === 'Projects' || activeCategory === 'Stock'
            ? 'mt-[170px]'
            : 'mt-[234px]'
        }`}>
          <div className="space-y-2 max-w-[800px] mx-auto">
            {activeCategory === 'Expenses' && expenses[selectedList]?.map(expense => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                onTogglePaid={handleTogglePaid}
              />
            ))}
            {activeCategory === 'Projects' && projects.map(project => (
              <div key={project.id} className="bg-white p-4 rounded-lg shadow-sm">
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
            ))}
            {activeCategory === 'Stock' && stockItems.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{item.name}</h3>
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              </div>
            ))}
            {activeCategory === 'Employees' && (
              <>
                {/* Debug: Mostrar todas as chaves de funcionários */}
                <div className="bg-gray-100 p-2 mb-4 rounded text-xs">
                  <p>Debug - Chaves de funcionários: {Object.keys(employees).join(', ')}</p>
                  <p>Data da semana selecionada: {format(selectedWeekStart, 'yyyy-MM-dd')}</p>
                </div>
                
                {Object.entries(employees).map(([weekKey, employeeList]) => {
                  console.log(`Renderizando funcionários da semana ${weekKey}, total: ${employeeList.length}`);
                  
                  // Filtrar funcionários pela semana selecionada
                  const filteredEmployees = employeeList.filter(employee => {
                    const employeeWeekStart = new Date(employee.weekStartDate);
                    const selectedWeekStartDate = new Date(selectedWeekStart);
                    
                    const isSameWeek = 
                      employeeWeekStart.getFullYear() === selectedWeekStartDate.getFullYear() &&
                      employeeWeekStart.getMonth() === selectedWeekStartDate.getMonth() &&
                      employeeWeekStart.getDate() === selectedWeekStartDate.getDate();
                    
                    console.log(`Funcionário ${employee.name}, semana ${employee.weekStartDate}, mesma semana: ${isSameWeek}`);
                    return isSameWeek;
                  });
                  
                  console.log(`Funcionários filtrados: ${filteredEmployees.length}`);
                  
                  return filteredEmployees.map(employee => (
                    <div key={employee.id} className="bg-white p-2.5 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-xl font-bold text-gray-800">{employee.name}</h3>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAddDay(employee.id, weekKey)}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors flex items-center"
                          >
                            +1 Day
                          </button>
                          <button
                            onClick={() => handleResetEmployee(employee.id, weekKey)}
                            className="px-2.5 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 text-sm">Days Worked:</span>
                          <span className="text-xl font-bold text-gray-900">{employee.daysWorked}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 text-sm">Amount to Receive:</span>
                          <span className="text-xl font-bold text-[#5ABB37]">
                            $ {(employee.daysWorked * 250).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ));
                })}
              </>
            )}
          </div>
        </main>

        <AddButton onClick={() => setIsAddDialogOpen(true)} />
        
        <AddItemDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          category={activeCategory}
          onSubmit={handleAddItem}
          selectedWeekStart={selectedWeekStart}
        />

        {isSupabaseConfigured() && <ConnectionStatus />}
      </div>
    </>
  );
}