import React from 'react';
import { Receipt, Briefcase, Package2, Users } from 'lucide-react';

interface NavigationProps {
  activeCategory: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  onCategoryChange: (category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => void;
}

export function Navigation({ activeCategory, onCategoryChange }: NavigationProps) {
  return (
    <nav className="fixed top-[100px] left-0 right-0 bg-[#5ABB37] border-t border-[#5ABB37]/20 py-1 px-4 shadow-md z-40 rounded-b-lg">
      <div className="flex justify-around divide-x divide-white/20 max-w-[800px] mx-auto">
        <button
          onClick={() => onCategoryChange('Expenses')}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 flex-1 justify-center transition-all duration-200 ${
            activeCategory === 'Expenses' ? 'bg-white/15 nav-item active' : 'nav-item hover:bg-white/5'
          }`}
        >
          <Receipt className="w-5 h-5 text-white" />
          <span className="text-white text-xs font-medium">Despesas</span>
        </button>
        <button
          onClick={() => onCategoryChange('Projects')}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 flex-1 justify-center transition-all duration-200 ${
            activeCategory === 'Projects' ? 'bg-white/15 nav-item active' : 'nav-item hover:bg-white/5'
          }`}
        >
          <Briefcase className="w-5 h-5 text-white" />
          <span className="text-white text-xs font-medium">Projetos</span>
        </button>
        <button
          onClick={() => onCategoryChange('Stock')}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 flex-1 justify-center transition-all duration-200 ${
            activeCategory === 'Stock' ? 'bg-white/15 nav-item active' : 'nav-item hover:bg-white/5'
          }`}
        >
          <Package2 className="w-5 h-5 text-white" />
          <span className="text-white text-xs font-medium">Estoque</span>
        </button>
        <button
          onClick={() => onCategoryChange('Employees')}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 flex-1 justify-center transition-all duration-200 ${
            activeCategory === 'Employees' ? 'bg-white/15 nav-item active' : 'nav-item hover:bg-white/5'
          }`}
        >
          <Users className="w-5 h-5 text-white" />
          <span className="text-white text-xs font-medium">Funcionários</span>
        </button>
      </div>
    </nav>
  );
}