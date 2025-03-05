import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ExpenseItem } from './components/ExpenseItem';
import { Navigation } from './components/Navigation';
import { CalendarButton } from './components/CalendarButton';
import { AddButton } from './components/AddButton';
import { Calendar } from './components/Calendar';
import { AddItemDialog } from './components/AddItemDialog';
import { Expense, Item, Project, StockItem, Employee, EmployeeName } from './types';
import { ChevronDown } from 'lucide-react';
import { storage } from './lib/storage';
import { validation } from './lib/validation';
import { syncService, loadInitialData, saveData, InitSyncFunction } from './lib/sync';
import { isSupabaseConfigured } from './lib/supabase';
import { ConnectionStatus } from './components/ConnectionStatus';

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

  useEffect(() => {
    console.log('useEffect principal iniciado');
    const loadData = async () => {
      console.log('Carregando dados...');
      try {
        if (isSupabaseConfigured()) {
          console.log('Supabase configurado, carregando dados do Supabase...');
          const supabaseData = await loadInitialData();
          
          if (supabaseData) {
            setExpenses(supabaseData.items.expenses);
            setProjects(supabaseData.items.projects);
            setStockItems(supabaseData.items.stock);
            setEmployees(supabaseData.items.employees);
            return;
          }
        }
        
        const storageData = storage.getData();
        setExpenses(storageData.items.expenses);
        setProjects(storageData.items.projects);
        setStockItems(storageData.items.stock);
        setEmployees(storageData.items.employees);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    loadData();

    let cleanupSync: (() => void) | undefined;
    
    if (isSupabaseConfigured()) {
      console.log('Iniciando sincronização em tempo real...');
      try {
        const initSync: InitSyncFunction = syncService();
        cleanupSync = initSync(
          (newExpenses: Record<string, Expense[]>) => setExpenses(newExpenses),
          (newProjects: Project[]) => setProjects(newProjects),
          (newStock: StockItem[]) => setStockItems(newStock),
          (newEmployees: Record<string, Employee[]>) => setEmployees(newEmployees)
        );
        
        console.log('Sincronização em tempo real iniciada com sucesso.');
      } catch (error) {
        console.error('Erro ao iniciar sincronização em tempo real:', error);
      }
    }

    return () => {
      console.log('Limpando efeito...');
      if (cleanupSync) {
        console.log('Limpando sincronização em tempo real...');
        cleanupSync();
      }
    };
  }, []);

  const handleTogglePaid = (id: string) => {
    setExpenses(prevExpenses => {
      const newExpenses = {
        ...prevExpenses,
        [selectedList]: prevExpenses[selectedList].map(expense =>
          expense.id === id ? { ...expense, paid: !expense.paid } : expense
        )
      };
      
      const data = storage.getData();
      data.items.expenses = newExpenses;
      
      if (isSupabaseConfigured()) {
        saveData(data);
      } else {
        storage.saveData(data);
      }
      
      return newExpenses;
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
  };

  const handleAddItem = (data: Partial<Item>) => {
    const validationResult = validation.validateItem(data);
    
    if (!validationResult.isValid) {
      return;
    }

    if (activeCategory === 'Expenses') {
      setExpenses(prevExpenses => {
        const currentList = prevExpenses[selectedList] || [];
        const newExpenses = {
          ...prevExpenses,
          [selectedList]: [...currentList, { ...data, id: crypto.randomUUID() } as Expense]
        };
        
        const storageData = { 
          items: {
            expenses: newExpenses,
            projects,
            stock: stockItems,
            employees
          }
        };
        
        if (isSupabaseConfigured()) {
          saveData(storageData);
        } else {
          storage.saveData(storageData);
        }
        
        return newExpenses;
      });
    } else if (activeCategory === 'Projects') {
      setProjects(prevProjects => {
        const newProjects = [...prevProjects, { ...data, id: crypto.randomUUID() } as Project];
        
        const storageData = { 
          items: {
            expenses,
            projects: newProjects,
            stock: stockItems,
            employees
          }
        };
        
        if (isSupabaseConfigured()) {
          saveData(storageData);
        } else {
          storage.saveData(storageData);
        }
        
        return newProjects;
      });
    } else if (activeCategory === 'Stock') {
      setStockItems(prevStockItems => {
        const newStockItems = [...prevStockItems, { ...data, id: crypto.randomUUID() } as StockItem];
        
        const storageData = { 
          items: {
            expenses,
            projects,
            stock: newStockItems,
            employees
          }
        };
        
        if (isSupabaseConfigured()) {
          saveData(storageData);
        } else {
          storage.saveData(storageData);
        }
        
        return newStockItems;
      });
    } else if (activeCategory === 'Employees') {
      setEmployees(prevEmployees => {
        const currentList = prevEmployees[selectedEmployee] || [];
        const newEmployees = {
          ...prevEmployees,
          [selectedEmployee]: [...currentList, { ...data, id: crypto.randomUUID() } as Employee]
        };
        
        const storageData = { 
          items: {
            expenses,
            projects,
            stock: stockItems,
            employees: newEmployees
          }
        };
        
        if (isSupabaseConfigured()) {
          saveData(storageData);
        } else {
          storage.saveData(storageData);
        }
        
        return newEmployees;
      });
    }
    setIsAddDialogOpen(false);
  };

  const handleListSelect = (value: ListName) => {
    setSelectedList(value);
    setIsDropdownOpen(false);
    
    const storageData = storage.getData();
    storageData.items.expenses = expenses;
    storageData.items.projects = projects;
    storageData.items.stock = stockItems;
    storageData.items.employees = employees;
    
    if (isSupabaseConfigured()) {
      saveData(storageData);
    } else {
      storage.saveData(storageData);
    }
  };

  const handleEmployeeSelect = (value: EmployeeName) => {
    setSelectedEmployee(value);
    setIsDropdownOpen(false);
  };

  const handleAddDay = (employeeId: string, employeeName: string) => {
    setEmployees(prevEmployees => {
      // Cria uma cópia profunda do objeto de funcionários
      const newEmployees = { ...prevEmployees };
      
      // Procura o funcionário em todas as semanas
      let employeeFound = false;
      let updatedEmployee = null;
      
      // Itera sobre todas as semanas
      for (const [weekStartDate, weekEmployees] of Object.entries(newEmployees)) {
        const employeeIndex = weekEmployees.findIndex(e => e.id === employeeId);
        
        if (employeeIndex !== -1) {
          // Cria uma cópia do funcionário
          updatedEmployee = { ...weekEmployees[employeeIndex] };
          updatedEmployee.daysWorked += 1;
          
          // Atualiza o array de funcionários da semana
          const updatedWeekEmployees = [...weekEmployees];
          updatedWeekEmployees[employeeIndex] = updatedEmployee;
          newEmployees[weekStartDate] = updatedWeekEmployees;
          
          employeeFound = true;
          break;
        }
      }
      
      // Se o funcionário não foi encontrado, registra um erro
      if (!employeeFound) {
        console.error(`Funcionário com ID ${employeeId} não encontrado`);
        return prevEmployees;
      }
      
      // Atualiza o armazenamento
      const storageData = storage.getData();
      storageData.items.employees = newEmployees;
      
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
      // Cria uma cópia profunda do objeto de funcionários
      const newEmployees = { ...prevEmployees };
      
      // Procura o funcionário em todas as semanas
      let employeeFound = false;
      let updatedEmployee = null;
      
      // Itera sobre todas as semanas
      for (const [weekStartDate, weekEmployees] of Object.entries(newEmployees)) {
        const employeeIndex = weekEmployees.findIndex(e => e.id === employeeId);
        
        if (employeeIndex !== -1) {
          // Cria uma cópia do funcionário
          updatedEmployee = { ...weekEmployees[employeeIndex] };
          updatedEmployee.daysWorked = 0;
          
          // Atualiza o array de funcionários da semana
          const updatedWeekEmployees = [...weekEmployees];
          updatedWeekEmployees[employeeIndex] = updatedEmployee;
          newEmployees[weekStartDate] = updatedWeekEmployees;
          
          employeeFound = true;
          break;
        }
      }
      
      // Se o funcionário não foi encontrado, registra um erro
      if (!employeeFound) {
        console.error(`Funcionário com ID ${employeeId} não encontrado`);
        return prevEmployees;
      }
      
      // Atualiza o armazenamento
      const storageData = storage.getData();
      storageData.items.employees = newEmployees;
      
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
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Quantity: {item.quantity}
                </p>
              </div>
            ))}
            {activeCategory === 'Employees' && Object.entries(employees).map(([employeeName, employeeList]) => 
              employeeList
                .filter(employee => {
                  const employeeWeekStart = new Date(employee.weekStartDate);
                  const selectedWeekStartDate = new Date(selectedWeekStart);
                  return employeeWeekStart.getFullYear() === selectedWeekStartDate.getFullYear() &&
                         employeeWeekStart.getMonth() === selectedWeekStartDate.getMonth() &&
                         employeeWeekStart.getDate() === selectedWeekStartDate.getDate();
                })
                .map(employee => (
                  <div key={employee.id} className="bg-white p-2.5 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-xl font-bold text-gray-800">{employee.employeeName}</h3>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAddDay(employee.id, employeeName)}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors flex items-center"
                        >
                          +1 Day
                        </button>
                        <button
                          onClick={() => handleResetEmployee(employee.id, employeeName)}
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
                ))
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