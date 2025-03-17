import { useState } from 'react';
import { format } from 'date-fns';
import { Employee } from '../types';
import { updateEmployee } from '../lib/employee';
import WorkDaysCalendar from './WorkDaysCalendar';

interface EmployeeReceiptProps {
  employee: Employee;
  onAddDay: (employeeId: string) => void;
  onReset: (employeeId: string) => void;
}

export default function EmployeeReceipt({ 
  employee, 
  onAddDay, 
  onReset 
}: EmployeeReceiptProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [workedDates, setWorkedDates] = useState<string[]>(employee.workedDates || []);

  const handleDateToggle = async (date: string) => {
    try {
      // Atualizar o banco de dados
      const updatedEmployee = {
        ...employee,
        workedDates: workedDates.includes(date)
          ? workedDates.filter(d => d !== date)
          : [...workedDates, date]
      };
      
      await updateEmployee(updatedEmployee);
      setWorkedDates(updatedEmployee.workedDates);
    } catch (error) {
      console.error('Error updating worked dates:', error);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{employee.name}</h3>
          <p className="text-sm text-gray-600">Daily Rate: ${employee.dailyRate}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Days Worked: {employee.daysWorked}</p>
          <p className="text-lg font-bold text-green-600">
            ${(employee.daysWorked * employee.dailyRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Days Worked
        </button>
        
        <button
          onClick={() => onReset(employee.id)}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reset
        </button>
      </div>

      {isCalendarOpen && (
        <WorkDaysCalendar
          employeeId={employee.id}
          initialWorkedDates={workedDates}
          onDateToggle={handleDateToggle}
        />
      )}
    </div>
  );
} 