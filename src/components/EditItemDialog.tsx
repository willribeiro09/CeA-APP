import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Item, ValidationError, Expense, Project, StockItem, Employee, BaseItem } from '../types';
import { validation, normalizeMonetaryValue } from '../lib/validation';
import { normalizeDate, formatDateToISO, parseISODate } from '../lib/dateUtils';

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
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    
    let itemData: Partial<Item>;
    let validationError: string | null = null;
    
    if (item && 'description' in item) {
      // É uma despesa
      const recurrence = data.recurrence as string;
      
      // Clean current description from recurrence suffixes
      let description = (data.description as string)
        .replace(/\*[MBW]$/, ''); // Remove existing suffixes
      
      // Add new recurrence suffix
      if (recurrence === 'monthly') {
        description += '*M';
      } else if (recurrence === 'biweekly') {
        description += '*B';
      } else if (recurrence === 'weekly') {
        description += '*W';
      }
      
      itemData = {
        ...item,
        description,
        amount: parseFloat(data.amount as string),
        date: (parseISODate(data.dueDate as string) || new Date()).toISOString(),
        category: 'Expenses',
        // Preservar o status de pagamento existente
        is_paid: (item as Expense).is_paid,
        paid: (item as Expense).paid
      };
      
      validationError = validation.expense(itemData as Partial<Expense>);
    } else if (item && 'client' in item) {
      // É um projeto
      try {
        // Necessário extrair cada campo individualmente para evitar problemas
        const projectItem = item as Project;
        
        // IMPORTANTE: Preservar o ID original!
        const projectId = projectItem.id;
        
        const projectClient = data.client as string;
        const projectLocation = data.location as string;
        const projectNumber = data.projectNumber as string;
        const projectNotes = data.notes as string;
        
        // Normalizar datas (importante para funcionar corretamente)
        // Para formulários de data HTML, usar parseISODate e depois formatDateToISO para evitar problemas de fuso
        // Se a data foi alterada no formulário, usar a nova data; senão, preservar a original
        const projectStartDate = data.startDate ? 
          formatDateToISO(parseISODate(data.startDate as string) || new Date(projectItem.startDate)) : 
          projectItem.startDate;
        const projectStatus = data.status as 'pending' | 'in_progress' | 'completed';
        const projectValue = normalizeMonetaryValue(data.value as string);
        const invoiceOk = data.invoiceOk === 'on';
        
        // Criar um objeto limpo com todos os campos necessários
        // NÃO estamos mais desestruturando o objeto original para evitar problemas
        itemData = {
          id: projectId, // PRESERVAR O ID ORIGINAL É CRUCIAL!
          name: projectClient, // Usando client como name
          client: projectClient,
          location: projectLocation,
          projectNumber: projectNumber,
          value: projectValue,
          startDate: projectStartDate,
          status: projectStatus,
          invoiceOk: invoiceOk,
          // Preservar outros campos que podem existir
          description: projectItem.description,
          endDate: projectItem.endDate,
          notes: projectNotes || projectItem.notes || '',
          photos: projectItem.photos || []
        };
        
        validationError = validation.project(itemData as Partial<Project>);
      } catch (error) {
        console.error("Erro no processamento dos dados do projeto:", error);
        setErrors([{ field: 'form', message: 'Erro no processamento dos dados do projeto. Tente novamente.' }]);
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
      } as Partial<StockItem>;
      
      validationError = validation.stockItem(itemData as Partial<StockItem>);
    } else if (item && 'employeeName' in item) {
      // É um funcionário
      
      
      itemData = {
        ...item,
        id: (item as Employee).id,
        name: data.name as string,
        dailyRate: parseFloat(data.dailyRate as string) || 250,
        category: 'Employees'
      };
      
      validationError = validation.employee(itemData as Partial<Employee>);
    } else {
      console.error("Categoria de item desconhecida");
      return;
    }

    if (validationError) {
      setErrors([{ field: 'form', message: validationError }]);
      return;
    }

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
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-md z-[100]"
          onOpenAutoFocus={(e: React.FocusEvent) => {
            // Previne o foco automático que pode causar scroll
            e.preventDefault();
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {item && 'description' in item ? 'Editar Despesa' : 
               item && 'client' in item ? 'Editar Projeto' : 
               item && 'name' in item && 'quantity' in item ? 'Editar Item do Estoque' : 'Editar Funcionário'}
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Formulário para editar {item && 'description' in item ? 'a despesa selecionada' : 
             item && 'client' in item ? 'o projeto selecionado' : 
             item && 'name' in item && 'quantity' in item ? 'o item do estoque selecionado' : 'o funcionário selecionado'}
          </Dialog.Description>
          
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
                    defaultValue={(item as Expense).description.replace(/\*[MBW]$/, '')}
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
                    defaultValue={formatDateToISO(parseISODate((item as Expense).date) || new Date())}
                    required
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="recurrence" className="block text-sm font-medium text-gray-700">
                    Recurrence
                  </label>
                  <select
                    id="recurrence"
                    name="recurrence"
                    defaultValue={
                      (item as Expense).description.endsWith('*M') ? 'monthly' :
                      (item as Expense).description.endsWith('*B') ? 'biweekly' :
                      (item as Expense).description.endsWith('*W') ? 'weekly' : 'none'
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  >
                    <option value="none">One-time expense</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
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
                    type="text"
                    id="value"
                    name="value"
                    defaultValue={(item as Project).value || ''}
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
                    defaultValue={formatDateToISO(parseISODate((item as Project).startDate) || new Date())}
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
                    <option value="pending">Pending</option>
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
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={(item as Project).notes || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                    placeholder="Add project notes..."
                  />
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