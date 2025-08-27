import React from 'react';
import { ReceiptText, Briefcase, Package, Users } from 'lucide-react';

interface NavigationProps {
  activeCategory: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  onCategoryChange: (category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => void;
  disabled?: boolean;
}

export function Navigation({ activeCategory, onCategoryChange, disabled = false }: NavigationProps) {
  return (
    <nav className="fixed top-[100px] left-0 right-0 bg-[#5ABB37] rounded-b-xl z-40">
      <div className="flex justify-around">
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Expenses')}
          disabled={disabled}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 flex-1 justify-center relative rounded-lg ${
            activeCategory === 'Expenses' 
              ? 'bg-gradient-to-b from-white/30 to-white/5 after:absolute after:bottom-0 after:left-[15%] after:right-[15%] after:h-0.5 after:bg-white after:rounded-full' 
              : ''
          }`}
        >
          <ReceiptText className={`w-[22px] h-[22px] ${activeCategory === 'Expenses' ? 'text-white' : 'text-white'} stroke-[2.5px]`} />
          <span className={`text-sm ${activeCategory === 'Expenses' ? 'text-white font-medium' : 'text-white'}`}>
            Expenses
          </span>
        </button>
        <div className="w-px bg-white/20 my-1.5"></div>
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Projects')}
          disabled={disabled}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 flex-1 justify-center relative rounded-lg ${
            activeCategory === 'Projects' 
              ? 'bg-gradient-to-b from-white/30 to-white/5 after:absolute after:bottom-0 after:left-[15%] after:right-[15%] after:h-0.5 after:bg-white after:rounded-full' 
              : ''
          }`}
        >
          <Briefcase className={`w-[22px] h-[22px] ${activeCategory === 'Projects' ? 'text-white' : 'text-white'} stroke-[2.5px]`} />
          <span className={`text-sm ${activeCategory === 'Projects' ? 'text-white font-medium' : 'text-white'}`}>
            Projects
          </span>
        </button>
        <div className="w-px bg-white/20 my-1.5"></div>
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Employees')}
          disabled={disabled}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 flex-1 justify-center relative rounded-lg ${
            activeCategory === 'Employees' 
              ? 'bg-gradient-to-b from-white/30 to-white/5 after:absolute after:bottom-0 after:left-[15%] after:right-[15%] after:h-0.5 after:bg-white after:rounded-full' 
              : ''
          }`}
        >
          <Users className={`w-[22px] h-[22px] ${activeCategory === 'Employees' ? 'text-white' : 'text-white'} stroke-[2.5px]`} />
          <span className={`text-sm ${activeCategory === 'Employees' ? 'text-white font-medium' : 'text-white'}`}>
            Employees
          </span>
        </button>
        <div className="w-px bg-white/20 my-1.5"></div>
        <button
          onClick={disabled ? () => {} : () => onCategoryChange('Stock')}
          disabled={disabled}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 flex-1 justify-center relative rounded-lg ${
            activeCategory === 'Stock' 
              ? 'bg-gradient-to-b from-white/30 to-white/5 after:absolute after:bottom-0 after:left-[15%] after:right-[15%] after:h-0.5 after:bg-white after:rounded-full' 
              : ''
          }`}
        >
          <Package className={`w-[22px] h-[22px] ${activeCategory === 'Stock' ? 'text-white' : 'text-white'} stroke-[2.5px]`} />
          <span className={`text-sm ${activeCategory === 'Stock' ? 'text-white font-medium' : 'text-white'}`}>
            Inventory
          </span>
        </button>
      </div>
    </nav>
  );
}