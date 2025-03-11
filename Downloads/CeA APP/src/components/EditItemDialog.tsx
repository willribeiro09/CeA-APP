import React, { useState, useEffect } from 'react';
import { Item, ValidationError, Expense, Project, StockItem, Employee } from '../types';

interface EditItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: (Expense | Project | StockItem | Employee) | null;
  onSubmit: (data: Partial<Item>) => void;
  selectedWeekStart?: Date;
}

export function EditItemDialog({ isOpen, onOpenChange, item, onSubmit, selectedWeekStart }: EditItemDialogProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) return;
    
    let updatedItem: Partial<Item> = { ...formData };
    
    console.log("Updated data:", updatedItem);
    setErrors([]);
    onSubmit(updatedItem);
    onOpenChange(false);
  };

  const getFieldError = (fieldName: string) => {
    return errors.find(error => error.field === fieldName)?.message;
  };

  const getItemCategory = (item: Expense | Project | StockItem | Employee): string => {
    if ('description' in item) return 'Expenses';
    if ('client' in item) return 'Projects';
    if ('quantity' in item) return 'Stock';
    return 'Employees';
  };

  if (!item) return null;

  const category = getItemCategory(item);

  return (
    <div className={`fixed inset-0 bg-black/50 z-50 ${isOpen ? 'flex' : 'hidden'} items-center justify-center`}>
      <div className="bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {category === 'Expenses' ? 'Edit Expense' : 
             category === 'Projects' ? 'Edit Project' : 
             category === 'Stock' ? 'Edit Inventory Item' :
             'Edit Employee'}
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
                  value={formData.description || ''}
                  onChange={handleChange}
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
                  value={formData.amount || ''}
                  onChange={handleChange}
                  step="0.01"
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