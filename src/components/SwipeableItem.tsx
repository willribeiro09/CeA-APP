import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Edit, Trash2, RotateCcw } from 'lucide-react';

export interface SwipeableItemProps {
  children: ReactNode;
  onDelete: () => void;
  onEdit: () => void;
  showEditButton?: boolean;
  customEditButton?: ReactNode;
  isWill?: boolean;
}

export function SwipeableItem({ 
  children, 
  onDelete, 
  onEdit, 
  showEditButton = true, 
  customEditButton,
  isWill = false
}: SwipeableItemProps) {
  const [isSwiped, setIsSwiped] = useState(false);
  const startX = useRef<number | null>(null);
  const currentX = useRef<number | null>(null);
  const swipeDistance = useRef<number>(0);
  const itemRef = useRef<HTMLDivElement>(null);
  
  const THRESHOLD = 80;
  const MAX_SWIPE = 180;
  const DIRECTION_THRESHOLD = 10; // Distância em pixels para determinar a direção do gesto
  
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
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node) && swipeDistance.current > 0) {
        resetSwipe();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="mb-4" style={{ overflow: 'hidden', borderRadius: '0.75rem' }}>
      <div className="relative overflow-hidden" style={{ borderRadius: '0.75rem' }}>
        {/* Ações de swipe */}
        <div className="absolute right-0 top-0 bottom-0 flex h-full">
          {isWill ? (
            <>
              <button
                onClick={onEdit}
                className="bg-gray-200 text-gray-700 flex items-center justify-center w-[50px] h-full"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="ml-1 text-xs">Reset</span>
              </button>
              <button
                onClick={onDelete}
                className="bg-red-500 text-white flex items-center justify-center w-[100px] h-full"
              >
                <span className="font-medium">Lay off</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="bg-blue-500 text-white flex items-center justify-center w-[75px] h-full"
              >
                <Edit className="w-4 h-4 mr-1" />
                <span className="text-sm">Edit</span>
              </button>
              <button
                onClick={onDelete}
                className="bg-red-500 text-white flex items-center justify-center w-[75px] h-full"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                <span className="text-sm">Delete</span>
              </button>
            </>
          )}
        </div>
        
        {/* Item principal */}
        <div
          ref={itemRef}
          className="bg-white relative z-10 transition-transform touch-pan-y shadow-sm"
          style={{ borderRadius: '0.75rem' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={isSwiped ? resetSwipe : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
} 