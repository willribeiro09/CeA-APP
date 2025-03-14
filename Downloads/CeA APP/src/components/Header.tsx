import React from 'react';
import { Logo } from './Logo';

interface HeaderProps {
  activeCategory: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
}

export function Header({ activeCategory }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 h-[100px]">
      <div className="flex items-center justify-between p-4">
        <Logo />
        <h1 className="text-xl font-semibold text-gray-800">
          {activeCategory}
        </h1>
      </div>
    </header>
  );
} 