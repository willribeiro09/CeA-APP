import React from 'react';

interface TotalValuePopupProps {
  total: number;
  clientType: 'Power' | 'Private';
}

export function TotalValuePopup({ total, clientType }: TotalValuePopupProps) {
  return (
    <div className="fixed bottom-5 left-4 z-30">
      <div className="bg-[#5ABB37] rounded-full shadow-md h-10 px-4 backdrop-blur-sm">
        <div className="h-full inline-flex items-center space-x-2">
          <span className="text-white text-base font-medium">Total</span>
          <span className="text-white text-lg font-normal">
            ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
