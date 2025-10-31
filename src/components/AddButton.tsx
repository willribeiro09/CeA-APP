import { Plus } from 'lucide-react';

interface AddButtonProps {
  onClick: () => void;
}

export function AddButton({ onClick }: AddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed right-4 bottom-4 w-14 h-14 bg-[#fe7e26] rounded-full 
        flex items-center justify-center shadow-lg hover:bg-[#e57121] 
        transition-colors duration-300 z-50"
    >
      <Plus className="w-6 h-6 text-white" />
    </button>
  );
}