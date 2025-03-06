import React, { useState, useRef, useEffect } from 'react';
import { Edit, Trash2 } from 'lucide-react';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  onEdit: () => void;
}

export function SwipeableItem({ children, onDelete, onEdit }: SwipeableItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  
  // Constantes para configuração do deslize
  const THRESHOLD = 80; // Quantidade mínima para considerar um deslize
  const MAX_SWIPE = 120; // Quantidade máxima de deslize
  
  // Função para lidar com o início do toque/arrasto
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setStartX(clientX);
    setIsDragging(true);
  };
  
  // Função para lidar com o movimento do toque/arrasto
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diff = startX - clientX;
    
    // Limitar o deslize para a esquerda apenas (valores positivos)
    const newTranslateX = Math.max(0, Math.min(diff, MAX_SWIPE));
    setTranslateX(newTranslateX);
  };
  
  // Função para lidar com o fim do toque/arrasto
  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Se o deslize for maior que o limite, mantenha aberto, caso contrário, feche
    if (translateX > THRESHOLD) {
      setTranslateX(MAX_SWIPE);
    } else {
      setTranslateX(0);
    }
  };
  
  // Função para fechar o item quando clicar fora dele
  const handleClickOutside = (e: MouseEvent) => {
    if (itemRef.current && !itemRef.current.contains(e.target as Node) && translateX > 0) {
      setTranslateX(0);
    }
  };
  
  // Adicionar listener para fechar quando clicar fora
  useEffect(() => {
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
      {/* Ações que aparecem ao deslizar - posicionadas atrás do conteúdo principal */}
      <div 
        className="absolute top-0 right-0 h-full flex items-center justify-end gap-1 pr-1"
        style={{ zIndex: 1 }}
      >
        <button 
          onClick={onEdit}
          className="h-[calc(100%-2px)] bg-blue-500 flex items-center justify-center text-white rounded-md"
          style={{ width: '55px' }}
        >
          <Edit size={20} />
        </button>
        <button 
          onClick={onDelete}
          className="h-[calc(100%-2px)] bg-red-500 flex items-center justify-center text-white rounded-md"
          style={{ width: '55px' }}
        >
          <Trash2 size={20} />
        </button>
      </div>
      
      {/* Conteúdo principal que será deslizado - posicionado acima das ações */}
      <div 
        className="relative bg-white rounded-lg shadow-sm"
        style={{ 
          transform: `translateX(-${translateX}px)`,
          transition: 'transform 0.3s ease',
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