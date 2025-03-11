import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { isSupabaseConfigured } from './lib/supabase';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ExpenseSelector } from './components/ExpenseSelector';
import { ExpenseList } from './components/ExpenseList';
import { AddItemDialog } from './components/AddItemDialog';
import { EditItemDialog } from './components/EditItemDialog';
import { Expense, Item, StorageItems } from './types';
import { loadInitialData, saveData } from './lib/sync';
import { WillItem } from './components/WillItem';
import { WillItemFixed } from './components/WillItemFixed';

export default function App() {
  const [activeCategory, setActiveCategory] = useState<'Expenses' | 'Projects' | 'Stock' | 'Employees'>('Expenses');
  const [selectedList, setSelectedList] = useState<'Carlos' | 'Diego' | 'C&A'>('Carlos');
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({
    'Carlos': [],
    'Diego': [],
    'C&A': []
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [storageData, setStorageData] = useState<StorageItems | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      const data = await loadInitialData();
      if (data) {
        setStorageData(data);
        setExpenses(data.expenses);
      }
    };
    
    loadData();
  }, []);

  // Salvar alterações
  const saveChanges = (newData: StorageItems) => {
    setStorageData(newData);
    saveData(newData);
  };

  // Alternar status de pago
  const handleTogglePaid = (id: string) => {
    const listName = selectedList;
    const list = expenses[listName] || [];
    const index = list.findIndex(item => item.id === id);
    
    if (index !== -1) {
      // Criar uma cópia da despesa e inverter o status de pago
      const updatedExpense = { ...list[index], paid: !list[index].paid };
      
      // Atualizar a lista com a despesa atualizada
      const newExpenses = { ...expenses };
      newExpenses[listName] = [
        ...list.slice(0, index),
        updatedExpense,
        ...list.slice(index + 1)
      ];
      
      // Atualizar o estado
      setExpenses(newExpenses);
      
      // Salvar alterações
      if (storageData) {
        saveChanges({
          ...storageData,
          expenses: newExpenses
        });
      }
    }
  };

  // Adicionar item
  const handleAddItem = (data: Partial<Item>) => {
    if (activeCategory === 'Expenses') {
      const expense = data as Expense;
      const id = Math.random().toString(36).substring(2, 9);
      expense.id = id;
      expense.paid = expense.paid || false;
      
      // Atualizar o estado
      const newExpenses = { ...expenses };
      const listName = selectedList;
      newExpenses[listName] = [...(newExpenses[listName] || []), expense];
      
      setExpenses(newExpenses);
      
      // Salvar alterações
      if (storageData) {
        saveChanges({
          ...storageData,
          expenses: newExpenses
        });
      }
    }
  };

  // Editar item
  const handleEditItem = (item: Expense) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  // Atualizar item
  const handleUpdateItem = (updatedItem: Partial<Item>) => {
    if (activeCategory === 'Expenses' && selectedItem) {
      const listName = selectedList;
      const list = expenses[listName] || [];
      const index = list.findIndex(item => item.id === selectedItem.id);
      
      if (index !== -1) {
        // Criar uma cópia da despesa com as atualizações
        const updatedExpense = { ...list[index], ...updatedItem };
        
        // Atualizar a lista com a despesa atualizada
        const newExpenses = { ...expenses };
        newExpenses[listName] = [
          ...list.slice(0, index),
          updatedExpense,
          ...list.slice(index + 1)
        ];
        
        // Atualizar o estado
        setExpenses(newExpenses);
        
        // Salvar alterações
        if (storageData) {
          saveChanges({
            ...storageData,
            expenses: newExpenses
          });
        }
      }
    }
  };

  // Excluir item
  const handleDeleteItem = (id: string) => {
    const listName = selectedList;
    const list = expenses[listName] || [];
    const index = list.findIndex(item => item.id === id);
    
    if (index !== -1) {
      // Atualizar a lista removendo a despesa
      const newExpenses = { ...expenses };
      newExpenses[listName] = [
        ...list.slice(0, index),
        ...list.slice(index + 1)
      ];
      
      // Atualizar o estado
      setExpenses(newExpenses);
      
      // Salvar alterações
      if (storageData) {
        saveChanges({
          ...storageData,
          expenses: newExpenses
        });
      }
    }
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
      
      // Salvar no Supabase e localmente
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

  return (
    <>
      <div className="bg-gray-50 min-h-screen flex flex-col">
        <Header activeCategory={activeCategory} />

        <Navigation
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        
        {isSupabaseConfigured() && <ConnectionStatus />}
        
        <div className="flex-1 pt-[170px] pb-20">
          <main className="px-4 pb-20">
            {activeCategory === 'Expenses' && (
              <>
                <ExpenseSelector
                  selected={selectedList}
                  onSelect={setSelectedList}
                />
                
                <ExpenseList
                  expenses={expenses[selectedList] || []}
                  onTogglePaid={handleTogglePaid}
                  onEditItem={handleEditItem}
                  onDeleteItem={handleDeleteItem}
                />
                
                <button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="fixed bottom-20 right-4 w-14 h-14 bg-[#5ABB37] rounded-full flex items-center justify-center text-white shadow-lg"
                >
                  <span className="text-2xl">+</span>
                </button>
              </>
            )}
          </main>
        </div>
      </div>
      
      <AddItemDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        category={activeCategory}
        onSubmit={handleAddItem}
      />
      
      <EditItemDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        item={selectedItem}
        onSubmit={handleUpdateItem}
      />
    </>
  );
} 