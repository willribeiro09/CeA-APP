import { Employee } from '../types';
import { format, startOfWeek } from 'date-fns';
import { getData, saveData } from './storage';

export async function updateEmployee(employee: Employee) {
  try {
    const storageData = getData();
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    
    if (!storageData.employees[weekStart]) {
      storageData.employees[weekStart] = [];
    }
    
    const updatedEmployees = storageData.employees[weekStart].map(e => 
      e.id === employee.id ? employee : e
    );
    
    storageData.employees[weekStart] = updatedEmployees;
    saveData(storageData);
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
} 