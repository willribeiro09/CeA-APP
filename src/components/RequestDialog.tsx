import React, { useState, useMemo, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2 } from 'lucide-react';
import { Project } from '../types';
import { supabase } from '../lib/supabase';

// Função para enviar notificação ao Telegram
async function sendTelegramNotification(requestData: {
  type: 'invoice' | 'estimate';
  customer_name: string;
  customer_phone: string;
  address: string;
  work_items: any[];
  total_value: number;
  status: string;
  created_at: string;
  send_from?: string[]; // Array com os nomes selecionados
  isEdit?: boolean; // Indica se é uma edição
}) {
  try {
    const response = await fetch(
      'https://mnucrulwdurskwofsgwp.supabase.co/functions/v1/send-telegram-notification',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udWNydWx3ZHVyc2t3b2ZzZ3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNzg3ODksImV4cCI6MjA1Njc1NDc4OX0.39iA0f1vEH2K8ygEobuv6O_FR8Fm8H2UXHzPkAZmm60',
        },
        body: JSON.stringify(requestData),
      }
    );
    
    if (!response.ok) {
      console.error('Failed to send Telegram notification:', await response.text());
    }
  } catch (error) {
    // Não bloquear o fluxo se falhar
    console.error('Error sending Telegram notification:', error);
  }
}

interface RequestData {
  id: string;
  type: 'invoice' | 'estimate';
  customer_name: string;
  customer_phone: string;
  address: string;
  work_items: Array<{
    workType: string;
    color: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  total_value: number;
  status: string;
  created_at: string;
  send_from?: string[]; // Array com os nomes selecionados
}

interface RequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'invoice' | 'estimate';
  projects: Project[];
  onSuccess: () => void;
  editingRequest?: RequestData | null; // Request para edição
}

interface WorkItem {
  id: string;
  workType: string;
  customWorkType?: string;
  color: string;
  customColor?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isConfirmed?: boolean; // Indica que o item foi confirmado e deve aparecer como compacto
}

const WORK_TYPES = [
  '5-Inch Gutter',
  '6-Inch Gutter',
  '5-Inch Downspout',
  '6-Inch Downspout',
  'GutterGuard',
  'GutterGuard Premium',
  'Cleaning',
  'Other'
];

const COLORS = ['White', 'Black', 'Bronze', 'Other'];

export function RequestDialog({ isOpen, onClose, type, projects, onSuccess, editingRequest }: RequestDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [workItems, setWorkItems] = useState<WorkItem[]>([
    {
      id: '1',
      workType: '5-Inch Gutter',
      color: 'White',
      quantity: 0,
      unitPrice: 0,
      total: 0,
      isConfirmed: false
    }
  ]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendFrom, setSendFrom] = useState<{ carlos: boolean; diego: boolean; ciaPhone: boolean }>({
    carlos: false,
    diego: false,
    ciaPhone: false
  });

  // Get unique clients from projects
  const clientsList = useMemo(() => {
    const clients = new Map<string, { name: string; phone: string }>();
    projects.forEach(p => {
      if (p.client && !clients.has(p.client.toLowerCase())) {
        clients.set(p.client.toLowerCase(), {
          name: p.client,
          phone: p.projectNumber || ''
        });
      }
    });
    return Array.from(clients.values());
  }, [projects]);

  // Filter clients based on input
  const filteredClients = useMemo(() => {
    if (!customerName || customerName.length < 2) return [];
    const search = customerName.toLowerCase();
    return clientsList.filter(c => c.name.toLowerCase().includes(search));
  }, [customerName, clientsList]);

  // Calculate total value (only confirmed items)
  const totalValue = useMemo(() => {
    return workItems
      .filter(item => item.isConfirmed)
      .reduce((sum, item) => sum + item.total, 0);
  }, [workItems]);

  const handleCustomerSelect = (client: { name: string; phone: string }) => {
    setCustomerName(client.name);
    setCustomerPhone(client.phone);
    setShowCustomerSuggestions(false);
  };

  const addWorkItem = () => {
    // Criar um novo item editável
    setWorkItems([
      ...workItems,
      {
        id: Date.now().toString(),
        workType: '5-Inch Gutter',
        color: 'White',
        quantity: 0,
        unitPrice: 0,
        total: 0,
        isConfirmed: false
      }
    ]);
  };

  const confirmWorkItem = () => {
    // Encontrar o último item não confirmado (editável)
    const unconfirmedItems = workItems.filter(item => !item.isConfirmed);
    if (unconfirmedItems.length === 0) return;
    
    const lastUnconfirmedItem = unconfirmedItems[unconfirmedItems.length - 1];
    
    // Validar se o item está preenchido
    if (!lastUnconfirmedItem.workType || lastUnconfirmedItem.quantity <= 0 || lastUnconfirmedItem.unitPrice <= 0) {
      alert('Please fill in all required fields (Work Type, Quantity, and Unit Price)');
      return;
    }
    
    // Se o workType ou color for "Other", validar campos customizados
    if (lastUnconfirmedItem.workType === 'Other' && !lastUnconfirmedItem.customWorkType?.trim()) {
      alert('Please specify the custom work type');
      return;
    }
    
    if (lastUnconfirmedItem.color === 'Other' && !lastUnconfirmedItem.customColor?.trim()) {
      alert('Please specify the custom color');
      return;
    }
    
    // Marcar o item como confirmado (não cria novo item)
    setWorkItems(workItems.map(item => 
      item.id === lastUnconfirmedItem.id 
        ? { ...item, isConfirmed: true }
        : item
    ));
  };

  const removeWorkItem = (id: string) => {
    if (workItems.length > 1) {
      setWorkItems(workItems.filter(item => item.id !== id));
    }
  };

  const updateWorkItem = (id: string, field: keyof WorkItem, value: any) => {
    setWorkItems(workItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalculate total when quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleSubmit = async () => {
    // Determinar o tipo do request (edição ou novo)
    const requestType = editingRequest ? editingRequest.type : type;
    
    // Validation - apenas nome obrigatório para invoice
    if (!customerName.trim()) {
      alert('Customer name is required');
      return;
    }
    
    // Preparar dados que serão usados independente do tipo
    const selectedSendFrom = [];
    if (sendFrom.carlos) selectedSendFrom.push('Carlos');
    if (sendFrom.diego) selectedSendFrom.push('Diego');
    if (sendFrom.ciaPhone) selectedSendFrom.push('Cia Phone');
    
    // Check if at least one "Send PDF to" option is selected (obrigatório para ambos)
    if (selectedSendFrom.length === 0) {
      alert('Please select at least one "Send PDF to" option');
      return;
    }
    
    // Filter only confirmed work items
    const confirmedWorkItems = workItems.filter(item => item.isConfirmed);
    
    // Para estimate, manter validações completas
    if (requestType === 'estimate') {
      if (!customerPhone.trim()) {
        alert('Customer phone is required');
        return;
      }
      if (!address.trim()) {
        alert('Address is required');
        return;
      }
      
      // Check if there's at least one confirmed work item (apenas para estimate)
      if (confirmedWorkItems.length === 0) {
        alert('Please add and confirm at least one work item');
        return;
      }
      
      // Check if all confirmed work items are valid (apenas para estimate)
      const invalidItem = confirmedWorkItems.find(item => {
        // Check quantity and unit price
        if (item.quantity <= 0 || item.unitPrice <= 0) {
          return true;
        }
        // Check if "Other" work type has custom value
        if (item.workType === 'Other' && !item.customWorkType?.trim()) {
          return true;
        }
        // Check if "Other" color has custom value
        if (item.color === 'Other' && !item.customColor?.trim()) {
          return true;
        }
        return false;
      });
      if (invalidItem) {
        alert('All work items must have valid quantity, unit price, and custom values (if "Other" is selected)');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare work items data (only confirmed items, pode ser array vazio para invoice)
      const workItemsData = confirmedWorkItems.map(item => ({
        workType: item.workType === 'Other' ? (item.customWorkType || 'Other') : item.workType,
        color: item.color === 'Other' ? (item.customColor || 'Other') : item.color,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      }));

      // Payload para Supabase (com send_from)
      const requestPayload = {
        type: editingRequest ? editingRequest.type : type,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        address: address.trim(),
        work_items: workItemsData,
        total_value: totalValue,
        status: editingRequest ? editingRequest.status : 'Pending',
        send_from: selectedSendFrom // Array de nomes selecionados
      };

      // Payload para Telegram (mesmo que Supabase)
      const telegramPayload = {
        ...requestPayload
      };

      if (editingRequest) {
        // Update existing request
        const { error } = await supabase
          .from('requests')
          .update(requestPayload)
          .eq('id', editingRequest.id);

        if (error) throw error;

        // Enviar notificação ao Telegram quando editar (não bloqueia o fluxo)
        sendTelegramNotification({
          ...telegramPayload,
          created_at: editingRequest.created_at,
          isEdit: true
        });
      } else {
        // Insert new request
        const { error } = await supabase
          .from('requests')
          .insert(requestPayload);

        if (error) throw error;

        // Enviar notificação ao Telegram para novos requests (não bloqueia o fluxo)
        sendTelegramNotification({
          ...telegramPayload,
          created_at: new Date().toISOString(),
          isEdit: false
        });
      }

      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setSendFrom({
        carlos: false,
        diego: false,
        ciaPhone: false
      });
      setWorkItems([{
        id: '1',
        workType: '5-Inch Gutter',
        color: 'White',
        quantity: 0,
        unitPrice: 0,
        total: 0,
        isConfirmed: false
      }]);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preencher campos quando estiver editando ou resetar quando fechar
  useEffect(() => {
    if (isOpen && editingRequest) {
      // Modo edição: preencher com dados do request
      setCustomerName(editingRequest.customer_name);
      setCustomerPhone(editingRequest.customer_phone);
      setAddress(editingRequest.address);
      
      // Preencher Send PDF to se existir
      if (editingRequest.send_from && Array.isArray(editingRequest.send_from)) {
        setSendFrom({
          carlos: editingRequest.send_from.includes('Carlos'),
          diego: editingRequest.send_from.includes('Diego'),
          ciaPhone: editingRequest.send_from.includes('Cia Phone')
        });
      } else {
        setSendFrom({
          carlos: false,
          diego: false,
          ciaPhone: false
        });
      }
      
      // Converter work_items para o formato do componente
      if (editingRequest.work_items && editingRequest.work_items.length > 0) {
        const convertedItems: WorkItem[] = editingRequest.work_items.map((item, index) => {
          const workType = item.workType || '';
          const color = item.color || '';
          
          return {
            id: (index + 1).toString(),
            workType: WORK_TYPES.includes(workType) ? workType : 'Other',
            customWorkType: WORK_TYPES.includes(workType) ? undefined : workType,
            color: COLORS.includes(color) ? color : 'Other',
            customColor: COLORS.includes(color) ? undefined : color,
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            total: item.total || 0,
            isConfirmed: true // Itens editados já estão confirmados
          };
        });
        setWorkItems(convertedItems);
      }
    } else if (!isOpen) {
      // Reset form quando fechar
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setSendFrom({
        carlos: false,
        diego: false,
        ciaPhone: false
      });
      setWorkItems([{
        id: '1',
        workType: '5-Inch Gutter',
        color: 'White',
        quantity: 0,
        unitPrice: 0,
        total: 0,
        isConfirmed: false
      }]);
    }
  }, [isOpen, editingRequest]);

  const isStep1Complete = customerName.trim() && customerPhone.trim() && address.trim();

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl w-full h-full md:h-[90vh] bg-white md:rounded-2xl shadow-lg flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-[#073863] px-4 py-3 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-semibold text-white">
              {editingRequest 
                ? `Edit ${editingRequest.type === 'invoice' ? 'Invoice' : 'Estimate'}`
                : (type === 'invoice' ? 'Invoice' : 'Estimate')
              }
            </h2>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded-full hover:bg-[#052a4a] transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Customer Data */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Information</h3>
              
              <div className="space-y-2">
                {/* Customer Name with Autocomplete */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setShowCustomerSuggestions(true);
                    }}
                    onFocus={() => setShowCustomerSuggestions(true)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Enter customer name"
                  />
                  
                  {/* Autocomplete Suggestions */}
                  {showCustomerSuggestions && filteredClients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredClients.map((client, index) => (
                        <button
                          key={index}
                          onClick={() => handleCustomerSelect(client)}
                          className="w-full text-left p-2 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          {client.phone && (
                            <div className="text-xs text-gray-600">{client.phone}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Phone {editingRequest ? (editingRequest.type === 'estimate' ? <span className="text-red-500">*</span> : null) : (type === 'estimate' ? <span className="text-red-500">*</span> : null)}
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Phone number"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Address {editingRequest ? (editingRequest.type === 'estimate' ? <span className="text-red-500">*</span> : null) : (type === 'estimate' ? <span className="text-red-500">*</span> : null)}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Address"
                  />
                </div>
              </div>
            </div>

            {/* Work Items */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Work Items</h3>
                
                <div className="space-y-2">
                  {workItems.map((item, index) => {
                    const displayWorkType = item.workType === 'Other' ? item.customWorkType || 'Other' : item.workType;
                    const displayColor = item.color === 'Other' ? item.customColor || 'Other' : item.color;
                    
                    // Encontrar o último item não confirmado
                    const unconfirmedItems = workItems.filter(i => !i.isConfirmed);
                    const lastUnconfirmedItem = unconfirmedItems.length > 0 ? unconfirmedItems[unconfirmedItems.length - 1] : null;
                    const isEditableItem = lastUnconfirmedItem && item.id === lastUnconfirmedItem.id;
                    
                    // Itens confirmados ou não confirmados que não são o último: mostrar resumo compacto
                    if (item.isConfirmed || !isEditableItem) {
                      return (
                        <div key={item.id} className="p-2 border border-gray-200 rounded-lg bg-white flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-900">
                              {displayWorkType} - {displayColor} | Qty: {item.quantity} | ${item.unitPrice.toFixed(2)}/unit
                            </span>
                          </div>
                          <button
                            onClick={() => removeWorkItem(item.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    }
                    
                    // Último item não confirmado (editável): mostrar formulário editável
                    return (
                      <div key={item.id} className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                          {workItems.length > 1 && (
                            <button
                              onClick={() => removeWorkItem(item.id)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Work Type */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Work Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={item.workType}
                              onChange={(e) => updateWorkItem(item.id, 'workType', e.target.value)}
                              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              {WORK_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                            {item.workType === 'Other' && (
                              <input
                                type="text"
                                value={item.customWorkType || ''}
                                onChange={(e) => updateWorkItem(item.id, 'customWorkType', e.target.value)}
                                className="w-full mt-1 p-2 text-sm border border-gray-300 rounded-lg bg-white"
                                placeholder="Specify work type"
                              />
                            )}
                          </div>

                          {/* Color */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Color <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={item.color}
                              onChange={(e) => updateWorkItem(item.id, 'color', e.target.value)}
                              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              {COLORS.map(color => (
                                <option key={color} value={color}>{color}</option>
                              ))}
                            </select>
                            {item.color === 'Other' && (
                              <input
                                type="text"
                                value={item.customColor || ''}
                                onChange={(e) => updateWorkItem(item.id, 'customColor', e.target.value)}
                                className="w-full mt-1 p-2 text-sm border border-gray-300 rounded-lg bg-white"
                                placeholder="Specify color"
                              />
                            )}
                          </div>

                          {/* Quantity */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.quantity || ''}
                              onChange={(e) => updateWorkItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                              placeholder="0"
                            />
                          </div>

                          {/* Unit Price */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Unit Price <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice || ''}
                              onChange={(e) => updateWorkItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        
                        {/* OK, Next Button - aparece abaixo do item editável */}
                        <button
                          onClick={confirmWorkItem}
                          className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                        >
                          OK, Next
                        </button>
                      </div>
                    );
                  })}

                  {/* Add Work Item Button - aparece apenas quando não há item editável (todos estão confirmados) */}
                  {!workItems.some(item => !item.isConfirmed) && (
                    <button
                      onClick={addWorkItem}
                      className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Work Item
                    </button>
                  )}
                </div>
            </div>
          </div>

          {/* Send PDF to Section - Fixed above footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Send PDF to: <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendFrom.carlos}
                  onChange={(e) => setSendFrom({ ...sendFrom, carlos: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Carlos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendFrom.diego}
                  onChange={(e) => setSendFrom({ ...sendFrom, diego: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Diego</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendFrom.ciaPhone}
                  onChange={(e) => setSendFrom({ ...sendFrom, ciaPhone: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Cia Phone</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting 
                ? (editingRequest ? 'Updating...' : 'Submitting...') 
                : (editingRequest ? 'Update' : 'Submit')
              }
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

