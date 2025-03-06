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
  const [isDragging, setIsDragging] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  
  const THRESHOLD = 80;
  const MAX_SWIPE = 180;
  
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setStartX(clientX);
    setIsDragging(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diff = startX - clientX;
    const newTranslateX = Math.max(0, Math.min(diff, MAX_SWIPE));
    setTranslateX(newTranslateX);
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
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
      className="relative mb-2"
      style={{ overflow: 'hidden', touchAction: 'none' }}
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
          zIndex: 2
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