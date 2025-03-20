import { format } from 'date-fns';
import { Logo } from './Logo';

export function Header({ activeCategory }: { activeCategory: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-[#073763] h-[100px] pt-safe-top px-4 z-50">
      <div className="h-full flex items-center gap-4">
        <div className="flex items-center gap-4">
          <Logo />
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">C&A Gutters</h1>
            <p className="text-gray-300 text-base leading-tight">
              {format(new Date(), 'MMMM yyyy')}
            </p>
          </div>
        </div>
        <div className="version-indicator">
          <small className="text-xs text-gray-400">v{new Date().toISOString().substring(0,10)}</small>
        </div>
        <div className="ml-auto text-white text-lg font-medium">
          {activeCategory}
        </div>
      </div>
    </header>
  );
}