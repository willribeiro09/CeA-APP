import React, { useState } from 'react';
import { Item, ValidationError, Expense, Project, StockItem, Employee } from '../types';

interface AddItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  onSubmit: (data: Partial<Item>) => void;
  selectedWeekStart?: Date;
}

export function AddItemDialog({ isOpen, onOpenChange, category, onSubmit, selectedWeekStart }: AddItemDialogProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    console.log("Form data:", data);
    
    let itemData: Partial<Item>;
    
    if (category === 'Expenses') {
      itemData = {
        description: data.description as string,
        amount: parseFloat(data.amount as string),
        date: new Date(data.dueDate as string).toISOString(),
        category: 'Expenses',
        is_paid: false,
        paid: false
      };
    } else if (category === 'Projects') {
      itemData = {
        name: data.name as string,
        description: data.description as string,
        client: data.client as string,
        startDate: new Date(data.startDate as string).toISOString(),
        status: 'pending',
        category: 'Projects'
      };
    } else if (category === 'Stock') {
      itemData = {
        name: data.name as string,
        quantity: parseInt(data.quantity as string),
        unit: data.unit as string,
        category: 'Stock'
      };
    } else {
      itemData = {
        name: data.name as string,
        employeeName: data.name as string,
        startDate: new Date().toISOString(),
        weekStartDate: selectedWeekStart?.toISOString() || new Date().toISOString(),
        daysWorked: 0,
        dailyRate: parseFloat(data.dailyRate as string) || 250,
        category: 'Employees'
      };
    }

    console.log("Formatted data:", itemData);
    setErrors([]);
    onSubmit(itemData);
    onOpenChange(false);
  };

  const getFieldError = (fieldName: string) => {
    return errors.find(error => error.field === fieldName)?.message;
  };

  return (
    <div className={`fixed inset-0 bg-black/50 z-50 ${isOpen ? 'flex' : 'hidden'} items-center justify-center`}>
      <div className="bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {category === 'Expenses' ? 'New Expense' : 
             category === 'Projects' ? 'New Project' : 
             category === 'Stock' ? 'New Inventory Item' :
             'New Employee'}
          </h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            X
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.find(error => error.field === 'form') && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {errors.find(error => error.field === 'form')?.message}
            </p>
          )}
          
          {category === 'Expenses' && (
            <>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                />
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  step="0.01"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                />
              </div>
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                />
              </div>
            </>
          )}
          
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#5ABB37] rounded-md hover:bg-[#4a9e2e]"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 