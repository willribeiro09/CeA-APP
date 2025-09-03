import React, { useMemo } from 'react';
import { SwipeableItem } from './SwipeableItem';

interface WillItemFixedProps {
  willBaseRate: number;
  willBonus: number;
  onReset: () => void;
  onLayoff: () => void;
  onIncreaseRate: () => void;
  onAddBonus: () => void;
  disabled?: boolean;
}

export function WillItemFixed({
  willBaseRate,
  willBonus,
  onReset,
  onLayoff,
  onIncreaseRate,
  onAddBonus,
  disabled = false
}: WillItemFixedProps) {
  // Usar useMemo para evitar recálculos desnecessários
  const totalAmount = useMemo(() => willBaseRate + willBonus, [willBaseRate, willBonus]);
  const formattedTotal = useMemo(() => totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }), [totalAmount]);
  const formattedBonus = useMemo(() => willBonus.toLocaleString('en-US', { minimumFractionDigits: 2 }), [willBonus]);
  
  return (
    <SwipeableItem
      onEdit={disabled ? () => {} : onReset}
      onDelete={disabled ? () => {} : onLayoff}
      isWill={true}
    >
      <div className="p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xl font-bold text-gray-800">William</h3>

        </div>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 text-sm">Days Worked:</span>
            <span className="text-xl font-bold text-gray-900">7</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 text-sm">Amount to Receive:</span>
            <span className="text-xl font-bold text-[#5ABB37]">
              $ {formattedTotal}
            </span>
          </div>
          {willBonus > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700 text-sm">Bonus:</span>
              <span className="text-sm font-semibold text-blue-500">
                $ {formattedBonus}
              </span>
            </div>
          )}
        </div>
      </div>
    </SwipeableItem>
  );
} 