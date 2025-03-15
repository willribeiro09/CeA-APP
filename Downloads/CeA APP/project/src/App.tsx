import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { WorkedDaysCalendar } from './components/WorkedDaysCalendar';
import { EmployeeReceipt } from './components/EmployeeReceipt';

// Types
type EmployeeName = string;

interface Employee {
  id: string;
  name: string;
  dailyRate: number;
  startDate: string;
  workedDates: string[]; // Changed from daysWorked (number) to workedDates (string[])
}

function App() {
  // State for employees
  const [employees, setEmployees] = useState<Record<string, Employee[]>>({});
  const [activeCategory, setActiveCategory] = useState<'Expenses' | 'Projects' | 'Stock' | 'Employees'>('Employees');
  const [selectedList, setSelectedList] = useState<string>('');
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(new Date());
  
  // State for WorkedDaysCalendar
  const [isWorkedDaysCalendarOpen, setIsWorkedDaysCalendarOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  // State for EmployeeReceipt
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  
  // Helper functions for dates
  const getEmployeeWeekStart = (date: Date): Date => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    return weekStart;
  };

  const getEmployeeWeekEnd = (date: Date): Date => {
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
    return weekEnd;
  };
  
  const getWeekStart = (date: Date, category: 'Expenses' | 'Projects' | 'Stock' | 'Employees' = 'Projects'): Date => {
    return category === 'Employees' ? getEmployeeWeekStart(date) : startOfWeek(date);
  };
  
  const getWeekEnd = (date: Date, category: 'Expenses' | 'Projects' | 'Stock' | 'Employees' = 'Projects'): Date => {
    return category === 'Employees' ? getEmployeeWeekEnd(date) : endOfWeek(date);
  };
  
  // Format date for key
  const formatDate = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };
  
  // Update selected week start date when changing category
  useEffect(() => {
    const today = new Date();
    const weekStart = getWeekStart(today, activeCategory);
    setSelectedWeekStart(weekStart);
    const formattedDate = formatDate(weekStart);
    setSelectedList(formattedDate);
  }, [activeCategory]);
  
  // Handle adding a new employee
  const handleAddEmployee = () => {
    const weekStartDate = formatDate(selectedWeekStart);
    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      name: 'New Employee',
      dailyRate: 150,
      startDate: new Date().toISOString(),
      workedDates: [] // Initialize with empty array
    };
    
    setEmployees(prevEmployees => {
      const newEmployees = { ...prevEmployees };
      
      if (!newEmployees[weekStartDate]) {
        newEmployees[weekStartDate] = [];
      }
      
      newEmployees[weekStartDate] = [
        ...(newEmployees[weekStartDate] || []),
        newEmployee
      ];
      
      return newEmployees;
    });
  };
  
  // Handle opening the worked days calendar
  const handleOpenWorkedDaysCalendar = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setIsWorkedDaysCalendarOpen(true);
  };
  
  // Handle opening the receipt
  const handleOpenReceipt = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setIsReceiptOpen(true);
  };
  
  // Handle change in worked dates
  const handleWorkedDatesChange = (dates: string[]) => {
    if (!selectedEmployeeId) return;
    
    const weekStartDate = formatDate(selectedWeekStart);
    
    setEmployees(prevEmployees => {
      const updatedEmployees = { ...prevEmployees };
      const weekEmployees = updatedEmployees[weekStartDate] || [];
      const employeeIndex = weekEmployees.findIndex(e => e.id === selectedEmployeeId);
      
      if (employeeIndex !== -1) {
        // Update the employee's worked dates
        const updatedEmployee = {
          ...weekEmployees[employeeIndex],
          workedDates: dates
        };
        
        updatedEmployees[weekStartDate] = [
          ...weekEmployees.slice(0, employeeIndex),
          updatedEmployee,
          ...weekEmployees.slice(employeeIndex + 1)
        ];
      }
      
      return updatedEmployees;
    });
  };
  
  // Get the selected employee
  const getSelectedEmployee = (): Employee | undefined => {
    const weekEmployees = employees[selectedList] || [];
    return weekEmployees.find(e => e.id === selectedEmployeeId);
  };
  
  // Render employees
  const renderEmployees = () => {
    const weekEmployees = employees[selectedList] || [];
    
    if (weekEmployees.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No employees for this week. Add a new employee to get started.
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {weekEmployees.map(employee => (
          <div 
            key={employee.id}
            className="bg-white rounded-lg p-4 shadow-md"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-lg">{employee.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenWorkedDaysCalendar(employee.id)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Days Worked
                </button>
                <button
                  onClick={() => handleOpenReceipt(employee.id)}
                  className="px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  Receipt
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-700 text-sm">Daily Rate:</span>
                <span>${employee.dailyRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 text-sm">Days Worked:</span>
                <span>{employee.workedDates.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 text-sm">Total:</span>
                <span className="font-medium">${(employee.dailyRate * employee.workedDates.length).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render the main content
  const renderContent = () => {
    if (activeCategory === 'Employees') {
      return (
        <div className="p-4 max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Employees</h2>
            <div className="flex gap-2">
              <button
                onClick={handleAddEmployee}
                className="px-3 py-1.5 bg-[#5ABB37] text-white text-sm rounded hover:bg-[#4a9e2e]"
              >
                Add Employee
              </button>
            </div>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-lg shadow-inner mb-4">
            <div className="text-center mb-4">
              <div className="text-sm text-gray-600 mb-1">Week</div>
              <div className="font-medium">
                {format(getWeekStart(selectedWeekStart, 'Employees'), 'MMM d')} - {format(getWeekEnd(selectedWeekStart, 'Employees'), 'MMM d, yyyy')}
              </div>
            </div>
            
            {renderEmployees()}
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-4 text-center">
        <p>Please select the Employees category to view employee information.</p>
      </div>
    );
  };
  
  const selectedEmployee = getSelectedEmployee();
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-[#5ABB37] text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center">Employee Management</h1>
      </header>
      
      <Navigation 
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      
      <main className="mt-24">
        {renderContent()}
      </main>
      
      {selectedEmployee && (
        <>
          <WorkedDaysCalendar
            isOpen={isWorkedDaysCalendarOpen}
            onOpenChange={setIsWorkedDaysCalendarOpen}
            employeeName={selectedEmployee.name}
            workedDates={selectedEmployee.workedDates}
            onDatesChange={handleWorkedDatesChange}
          />
          
          <EmployeeReceipt
            isOpen={isReceiptOpen}
            onOpenChange={setIsReceiptOpen}
            employeeName={selectedEmployee.name}
            dailyRate={selectedEmployee.dailyRate}
            workedDates={selectedEmployee.workedDates}
            weekStartDate={selectedWeekStart}
          />
        </>
      )}
    </div>
  );
}

export default App;
