import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, Image } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Item, ValidationError, Expense, Project, StockItem, Employee, ProjectPhoto } from '../types';
import { validation, normalizeMonetaryValue } from '../lib/validation';
import { normalizeDate, formatDateToISO, parseISODate } from '../lib/dateUtils';
import { v4 as uuidv4 } from 'uuid';
import { PhotoService } from '../lib/photoService';
import { getEnvironmentInfo } from '../lib/deviceUtils';

interface AddItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category: 'Expenses' | 'Projects' | 'Stock' | 'Employees';
  onSubmit: (data: Partial<Item>) => void;
  selectedWeekStart?: Date;
  selectedClient?: 'Power' | 'Private';
}

export function AddItemDialog({ isOpen, onOpenChange, category, onSubmit, selectedWeekStart, selectedClient }: AddItemDialogProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<ProjectPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('dialog-open');
    } else {
      document.body.classList.remove('dialog-open');
      // Limpar fotos quando o dialog for fechado
      setUploadedPhotos([]);
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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Criar um ID temporário para o projeto (será substituído quando o projeto for criado)
        const tempProjectId = 'temp-' + uuidv4();
        const deviceId = getEnvironmentInfo().deviceId;
        return await PhotoService.uploadPhoto(file, tempProjectId, deviceId);
      });

      const newPhotos = await Promise.all(uploadPromises);
      setUploadedPhotos(prev => [...prev, ...newPhotos]);
    } catch (error) {
      console.error('Erro ao fazer upload das fotos:', error);
      setErrors([{ field: 'photos', message: 'Erro ao fazer upload das fotos' }]);
    } finally {
      setIsUploading(false);
      // Limpar o input para permitir selecionar os mesmos arquivos novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setUploadedPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    
    let itemData: Partial<Item>;
    let validationError: string | null = null;
    
    if (category === 'Expenses') {
      // Usar parseISODate em vez de normalizeDate para evitar problema de data do dia anterior
      const dueDate = data.dueDate ? parseISODate(data.dueDate as string) || new Date() : new Date();
      const recurrence = data.recurrence as string;
      
      // Add recurrence suffix to description
      let description = data.description as string;
      if (recurrence === 'monthly') {
        description += '*M';
      } else if (recurrence === 'biweekly') {
        description += '*B';
      } else if (recurrence === 'weekly') {
        description += '*W';
      }
      
      itemData = {
        description,
        amount: parseFloat(data.amount as string),
        date: dueDate.toISOString(),
        category: 'Expenses',
        paid: false,
        is_paid: false
      } as Partial<Expense>;
      validationError = validation.expense(itemData as Partial<Expense>);
    } else if (category === 'Projects') {
      // Usar a data do formulário se fornecida, caso contrário usar selectedWeekStart
      // Para formulários de data HTML, usar parseISODate em vez de normalizeDate para evitar problemas de fuso
      const startDate = data.startDate ? parseISODate(data.startDate as string) || selectedWeekStart : selectedWeekStart;
      const endDate = data.endDate ? parseISODate(data.endDate as string) : undefined;
      
      // Garantir que temos todos os campos obrigatórios
      const projectValue = data.value ? normalizeMonetaryValue(data.value as string) : 0;
      
      // Criar o objeto do projeto com todos os campos obrigatórios
      // IMPORTANTE: clientType deve sempre usar o selectedClient atual, não o nome do projeto
      itemData = {
        id: uuidv4(),
        name: data.client as string,
        client: data.client as string,
        clientType: selectedClient, // Sempre usar o selectedClient atual (Private ou Power)
        projectNumber: data.projectNumber as string || '',
        location: data.location as string || '',
        startDate: startDate ? formatDateToISO(startDate) : formatDateToISO(selectedWeekStart),
        endDate: endDate ? formatDateToISO(endDate) : undefined,
        status: (data.status as 'completed' | 'in_progress') || 'in_progress',
        value: projectValue,
        invoiceOk: (data.invoiceOk === 'on'),
        notes: data.notes as string || '',
        photos: uploadedPhotos,
        lastModified: Date.now(), // Adicionar timestamp de criação
        category: 'Projects'
      } as Partial<Project>;
      validationError = validation.project(itemData as Partial<Project>);
    } else if (category === 'Stock') {
      itemData = {
        name: data.name as string,
        quantity: parseInt(data.quantity as string),
        unit: data.unit as string,
        category: 'Stock'
      } as Partial<StockItem>;
      validationError = validation.stockItem(itemData as Partial<StockItem>);
    } else {
      // É um funcionário
      const startDateString = selectedWeekStart?.toISOString() || new Date().toISOString();
      const startDate = startDateString ? normalizeDate(new Date(startDateString)) : normalizeDate(new Date());
      
      // Usar formatDateToISO para garantir formato correto
      const weekStartDateISO = formatDateToISO(startDate);
      
      itemData = {
        name: data.name as string,
        employeeName: data.name as string,
        weekStartDate: weekStartDateISO,
        daysWorked: 0,
        dailyRate: parseFloat(data.dailyRate as string) || 250,
        category: 'Employees',
        workedDates: []  // Inicializar com array vazio
      } as Partial<Employee>;
      validationError = validation.employee(itemData as Partial<Employee>);
    }

    if (validationError) {
      console.error("❌ Erro de validação:", validationError);
      setErrors([{ field: 'form', message: validationError }]);
      return;
    }

    setErrors([]);
    
    try {
      onSubmit(itemData);
      onOpenChange(false);
    } catch (error) {
      console.error("❌ Erro ao chamar onSubmit:", error);
      setErrors([{ field: 'form', message: 'Erro ao salvar item. Tente novamente.' }]);
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
            // Previne o foco automático que pode causar scroll
            e.preventDefault();
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {category === 'Expenses' ? 'Adicionar Despesa' : 
               category === 'Projects' ? 'Adicionar Projeto' : 
               category === 'Stock' ? 'Adicionar Item ao Estoque' : 'Adicionar Funcionário'}
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Formulário para adicionar {category === 'Expenses' ? 'uma nova despesa' : 
             category === 'Projects' ? 'um novo projeto' : 
             category === 'Stock' ? 'um novo item ao estoque' : 'um novo funcionário'}
          </Dialog.Description>
          
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
                <div>
                  <label htmlFor="recurrence" className="block text-sm font-medium text-gray-700">
                    Recurrence
                  </label>
                  <select
                    id="recurrence"
                    name="recurrence"
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
                  <label htmlFor="location" className="block text sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
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
                    defaultValue={selectedWeekStart ? formatDateToISO(selectedWeekStart) : formatDateToISO(new Date())}
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
                    defaultValue="pending"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                  >
                    <option value="pending">Pending</option>
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
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#5ABB37] focus:ring focus:ring-[#5ABB37] focus:ring-opacity-50"
                    placeholder="Add project notes..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photos
                  </label>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      disabled={isUploading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {isUploading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {uploadedPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {uploadedPhotos.map((photo) => (
                          <div key={photo.id} className="relative">
                            <img
                              src={photo.url}
                              alt="Uploaded photo"
                              className="w-full h-20 object-cover rounded-lg border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(photo.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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