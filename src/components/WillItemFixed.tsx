import React from 'react';
import { SwipeableItem } from './SwipeableItem';

interface WillItemFixedProps {
  willBaseRate: number;
  willBonus: number;
  onReset: () => void;
  onLayoff: () => void;
  onIncreaseRate: () => void;
  onAddBonus: () => void;
}

export function WillItemFixed({
  willBaseRate,
  willBonus,
  onReset,
  onLayoff,
  onIncreaseRate,
  onAddBonus
}: WillItemFixedProps) {
  return (
    <SwipeableItem
      onEdit={onIncreaseRate}
      onDelete={onLayoff}
    >
      <div className="p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xl font-bold text-gray-800">Will</h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onIncreaseRate}
              className="px-4 py-1 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors flex items-center h-8"
            >
              Increase
            </button>
            <button
              className="px-2.5 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors h-8"
              onClick={onAddBonus}
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
    </SwipeableItem>
  );
} 