import { format } from 'date-fns';
import { useMemo } from 'react';
import { Logo } from './Logo';

interface HeaderProps {
  activeCategory: string;
}

export function Header({ activeCategory }: HeaderProps) {
  // Usar useMemo para evitar recálculo da data a cada renderização
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
        <div className="ml-auto">
          <div className="text-white text-lg font-medium">
            {activeCategory}
          </div>
        </div>
      </div>
    </header>
  );
}