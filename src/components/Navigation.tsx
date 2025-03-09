import React from 'react';
import { ReceiptText, Briefcase, Package, Users } from 'lucide-react';

interface NavigationProps {
  activeCategory: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  onCategoryChange: (category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => void;
}

export function Navigation({ activeCategory, onCategoryChange }: NavigationProps) {
  return (
    <nav className="fixed top-[100px] left-0 right-0 bg-[#5ABB37] rounded-b-xl z-40">
      <div className="flex justify-around">
        <button
          onClick={() => onCategoryChange('Expenses')}
          className="flex flex-col items-center gap-1 px-4 py-2 flex-1 justify-center"
        >
          <ReceiptText className={`w-6 h-6 ${activeCategory === 'Expenses' ? 'text-white' : 'text-white/70'} stroke-[2.5px]`} />
          <span className={`text-sm ${activeCategory === 'Expenses' ? 'text-white font-medium' : 'text-white/70'}`}>
            Expenses
          </span>
        </button>
        <button
          onClick={() => onCategoryChange('Projects')}
          className="flex flex-col items-center gap-1 px-4 py-2 flex-1 justify-center"
        >
          <Briefcase className={`w-6 h-6 ${activeCategory === 'Projects' ? 'text-white' : 'text-white/70'} stroke-[2.5px]`} />
          <span className={`text-sm ${activeCategory === 'Projects' ? 'text-white font-medium' : 'text-white/70'}`}>
            Projects
          </span>
        </button>
        <button
          onClick={() => onCategoryChange('Stock')}
          className="flex flex-col items-center gap-1 px-4 py-2 flex-1 justify-center"
        >
          <Package className={`w-6 h-6 ${activeCategory === 'Stock' ? 'text-white' : 'text-white/70'} stroke-[2.5px]`} />
          <span className={`text-sm ${activeCategory === 'Stock' ? 'text-white font-medium' : 'text-white/70'}`}>
            Inventory
          </span>
        </button>
        <button
          onClick={() => onCategoryChange('Employees')}
          className="flex flex-col items-center gap-1 px-4 py-2 flex-1 justify-center"
        >
          <Users className={`w-6 h-6 ${activeCategory === 'Employees' ? 'text-white' : 'text-white/70'} stroke-[2.5px]`} />
          <span className={`text-sm ${activeCategory === 'Employees' ? 'text-white font-medium' : 'text-white/70'}`}>
            Employees
          </span>
        </button>
      </div>
    </nav>
  );
}