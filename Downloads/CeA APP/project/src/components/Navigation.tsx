import React from 'react';
import { ReceiptText, Briefcase, Package, Users, Bell } from 'lucide-react';

interface NavigationProps {
  activeCategory: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  onCategoryChange: (category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => void;
}

export function Navigation({ activeCategory, onCategoryChange }: NavigationProps) {
  return (
    <nav className="fixed top-[100px] left-0 right-0 bg-[#5ABB37] rounded-b-xl z-40">
      <div className="flex justify-around relative">
        {/* Test Button - Blue button in the right corner */}
        {activeCategory === 'Expenses' && (
          <button 
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md"
            onClick={() => alert('Test button clicked!')}
          >
            <Bell size={16} />
          </button>
        )}
        
        <button
          onClick={() => onCategoryChange('Expenses')}
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
          onClick={() => onCategoryChange('Projects')}
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
          onClick={() => onCategoryChange('Employees')}
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
          onClick={() => onCategoryChange('Stock')}
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