import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Item, ValidationError, Expense, Project, StockItem, Employee, PendingChange } from '../types';
import { validation, normalizeMonetaryValue } from '../lib/validation';
import { normalizeDate, formatDateToISO } from '../lib/dateUtils';
import { v4 as uuidv4 } from 'uuid';
import { syncService } from '../lib/sync';

interface AddItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  onSubmit: (data: Partial<Item>) => void;
  selectedWeekStart?: Date;
  onRequestClose: () => void;
}

export function AddItemDialog({ isOpen, onOpenChange, category, onSubmit, selectedWeekStart, onRequestClose }: AddItemDialogProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('dialog-open');
    } else {
      document.body.classList.remove('dialog-open');
    }
    
    return () => {
      document.body.classList.remove('dialog-open');
    };
  }, [isOpen]);

  const handleInputFocus = () => {
    document.body.classList.add('input-focused');
  };

  const handleInputBlur = () => {
    document.body.classList.remove('input-focused');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    let itemData: Partial<Item>;
    let validationError: string | null = null;
    
    if (category === 'Expenses') {
      const dueDate = formData.get('dueDate') ? normalizeDate(new Date(formData.get('dueDate') as string)) : new Date();
      
      itemData = {
        description: formData.get('description') as string,
        amount: parseFloat(formData.get('amount') as string),
        date: dueDate.toISOString(),
        category: 'Expenses',
        paid: false
      } as Partial<Expense>;
      validationError = validation.expense(itemData as Partial<Expense>);
    } else if (category === 'Projects') {
      const startDate = formData.get('startDate') ? normalizeDate(new Date(formData.get('startDate') as string)) : new Date();
      const endDate = formData.get('endDate') ? normalizeDate(new Date(formData.get('endDate') as string)) : undefined;
      
      console.log('Dados brutos do formulário de projeto:', formData);
      console.log('startDate processada:', startDate);
      console.log('Valor bruto:', formData.get('value'));
      
      const projectValue = normalizeMonetaryValue(formData.get('value') as string);
      console.log('Valor normalizado:', projectValue);
      
      itemData = {
        id: uuidv4(),
        name: formData.get('client') as string,
        client: formData.get('client') as string,
        projectNumber: formData.get('projectNumber') as string || '',
        location: formData.get('location') as string || '',
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString(),
        status: formData.get('status') as 'completed' | 'in_progress',
        value: projectValue,
        invoiceOk: (formData.get('invoiceOk') === 'on'),
        category: 'Projects'
      } as Partial<Project>;
      
      console.log("Dados de projeto formatados completos:", itemData);
      validationError = validation.project(itemData as Partial<Project>);
    } else if (category === 'Stock') {
      itemData = {
        name: formData.get('name') as string,
        quantity: parseInt(formData.get('quantity') as string),
        unit: formData.get('unit') as string,
        category: 'Stock'
      } as Partial<StockItem>;
      validationError = validation.stockItem(itemData as Partial<StockItem>);
    } else {
      const startDateString = selectedWeekStart?.toISOString() || new Date().toISOString();
      const startDate = startDateString ? normalizeDate(new Date(startDateString)) : normalizeDate(new Date());
      
      const weekStartDateISO = formatDateToISO(startDate);
      
      itemData = {
        name: formData.get('name') as string,
        employeeName: formData.get('name') as string,
        weekStartDate: startDate.toISOString(),
        daysWorked: 0,
        dailyRate: parseFloat(formData.get('dailyRate') as string) || 250,
        category: 'Employees',
        workedDates: []
      } as Partial<Employee>;
      validationError = validation.employee(itemData as Partial<Employee>);
    }

    if (validationError) {
      console.error("Erro de validação:", validationError);
      setErrors([{ field: 'form', message: validationError }]);
      return;
    }

    try {
      onSubmit(itemData);
      
      if (!navigator.onLine) {
        console.log('Operação offline detectada, registrando para sincronização posterior');
        const change: Omit<PendingChange, 'id' | 'timestamp' | 'syncStatus'> = {
          type: 'add',
          entity: category.toLowerCase() as any,
          data: itemData
        };
        
        await syncService.addOfflineChange(change);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      setErrors([{ field: 'form', message: 'Ocorreu um erro ao adicionar o item.' }]);
    }
  };

  const getFieldError = (fieldName: string) => {
    return errors.find(error => error.field === fieldName)?.message;
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-md z-[100]"
          onOpenAutoFocus={(e: React.FocusEvent) => {
            e.preventDefault();
          }}
        >
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
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
              </>
            )}
            
            {category === 'Projects' && (
              <>
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
                  <label htmlFor="projectNumber" className="block text-sm font-medium text-gray-700">
                    Number
                  </label>
                  <input
                    type="text"
                    id="projectNumber"
                    name="projectNumber"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="value" className="block text-sm font-medium text-gray-700">
                    Value
                  </label>
                  <input
                    type="text"
                    id="value"
                    name="value"
                    placeholder="0.00"
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
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="invoiceOk" className="block text-sm font-medium text-gray-700">
                    Invoice OK
                  </label>
                  <input
                    type="checkbox"
                    id="invoiceOk"
                    name="invoiceOk"
                    className="mt-1"
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