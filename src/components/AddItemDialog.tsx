import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Item, ValidationError } from '../types';
import { validation } from '../lib/validation';

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
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    
    let itemData: Partial<Item>;
    
    if (category === 'Expenses') {
      itemData = {
        ...data,
        amount: parseFloat(data.amount as string),
        dueDate: new Date(data.dueDate as string),
        paid: false,
        category: 'Expenses'
      };
    } else if (category === 'Projects') {
      itemData = {
        ...data,
        startDate: new Date(data.startDate as string),
        status: 'pending',
        category: 'Projects'
      };
    } else if (category === 'Stock') {
      itemData = {
        ...data,
        quantity: parseInt(data.quantity as string),
        category: 'Stock'
      };
    } else {
      itemData = {
        ...data,
        daysWorked: 0,
        weekStartDate: new Date(data.weekStartDate as string),
        category: 'Employees',
        dailyRate: 250,
        employeeName: data.name as string
      };
    }

    const validationResult = validation.validateItem(itemData);
    if (!validationResult.isValid) {
      setErrors(validationResult.errors);
      return;
    }

    setErrors([]);
    onSubmit(itemData);
    onOpenChange(false);
  };

  const getFieldError = (fieldName: string) => {
    return errors.find(error => error.field === fieldName)?.message;
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-md">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Add {category === 'Expenses' ? 'Expense' : 
                   category === 'Projects' ? 'Project' : 
                   category === 'Stock' ? 'Stock Item' :
                   'Work Record'}
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {category === 'Expenses' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Expense Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50 ${
                      getFieldError('name') ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('name') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
                  )}
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
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50 ${
                      getFieldError('amount') ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('amount') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('amount')}</p>
                  )}
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
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50 ${
                      getFieldError('dueDate') ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('dueDate') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('dueDate')}</p>
                  )}
                </div>
              </>
            )}
            
            {category === 'Projects' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50 ${
                      getFieldError('name') ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('name') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50 ${
                      getFieldError('description') ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('description') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('description')}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50 ${
                      getFieldError('startDate') ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('startDate') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('startDate')}</p>
                  )}
                </div>
              </>
            )}
            
            {category === 'Stock' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Item Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50 ${
                      getFieldError('name') ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('name') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50 ${
                      getFieldError('quantity') ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('quantity') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('quantity')}</p>
                  )}
                </div>
              </>
            )}

            {category === 'Employees' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Employee Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50 ${
                      getFieldError('name') ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('name') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
                  )}
                </div>
                <input 
                  type="hidden"
                  id="weekStartDate"
                  name="weekStartDate"
                  value={selectedWeekStart?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]}
                />
                <input
                  type="hidden"
                  id="employeeName"
                  name="employeeName"
                  value=""
                />
              </>
            )}
            
            <div className="flex justify-end gap-3 mt-6">
              <Dialog.Close className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800">
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                className="px-4 py-2 bg-[#5ABB37] text-white rounded-md text-sm font-medium hover:bg-[#4a9e2e] transition-colors"
              >
                Add
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}