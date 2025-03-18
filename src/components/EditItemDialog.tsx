import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Item, ValidationError, Expense, Project, StockItem, Employee, BaseItem } from '../types';
import { validation } from '../lib/validation';

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

  // Atualizar o formData quando o item mudar
  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  // Adicionar/remover classe ao body quando o diálogo estiver aberto/fechado
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('dialog-open');
    } else {
      document.body.classList.remove('dialog-open');
    }
    
    // Cleanup ao desmontar o componente
    return () => {
      document.body.classList.remove('dialog-open');
    };
  }, [isOpen]);

  // Gerenciamento de foco para inputs de data
  const handleInputFocus = () => {
    document.body.classList.add('input-focused');
  };

  const handleInputBlur = () => {
    document.body.classList.remove('input-focused');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Formulário de edição enviado");
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    console.log("Dados do formulário:", data);
    
    let itemData: Partial<Item>;
    let validationError: string | null = null;
    
    if (item && 'description' in item) {
      // É uma despesa
      itemData = {
        ...item,
        description: data.description as string,
        amount: parseFloat(data.amount as string),
        date: new Date(data.dueDate as string).toISOString(),
        category: 'Expenses'
      };
      console.log("Dados de despesa formatados:", itemData);
      validationError = validation.expense(itemData as Partial<Expense>);
    } else if (item && 'client' in item) {
      // É um projeto
      try {
        console.log("Processing project for editing:", item);
        
        // Usar type assertion mais segura para garantir que o item seja tratado como Project
        const projectItem = item as unknown as Project;
        
        // Garantir que todos os campos estejam presentes e com valores válidos
        const projectClient = data.client as string || projectItem.client || '';
        const projectLocation = data.location as string || projectItem.location || '';
        const projectNumber = data.projectNumber as string || projectItem.projectNumber || '';
        
        // Tratar o valor como número, com fallback para o valor atual ou zero
        let projectValue = 0;
        try {
          projectValue = parseFloat(data.value as string);
          if (isNaN(projectValue)) {
            projectValue = projectItem.value || 0;
          }
        } catch (e) {
          console.error("Error processing project value:", e);
          projectValue = projectItem.value || 0;
        }
        
        // Tratar a data com fallback para a data atual ou a data do item
        let projectStartDate = '';
        try {
          projectStartDate = new Date(data.startDate as string).toISOString();
        } catch (e) {
          console.error("Error processing project date:", e);
          projectStartDate = projectItem.startDate || new Date().toISOString();
        }
        
        // Garantir que o status seja um dos valores válidos
        const projectStatus = ['completed', 'in_progress'].includes(data.status as string) 
          ? data.status as 'completed' | 'in_progress'
          : 'in_progress'; // Defaulting to 'in_progress' instead of checking for 'pending'
        
        // Verificar se o invoice está OK
        const invoiceOk = data.invoiceOk === 'on';
        
        // Criar um objeto limpo sem o spread operator (que pode causar problemas)
        itemData = {
          id: projectItem.id,
          name: projectClient, // Usando client como name
          client: projectClient,
          location: projectLocation,
          projectNumber: projectNumber,
          value: projectValue,
          startDate: projectStartDate,
          status: projectStatus,
          invoiceOk: invoiceOk
        };
        
        console.log("Project data formatted - SAFE VERSION:", itemData);
        validationError = validation.project(itemData as Partial<Project>);
      } catch (error) {
        console.error("Error processing project data:", error);
        setErrors([{ field: 'form', message: 'Error processing project data. Please try again.' }]);
        return;
      }
    } else if (item && 'quantity' in item) {
      // É um item de estoque
      itemData = {
        ...item,
        name: data.name as string,
        quantity: parseInt(data.quantity as string),
        unit: data.unit as string,
        category: 'Stock'
      };
      console.log("Dados de estoque formatados:", itemData);
      validationError = validation.stockItem(itemData as Partial<StockItem>);
    } else if (item && 'employeeName' in item) {
      // É um funcionário
      console.log("Formatando dados de funcionário:", data);
      
      itemData = {
        ...item,
        id: (item as Employee).id,
        name: data.name as string,
        dailyRate: parseFloat(data.dailyRate as string) || 250,
        category: 'Employees'
      };
      console.log("Dados de funcionário formatados para edição:", itemData);
      validationError = validation.employee(itemData as Partial<Employee>);
    } else {
      console.error("Categoria de item desconhecida");
      return;
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

  if (!item) return null;

  // Determinar a categoria do item
  const getItemCategory = (item: Expense | Project | StockItem | Employee): string => {
    if ('description' in item) return 'Expenses';
    if ('client' in item) return 'Projects';
    if ('quantity' in item) return 'Stock';
    if ('employeeName' in item) return 'Employees';
    return '';
  };

  const itemCategory = getItemCategory(item);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-[2px]" />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-md z-50"
          onOpenAutoFocus={(e: React.FocusEvent) => {
            // Previne o foco automático que pode causar scroll
            e.preventDefault();
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {itemCategory === 'Expenses' ? 'Editar Despesa' : 
               itemCategory === 'Projects' ? 'Editar Projeto' : 
               itemCategory === 'Stock' ? 'Editar Item de Estoque' :
               'Editar Funcionário'}
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
            
            {itemCategory === 'Expenses' && (
              <>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    defaultValue={(item as Expense).description}
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
                    defaultValue={(item as Expense).amount}
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
                    defaultValue={new Date((item as Expense).date).toISOString().split('T')[0]}
                    required
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
              </>
            )}
            
            {itemCategory === 'Projects' && (
              <>
                <div>
                  <label htmlFor="client" className="block text-sm font-medium text-gray-700">
                    Client
                  </label>
                  <input
                    type="text"
                    id="client"
                    name="client"
                    defaultValue={(item as Project).client}
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
                    defaultValue={(item as Project).projectNumber || ''}
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
                    defaultValue={(item as Project).location || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="value" className="block text-sm font-medium text-gray-700">
                    Value
                  </label>
                  <input
                    type="number"
                    id="value"
                    name="value"
                    defaultValue={(item as Project).value || ''}
                    step="0.01"
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
                    defaultValue={new Date((item as Project).startDate).toISOString().split('T')[0]}
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
                    defaultValue={(item as Project).status}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="invoiceOk"
                    name="invoiceOk"
                    defaultChecked={(item as Project).invoiceOk}
                    className="h-4 w-4 text-[#5ABB37] focus:ring-[#5ABB37] border-gray-300 rounded"
                  />
                  <label htmlFor="invoiceOk" className="ml-2 block text-sm text-gray-700">
                    Invoice OK
                  </label>
                </div>
              </>
            )}
            
            {itemCategory === 'Stock' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Item Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={(item as StockItem).name}
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
                    defaultValue={(item as StockItem).quantity}
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
                    defaultValue={(item as StockItem).unit}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
              </>
            )}

            {itemCategory === 'Employees' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Employee Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={(item as Employee).name}
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
                    defaultValue={(item as Employee).dailyRate || 250}
                    min="1"
                    step="1"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
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
                Save
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 