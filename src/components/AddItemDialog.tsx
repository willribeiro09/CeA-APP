import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Item, ValidationError, Expense, Project, StockItem, Employee } from '../types';
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
    console.log("Formulário enviado");
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    console.log("Dados do formulário:", data);
    
    let itemData: Partial<Item>;
    let validationError: string | null = null;
    
    if (category === 'Expenses') {
      itemData = {
        description: data.description as string,
        amount: parseFloat(data.amount as string),
        date: new Date(data.dueDate as string).toISOString(),
        category: 'Expenses',
        is_paid: false
      };
      console.log("Dados de despesa formatados:", itemData);
      validationError = validation.expense(itemData as Partial<Expense>);
    } else if (category === 'Projects') {
      itemData = {
        name: data.name as string,
        description: data.description as string,
        client: data.client as string,
        startDate: new Date(data.startDate as string).toISOString(),
        status: 'pending',
        category: 'Projects'
      };
      console.log("Dados de projeto formatados:", itemData);
      validationError = validation.project(itemData as Partial<Project>);
    } else if (category === 'Stock') {
      itemData = {
        name: data.name as string,
        quantity: parseInt(data.quantity as string),
        unit: data.unit as string,
        category: 'Stock'
      };
      console.log("Dados de estoque formatados:", itemData);
      validationError = validation.stockItem(itemData as Partial<StockItem>);
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
      console.log("Dados de funcionário formatados:", itemData);
      validationError = validation.employee(itemData as Partial<Employee>);
    }

    if (validationError) {
      console.error("Erro de validação:", validationError);
      setErrors([{ field: 'form', message: validationError }]);
      return;
    }

    console.log("Dados válidos, chamando onSubmit com:", itemData);
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
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-md z-50">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {category === 'Expenses' ? 'New Expense' : 
               category === 'Projects' ? 'New Project' : 
               category === 'Stock' ? 'New Inventory Item' :
               'New Employee'}
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="client" className="block text-sm font-medium text-gray-700">
                    Client
                  </label>
                  <input
                    type="text"
                    id="client"
                    name="client"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                    Unit
                  </label>
                  <input
                    type="text"
                    id="unit"
                    name="unit"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="dailyRate" className="block text-sm font-medium text-gray-700">
                    Daily Rate ($)
                  </label>
                  <input
                    type="number"
                    id="dailyRate"
                    name="dailyRate"
                    defaultValue="250"
                    min="1"
                    step="1"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
                <input 
                  type="hidden"
                  id="weekStartDate"
                  name="weekStartDate"
                  value={selectedWeekStart?.toISOString() || new Date().toISOString()}
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