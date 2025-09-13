import React, { useState, useEffect } from 'react';
import { format, addMonths, addDays, addWeeks } from 'date-fns';
import { X, Edit, Trash2, Upload, Calendar, Check, Camera } from 'lucide-react';
import { Expense, ExpenseInstallment, ExpenseReceipt } from '../types';
import { getRecurrenceType } from '../lib/recurringUtils';
import { ReceiptViewer } from './ReceiptViewer';
import { v4 as uuidv4 } from 'uuid';

interface ExpenseDetailDialogProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onSave: (expense: Expense) => void;
}

export function ExpenseDetailDialog({
  expense,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onSave
}: ExpenseDetailDialogProps) {
  const [notes, setNotes] = useState('');
  const [localExpense, setLocalExpense] = useState<Expense | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedReceipt, setSelectedReceipt] = useState<ExpenseReceipt | null>(null);
  const [isReceiptViewerOpen, setIsReceiptViewerOpen] = useState(false);

  useEffect(() => {
    if (expense) {
      setLocalExpense({ ...expense });
      setNotes(expense.notes || '');
      
      // Generate installments if they don't exist
      if (!expense.installments || expense.installments.length === 0) {
        const installments = generateInstallments(expense);
        setLocalExpense({ ...expense, installments });
      }
    }
  }, [expense]);

  const generateInstallments = (exp: Expense): ExpenseInstallment[] => {
    const recurrenceType = getRecurrenceType(exp);
    const installments: ExpenseInstallment[] = [];
    
    
    if (recurrenceType === 'none') {
      // Single payment
      return [{
        id: uuidv4(),
        dueDate: exp.date,
        amount: exp.amount,
        isPaid: exp.is_paid || exp.paid || false,
        paidDate: exp.is_paid || exp.paid ? exp.date : undefined
      }];
    }
    
    // For recurring expenses, calculate dates based on the original user-set date
    const today = new Date();
    const originalDate = new Date(exp.date);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Calculate the current month's installment first
    let currentMonthDate = new Date(currentYear, currentMonth, originalDate.getDate());
    
    // If the current month date hasn't passed yet, use it
    let nextDate = currentMonthDate;
    
    // If the current month date has already passed, calculate the next occurrence
    if (currentMonthDate < today) {
      nextDate = new Date(originalDate);
      while (nextDate < today) {
        if (recurrenceType === 'monthly') {
          nextDate = addMonths(nextDate, 1);
        } else if (recurrenceType === 'biweekly') {
          nextDate = addDays(nextDate, 14);
        } else if (recurrenceType === 'weekly') {
          nextDate = addWeeks(nextDate, 1);
        }
      }
    }
    
    // Always add current month installment for recurring expenses
    const currentMonthInstallment: ExpenseInstallment = {
      id: uuidv4(),
      dueDate: currentMonthDate.toISOString(),
      amount: exp.amount,
      isPaid: false,
      paidDate: undefined
    };
    installments.push(currentMonthInstallment);
    
    // Check for overdue installments
    let checkDate = new Date(originalDate);
    while (checkDate < today) {
      const checkMonth = checkDate.getMonth();
      const checkYear = checkDate.getFullYear();
      
      // If this date was in a previous month and wasn't paid, add as overdue
      if (checkYear < currentYear || (checkYear === currentYear && checkMonth < currentMonth)) {
        if (!(exp.is_paid || exp.paid)) {
          const overdueInstallment: ExpenseInstallment = {
            id: uuidv4(),
            dueDate: checkDate.toISOString(),
            amount: exp.amount,
            isPaid: false,
            paidDate: undefined
          };
          installments.unshift(overdueInstallment);
        }
      }
      
      // Move to next occurrence
      if (recurrenceType === 'monthly') {
        checkDate = addMonths(checkDate, 1);
      } else if (recurrenceType === 'biweekly') {
        checkDate = addDays(checkDate, 14);
      } else if (recurrenceType === 'weekly') {
        checkDate = addWeeks(checkDate, 1);
      }
    }
    return installments;
  };

  const toggleInstallmentPaid = (installmentId: string) => {
    if (!localExpense) return;
    
    const updatedInstallments = localExpense.installments?.map(inst => {
      if (inst.id === installmentId) {
        return {
          ...inst,
          isPaid: !inst.isPaid,
          paidDate: !inst.isPaid ? new Date().toISOString() : undefined
        };
      }
      return inst;
    }) || [];
    
    setLocalExpense({
      ...localExpense,
      installments: updatedInstallments
    });
  };

  const getPaymentStatus = () => {
    if (!localExpense?.installments) return 'Not paid';
    
    // Filter installments for current month only
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthInstallments = localExpense.installments.filter(inst => {
      const instDate = new Date(inst.dueDate);
      return instDate.getMonth() === currentMonth && instDate.getFullYear() === currentYear;
    });
    
    const totalInstallments = currentMonthInstallments.length;
    const paidInstallments = currentMonthInstallments.filter(inst => inst.isPaid).length;
    
    if (totalInstallments === 0) return 'Not paid';
    if (paidInstallments === 0) return 'Not paid';
    
    if (totalInstallments === 1) {
      if (paidInstallments === 1) {
        const lastPaidDate = currentMonthInstallments
          .filter(inst => inst.isPaid && inst.paidDate)
          .sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime())[0];
        
        if (lastPaidDate) {
          return `Paid on ${format(new Date(lastPaidDate.paidDate!), 'MMM dd')}`;
        }
        return 'Paid';
      }
      return 'Not paid';
    }
    
    // Multiple installments in current month
    return `${paidInstallments} of ${totalInstallments} Paid`;
  };

  const getProgressPercentage = () => {
    if (!localExpense?.installments) return 0;
    
    // Filter installments for current month only
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthInstallments = localExpense.installments.filter(inst => {
      const instDate = new Date(inst.dueDate);
      return instDate.getMonth() === currentMonth && instDate.getFullYear() === currentYear;
    });
    
    const totalInstallments = currentMonthInstallments.length;
    const paidInstallments = currentMonthInstallments.filter(inst => inst.isPaid).length;
    
    if (totalInstallments === 0) return 0;
    return (paidInstallments / totalInstallments) * 100;
  };

  const getCurrentMonthInstallments = () => {
    if (!localExpense?.installments) return [];
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    return localExpense.installments.filter(inst => {
      const instDate = new Date(inst.dueDate);
      
      // Include current month installments
      if (instDate.getMonth() === currentMonth && instDate.getFullYear() === currentYear) {
        return true;
      }
      
      // Include overdue installments from previous months that are unpaid
      if (instDate < today && !inst.isPaid) {
        return true;
      }
      
      return false;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  const getExpenseStatus = () => {
    if (!localExpense?.installments) return { type: 'none', color: 'bg-white' };
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentMonthInstallments = localExpense.installments.filter(inst => {
      const instDate = new Date(inst.dueDate);
      return instDate.getMonth() === currentMonth && instDate.getFullYear() === currentYear;
    });
    
    const paidInstallments = currentMonthInstallments.filter(inst => inst.isPaid);
    const unpaidInstallments = currentMonthInstallments.filter(inst => !inst.isPaid);
    
    // If all installments are paid, return green
    if (currentMonthInstallments.length > 0 && paidInstallments.length === currentMonthInstallments.length) {
      return { type: 'paid', color: 'bg-green-50' };
    }
    
    // If no installments this month, return white
    if (currentMonthInstallments.length === 0) {
      return { type: 'none', color: 'bg-white' };
    }
    
    // Check unpaid installments for overdue or near due
    let hasOverdue = false;
    let hasNearDue = false;
    
    unpaidInstallments.forEach(inst => {
      const dueDate = new Date(inst.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        hasOverdue = true;
      } else if (diffDays <= 5) {
        hasNearDue = true;
      }
    });
    
    // Priority: overdue > near due > partial paid > normal
    if (hasOverdue) {
      return { type: 'overdue', color: 'bg-red-50' };
    }
    
    if (hasNearDue) {
      return { type: 'near_due', color: 'bg-yellow-50' };
    }
    
    // If some are paid but not all
    if (paidInstallments.length > 0) {
      return { type: 'partial', color: 'bg-yellow-50' };
    }
    
    // Default for unpaid but not near due
    return { type: 'normal', color: 'bg-white' };
  };

  const getBackgroundColor = () => {
    return getExpenseStatus().color;
  };

  const getNextDueDate = () => {
    if (!localExpense?.installments) return null;
    
    const unpaidInstallments = localExpense.installments
      .filter(inst => !inst.isPaid)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    return unpaidInstallments.length > 0 ? unpaidInstallments[0].dueDate : null;
  };

  const handleSave = () => {
    if (!localExpense) return;
    
    const updatedExpense = {
      ...localExpense,
      notes: notes.trim(),
      lastModified: Date.now()
    };
    
    onSave(updatedExpense);
    onClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !localExpense) return;
    
    // Simulate file upload - in real implementation, upload to Supabase
    const receipt: ExpenseReceipt = {
      id: uuidv4(),
      filename: file.name,
      url: URL.createObjectURL(file), // Temporary URL
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
      mimeType: file.type
    };
    
    setLocalExpense({
      ...localExpense,
      receipts: [...(localExpense.receipts || []), receipt]
    });
  };

  const removeReceipt = (receiptId: string) => {
    if (!localExpense) return;
    
    setLocalExpense({
      ...localExpense,
      receipts: localExpense.receipts?.filter(r => r.id !== receiptId) || []
    });
  };

  const viewReceipt = (receipt: ExpenseReceipt) => {
    setSelectedReceipt(receipt);
    setIsReceiptViewerOpen(true);
  };

  const closeReceiptViewer = () => {
    setIsReceiptViewerOpen(false);
    setSelectedReceipt(null);
  };

  if (!isOpen || !expense || !localExpense) return null;

  const nextDueDate = getNextDueDate();
  const paymentStatus = getPaymentStatus();
  const progressPercentage = getProgressPercentage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${getBackgroundColor()} rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div>
            <h2 className="text-base font-medium text-gray-900">
              ({format(new Date(), 'MMM yyyy')}) Expense Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Basic Info */}
          <div>
            <h3 className="font-semibold text-gray-900 text-xl">
              {localExpense.description.replace(/\*[MBW]$/, '')}
            </h3>
            <p className="text-3xl font-bold text-[#5ABB37]">
              ${localExpense.amount.toFixed(2)}
            </p>
            {nextDueDate && (
              <p className="text-base text-gray-600 mt-1">
                Next due: {format(new Date(nextDueDate), 'MMMM d, yyyy')}
              </p>
            )}
          </div>

          {/* Payment Status */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Payment Status</span>
              <span className={`font-medium ${
                paymentStatus.includes('Paid') && !paymentStatus.includes('Not paid') 
                  ? 'text-green-600' 
                  : 'text-gray-600'
              }`}>
                {paymentStatus}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  (() => {
                    const status = getExpenseStatus();
                    if (status.type === 'paid') return 'bg-green-500';
                    if (status.type === 'overdue') return 'bg-red-500';
                    if (status.type === 'near_due') return 'bg-yellow-500';
                    if (status.type === 'partial') return 'bg-yellow-500';
                    return progressPercentage > 0 ? 'bg-gray-400' : 'bg-gray-300';
                  })()
                }`}
                style={{ width: `${Math.max(progressPercentage, 2)}%` }}
              />
            </div>
          </div>

          {/* Payment Schedule - Only current month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Schedule
            </label>
            
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {getCurrentMonthInstallments().map((installment) => {
                const getInstallmentColor = () => {
                  if (installment.isPaid) {
                    return 'bg-green-100 text-green-800 border border-green-300';
                  }
                  
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dueDate = new Date(installment.dueDate);
                  dueDate.setHours(0, 0, 0, 0);
                  
                  const diffTime = dueDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays < 0) {
                    return 'bg-red-100 text-red-800 border border-red-300';
                  } else if (diffDays <= 5) {
                    return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
                  }
                  
                  return 'bg-gray-50 hover:bg-gray-100 border border-gray-200';
                };
                
                return (
                <button
                  key={installment.id}
                  onClick={() => toggleInstallmentPaid(installment.id)}
                  className={`w-full flex items-center justify-between p-3 rounded transition-colors ${getInstallmentColor()}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox visual */}
                    <div 
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        installment.isPaid
                          ? 'bg-green-500 border-green-500'
                          : (() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const dueDate = new Date(installment.dueDate);
                              dueDate.setHours(0, 0, 0, 0);
                              
                              const diffTime = dueDate.getTime() - today.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              
                              if (diffDays < 0) {
                                return 'border-red-400 bg-white hover:border-red-500';
                              } else if (diffDays <= 5) {
                                return 'border-yellow-400 bg-white hover:border-yellow-500';
                              }
                              
                              return 'border-gray-400 bg-white hover:border-gray-500';
                            })()
                      }`}
                    >
                      {installment.isPaid && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">
                      {format(new Date(installment.dueDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    ${installment.amount.toFixed(2)}
                  </span>
                </button>
                );
              })}
              {getCurrentMonthInstallments().length === 0 && (
                <p className="text-sm text-gray-500 p-2">No installments for current month</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(localExpense)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => onDelete(localExpense.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this expense..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-20 text-sm"
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipts
            </label>
            <div className="space-y-2">
              {localExpense.receipts?.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 cursor-pointer transition-colors">
                  <div 
                    className="flex items-center gap-3 flex-1 min-w-0"
                    onClick={() => viewReceipt(receipt)}
                  >
                    <div className="flex-shrink-0">
                      {receipt.mimeType?.startsWith('image/') ? (
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-medium">IMG</span>
                        </div>
                      ) : receipt.mimeType === 'application/pdf' ? (
                        <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                          <span className="text-red-600 text-xs font-medium">PDF</span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-medium">FILE</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{receipt.filename}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(receipt.uploadedAt).toLocaleDateString()}
                        {receipt.fileSize && ` • ${(receipt.fileSize / 1024).toFixed(1)} KB`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeReceipt(receipt.id);
                    }}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Remove receipt"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">Upload Receipt</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>


          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full bg-[#5ABB37] text-white py-3 rounded-lg hover:bg-[#4a9c2e] transition-colors font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Receipt Viewer Modal */}
      <ReceiptViewer
        receipt={selectedReceipt}
        isOpen={isReceiptViewerOpen}
        onClose={closeReceiptViewer}
      />
    </div>
  );
}
