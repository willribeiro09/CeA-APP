import React, { useRef, useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Edit3, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { ProjectPhoto } from '../types';

type Props = {
  photo: ProjectPhoto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (photo: ProjectPhoto) => void;
  onDelete: (photo: ProjectPhoto) => void;
};

export default function PhotoViewer({ photo, open, onOpenChange, onEdit, onDelete }: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState<{ x: number; y: number } | null>(null);
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState<{ x: number; y: number } | null>(null);

  // Reset quando abrir nova foto
  useEffect(() => {
    if (open && photo) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, photo]);

  // Manipular zoom com pinça (touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setLastTouch({ x: touch.clientX, y: touch.clientY });
      // Permitir arrastar sempre que houver zoom
      setIsDragging(scale > 1);
    } else if (e.touches.length === 2) {
      // Para zoom com pinça, não permitir arrastar
      setIsDragging(false);
      setLastTouch(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Zoom com pinça
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      // Simples aproximação para zoom - em produção seria melhor usar a distância inicial
      const newScale = Math.min(Math.max(distance / 200, 0.5), 3);
      setScale(newScale);
      
      // Atualizar isDragging baseado no novo scale
      setIsDragging(newScale > 1);
    } else if (e.touches.length === 1 && isDragging && lastTouch) {
      // Pan/arrastar quando com zoom
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastTouch.x;
      const deltaY = touch.clientY - lastTouch.y;
      
      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastTouch({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouch(null);
  };

  // Handlers para mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsMouseDragging(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMouseDragging && lastMouse && scale > 1) {
      const deltaX = e.clientX - lastMouse.x;
      const deltaY = e.clientY - lastMouse.y;
      
      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsMouseDragging(false);
    setLastMouse(null);
  };

  // Manipular zoom com mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(scale + delta, 0.5), 3);
    setScale(newScale);
  };

  // Reset da imagem para posição inicial
  const resetImage = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.5, 5)); // Máximo 5x zoom
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev / 1.5, 0.1)); // Mínimo 0.1x zoom
  };

  const handleDelete = () => {
    if (photo && confirm('Tem certeza que deseja deletar esta foto?')) {
      onDelete(photo);
      onOpenChange(false);
    }
  };

  if (!photo) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" />
        <Dialog.Content 
          className="fixed inset-0 z-[100] flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header com dados do arquivo e botão X */}
          <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm">
            <div className="text-white/80 text-sm">
              {photo.filename || 'Project Photo'}
              {photo.uploadedAt && (
                <span className="text-white/60 text-xs ml-2">
                  • {new Date(photo.uploadedAt).toLocaleString('pt-BR')}
                </span>
              )}
              {photo.fileSize && (
                <span className="text-white/60 text-xs ml-1">
                  • {(photo.fileSize / 1024 / 1024).toFixed(1)}MB
                </span>
              )}
            </div>
            <Dialog.Close className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
              <X className="w-6 h-6" />
            </Dialog.Close>
          </div>

          {/* Image Container */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-hidden flex items-center justify-center bg-black relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <div
              className="relative"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: (isDragging || isMouseDragging) ? 'none' : 'transform 0.2s ease-out',
                transformOrigin: 'center center'
              }}
            >
              <img
                ref={imageRef}
                src={photo.url}
                alt="Project photo"
                className="max-w-full max-h-full object-contain select-none touch-none"
                draggable={false}
                crossOrigin="anonymous"
              />
            </div>

            {/* Botões de Zoom - Canto inferior esquerdo */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-2">
              <button
                onClick={zoomIn}
                className="w-12 h-12 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                title="Zoom In"
              >
                <ZoomIn className="w-6 h-6" />
              </button>
              <button
                onClick={zoomOut}
                className="w-12 h-12 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                title="Zoom Out"
              >
                <ZoomOut className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Footer com botões Edit/Delete */}
          <div className="p-4 bg-black/50 backdrop-blur-sm">
            {/* Botões Edit/Delete */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => onEdit(photo)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
