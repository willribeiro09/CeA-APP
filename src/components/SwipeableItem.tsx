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
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [direction, setDirection] = useState<'none' | 'horizontal' | 'vertical'>('none');
  const itemRef = useRef<HTMLDivElement>(null);
  
  const THRESHOLD = 80;
  const MAX_SWIPE = 180;
  const DIRECTION_THRESHOLD = 10; // Distância em pixels para determinar a direção do gesto
  
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartX(clientX);
    setStartY(clientY);
    setDirection('none');
    setIsDragging(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const diffX = startX - clientX;
    const diffY = startY - clientY;
    
    // Determinar a direção do movimento se ainda não foi determinada
    if (direction === 'none') {
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      
      // Se o movimento for principalmente horizontal e maior que o limite
      if (absX > DIRECTION_THRESHOLD && absX > absY) {
        setDirection('horizontal');
      }
      // Se o movimento for principalmente vertical e maior que o limite
      else if (absY > DIRECTION_THRESHOLD && absY > absX) {
        setDirection('vertical');
      }
    }
    
    // Se a direção for horizontal, permitir o deslize
    if (direction === 'horizontal') {
      // Só permitir swipe da direita para a esquerda (diffX positivo)
      if (diffX > 0) {
        const newTranslateX = Math.max(0, Math.min(diffX, MAX_SWIPE));
        setTranslateX(newTranslateX);
      }
      
      // Prevenir rolagem da página durante o swipe horizontal
      if (e.cancelable && 'touches' in e) {
        e.preventDefault();
      }
    }
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
    setDirection('none');
    
    if (translateX > THRESHOLD) {
      setTranslateX(MAX_SWIPE);
    } else {
      setTranslateX(0);
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node) && translateX > 0) {
        setTranslateX(0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [translateX]);
  
  return (
    <div 
      ref={itemRef}
      className="relative mb-2 list-item"
      style={{ overflow: 'hidden' }}
    >
      {/* Botões de ação */}
      <div 
        className="absolute top-0 right-0 h-full flex items-center gap-2 pr-3"
        style={{ zIndex: 1 }}
      >
        {isWill ? (
          <>
            <button
              onClick={onDelete}
              className="h-full w-[40px] bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {customEditButton && (
              <div onClick={onEdit} className="h-full">
                {customEditButton}
              </div>
            )}
          </>
        ) : (
          <>
            <button
              onClick={onDelete}
              className="h-[calc(100%-8px)] w-[40px] bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {showEditButton && (
              <button
                onClick={onEdit}
                className="h-[calc(100%-8px)] w-[90px] bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Conteúdo principal */}
      <div 
        className="relative bg-white rounded-lg shadow-sm"
        style={{ 
          transform: `translateX(-${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease',
          zIndex: 2,
          backfaceVisibility: 'hidden'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
} 