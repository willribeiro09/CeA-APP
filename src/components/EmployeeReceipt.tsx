import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import WorkDaysCalendar from './WorkDaysCalendar';

interface Employee {
  id: string;
  name: string;
  role?: string;
  dailyRate: number;
  daysWorked: number;
  workedDates: string[];
}

interface EmployeeReceiptProps {
  employee: Employee;
  weekStartDate: string;
  onReset: (employeeId: string, weekStartDate: string) => void;
  onUpdateWorkedDates: (employeeId: string, dates: string[]) => void;
}

const EmployeeReceipt: React.FC<EmployeeReceiptProps> = ({ 
  employee, 
  weekStartDate, 
  onReset,
  onUpdateWorkedDates
}) => {
  const handleDateToggle = async (date: string) => {
    try {
      const updatedEmployee = { ...employee };
      const dateIndex = updatedEmployee.workedDates.indexOf(date);
      
      if (dateIndex === -1) {
        updatedEmployee.workedDates.push(date);
        updatedEmployee.daysWorked += 1;
      } else {
        updatedEmployee.workedDates.splice(dateIndex, 1);
        updatedEmployee.daysWorked -= 1;
      }

      // Atualizar o funcionário no estado
      onUpdateWorkedDates(employee.id, updatedEmployee.workedDates);
      
    } catch (error) {
      console.error('Erro ao atualizar data:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg">
      {/* Calendário sempre visível */}
      <div>
        <WorkDaysCalendar
          employeeId={employee.id}
          initialWorkedDates={employee.workedDates || []}
          onDateToggle={handleDateToggle}
        />
      </div>
    </div>
  );
};

export default EmployeeReceipt; 