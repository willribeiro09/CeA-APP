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
      onEdit={onReset}
      onDelete={onLayoff}
      isWill={true}
    >
      <div className="p-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl font-bold text-gray-800">Will</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={onIncreaseRate}
              className="px-2 py-1 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors flex items-center h-7"
            >
              Increase
            </button>
            <button
              className="px-2 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors h-7"
              onClick={onAddBonus}
            >
              BONUS
            </button>
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 text-xs">Days Worked:</span>
            <span className="text-lg font-bold text-gray-900">7</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 text-xs">Amount to Receive:</span>
            <span className="text-lg font-bold text-[#5ABB37]">
              $ {(willBaseRate + willBonus).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {willBonus > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700 text-xs">Bonus:</span>
              <span className="text-xs font-semibold text-blue-500">
                $ {willBonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>
    </SwipeableItem>
  );
} 