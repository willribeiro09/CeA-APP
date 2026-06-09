import React from 'react';
import { ReceiptText, Briefcase, Package, Users, Home } from 'lucide-react';

interface NavigationProps {
  activeCategory: 'Home' | 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  onCategoryChange: (category: 'Home' | 'Expenses' | 'Projects' | 'Stock' | 'Employees') => void;
  disabled?: boolean;
}

export function Navigation({ activeCategory, onCategoryChange, disabled = false }: NavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-[#1a2d4a] to-[#0D1C34] z-40 rounded-t-xl navigation-bottom-bar">
      <div className="flex justify-around items-center h-14 px-2 relative navigation-content">
        {/* Home */}
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Home')}
          disabled={disabled}
          className="flex flex-col items-center justify-center flex-1"
        >
          <Home className={`w-5 h-5 ${activeCategory === 'Home' ? 'text-white drop-shadow-lg scale-110' : 'text-white/80'}`} />
          <span className={`text-xs mt-0.5 ${activeCategory === 'Home' ? 'text-white font-bold drop-shadow' : 'text-white/80'}`}>
            Home
          </span>
        </button>

        {/* Separador */}
        <div className="w-px h-6 bg-white/20 flex-shrink-0" />

        {/* Expenses */}
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Expenses')}
          disabled={disabled}
          className="flex flex-col items-center justify-center flex-1"
        >
          <ReceiptText className={`w-5 h-5 ${activeCategory === 'Expenses' ? 'text-white drop-shadow-lg scale-110' : 'text-white/80'}`} />
          <span className={`text-xs mt-0.5 ${activeCategory === 'Expenses' ? 'text-white font-bold drop-shadow' : 'text-white/80'}`}>
            Expenses
          </span>
        </button>

        {/* Separador */}
        <div className="w-px h-6 bg-white/20 flex-shrink-0" />

        {/* Espaço para o botão + */}
        <div className="flex-1"></div>

        {/* Separador */}
        <div className="w-px h-6 bg-white/20 flex-shrink-0" />

        {/* Projects */}
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Projects')}
          disabled={disabled}
          className="flex flex-col items-center justify-center flex-1"
        >
          <Briefcase className={`w-5 h-5 ${activeCategory === 'Projects' ? 'text-white drop-shadow-lg scale-110' : 'text-white/80'}`} />
          <span className={`text-xs mt-0.5 ${activeCategory === 'Projects' ? 'text-white font-bold drop-shadow' : 'text-white/80'}`}>
            Projects
          </span>
        </button>

        {/* Separador */}
        <div className="w-px h-6 bg-white/20 flex-shrink-0" />

        {/* Employees */}
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Employees')}
          disabled={disabled}
          className="flex flex-col items-center justify-center flex-1"
        >
          <Users className={`w-5 h-5 ${activeCategory === 'Employees' ? 'text-white drop-shadow-lg scale-110' : 'text-white/80'}`} />
          <span className={`text-xs mt-0.5 ${activeCategory === 'Employees' ? 'text-white font-bold drop-shadow' : 'text-white/80'}`}>
            Employees
          </span>
        </button>
      </div>
    </nav>
  );
}