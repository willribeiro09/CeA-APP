import React, { ReactNode, useRef, useState } from 'react';
import { Trash2, Edit } from 'lucide-react';

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
  isWill = false,
  customEditButton
}: SwipeableItemProps) {
  const [offset, setOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const itemRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const threshold = 80; // Limiar para considerar um swipe

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    // Limitar o swipe para a esquerda apenas
    if (diff < 0) {
      // Limitar o swipe para não ultrapassar o tamanho dos botões
      const newOffset = Math.max(diff, -threshold);
      setOffset(newOffset);
    } else if (diff > 0 && offset < 0) {
      // Permitir arrastar de volta se já estiver aberto
      const newOffset = Math.min(0, offset + diff);
      setOffset(newOffset);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    
    // Se o swipe foi suficiente, abrir completamente
    if (offset < -threshold / 2) {
      setOffset(-threshold);
    } else {
      // Caso contrário, fechar
      setOffset(0);
    }
  };

  // Resetar o swipe quando clicar fora
  const resetSwipe = () => {
    if (offset !== 0) {
      setOffset(0);
    }
  };

  // Adicionar event listener para clicar fora
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        resetSwipe();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div 
      ref={itemRef}
      className="relative overflow-hidden mb-4 rounded-lg"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        style={{ transform: `translateX(${offset}px)` }}
        className="transition-transform duration-200 ease-out"
      >
        {children}
      </div>
      
      <div 
        className="absolute top-0 right-0 h-full flex items-center"
        style={{ transform: `translateX(${threshold + offset}px)` }}
      >
        {isWill ? (
          // Botões personalizados para Will
          customEditButton
        ) : (
          // Botões padrão
          <div className="flex">
            <button
              onClick={onEdit}
              className="bg-blue-500 h-full px-4 flex items-center justify-center"
            >
              <Edit className="text-white" size={18} />
            </button>
            <button
              onClick={onDelete}
              className="bg-red-500 h-full px-4 flex items-center justify-center"
            >
              <Trash2 className="text-white" size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}