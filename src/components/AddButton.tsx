import React, { useState } from 'react';
import { Plus, Receipt, CreditCard } from 'lucide-react';

interface AddButtonProps {
  onClick: () => void;
  onScanReceipt?: () => void;
  activeCategory?: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
}

export function AddButton({ onClick, onScanReceipt, activeCategory }: AddButtonProps) {
  const [showOptions, setShowOptions] = useState(false);
  
  const handleClick = () => {
    if (activeCategory === 'Expenses' && onScanReceipt) {
      setShowOptions(true);
    } else {
      onClick();
    }
  };
  
  const handleAddExpense = () => {
    setShowOptions(false);
    onClick();
  };
  
  const handleScanReceipt = () => {
    setShowOptions(false);
    if (onScanReceipt) {
      onScanReceipt();
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="fixed bottom-5 right-5 bg-[#5ABB37] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-40"
      >
        <Plus className="w-6 h-6" />
      </button>
      
      {showOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center pb-24">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">Add</h3>
            </div>
            
            <div>
              <button 
                onClick={handleAddExpense}
                className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50"
              >
                <CreditCard className="w-5 h-5 mr-3 text-[#5ABB37]" />
                <span>Add Expense</span>
              </button>
              
              <button 
                onClick={handleScanReceipt}
                className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50"
              >
                <Receipt className="w-5 h-5 mr-3 text-[#5ABB37]" />
                <span>Scan Receipt</span>
              </button>
            </div>
            
            <div className="p-3 border-t">
              <button 
                onClick={() => setShowOptions(false)}
                className="w-full py-2 bg-gray-100 rounded-md text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}