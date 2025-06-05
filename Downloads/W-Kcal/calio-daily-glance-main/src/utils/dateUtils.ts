
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDisplayDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const getMonthDays = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  // Add empty days for proper week alignment
  const startingDayOfWeek = firstDay.getDay();
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(new Date(year, month, -i));
  }
  days.reverse();
  
  // Add month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }
  
  return days;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isSameMonth = (date: Date, month: number, year: number): boolean => {
  return date.getMonth() === month && date.getFullYear() === year;
};
