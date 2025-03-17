import React from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface Employee {
  id: string;
  name: string;
  role?: string;
  dailyRate: number;
  daysWorked: number;
  workedDates: string[];
}

interface EmployeeReceiptProps {
  employee: Employee;
}

const EmployeeReceipt: React.FC<EmployeeReceiptProps> = ({ 
  employee
}) => {
  // Sort worked dates
  const sortedDates = [...(employee.workedDates || [])].sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Calculate total amount
  const totalAmount = employee.daysWorked * employee.dailyRate;

  // Function to print receipt
  const handlePrint = () => {
    window.print();
  };

  // Function to share receipt
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Receipt - ${employee.name}`,
          text: `Payment receipt for ${employee.name} in the amount of $ ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        });
      } else {
        alert('Sharing not supported in this browser');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 print:p-0 print:shadow-none print-receipt">
      {/* Receipt header */}
      <div className="flex flex-col items-center mb-3 print:mb-2">
        <div className="w-32 h-16 my-2 flex items-center justify-center">
          <img 
            src="/dist/cealogo.png" 
            alt="C&A Logo" 
            className="h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '';
              target.parentElement!.innerHTML = '<h1 class="text-2xl font-bold text-[#5ABB37]">C&A</h1>';
            }}
          />
        </div>
      </div>

      {/* Employee information */}
      <div className="border-t border-b border-gray-200 py-2 mb-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-gray-500 text-sm">Name:</p>
            <p className="font-semibold">{employee.name}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Daily Rate:</p>
            <p className="font-semibold">$ {employee.dailyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Worked days details */}
      <div className="mb-3">
        <h2 className="text-md font-semibold mb-1">Worked Days</h2>
        <div className="bg-gray-50 rounded-md p-2 print:bg-white print:p-0">
          {sortedDates.length > 0 ? (
            <div className="flex flex-col gap-1">
              {sortedDates.map(date => {
                const dateObj = new Date(date);
                return (
                  <div key={date} className="text-sm flex justify-between">
                    <span>{format(dateObj, 'MM/dd/yyyy', { locale: enUS })}</span>
                    <span className="text-gray-600">{format(dateObj, 'EEEE', { locale: enUS })}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No days recorded</p>
          )}
        </div>
      </div>

      {/* Total amount */}
      <div className="bg-gray-100 rounded-md p-3 mb-3 print:bg-white print:p-0 print:mb-2">
        <div className="flex justify-between items-center">
          <span className="text-md font-semibold">Total Amount:</span>
          <span className="text-lg font-bold text-green-600">
            $ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-4 mb-3 print:mb-2">
        <div className="flex flex-col items-center">
          <div className="border-t border-gray-300 w-full mt-4"></div>
          <p className="text-xs text-gray-500 mt-1">Employee Signature</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="border-t border-gray-300 w-full mt-4"></div>
          <p className="text-xs text-gray-500 mt-1">Company Signature</p>
        </div>
      </div>

      {/* Date */}
      <div className="text-center text-xs text-gray-500 mb-3 print:mb-2">
        <p>Document issued on {format(new Date(), 'MM/dd/yyyy', { locale: enUS })}</p>
      </div>

      {/* Action buttons (hidden when printing) */}
      <div className="flex justify-center gap-4 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
        <button
          onClick={handleShare}
          className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </button>
      </div>
    </div>
  );
};

export default EmployeeReceipt; 