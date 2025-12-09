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
  // Generate installments with correct filtering logic
  const installments = useMemo(() => {
    const recurrenceType = getRecurrenceType(expense);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const originalDate = new Date(expense.date);
    
    const installmentsArray: ExpenseInstallment[] = [];
    
    // 1. Add REAL installments from database with correct filtering
    if (expense.installments && expense.installments.length > 0) {
      expense.installments.forEach(inst => {
        const instDate = new Date(inst.dueDate);
        instDate.setHours(0, 0, 0, 0);
        
        // Current month: add ALL (paid and unpaid)
        if (instDate.getMonth() === currentMonth && instDate.getFullYear() === currentYear) {
          installmentsArray.push(inst);
        }
        // Previous months: add ONLY unpaid (overdue)
        else if (instDate < today && !inst.isPaid) {
          installmentsArray.push(inst);
        }
      });
    }
    
    // 2. For recurring expenses: check if current month installment exists, if not create virtual
    if (recurrenceType !== 'none') {
      const hasCurrentMonth = installmentsArray.some(inst => {
        const d = new Date(inst.dueDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      
      if (!hasCurrentMonth) {
        // Create virtual installment for current month
        const currentMonthDate = new Date(currentYear, currentMonth, originalDate.getDate());
        installmentsArray.push({
          id: uuidv4(),
          dueDate: currentMonthDate.toISOString(),
          amount: expense.amount,
          isPaid: false, // Virtual always starts unpaid
          paidDate: undefined
        });
      }
    }
    
    // 3. For non-recurring expenses without installments: use expense.date
    if (recurrenceType === 'none' && installmentsArray.length === 0) {
      const expenseDate = new Date(expense.date);
      expenseDate.setHours(0, 0, 0, 0);
      
      // Only show if it's current month or overdue
      if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
        installmentsArray.push({
          id: uuidv4(),
          dueDate: expense.date,
          amount: expense.amount,
          isPaid: expense.is_paid || expense.paid || false,
          paidDate: (expense.is_paid || expense.paid) ? expense.date : undefined
        });
      } else if (expenseDate < today && !(expense.is_paid || expense.paid)) {
        installmentsArray.push({
          id: uuidv4(),
          dueDate: expense.date,
          amount: expense.amount,
          isPaid: false,
          paidDate: undefined
        });
      }
    }
    
    // Sort by due date
    return installmentsArray.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
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

  // Próxima data de vencimento baseada diretamente na data original + recorrência
  const nextDueDate = useMemo(() => {
    const recurrenceType = getRecurrenceType(expense);
    const hasDate = !!expense.date;
    if (!hasDate) {
      return null;
    }

    const originalDate = new Date(expense.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Despesa não recorrente: usa a própria data
    if (recurrenceType === 'none') {
      return originalDate.toISOString();
    }

    let nextDate = new Date(originalDate);
    nextDate.setHours(0, 0, 0, 0);

    const isBeforeToday = nextDate.getTime() < today.getTime();

    while (isBeforeToday) {
      if (recurrenceType === 'monthly') {
        nextDate = addMonths(nextDate, 1);
      } else if (recurrenceType === 'biweekly') {
        nextDate = addDays(nextDate, 14);
      } else if (recurrenceType === 'weekly') {
        nextDate = addWeeks(nextDate, 7);
      } else {
        break;
      }
      nextDate.setHours(0, 0, 0, 0);
      if (nextDate.getTime() >= today.getTime()) {
        break;
      }
    }

    return nextDate.toISOString();
  }, [expense]);

  // Get status based on due dates and payment status (inclui mês atual + atrasados)
  const getExpenseStatusVisual = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const relevantInstallments = installments.filter(inst => {
      const instDate = new Date(inst.dueDate);

      if (instDate.getMonth() === currentMonth && instDate.getFullYear() === currentYear) {
        return true;
      }

      if (instDate < today && !inst.isPaid) {
        return true;
      }

      return false;
    });

    const paidInstallments = relevantInstallments.filter(inst => inst.isPaid);
    const unpaidInstallments = relevantInstallments.filter(inst => !inst.isPaid);

    if (relevantInstallments.length > 0 && paidInstallments.length === relevantInstallments.length) {
      return { type: 'paid', color: 'bg-green-50' };
    }

    if (relevantInstallments.length === 0) {
      return { type: 'none', color: 'bg-white' };
    }

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

    if (hasOverdue) {
      return { type: 'overdue', color: 'bg-red-50' };
    }

    if (hasNearDue) {
      return { type: 'near_due', color: 'bg-yellow-50' };
    }

    if (paidInstallments.length > 0) {
      return { type: 'partial', color: 'bg-yellow-50' };
    }

    return { type: 'normal', color: 'bg-white' };
  };

  const expenseStatus = useMemo(() => getExpenseStatusVisual(), [installments]);

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
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-green-600 font-medium">Paid</p>
                    </div>
                    {nextDueDate ? (
                      <p className="text-sm text-gray-600">
                        {(() => {
                          const dueDate = new Date(nextDueDate);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          dueDate.setHours(0, 0, 0, 0);
                          
                          const diffTime = dueDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
          if (diffDays < 0) {
            return `Due on: ${format(dueDate, 'MMM d')}`;
          } else if (diffDays <= 3) {
                            if (diffDays === 0) return 'Due today';
                            if (diffDays === 1) return 'Due in 1 day';
                            return `Due in ${diffDays} days`;
                          } else {
                            return `Due on: ${format(dueDate, 'MMM d')}`;
                          }
                        })()}
                      </p>
                    ) : null}
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
                    } else if (diffDays <= 3) {
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