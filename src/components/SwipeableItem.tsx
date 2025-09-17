import React, { useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { Edit, RotateCcw, Trash2 } from 'lucide-react';

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
  const startY = useRef<number | null>(null);
  const currentX = useRef<number | null>(null);
  const swipeDistance = useRef<number>(0);
  const itemRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const hasStartedSwipe = useRef<boolean>(false);
  
  // Função para resetar o swipe
  const resetSwipe = useCallback(() => {
    if (itemRef.current) {
      itemRef.current.style.transform = 'translateX(0)';
    }
    setIsSwiped(false);
    swipeDistance.current = 0;
    hasStartedSwipe.current = false;
  }, []);

  // Touch events para dispositivos móveis
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = touch.clientX;
    swipeDistance.current = 0;
    isDragging.current = true;
    hasStartedSwipe.current = false;
    // NÃO usar preventDefault aqui para permitir scroll vertical
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null || !isDragging.current) return;
    
    const touch = e.touches[0];
    currentX.current = touch.clientX;
    const currentY = touch.clientY;
    
    const deltaX = currentX.current - startX.current;
    const deltaY = currentY - startY.current;
    
    // Verificar se ainda não iniciou o swipe
    if (!hasStartedSwipe.current) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      // Threshold mínimo de 15px para iniciar qualquer ação
      if (absX < 15 && absY < 15) return;
      
      // Se o movimento vertical é maior que o horizontal, é scroll - não fazer nada
      if (absY > absX) {
        isDragging.current = false;
        return;
      }
      
      // Se chegou aqui, é um swipe horizontal válido
      hasStartedSwipe.current = true;
      e.preventDefault(); // Agora sim, prevenir scroll
    }
    
    if (hasStartedSwipe.current && itemRef.current) {
      swipeDistance.current = deltaX;
      
      if (isSwiped) {
        // Se já está aberto, permitir arrastar de volta para fechar
        const newPosition = Math.max(-150, -150 + deltaX);
        itemRef.current.style.transform = `translateX(${newPosition}px)`;
      } else {
        // Se está fechado, permitir arrastar para a esquerda para abrir
        const limitedDeltaX = Math.min(0, Math.max(-150, deltaX));
        itemRef.current.style.transform = `translateX(${limitedDeltaX}px)`;
      }
      
      // Atualizar o estado de swipe baseado na posição atual
      const transform = itemRef.current.style.transform;
      const currentPosition = parseInt(transform.replace('translateX(', '').replace('px)', '') || '0');
      setIsSwiped(currentPosition < -25);
    }
  }, [isSwiped]);
  
  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    
    // Só processar o fim do swipe se realmente iniciou um swipe
    if (hasStartedSwipe.current && itemRef.current) {
      const transform = itemRef.current.style.transform;
      const currentPosition = parseInt(transform.replace('translateX(', '').replace('px)', '') || '0');
      
      // Snap para a posição aberta ou fechada
      if (currentPosition < -75) {
        // Abrir completamente
        itemRef.current.style.transform = 'translateX(-150px)';
        setIsSwiped(true);
      } else {
        // Fechar
        resetSwipe();
      }
    }
    
    startX.current = null;
    startY.current = null;
    currentX.current = null;
    isDragging.current = false;
    hasStartedSwipe.current = false;
  }, [resetSwipe]);

  // Mouse events para desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    currentX.current = e.clientX;
    swipeDistance.current = 0;
    isDragging.current = true;
    hasStartedSwipe.current = false;
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (startX.current === null || startY.current === null || !isDragging.current) return;
    
    currentX.current = e.clientX;
    const currentY = e.clientY;
    
    const deltaX = currentX.current - startX.current;
    const deltaY = currentY - startY.current;
    
    // Verificar se ainda não iniciou o swipe
    if (!hasStartedSwipe.current) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      // Threshold mínimo de 10px para mouse (menor que touch)
      if (absX < 10 && absY < 10) return;
      
      // Se o movimento vertical é maior que o horizontal, não é swipe
      if (absY > absX) {
        isDragging.current = false;
        return;
      }
      
      // Se chegou aqui, é um swipe horizontal válido
      hasStartedSwipe.current = true;
    }
    
    if (hasStartedSwipe.current && itemRef.current) {
      swipeDistance.current = deltaX;
      
      if (isSwiped) {
        // Se já está aberto, permitir arrastar de volta para fechar
        const newPosition = Math.max(-150, -150 + deltaX);
        itemRef.current.style.transform = `translateX(${newPosition}px)`;
      } else {
        // Se está fechado, permitir arrastar para a esquerda para abrir
        const limitedDeltaX = Math.min(0, Math.max(-150, deltaX));
        itemRef.current.style.transform = `translateX(${limitedDeltaX}px)`;
      }
      
      // Atualizar o estado de swipe baseado na posição atual
      const transform = itemRef.current.style.transform;
      const currentPosition = parseInt(transform.replace('translateX(', '').replace('px)', '') || '0');
      setIsSwiped(currentPosition < -25);
    }
  }, [isSwiped]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    
    // Só processar o fim do swipe se realmente iniciou um swipe
    if (hasStartedSwipe.current && itemRef.current) {
      const transform = itemRef.current.style.transform;
      const currentPosition = parseInt(transform.replace('translateX(', '').replace('px)', '') || '0');
      
      // Snap para a posição aberta ou fechada
      if (currentPosition < -75) {
        // Abrir completamente
        itemRef.current.style.transform = 'translateX(-150px)';
        setIsSwiped(true);
      } else {
        // Fechar
        resetSwipe();
      }
    }
    
    startX.current = null;
    startY.current = null;
    currentX.current = null;
    isDragging.current = false;
    hasStartedSwipe.current = false;
  }, [resetSwipe]);

  // Click outside para fechar
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (itemRef.current && !itemRef.current.contains(e.target as Node) && isSwiped) {
      resetSwipe();
    }
  }, [isSwiped, resetSwipe]);

  // Global mouse events para desktop
  useEffect(() => {
    if (isDragging.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Click outside listener
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (itemRef.current) {
        itemRef.current.style.transform = 'translateX(0)';
      }
    };
  }, []);
  
  return (
    <div style={{ overflow: 'hidden', borderRadius: '0.75rem' }}>
      <div className="relative overflow-hidden" style={{ borderRadius: '0.75rem' }}>
        {/* Ações de swipe */}
        <div className="absolute right-0 top-0 bottom-0 flex h-full">
          {isWill ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                  resetSwipe();
                }}
                className="bg-gray-200 text-gray-700 flex items-center justify-center w-[50px] h-full hover:bg-gray-300 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  resetSwipe();
                }}
                className="bg-red-500 text-white flex items-center justify-center w-[100px] h-full hover:bg-red-600 transition-colors"
              >
                <span className="font-medium">Lay off</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                  resetSwipe();
                }}
                className="bg-blue-500 text-white flex items-center justify-center w-[75px] h-full hover:bg-blue-600 transition-colors"
              >
                <Edit className="w-4 h-4 mr-1" />
                <span className="text-sm">Edit</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  resetSwipe();
                }}
                className="bg-red-500 text-white flex items-center justify-center w-[75px] h-full hover:bg-red-600 transition-colors"
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
          className="bg-white relative z-10 transition-transform duration-200 ease-out shadow-sm cursor-grab active:cursor-grabbing"
          style={{ 
            borderRadius: '0.75rem',
            userSelect: 'none',
            touchAction: 'pan-y'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            if (isSwiped) {
              e.stopPropagation();
              resetSwipe();
            }
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}