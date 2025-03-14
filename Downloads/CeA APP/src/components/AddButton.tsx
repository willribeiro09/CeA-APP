import React from 'react';
import { Plus } from 'lucide-react';

interface AddButtonProps {
  onClick: () => void;
}

export function AddButton({ onClick }: AddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-[#5ABB37] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#4a9e2e] transition-colors"
      aria-label="Adicionar item"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
} 