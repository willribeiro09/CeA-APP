import React from 'react';

interface WillItemProps {
  willBaseRate: number;
  willBonus: number;
  onReset: () => void;
  onLayoff: () => void;
  onIncrease: () => void;
  onBonus: () => void;
}

export function WillItemFixed({ 
  willBaseRate, 
  willBonus, 
  onReset, 
  onLayoff, 
  onIncrease, 
  onBonus 
}: WillItemProps) {
  return (
    <div className="relative overflow-hidden rounded-lg mb-4">
      <div className="absolute right-0 top-0 bottom-0 flex h-full">
        <button 
          onClick={onReset}
          className="h-full w-[75px] bg-gray-200 text-gray-700 flex items-center justify-center first:rounded-l-lg"
        >
          Reset
        </button>
        <button
          onClick={onLayoff}
          className="h-full w-[75px] bg-red-500 text-white flex items-center justify-center rounded-r-lg"
        >
          Lay off
        </button>
      </div>

      <div className="bg-white relative z-10 p-2.5 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xl font-bold text-gray-800">Will</h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onIncrease}
              className="px-4 py-1 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors flex items-center h-8"
            >
              Increase
            </button>
            <button
              className="px-2.5 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors h-8"
              onClick={onBonus}
            >
              BONUS
            </button>
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 text-sm">Days Worked:</span>
            <span className="text-xl font-bold text-gray-900">7</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 text-sm">Amount to Receive:</span>
            <span className="text-xl font-bold text-[#5ABB37]">
              $ {(willBaseRate + willBonus).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {willBonus > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700 text-sm">Bonus:</span>
              <span className="text-sm font-semibold text-blue-500">
                $ {willBonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 