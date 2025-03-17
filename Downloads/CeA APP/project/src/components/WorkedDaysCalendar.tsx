import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import 'react-day-picker/dist/style.css';

interface WorkedDaysCalendarProps {
  workedDates: string[];
  onDatesChange: (dates: string[]) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
}

export function WorkedDaysCalendar({ 
  workedDates = [], 
  onDatesChange, 
  isOpen, 
  onOpenChange,
  employeeName
}: WorkedDaysCalendarProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Convert worked dates from string to Date objects
  useEffect(() => {
    if (workedDates && workedDates.length > 0) {
      const dates = workedDates.map(dateStr => new Date(dateStr));
      setSelectedDates(dates);
    } else {
      setSelectedDates([]);
    }
  }, [workedDates]);

  // Generate days of current month
  const monthStart = startOfMonth(new Date(currentYear, currentMonth));
  const monthEnd = endOfMonth(new Date(currentYear, currentMonth));
  
  // Generate array with all days of the month
  const daysInMonth: Date[] = [];
  const currentDate = new Date(monthStart);
  while (currentDate <= monthEnd) {
    daysInMonth.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Function to check if a date is selected
  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate => isSameDay(selectedDate, date));
  };

  // Function to toggle date selection - fixed to prevent multiple selections
  const toggleDate = (date: Date) => {
    // Prevent future dates from being selected
    if (date > today) return;
    
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    // Use a more precise comparison to prevent multiple selections
    if (isDateSelected(date)) {
      // Remove the date if already selected
      const newDates = selectedDates.filter(d => !isSameDay(d, date));
      setSelectedDates(newDates);
      onDatesChange(newDates.map(d => format(d, 'yyyy-MM-dd')));
    } else {
      // Add the date if not selected
      const newDates = [...selectedDates, date];
      setSelectedDates(newDates);
      onDatesChange(newDates.map(d => format(d, 'yyyy-MM-dd')));
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-4 shadow-xl z-50 w-[90%] max-w-md">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Worked Days - {employeeName}
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>
          
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">
              Select the days worked in the current month:
            </div>
            <div className="text-xs text-gray-400 mb-4">
              Total days selected: {selectedDates.length}
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
            
            {/* Empty spaces to align the first day of the month */}
            {Array.from({ length: monthStart.getDay() }).map((_, index) => (
              <div key={`empty-start-${index}`} className="h-10"></div>
            ))}
            
            {/* Days of the month */}
            {daysInMonth.map((day: Date) => {
              const isSelected = isDateSelected(day);
              const isToday = isSameDay(day, today);
              const isFuture = day > today;
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={(e) => {
                    e.preventDefault(); // Prevent event bubbling
                    e.stopPropagation(); // Stop propagation to prevent multiple selections
                    if (!isFuture) toggleDate(day);
                  }}
                  disabled={isFuture}
                  className={`
                    h-10 rounded-md flex items-center justify-center text-sm
                    ${isSelected ? 'bg-[#5ABB37] text-white' : 'bg-gray-100 text-gray-700'}
                    ${isToday ? 'ring-2 ring-blue-400' : ''}
                    ${isFuture ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'}
                  `}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          
          <div className="flex justify-end">
            <Dialog.Close className="px-4 py-2 bg-[#5ABB37] text-white rounded-md text-sm font-medium hover:bg-[#4a9e2e] transition-colors">
              Confirm
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 