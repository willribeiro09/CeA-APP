import React, { useState, useRef, useEffect, ReactNode, useCallback } from 'react';
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
  
  // Usar useCallback para evitar recriação das funções a cada renderização
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    currentX.current = touch.clientX;
    swipeDistance.current = 0;
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startX.current === null) return;
    
    const touch = e.touches[0];
    currentX.current = touch.clientX;
    
    if (itemRef.current) {
      const deltaX = currentX.current - startX.current;
      swipeDistance.current = deltaX;
      
      // Limitar o swipe para a esquerda (valores negativos)
      const limitedDeltaX = Math.min(0, Math.max(-150, deltaX));
      itemRef.current.style.transform = `translateX(${limitedDeltaX}px)`;
    }
    
    // Atualizar o estado de swipe
    setIsSwiped(swipeDistance.current > 50);
  }, []);
  
  const handleTouchEnd = useCallback(() => {
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
  }, []);
  
  const resetSwipe = useCallback(() => {
    if (itemRef.current) {
      itemRef.current.style.transform = 'translateX(0)';
    }
    setIsSwiped(false);
    swipeDistance.current = 0;
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (itemRef.current && !itemRef.current.contains(e.target as Node) && isSwiped) {
      resetSwipe();
    }
  }, [isSwiped, resetSwipe]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);
  
  return (
    <div style={{ overflow: 'hidden', borderRadius: '0.75rem' }}>
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