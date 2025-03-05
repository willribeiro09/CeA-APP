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
    try {
      const success = await syncService.sync(newData);
      
      if (success === false) {
        console.error('Erro ao salvar alterações');
        // Adicionar feedback visual de erro
      }
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      // Adicionar feedback visual de erro
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
    console.log("Função handleAddItem chamada com dados:", data);
    let validationError = null;
    
    if (activeCategory === 'Expenses') {
      validationError = validation.expense(data as Partial<Expense>);
    } else if (activeCategory === 'Projects') {
      validationError = validation.project(data as Partial<Project>);
    } else if (activeCategory === 'Stock') {
      validationError = validation.stockItem(data as Partial<StockItem>);
    } else if (activeCategory === 'Employees') {
      validationError = validation.employee(data as Partial<Employee>);
    }
    
    if (validationError) {
      console.error("Erro de validação:", validationError);
      return;
    }

    console.log("Dados recebidos para adicionar:", data, "Categoria:", activeCategory);
    const timestamp = Date.now();

    if (activeCategory === 'Expenses') {
      setExpenses(prevExpenses => {
        console.log("Estado anterior de despesas:", prevExpenses);
        const currentList = prevExpenses[selectedList] || [];
        const newExpense = { ...data, id: crypto.randomUUID() } as Expense;
        console.log("Nova despesa a ser adicionada:", newExpense);
        
        const newExpenses = {
          ...prevExpenses,
          [selectedList]: [...currentList, newExpense]
        };
        
        console.log("Novas despesas:", newExpenses);
        const storageData: StorageItems = {
          expenses: newExpenses,
          projects,
          stock: stockItems,
          employees,
          lastSync: timestamp
        };
        
        // Usar saveChanges para salvar os dados
        saveChanges(storageData);
        
        return newExpenses;
      });
    } else if (activeCategory === 'Projects') {
      setProjects(prevProjects => {
        console.log("Estado anterior de projetos:", prevProjects);
        const newProject = { ...data, id: crypto.randomUUID() } as Project;
        console.log("Novo projeto a ser adicionado:", newProject);
        
        const newProjects = [...prevProjects, newProject];
        
        console.log("Novos projetos:", newProjects);
        const storageData: StorageItems = {
          expenses,
          projects: newProjects,
          stock: stockItems,
          employees,
          lastSync: timestamp
        };
        
        // Usar saveChanges para salvar os dados
        saveChanges(storageData);
        
        return newProjects;
      });
    } else if (activeCategory === 'Stock') {
      setStockItems(prevStockItems => {
        console.log("Estado anterior de estoque:", prevStockItems);
        const newStockItem = { ...data, id: crypto.randomUUID() } as StockItem;
        console.log("Novo item de estoque a ser adicionado:", newStockItem);
        
        const newStockItems = [...prevStockItems, newStockItem];
        
        console.log("Novos itens de estoque:", newStockItems);
        const storageData: StorageItems = {
          expenses,
          projects,
          stock: newStockItems,
          employees,
          lastSync: timestamp
        };
        
        // Usar saveChanges para salvar os dados
        saveChanges(storageData);
        
        return newStockItems;
      });
    } else if (activeCategory === 'Employees') {
      setEmployees(prevEmployees => {
        console.log("Estado anterior de funcionários:", prevEmployees);
        // Garantir que employeeName seja definido
        const employeeData = {
          ...data,
          id: crypto.randomUUID(),
          employeeName: selectedEmployee,
          weekStartDate: selectedWeekStart.toISOString(),
          daysWorked: 0
        } as Employee;
        
        console.log("Dados do funcionário:", employeeData);
        
        const weekKey = selectedWeekStart.toISOString().split('T')[0];
        const currentList = prevEmployees[weekKey] || [];
        const newEmployees = {
          ...prevEmployees,
          [weekKey]: [...currentList, employeeData]
        };
        
        console.log("Novos funcionários:", newEmployees);
        const storageData: StorageItems = {
          expenses,
          projects,
          stock: stockItems,
          employees: newEmployees,
          lastSync: timestamp
        };
        
        // Usar saveChanges para salvar os dados
        saveChanges(storageData);
        
        return newEmployees;
      });
    }
    console.log("Fechando diálogo de adição");
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