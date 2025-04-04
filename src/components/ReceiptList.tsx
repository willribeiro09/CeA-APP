import React from 'react';
import { Expense } from '../types';
import { X, Eye } from 'lucide-react';

interface ReceiptListProps {
  expenses: Expense[];
  onAddReceipt: (file: File) => Promise<void>;
  onDeleteReceipt: (expenseId: string, receiptUrl: string) => void;
  onViewReceipt: (receiptUrl: string) => void;
}

export function ReceiptList({ expenses, onAddReceipt, onDeleteReceipt, onViewReceipt }: ReceiptListProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await onAddReceipt(files[0]);
      // Clean file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Filter only expenses with receipts
  const receiptsExpenses = expenses.filter(expense => expense.receipts_urls && expense.receipts_urls.length > 0);
  
  if (receiptsExpenses.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 text-center">
          <p className="text-gray-500">No receipts found</p>
          
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg">Receipts</h3>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="space-y-3">
          {receiptsExpenses.map(expense => (
            <div key={expense.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{expense.description}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(expense.date).toLocaleDateString('en-US')}
                  </p>
                </div>
                <p className="font-semibold text-[#5ABB37]">
                  ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              
              <div className="space-y-2">
                {expense.receipts_urls?.map((url, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <p className="text-sm truncate max-w-[200px]">
                      {url.split('/').pop()}
                    </p>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => onViewReceipt(url)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => onDeleteReceipt(expense.id, url)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 