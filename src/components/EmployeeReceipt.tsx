// Declaração de tipo para o módulo html2pdf.js
declare module 'html2pdf.js' {
  const html2pdf: any;
  export default html2pdf;
}

import React, { useRef } from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';

interface Employee {
  id: string;
  name: string;
  role?: string;
  dailyRate: number;
  daysWorked: number;
  workedDates: string[];
  weekStartDate?: string;
}

interface EmployeeReceiptProps {
  employee: Employee;
  weekRange?: string;
}

const EmployeeReceipt: React.FC<EmployeeReceiptProps> = ({ 
  employee,
  weekRange
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Sort worked dates
  const sortedDates = [...(employee.workedDates || [])].sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Calculate total amount
  const totalAmount = employee.daysWorked * employee.dailyRate;

  // Function to print receipt
  const handlePrint = () => {
    // Use a print-specific stylesheet that hides everything except the receipt
    const originalContents = document.body.innerHTML;
    const printContents = receiptRef.current?.outerHTML || '';
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the receipt');
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${employee.name} (${weekRange})</title>
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              padding: 0;
              margin: 0;
              background-color: white;
            }
            .print-receipt {
              max-width: 100%;
              margin: 0 auto;
              padding: 20px;
              box-sizing: border-box;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .print-receipt {
                width: 100%;
                box-shadow: none;
              }
              .print-hidden {
                display: none !important;
              }
            }
            /* Copy all the styles from the original receipt */
            .bg-white { background-color: white; }
            .rounded-lg { border-radius: 0.5rem; }
            .p-4 { padding: 1rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-1 { margin-top: 0.25rem; }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            .justify-between { justify-content: space-between; }
            .w-56 { width: 14rem; }
            .h-28 { height: 7rem; }
            .h-full { height: 100%; }
            .object-contain { object-fit: contain; }
            .text-5xl { font-size: 3rem; }
            .text-lg { font-size: 1.125rem; }
            .text-md { font-size: 1rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .text-gray-700 { color: #4a5568; }
            .text-gray-600 { color: #718096; }
            .text-gray-500 { color: #a0aec0; }
            .text-green-600 { color: #38a169; }
            .text-[#5ABB37] { color: #5ABB37; }
            .tracking-wide { letter-spacing: 0.025em; }
            .border-t { border-top-width: 1px; }
            .border-b { border-bottom-width: 1px; }
            .border-gray-200 { border-color: #edf2f7; }
            .border-gray-300 { border-color: #e2e8f0; }
            .grid { display: grid; }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-2 { gap: 0.5rem; }
            .gap-4 { gap: 1rem; }
            .gap-1 { gap: 0.25rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .p-2 { padding: 0.5rem; }
            .p-3 { padding: 0.75rem; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .rounded-md { border-radius: 0.375rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .text-center { text-align: center; }
            .w-full { width: 100%; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };

  // Function to share receipt as PDF
  const handleShare = async () => {
    if (!receiptRef.current) return;
    
    try {
      // Temporarily hide the buttons for PDF generation
      const buttons = receiptRef.current.querySelector('.print-hidden');
      if (buttons instanceof HTMLElement) {
        buttons.style.display = 'none';
      }
      
      // Generate PDF using html2pdf
      const opt = {
        margin: 10,
        filename: `Receipt-${employee.name}-${weekRange}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      };
      
      const pdfDoc = await html2pdf().set(opt).from(receiptRef.current).outputPdf();
      const pdfBlob = new Blob([pdfDoc], { type: 'application/pdf' });
      
      // Show buttons again
      if (buttons instanceof HTMLElement) {
        buttons.style.display = 'flex';
      }
      
      // Try to use Web Share API if available
      if (navigator.share) {
        const file = new File([pdfBlob], `Receipt-${employee.name}-${weekRange}.pdf`, { type: 'application/pdf' });
        
        await navigator.share({
          title: `Receipt - ${employee.name} (${weekRange})`,
          text: `Payment receipt for ${employee.name} for week ${weekRange} in the amount of $ ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          files: [file]
        });
      } else {
        // Fallback: Open the PDF in a new tab
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const tab = window.open(pdfUrl, '_blank');
        if (!tab) {
          alert('Unable to open the receipt. Please check your browser settings.');
          // Alternative: Force download
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = `Receipt-${employee.name}-${weekRange}.pdf`;
          link.click();
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      
      // Fallback to image sharing if PDF doesn't work
      try {
        // Create a canvas from the receipt element
        const canvas = await html2canvas(receiptRef.current, {
          backgroundColor: "white",
          scale: 2, // Higher resolution
          logging: false,
          onclone: (clonedDoc: Document, element: HTMLElement) => {
            // Make sure the element has the right styling in the cloned document
            if (element instanceof HTMLElement) {
              element.style.padding = '20px';
              element.style.boxShadow = 'none';
              element.style.width = 'auto';
              element.style.height = 'auto';
              
              // Hide print buttons in the screenshot
              const buttons = element.querySelector('.print-hidden');
              if (buttons instanceof HTMLElement) {
                buttons.style.display = 'none';
              }
            }
          }
        });
        
        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b: Blob | null) => {
            if (b) resolve(b);
            else alert('Failed to create image');
          }, 'image/png');
        });
        
        // Try to use Web Share API if available
        if (navigator.share) {
          const file = new File([blob], `Receipt-${employee.name}-${weekRange}.png`, { type: 'image/png' });
          
          await navigator.share({
            title: `Receipt - ${employee.name} (${weekRange})`,
            text: `Payment receipt for ${employee.name} for week ${weekRange} in the amount of $ ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            files: [file]
          });
        } else {
          // Fallback: Open the image in a new tab
          const imageUrl = URL.createObjectURL(blob);
          const tab = window.open();
          if (tab) {
            tab.document.write(`
              <html>
                <head>
                  <title>Receipt - ${employee.name} (${weekRange})</title>
                  <style>
                    body { 
                      margin: 0; 
                      display: flex; 
                      justify-content: center; 
                      align-items: center; 
                      height: 100vh; 
                      background-color: #f3f4f6;
                    }
                    img { 
                      max-width: 100%; 
                      max-height: 100vh; 
                      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                  </style>
                </head>
                <body>
                  <img src="${imageUrl}" alt="Receipt for ${employee.name}">
                </body>
              </html>
            `);
            tab.document.close();
          } else {
            alert('Unable to open the receipt. Please check your browser settings.');
          }
        }
      } catch (fallbackError) {
        console.error('Error in fallback sharing:', fallbackError);
        alert('Error sharing the receipt: ' + error);
      }
    }
  };

  return (
    <div 
      ref={receiptRef} 
      className="bg-white rounded-lg p-4 print:p-0 print:shadow-none print-receipt"
    >
      {/* Receipt header */}
      <div className="flex flex-col items-center mb-4 print:mb-3">
        <div className="w-56 h-28 mb-2 flex items-center justify-center">
          <img 
            src="./cealogo.png" 
            alt="C&A Logo" 
            className="h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '';
              target.parentElement!.innerHTML = '<h1 class="text-5xl font-bold text-[#5ABB37]">C&A</h1>';
            }}
          />
        </div>
        <p className="text-lg font-medium text-gray-700 tracking-wide" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", letterSpacing: '0.05em' }}>
          C&A Gutters Inc.
        </p>
      </div>

      {/* Employee information */}
      <div className="border-t border-b border-gray-200 py-2 mb-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-gray-500 text-sm">Name:</p>
            <p className="font-semibold">{employee.name}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Daily Rate:</p>
            <p className="font-semibold">$ {employee.dailyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Week:</p>
            <p className="font-semibold">{weekRange || 'Current Week'}</p>
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
                    <span>{format(dateObj, 'MM/dd', { locale: enUS })}</span>
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
      <div className="bg-gray-100 rounded-md p-3 mb-8 print:bg-white print:p-0 print:mb-6">
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
        <p>Document issued on {format(new Date(), 'MM/dd', { locale: enUS })}</p>
      </div>

      {/* Action buttons (hidden when printing) */}
      <div className="flex justify-center gap-4 print:hidden print-hidden">
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