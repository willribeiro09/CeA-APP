import { Receipt, Briefcase, Package2, Users } from 'lucide-react';

interface NavigationProps {
  activeCategory: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  onCategoryChange: (category: 'Expenses' | 'Projects' | 'Stock' | 'Employees') => void;
}

export function Navigation({ activeCategory, onCategoryChange }: NavigationProps) {
  return (
    <nav className="fixed top-[100px] left-0 right-0 bg-[#5ABB37] rounded-b-xl z-40">
      <div className="flex justify-around divide-x divide-white/20">
        <button
          onClick={() => onCategoryChange('Expenses')}
          className={`flex flex-col items-center gap-1 px-4 py-2 flex-1 justify-center ${
            activeCategory === 'Expenses' ? 'bg-white/10' : ''
          }`}
        >
          <Receipt className="w-5 h-5 text-white" />
          <span className="text-white text-sm">Expenses</span>
        </button>
        <button
          onClick={() => onCategoryChange('Projects')}
          className={`flex flex-col items-center gap-1 px-4 py-2 flex-1 justify-center ${
            activeCategory === 'Projects' ? 'bg-white/10' : ''
          }`}
        >
          <Briefcase className="w-5 h-5 text-white" />
          <span className="text-white text-sm">Projects</span>
        </button>
        <button
          onClick={() => onCategoryChange('Stock')}
          className={`flex flex-col items-center gap-1 px-4 py-2 flex-1 justify-center ${
            activeCategory === 'Stock' ? 'bg-white/10' : ''
          }`}
        >
          <Package2 className="w-5 h-5 text-white" />
          <span className="text-white text-sm">Inventory</span>
        </button>
        <button
          onClick={() => onCategoryChange('Employees')}
          className={`flex flex-col items-center gap-1 px-4 py-2 flex-1 justify-center ${
            activeCategory === 'Employees' ? 'bg-white/10' : ''
          }`}
        >
          <Users className="w-5 h-5 text-white" />
          <span className="text-white text-sm">Employees</span>
        </button>
      </div>
    </nav>
  );
}