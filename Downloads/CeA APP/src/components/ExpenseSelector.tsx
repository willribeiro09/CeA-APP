import React from 'react';

interface ExpenseSelectorProps {
  selected: 'Carlos' | 'Diego' | 'C&A';
  onSelect: (value: 'Carlos' | 'Diego' | 'C&A') => void;
}

export function ExpenseSelector({ selected, onSelect }: ExpenseSelectorProps) {
  return (
    <div className="flex bg-white rounded-lg shadow-sm overflow-hidden mb-4">
      <button
        onClick={() => onSelect('Carlos')}
        className={`flex-1 py-2 px-4 text-center ${
          selected === 'Carlos' ? 'bg-[#5ABB37] text-white' : 'text-gray-700'
        }`}
      >
        Carlos
      </button>
      <button
        onClick={() => onSelect('Diego')}
        className={`flex-1 py-2 px-4 text-center ${
          selected === 'Diego' ? 'bg-[#5ABB37] text-white' : 'text-gray-700'
        }`}
      >
        Diego
      </button>
      <button
        onClick={() => onSelect('C&A')}
        className={`flex-1 py-2 px-4 text-center ${
          selected === 'C&A' ? 'bg-[#5ABB37] text-white' : 'text-gray-700'
        }`}
      >
        C&A
      </button>
    </div>
  );
} 