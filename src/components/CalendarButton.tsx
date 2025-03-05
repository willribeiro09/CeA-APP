import { Calendar } from 'lucide-react';

interface CalendarButtonProps {
  onClick: () => void;
}

export function CalendarButton({ onClick }: CalendarButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed right-4 bottom-20 w-14 h-14 bg-[#5ABB37] rounded-full 
        flex items-center justify-center shadow-lg hover:bg-[#4a9e2e] 
        transition-colors duration-300"
    >
      <Calendar className="w-6 h-6 text-white" />
    </button>
  );
}