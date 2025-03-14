import { useState, useCallback, useEffect } from 'react';
import { Employee } from '../types';
import { getData, saveData } from '../utils/storageUtils';

/**
 * Hook para gerenciar os funcionários
 */
export function useEmployees() {
  // Estado para armazenar os funcionários
  const [employees, setEmployees] = useState<Record<string, Employee[]>>({});
  
  // Estado para armazenar a taxa base do Will
  const [willBaseRate, setWillBaseRate] = useState<number>(0);
  
  // Estado para armazenar o bônus do Will
  const [willBonus, setWillBonus] = useState<number>(0);
  
  // Carrega os funcionários do armazenamento local
  useEffect(() => {
    const data = getData();
    if (data) {
      if (data.employees) {
        setEmployees(data.employees);
      }
      
      if (data.willBaseRate !== undefined) {
        setWillBaseRate(data.willBaseRate);
      }
      
      if (data.willBonus !== undefined) {
        setWillBonus(data.willBonus);
      }
    }
  }, []);
  
  // Adiciona um dia trabalhado para um funcionário
  const addDay = useCallback((week: string, employeeId: string): void => {
    console.log(`Adicionando dia para funcionário ${employeeId} na semana ${week}`);
    
    setEmployees(prevEmployees => {
      // Verifica se a semana existe
      if (!prevEmployees[week]) {
        console.error(`Semana ${week} não encontrada`);
        return prevEmployees;
      }
      
      // Encontra o funcionário pelo ID
      const employeeIndex = prevEmployees[week].findIndex(emp => emp.id === employeeId);
      
      // Verifica se o funcionário existe
      if (employeeIndex === -1) {
        console.error(`Funcionário com ID ${employeeId} não encontrado na semana ${week}`);
        return prevEmployees;
      }
      
      // Cria um novo objeto para evitar mutação do estado anterior
      const updatedEmployees = { ...prevEmployees };
      
      // Incrementa os dias trabalhados
      updatedEmployees[week][employeeIndex] = {
        ...updatedEmployees[week][employeeIndex],
        daysWorked: updatedEmployees[week][employeeIndex].daysWorked + 1
      };
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        employees: updatedEmployees
      });
      
      return updatedEmployees;
    });
  }, []);
  
  // Reseta os dias trabalhados de um funcionário
  const resetEmployee = useCallback((week: string, employeeId: string): void => {
    console.log(`Resetando dias para funcionário ${employeeId} na semana ${week}`);
    
    setEmployees(prevEmployees => {
      // Verifica se a semana existe
      if (!prevEmployees[week]) {
        console.error(`Semana ${week} não encontrada`);
        return prevEmployees;
      }
      
      // Encontra o funcionário pelo ID
      const employeeIndex = prevEmployees[week].findIndex(emp => emp.id === employeeId);
      
      // Verifica se o funcionário existe
      if (employeeIndex === -1) {
        console.error(`Funcionário com ID ${employeeId} não encontrado na semana ${week}`);
        return prevEmployees;
      }
      
      // Cria um novo objeto para evitar mutação do estado anterior
      const updatedEmployees = { ...prevEmployees };
      
      // Reseta os dias trabalhados
      updatedEmployees[week][employeeIndex] = {
        ...updatedEmployees[week][employeeIndex],
        daysWorked: 0
      };
      
      // Salva as alterações no armazenamento local
      const data = getData();
      saveData({
        ...data,
        employees: updatedEmployees
      });
      
      return updatedEmployees;
    });
  }, []);
  
  // Atualiza a taxa base do Will
  const updateWillBaseRate = useCallback((rate: number): void => {
    setWillBaseRate(rate);
    
    // Salva as alterações no armazenamento local
    const data = getData();
    saveData({
      ...data,
      willBaseRate: rate
    });
  }, []);
  
  // Atualiza o bônus do Will
  const updateWillBonus = useCallback((bonus: number): void => {
    setWillBonus(bonus);
    
    // Salva as alterações no armazenamento local
    const data = getData();
    saveData({
      ...data,
      willBonus: bonus
    });
  }, []);
  
  return {
    employees,
    willBaseRate,
    willBonus,
    addDay,
    resetEmployee,
    updateWillBaseRate,
    updateWillBonus
  };
} 