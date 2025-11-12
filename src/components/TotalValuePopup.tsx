import React from 'react';

interface TotalValuePopupProps {
  total: number;
}

export function TotalValuePopup({ total }: TotalValuePopupProps) {
  return (
    <div className="fixed bottom-20 left-4 z-30">
      <div className="bg-[#5ABB37] rounded-full px-4 py-1.5 shadow-md backdrop-blur-sm">
        <span className="text-white text-lg font-semibold">
          ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
