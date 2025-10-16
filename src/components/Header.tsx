import { format } from 'date-fns';
import { useMemo } from 'react';
import { Logo } from './Logo';
import { NotificationDropdown } from './NotificationDropdown';
import { SearchDropdown } from './SearchDropdown';
import { Expense, Project, StockItem, Employee } from '../types';

interface HeaderProps {
  activeCategory: string;
  onNotificationClick: (notification: any) => void;
  expenses: Record<string, Expense[]>;
  projects: Project[];
  stockItems: StockItem[];
  employees: Record<string, Employee[]>;
  onSearchResultClick?: (result: any) => void;
}

export function Header({ 
  activeCategory, 
  onNotificationClick, 
  expenses, 
  projects, 
  stockItems, 
  employees,
  onSearchResultClick 
}: HeaderProps) {
  const currentMonthYear = useMemo(() => format(new Date(), 'MMMM yyyy'), []);
  
  return (
    <header className="fixed top-0 left-0 right-0 bg-[#073763] h-[100px] pt-safe-top px-4 z-50">
      <div className="h-full flex items-center gap-4">
        <div className="flex items-center gap-4">
          <Logo />
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">C&A Gutters</h1>
            <p className="text-gray-300 text-base leading-tight">
              {currentMonthYear}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SearchDropdown 
            expenses={expenses}
            projects={projects}
            stockItems={stockItems}
            employees={employees}
            onSearchResultClick={onSearchResultClick}
          />
          <NotificationDropdown onNotificationClick={onNotificationClick} />
        </div>
      </div>
    </header>
  );
}