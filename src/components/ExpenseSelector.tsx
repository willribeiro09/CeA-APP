import React from 'react';

interface ExpenseSelectorProps {
  selected: 'Carlos' | 'Diego' | 'C&A';
  onSelect: (value: 'Carlos' | 'Diego' | 'C&A') => void;
}

export function ExpenseSelector({ selected, onSelect }: ExpenseSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-1 bg-white rounded-lg p-1 shadow-sm">
      <button
        onClick={() => onSelect('Carlos')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          selected === 'Carlos'
            ? 'bg-[#5ABB37] text-white'
            : 'hover:bg-gray-100'
        }`}
      >
        Carlos
      </button>
      <button
        onClick={() => onSelect('Diego')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          selected === 'Diego'
            ? 'bg-[#5ABB37] text-white'
            : 'hover:bg-gray-100'
        }`}
      >
        Diego
      </button>
      <button
        onClick={() => onSelect('C&A')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          selected === 'C&A'
            ? 'bg-[#5ABB37] text-white'
            : 'hover:bg-gray-100'
        }`}
      >
        C&A
      </button>
    </div>
  );
}