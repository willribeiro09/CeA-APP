import React from 'react';

interface TotalValuePopupProps {
  total: number;
  clientType: 'Power' | 'Private';
}

export function TotalValuePopup({ total, clientType }: TotalValuePopupProps) {
  return (
    <div className="fixed bottom-5 left-4 z-30">
      <div className="bg-[#5ABB37] rounded-lg shadow-md px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <span className="text-white text-base font-medium">Total:</span>
          <span className="text-white text-2xl font-semibold">
            ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
