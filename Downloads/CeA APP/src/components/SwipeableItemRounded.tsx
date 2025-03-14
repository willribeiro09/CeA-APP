import React, { useState, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';

interface SwipeableItemProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

export function SwipeableItem({ children, onEdit, onDelete }: SwipeableItemProps) {
  const [isSwiped, setIsSwiped] = useState(false);
  const startX = useRef<number | null>(null);
  const currentX = useRef<number | null>(null);
  const swipeDistance = useRef<number>(0);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    swipeDistance.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startX.current) return;

    currentX.current = e.touches[0].clientX;
    const diff = (startX.current - currentX.current);

    // Limitar o swipe para a esquerda apenas (valores positivos)
    swipeDistance.current = Math.max(0, diff);

    // Limitar a distância máxima de swipe
    const maxSwipe = 150;
    swipeDistance.current = Math.min(swipeDistance.current, maxSwipe);

    // Aplicar a transformação
    if (itemRef.current) {
      itemRef.current.style.transform = `translateX(-${swipeDistance.current}px)`;
    }

    // Atualizar o estado de swipe
    setIsSwiped(swipeDistance.current > 50);
  };

  const handleTouchEnd = () => {
    // Snap para a posição aberta ou fechada
    if (swipeDistance.current > 50) {
      // Abrir completamente
      if (itemRef.current) {
        itemRef.current.style.transform = 'translateX(-150px)';
      }
      setIsSwiped(true);
    } else {
      // Fechar
      resetSwipe();
    }

    startX.current = null;
    currentX.current = null;
  };

  const resetSwipe = () => {
    if (itemRef.current) {
      itemRef.current.style.transform = 'translateX(0)';
    }
    setIsSwiped(false);
    swipeDistance.current = 0;
  };

  return (
    <div className="relative overflow-hidden rounded-lg mb-2">
      {/* Ações de swipe */}
      <div className="absolute right-0 top-0 bottom-0 flex h-full">
        <button
          onClick={onEdit}
          className="bg-blue-500 text-white flex items-center justify-center w-[75px] h-full first:rounded-l-lg"
        >
          <Edit size={20} />
        </button>
        <button
          onClick={onDelete}
          className="bg-red-500 text-white flex items-center justify-center w-[75px] h-full rounded-r-lg"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Item principal */}
      <div
        ref={itemRef}
        className="bg-white relative z-10 transition-transform touch-pan-y rounded-lg shadow-sm"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isSwiped ? resetSwipe : undefined}
      >
        {children}
      </div>
    </div>
  );
} 