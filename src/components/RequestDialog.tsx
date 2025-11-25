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

interface RequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'invoice' | 'estimate';
  projects: Project[];
  onSuccess: () => void;
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

export function RequestDialog({ isOpen, onClose, type, projects, onSuccess }: RequestDialogProps) {
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
      total: 0
    }
  ]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Calculate total value
  const totalValue = useMemo(() => {
    return workItems.reduce((sum, item) => sum + item.total, 0);
  }, [workItems]);

  const handleCustomerSelect = (client: { name: string; phone: string }) => {
    setCustomerName(client.name);
    setCustomerPhone(client.phone);
    setShowCustomerSuggestions(false);
  };

  const addWorkItem = () => {
    setWorkItems([
      ...workItems,
      {
        id: Date.now().toString(),
        workType: '5-Inch Gutter',
        color: 'White',
        quantity: 0,
        unitPrice: 0,
        total: 0
      }
    ]);
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
    // Validation
    if (!customerName.trim()) {
      alert('Customer name is required');
      return;
    }
    if (!customerPhone.trim()) {
      alert('Customer phone is required');
      return;
    }
    if (!address.trim()) {
      alert('Address is required');
      return;
    }
    
    // Check if all work items are valid
    const invalidItem = workItems.find(item => 
      item.quantity <= 0 || item.unitPrice <= 0
    );
    if (invalidItem) {
      alert('All work items must have quantity and unit price greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare work items data
      const workItemsData = workItems.map(item => ({
        workType: item.workType === 'Other' ? item.customWorkType : item.workType,
        color: item.color === 'Other' ? item.customColor : item.color,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      }));

      const requestPayload = {
        type,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        address: address.trim(),
        work_items: workItemsData,
        total_value: totalValue,
        status: 'Pending'
      };

      const { error } = await supabase
        .from('requests')
        .insert(requestPayload);

      if (error) throw error;

      // Enviar notificação ao Telegram (não bloqueia o fluxo)
      sendTelegramNotification({
        ...requestPayload,
        created_at: new Date().toISOString()
      });

      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setWorkItems([{
        id: '1',
        workType: '5-Inch Gutter',
        color: 'White',
        quantity: 0,
        unitPrice: 0,
        total: 0
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

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setWorkItems([{
        id: '1',
        workType: '5-Inch Gutter',
        color: 'White',
        quantity: 0,
        unitPrice: 0,
        total: 0
      }]);
    }
  }, [isOpen]);

  const isStep1Complete = customerName.trim() && customerPhone.trim() && address.trim();

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl w-full h-full md:h-[90vh] bg-white md:rounded-2xl shadow-lg flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">
              {type === 'invoice' ? 'Invoice' : 'Estimate'}
            </h2>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded-full hover:bg-blue-700 transition-colors">
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
                    Phone <span className="text-red-500">*</span>
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
                    Address <span className="text-red-500">*</span>
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
                    const isLastItem = index === workItems.length - 1;
                    const displayWorkType = item.workType === 'Other' ? item.customWorkType || 'Other' : item.workType;
                    const displayColor = item.color === 'Other' ? item.customColor || 'Other' : item.color;
                    
                    // Itens anteriores: mostrar resumo compacto
                    if (!isLastItem) {
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
                    
                    // Último item: mostrar formulário editável
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
                      </div>
                    );
                  })}

                  {/* Add Work Item Button */}
                  <button
                    onClick={addWorkItem}
                    className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Work Item
                  </button>
                </div>
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
              className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

