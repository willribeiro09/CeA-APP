import { useState, useEffect } from 'react';
import { format, getDaysInMonth, startOfMonth } from 'date-fns';

interface WorkDaysCalendarProps {
  employeeId: string;
  initialWorkedDates: string[];
  onDateToggle: (date: string) => void;
}

export default function WorkDaysCalendar({ 
  employeeId, 
  initialWorkedDates, 
  onDateToggle 
}: WorkDaysCalendarProps) {
  const [workedDates, setWorkedDates] = useState<string[]>(initialWorkedDates);
  const currentMonth = startOfMonth(new Date());
  const daysInMonth = getDaysInMonth(currentMonth);

  const handleDateClick = (date: string) => {
    const newDates = workedDates.includes(date)
      ? workedDates.filter(d => d !== date)
      : [...workedDates, date];
    
    setWorkedDates(newDates);
    onDateToggle(date);
  };

  return (
    <div className="grid grid-cols-7 gap-2 p-4 bg-white rounded-lg shadow">
      {Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(currentMonth);
        date.setDate(i + 1);
        const dateString = format(date, 'yyyy-MM-dd');
        const isWorked = workedDates.includes(dateString);

        return (
          <button
            key={dateString}
            onClick={() => handleDateClick(dateString)}
            className={`p-2 rounded-full ${
              isWorked 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {date.getDate()}
          </button>
        );
      })}
    </div>
  );
} 