import React, { useRef } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { X, Printer } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface EmployeeReceiptProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  dailyRate: number;
  workedDates: string[];
  weekStartDate: Date;
}

export function EmployeeReceipt({
  isOpen,
  onOpenChange,
  employeeName,
  dailyRate,
  workedDates = [],
  weekStartDate
}: EmployeeReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Calculate week start and end
  const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 }); // Sunday
  
  // Filter only worked dates within current week
  const datesInWeek = workedDates
    .map(dateStr => new Date(dateStr))
    .filter(date => {
      // Manually check if date is within week range
      return date >= weekStart && date <= weekEnd;
    })
    .sort((a, b) => a.getTime() - b.getTime());
  
  // Calculate total amount to be paid
  const totalAmount = datesInWeek.length * dailyRate;
  
  // Function to print receipt
  const handlePrint = () => {
    if (receiptRef.current) {
      const content = receiptRef.current;
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt - ${employeeName}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 20px;
                  color: #333;
                }
                .receipt {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  border: 1px solid #ddd;
                }
                .header {
                  text-align: center;
                  margin-bottom: 20px;
                  padding-bottom: 10px;
                  border-bottom: 2px solid #eee;
                }
                .details {
                  margin-bottom: 20px;
                }
                .dates {
                  margin-bottom: 20px;
                }
                .date-item {
                  padding: 5px 0;
                  border-bottom: 1px solid #eee;
                }
                .total {
                  font-weight: bold;
                  text-align: right;
                  padding-top: 10px;
                  border-top: 2px solid #eee;
                }
                .signature {
                  margin-top: 50px;
                  text-align: center;
                }
                .signature-line {
                  display: inline-block;
                  width: 200px;
                  border-bottom: 1px solid #333;
                  margin-bottom: 5px;
                }
                .text-center {
                  text-align: center;
                }
                .mb-6 {
                  margin-bottom: 1.5rem;
                }
                .pb-4 {
                  padding-bottom: 1rem;
                }
                .border-b-2 {
                  border-bottom-width: 2px;
                }
                .border-gray-200 {
                  border-color: #e5e7eb;
                }
                .text-xl {
                  font-size: 1.25rem;
                  line-height: 1.75rem;
                }
                .font-bold {
                  font-weight: 700;
                }
                .mb-1 {
                  margin-bottom: 0.25rem;
                }
                .text-gray-500 {
                  color: #6b7280;
                }
                .text-sm {
                  font-size: 0.875rem;
                  line-height: 1.25rem;
                }
                .font-semibold {
                  font-weight: 600;
                }
                .mb-2 {
                  margin-bottom: 0.5rem;
                }
                .font-medium {
                  font-weight: 500;
                }
                .space-y-1 > * + * {
                  margin-top: 0.25rem;
                }
                .py-1 {
                  padding-top: 0.25rem;
                  padding-bottom: 0.25rem;
                }
                .border-b {
                  border-bottom-width: 1px;
                }
                .border-gray-100 {
                  border-color: #f3f4f6;
                }
                .flex {
                  display: flex;
                }
                .justify-between {
                  justify-content: space-between;
                }
                .italic {
                  font-style: italic;
                }
                .pt-4 {
                  padding-top: 1rem;
                }
                .border-t-2 {
                  border-top-width: 2px;
                }
                .items-center {
                  align-items: center;
                }
                .text-xl {
                  font-size: 1.25rem;
                  line-height: 1.75rem;
                }
                .text-\[\#5ABB37\] {
                  color: #5ABB37;
                }
                .mt-12 {
                  margin-top: 3rem;
                }
                .inline-block {
                  display: inline-block;
                }
                .w-48 {
                  width: 12rem;
                }
                .border-gray-400 {
                  border-color: #9ca3af;
                }
                .mb-1 {
                  margin-bottom: 0.25rem;
                }
              </style>
            </head>
            <body>
              <div class="receipt">
                <div class="text-center mb-6 pb-4 border-b-2 border-gray-200">
                  <h2 class="text-xl font-bold mb-1">Payment Receipt</h2>
                  <p class="text-gray-500 text-sm">
                    Week: ${format(weekStart, 'MM/dd/yyyy')} - ${format(weekEnd, 'MM/dd/yyyy')}
                  </p>
                </div>
                
                <div class="mb-6">
                  <h3 class="font-semibold mb-2">Employee Details</h3>
                  <p><span class="font-medium">Name:</span> ${employeeName}</p>
                  <p><span class="font-medium">Daily Rate:</span> $${dailyRate.toFixed(2)}</p>
                </div>
                
                <div class="mb-6">
                  <h3 class="font-semibold mb-2">Worked Days</h3>
                  ${datesInWeek.length > 0 ? 
                    `<div class="space-y-1">
                      ${datesInWeek.map(date => 
                        `<div class="py-1 border-b border-gray-100 flex justify-between">
                          <span>${format(date, 'MM/dd/yyyy')}</span>
                          <span>$${dailyRate.toFixed(2)}</span>
                        </div>`
                      ).join('')}
                    </div>` : 
                    `<p class="text-gray-500 italic">No days worked this week.</p>`
                  }
                </div>
                
                <div class="pt-4 border-t-2 border-gray-200 flex justify-between items-center">
                  <span class="font-bold">Total Amount:</span>
                  <span class="text-xl font-bold text-[#5ABB37]">$${totalAmount.toFixed(2)}</span>
                </div>
                
                <div class="mt-12 text-center">
                  <div class="inline-block w-48 border-b border-gray-400 mb-1"></div>
                  <p class="text-sm text-gray-500">Signature</p>
                </div>
              </div>
            </body>
          </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };
  
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-xl z-50 w-[90%] max-w-md">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-xl font-bold">
              Weekly Receipt
            </Dialog.Title>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="text-gray-600 hover:text-gray-800"
                title="Print receipt"
              >
                <Printer className="w-5 h-5" />
              </button>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
          </div>
          
          <div ref={receiptRef} className="receipt-content">
            <div className="text-center mb-6 pb-4 border-b-2 border-gray-200">
              <h2 className="text-xl font-bold mb-1">Payment Receipt</h2>
              <p className="text-gray-500 text-sm">
                Week: {format(weekStart, 'MM/dd/yyyy')} - {format(weekEnd, 'MM/dd/yyyy')}
              </p>
            </div>
            
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Employee Details</h3>
              <p><span className="font-medium">Name:</span> {employeeName}</p>
              <p><span className="font-medium">Daily Rate:</span> ${dailyRate.toFixed(2)}</p>
            </div>
            
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Worked Days</h3>
              {datesInWeek.length > 0 ? (
                <div className="space-y-1">
                  {datesInWeek.map(date => (
                    <div key={date.toISOString()} className="py-1 border-b border-gray-100 flex justify-between">
                      <span>{format(date, 'MM/dd/yyyy')}</span>
                      <span>${dailyRate.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No days worked this week.</p>
              )}
            </div>
            
            <div className="pt-4 border-t-2 border-gray-200 flex justify-between items-center">
              <span className="font-bold">Total Amount:</span>
              <span className="text-xl font-bold text-[#5ABB37]">${totalAmount.toFixed(2)}</span>
            </div>
            
            <div className="mt-12 text-center">
              <div className="inline-block w-48 border-b border-gray-400 mb-1"></div>
              <p className="text-sm text-gray-500">Signature</p>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 