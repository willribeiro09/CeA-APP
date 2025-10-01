import { format, addMonths, addDays, addWeeks } from 'date-fns';
import { Check, Trash2, Repeat, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Expense, ExpenseInstallment } from '../types';
import { SwipeableItem } from './SwipeableItem';
import { isRecurringExpense, getExpenseStatus, getRecurrenceType } from '../lib/recurringUtils';
import { v4 as uuidv4 } from 'uuid';

interface ExpenseItemProps {
  expense: Expense;
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onViewDetails: (expense: Expense) => void;
}

export function ExpenseItem({ expense, onTogglePaid, onDelete, onEdit, onViewDetails }: ExpenseItemProps) {
  // Generate installments if they don't exist
  const installments = useMemo(() => {
    if (expense.installments && expense.installments.length > 0) {
      return expense.installments;
    }
    
    const recurrenceType = getRecurrenceType(expense);
    if (recurrenceType === 'none') {
      return [{
        id: uuidv4(),
        dueDate: expense.date,
        amount: expense.amount,
        isPaid: expense.is_paid || expense.paid || false,
        paidDate: expense.is_paid || expense.paid ? expense.date : undefined
      }];
    }
    
    // For recurring expenses, calculate dates based on the original user-set date
    const today = new Date();
    const originalDate = new Date(expense.date);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const installmentsArray: ExpenseInstallment[] = [];
    
    // Calculate the current month's installment
    const currentMonthDate = new Date(currentYear, currentMonth, originalDate.getDate());
    
    // Always add current month installment for recurring expenses
    const currentMonthInstallment: ExpenseInstallment = {
      id: uuidv4(),
      dueDate: currentMonthDate.toISOString(),
      amount: expense.amount,
      isPaid: expense.is_paid || expense.paid || false,
      paidDate: (expense.is_paid || expense.paid) ? expense.date : undefined
    };
    installmentsArray.push(currentMonthInstallment);
    
    // Check for overdue installments
    let checkDate = new Date(originalDate);
    while (checkDate < today) {
      const checkMonth = checkDate.getMonth();
      const checkYear = checkDate.getFullYear();
      
      // If this date was in a previous month, add as overdue (independente do status global)
      if (checkYear < currentYear || (checkYear === currentYear && checkMonth < currentMonth)) {
        const overdueInstallment: ExpenseInstallment = {
          id: uuidv4(),
          dueDate: checkDate.toISOString(),
          amount: expense.amount,
          isPaid: false,
          paidDate: undefined
        };
        installmentsArray.unshift(overdueInstallment);
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
    
    return installmentsArray;
  }, [expense]);

  // Calculate payment status including overdue installments
  const paymentStatus = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    // Get all relevant installments (current month + overdue)
    const relevantInstallments = installments.filter(inst => {
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
    });
    
    const totalInstallments = relevantInstallments.length;
    const paidInstallments = relevantInstallments.filter(inst => inst.isPaid).length;
    
    if (totalInstallments === 0) return 'Not paid';
    if (paidInstallments === 0) return 'Not paid';
    
    if (totalInstallments === 1) {
      if (paidInstallments === 1) {
        const lastPaidDate = relevantInstallments
          .filter(inst => inst.isPaid && inst.paidDate)
          .sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime())[0];
        
        if (lastPaidDate) {
          return `${format(new Date(lastPaidDate.dueDate), 'MMM dd')} Paid`;
        }
        return 'Paid';
      }
      return 'Not paid';
    }
    
    // Multiple installments (current + overdue)
    return `${paidInstallments} of ${totalInstallments} Paid`;
  }, [installments]);

  // Calculate progress percentage including overdue installments
  const progressPercentage = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    const relevantInstallments = installments.filter(inst => {
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
    });
    
    const totalInstallments = relevantInstallments.length;
    const paidInstallments = relevantInstallments.filter(inst => inst.isPaid).length;
    
    if (totalInstallments === 0) return 0;
    return (paidInstallments / totalInstallments) * 100;
  }, [installments]);

  // Get next due date from relevant installments (current + overdue)
  const nextDueDate = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    const relevantInstallments = installments.filter(inst => {
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
    });
    
    const unpaidInstallments = relevantInstallments
      .filter(inst => !inst.isPaid)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    return unpaidInstallments.length > 0 ? unpaidInstallments[0].dueDate : null;
  }, [installments]);

  // Get status based on due dates and payment status
  const getExpenseStatus = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
    
    // Get all relevant installments (current month + overdue from previous months)
    const relevantInstallments = installments.filter(inst => {
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
    });
    
    const paidInstallments = relevantInstallments.filter(inst => inst.isPaid);
    const unpaidInstallments = relevantInstallments.filter(inst => !inst.isPaid);
    
    
    // If all relevant installments are paid, return green
    if (relevantInstallments.length > 0 && paidInstallments.length === relevantInstallments.length) {
      return { type: 'paid', color: 'bg-green-50' };
    }
    
    // If no relevant installments, return white
    if (relevantInstallments.length === 0) {
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

  const expenseStatus = useMemo(() => getExpenseStatus(), [installments]);

  // Get background color based on expense status
  const getBackgroundColor = () => {
    return expenseStatus.color;
  };


  const dueDate = useMemo(() => expense.date ? new Date(expense.date) : new Date(), [expense.date]);
  const isRecurring = useMemo(() => isRecurringExpense(expense), [expense]);
  const cleanDescription = useMemo(() => expense.description.replace(/\*[MBW]$/, ''), [expense.description]);
  const formattedAmount = useMemo(() => expense.amount.toFixed(2), [expense.amount]);

  return (
    <SwipeableItem
      onEdit={() => onEdit(expense)}
      onDelete={() => onDelete(expense.id)}
    >
      <div 
        className={`${getBackgroundColor()} transition-all duration-300 cursor-pointer rounded-lg shadow-md hover:shadow-lg border-2 backdrop-blur-sm ${
          expenseStatus.type === 'paid' ? 'border-green-200/60 shadow-green-200/20' :
          expenseStatus.type === 'overdue' ? 'border-red-200/60 shadow-red-200/20' :
          expenseStatus.type === 'near_due' ? 'border-yellow-200/60 shadow-yellow-200/20' :
          expenseStatus.type === 'partial' ? 'border-yellow-200/60 shadow-yellow-200/20' :
          'border-gray-200/60 shadow-gray-200/20'
        }`}
        style={{
          boxShadow: expenseStatus.type === 'paid' ? '0 4px 6px -1px rgba(34, 197, 94, 0.1), 0 2px 4px -1px rgba(34, 197, 94, 0.06)' :
                     expenseStatus.type === 'overdue' ? '0 4px 6px -1px rgba(239, 68, 68, 0.1), 0 2px 4px -1px rgba(239, 68, 68, 0.06)' :
                     expenseStatus.type === 'near_due' ? '0 4px 6px -1px rgba(234, 179, 8, 0.1), 0 2px 4px -1px rgba(234, 179, 8, 0.06)' :
                     expenseStatus.type === 'partial' ? '0 4px 6px -1px rgba(234, 179, 8, 0.1), 0 2px 4px -1px rgba(234, 179, 8, 0.06)' :
                     '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
        onClick={() => onViewDetails(expense)}
      >
        <div className="flex items-start p-4">
          {/* Left side - Name and next due */}
          <div className="flex-1">
          <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 text-base">
              {cleanDescription}
            </h3>
            {isRecurring && (
              <Repeat className="w-4 h-4 text-gray-400" title="Recurring expense" />
            )}
          </div>
            {(() => {
              const currentMonth = new Date().getMonth();
              const currentYear = new Date().getFullYear();
              
              // Check if current month installment is paid
              const currentMonthInstallments = installments.filter(inst => {
                const instDate = new Date(inst.dueDate);
                return instDate.getMonth() === currentMonth && instDate.getFullYear() === currentYear;
              });
              
              const isCurrentMonthPaid = currentMonthInstallments.length > 0 && 
                currentMonthInstallments.every(inst => inst.isPaid);
              
              if (isCurrentMonthPaid) {
                return (
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-600 font-medium">Paid</p>
                  </div>
                );
              }
              
              return nextDueDate && (
                <p className="text-sm text-gray-600 mt-1">
                  {(() => {
                    const dueDate = new Date(nextDueDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    dueDate.setHours(0, 0, 0, 0);
                    
                    const diffTime = dueDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays < 0) {
                      return `Due on: ${format(dueDate, 'MMM d')}`;
                    } else if (diffDays <= 5) {
                      if (diffDays === 0) return 'Due today';
                      if (diffDays === 1) return 'Due in 1 day';
                      return `Due in ${diffDays} days`;
                    } else {
                      return `Due on: ${format(dueDate, 'MMM d')}`;
                    }
                  })()}
                </p>
              );
            })()}
        </div>

          {/* Right side - Amount and status */}
          <div className="text-right">
            <span className="font-semibold text-[#5ABB37] text-lg">
            ${formattedAmount}
          </span>
            <p className="text-xs text-gray-600 mt-1">
              {paymentStatus}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                expenseStatus.type === 'paid' ? 'bg-green-500' :
                expenseStatus.type === 'overdue' ? 'bg-red-500' :
                expenseStatus.type === 'near_due' ? 'bg-yellow-500' :
                expenseStatus.type === 'partial' ? 'bg-yellow-500' :
                progressPercentage > 0 ? 'bg-gray-400' : 'bg-gray-300'
              }`}
              style={{ width: `${Math.max(progressPercentage, 2)}%` }}
            />
          </div>
        </div>
      </div>
    </SwipeableItem>
  );
}