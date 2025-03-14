import { useState, useCallback, useEffect } from 'react';
import { Expense } from '../types';
import { formatDateISO, isDateInRange } from '../utils/dateUtils';
import { getData, saveData } from '../utils/storageUtils';

/**
 * Hook para gerenciar as despesas
 */
export function useExpenses() {
  // Estado para armazenar as despesas
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});
  
  // Carrega as despesas do armazenamento local
  useEffect(() => {
    const data = getData();
    if (data && data.expenses) {
      setExpenses(data.expenses);
    }
  }, []);
  
  // Calcula o total de despesas em um intervalo de datas
  const calculateTotal = useCallback((startDate: Date, endDate: Date): number => {
    let total = 0;
    
    // Converte as datas para o formato ISO para comparação
    const start = formatDateISO(startDate);
    const end = formatDateISO(endDate);
    
    // Percorre todas as semanas
    Object.values(expenses).forEach(weekExpenses => {
      // Filtra as despesas que estão dentro do intervalo de datas
      const filteredExpenses = weekExpenses.filter(expense => 
        isDateInRange(new Date(expense.date), new Date(start), new Date(end))
      );
      
      // Soma os valores das despesas filtradas
      total += filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    });
    
    return total;
  }, [expenses]);
  
  // Adiciona uma nova despesa
  const addExpense = useCallback((week: string, expense: Partial<Expense>): void => {
    // Verifica se todos os campos obrigatórios estão preenchidos
    if (!expense.description || !expense.amount || !expense.date || !expense.category) {
      console.error('Dados incompletos para adicionar despesa');
      return;
    }
    
    setExpenses(prevExpenses => {
      // Cria um novo objeto para evitar mutação do estado anterior
      const updatedExpenses = { ...prevExpenses };
      
      // Inicializa a semana se não existir
      if (!updatedExpenses[week]) {
        updatedExpenses[week] = [];
      }
      
      // Adiciona a nova despesa com um ID único
      const newExpense: Expense = {
        id: Date.now().toString(),
        description: expense.description!,
        amount: expense.amount!,
        date: expense.date!,
        category: expense.category!,
        paid: expense.paid || false
      };
      
      updatedExpenses[week].push(newExpense);
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        expenses: updatedExpenses
      });
      
      return updatedExpenses;
    });
  }, []);
  
  // Atualiza uma despesa existente
  const updateExpense = useCallback((week: string, id: string, updatedExpense: Partial<Expense>): void => {
    setExpenses(prevExpenses => {
      // Verifica se a semana existe
      if (!prevExpenses[week]) {
        console.error(`Semana ${week} não encontrada`);
        return prevExpenses;
      }
      
      // Encontra o índice da despesa
      const expenseIndex = prevExpenses[week].findIndex(expense => expense.id === id);
      
      // Verifica se a despesa existe
      if (expenseIndex === -1) {
        console.error(`Despesa com ID ${id} não encontrada na semana ${week}`);
        return prevExpenses;
      }
      
      // Cria um novo objeto para evitar mutação do estado anterior
      const updatedExpenses = { ...prevExpenses };
      
      // Atualiza a despesa
      updatedExpenses[week][expenseIndex] = {
        ...updatedExpenses[week][expenseIndex],
        ...updatedExpense
      };
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        expenses: updatedExpenses
      });
      
      return updatedExpenses;
    });
  }, []);
  
  // Remove uma despesa
  const deleteExpense = useCallback((week: string, id: string): void => {
    setExpenses(prevExpenses => {
      // Verifica se a semana existe
      if (!prevExpenses[week]) {
        console.error(`Semana ${week} não encontrada`);
        return prevExpenses;
      }
      
      // Cria um novo objeto para evitar mutação do estado anterior
      const updatedExpenses = { ...prevExpenses };
      
      // Remove a despesa
      updatedExpenses[week] = updatedExpenses[week].filter(expense => expense.id !== id);
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        expenses: updatedExpenses
      });
      
      return updatedExpenses;
    });
  }, []);
  
  // Alterna o status de pagamento de uma despesa
  const togglePaid = useCallback((week: string, id: string): void => {
    setExpenses(prevExpenses => {
      // Verifica se a semana existe
      if (!prevExpenses[week]) {
        console.error(`Semana ${week} não encontrada`);
        return prevExpenses;
      }
      
      // Encontra o índice da despesa
      const expenseIndex = prevExpenses[week].findIndex(expense => expense.id === id);
      
      // Verifica se a despesa existe
      if (expenseIndex === -1) {
        console.error(`Despesa com ID ${id} não encontrada na semana ${week}`);
        return prevExpenses;
      }
      
      // Cria um novo objeto para evitar mutação do estado anterior
      const updatedExpenses = { ...prevExpenses };
      
      // Alterna o status de pagamento
      updatedExpenses[week][expenseIndex] = {
        ...updatedExpenses[week][expenseIndex],
        paid: !updatedExpenses[week][expenseIndex].paid
      };
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        expenses: updatedExpenses
      });
      
      return updatedExpenses;
    });
  }, []);
  
  // Filtra as despesas por intervalo de datas
  const filterByDateRange = useCallback((startDate: Date, endDate: Date): Expense[] => {
    const filteredExpenses: Expense[] = [];
    
    // Converte as datas para o formato ISO para comparação
    const start = formatDateISO(startDate);
    const end = formatDateISO(endDate);
    
    // Percorre todas as semanas
    Object.values(expenses).forEach(weekExpenses => {
      // Filtra as despesas que estão dentro do intervalo de datas
      const filtered = weekExpenses.filter(expense => 
        isDateInRange(new Date(expense.date), new Date(start), new Date(end))
      );
      
      // Adiciona as despesas filtradas ao resultado
      filteredExpenses.push(...filtered);
    });
    
    return filteredExpenses;
  }, [expenses]);
  
  return {
    expenses,
    calculateTotal,
    addExpense,
    updateExpense,
    deleteExpense,
    togglePaid,
    filterByDateRange
  };
} 