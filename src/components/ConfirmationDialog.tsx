import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  onGoToMenu: () => void;
}

export function ConfirmationDialog({ isOpen, onOpenChange, category, onGoToMenu }: ConfirmationDialogProps) {
  const getCategoryLabel = () => {
    switch (category) {
      case 'Expenses':
        return 'Expense';
      case 'Projects':
        return 'Project';
      case 'Stock':
        return 'Stock Item';
      case 'Employees':
        return 'Employee';
      default:
        return 'Item';
    }
  };

  const handleGoToMenu = () => {
    onGoToMenu();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-[90%] max-w-md z-[201]"
          style={{ animation: 'zoomIn 0.2s ease-out' }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="relative p-6">
            <Dialog.Close className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5" />
            </Dialog.Close>
            
            <div className="pt-2 pb-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900 mb-2">
                {getCategoryLabel()} added successfully
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-600">
                Your {getCategoryLabel().toLowerCase()} has been saved.
              </Dialog.Description>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleGoToMenu}
                className="px-6 py-2.5 bg-[#073863] text-white rounded-lg text-sm font-medium hover:bg-[#052a4a] transition-colors shadow-sm"
              >
                Go to {category}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

