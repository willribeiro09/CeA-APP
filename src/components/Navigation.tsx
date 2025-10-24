import React from 'react';
import { ReceiptText, Briefcase, Package, Users, Home } from 'lucide-react';

interface NavigationProps {
  activeCategory: 'Home' | 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  onCategoryChange: (category: 'Home' | 'Expenses' | 'Projects' | 'Stock' | 'Employees') => void;
  disabled?: boolean;
}

export function Navigation({ activeCategory, onCategoryChange, disabled = false }: NavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#5ABB37] z-40 pb-safe">
      <div className="flex justify-around items-center h-16 px-2 relative">
        {/* Home */}
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Home')}
          disabled={disabled}
          className="flex flex-col items-center justify-center flex-1"
        >
          <Home className={`w-6 h-6 ${activeCategory === 'Home' ? 'text-white' : 'text-white/60'}`} />
          <span className={`text-xs mt-1 ${activeCategory === 'Home' ? 'text-white font-medium' : 'text-white/60'}`}>
            Home
          </span>
        </button>

        {/* Expenses */}
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Expenses')}
          disabled={disabled}
          className="flex flex-col items-center justify-center flex-1"
        >
          <ReceiptText className={`w-6 h-6 ${activeCategory === 'Expenses' ? 'text-white' : 'text-white/60'}`} />
          <span className={`text-xs mt-1 ${activeCategory === 'Expenses' ? 'text-white font-medium' : 'text-white/60'}`}>
            Expenses
          </span>
        </button>

        {/* Espaço para o botão + */}
        <div className="flex-1"></div>

        {/* Projects */}
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Projects')}
          disabled={disabled}
          className="flex flex-col items-center justify-center flex-1"
        >
          <Briefcase className={`w-6 h-6 ${activeCategory === 'Projects' ? 'text-white' : 'text-white/60'}`} />
          <span className={`text-xs mt-1 ${activeCategory === 'Projects' ? 'text-white font-medium' : 'text-white/60'}`}>
            Projects
          </span>
        </button>

        {/* Employees */}
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Employees')}
          disabled={disabled}
          className="flex flex-col items-center justify-center flex-1"
        >
          <Users className={`w-6 h-6 ${activeCategory === 'Employees' ? 'text-white' : 'text-white/60'}`} />
          <span className={`text-xs mt-1 ${activeCategory === 'Employees' ? 'text-white font-medium' : 'text-white/60'}`}>
            Employees
          </span>
        </button>
      </div>
    </nav>
  );
}