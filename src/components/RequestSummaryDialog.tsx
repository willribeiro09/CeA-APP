import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Edit, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Request {
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
  created_by?: string;
}

interface RequestSummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request | null;
  onEdit: (request: Request) => void;
  onSent: (requestId: string) => void;
}

export function RequestSummaryDialog({ 
  isOpen, 
  onClose, 
  request, 
  onEdit, 
  onSent 
}: RequestSummaryDialogProps) {
  if (!request) return null;

  const handleSent = () => {
    if (confirm('Are you sure you want to mark this request as sent and delete it?')) {
      onSent(request.id);
      onClose();
    }
  };

  const formattedDate = format(new Date(request.created_at), 'PPP', { locale: ptBR });

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-lg z-50 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Request Summary
            </h2>
            <Dialog.Close asChild>
              <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Type and Status */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                request.type === 'invoice' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {request.type === 'invoice' ? 'Invoice' : 'Estimate'}
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                request.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                request.status === 'Approved' ? 'bg-green-100 text-green-700' :
                request.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                {request.status}
              </span>
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Customer</h3>
              <p className="text-sm text-gray-700">{request.customer_name}</p>
              <p className="text-xs text-gray-600">{request.customer_phone}</p>
              <p className="text-xs text-gray-600 mt-1">{request.address}</p>
            </div>

            {/* Work Items */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Work Items</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {request.work_items && request.work_items.length > 0 ? (
                  request.work_items.map((item, index) => (
                    <div key={index} className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
                      <div className="font-medium">{item.workType} - {item.color}</div>
                      <div className="text-gray-600">
                        Qty: {item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No work items</p>
                )}
              </div>
            </div>

            {/* Total and Date */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm text-gray-700">{formattedDate}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total Value</p>
                <p className="text-lg font-bold text-green-600">${request.total_value.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                onEdit(request);
                onClose();
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleSent}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Sent
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

