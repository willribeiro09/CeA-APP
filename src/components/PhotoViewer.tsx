import React, { useRef, useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Edit3, Trash2 } from 'lucide-react';
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
      setIsDragging(true);
    } else if (e.touches.length === 2) {
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
    } else if (e.touches.length === 1 && isDragging && lastTouch && scale > 1) {
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
        <Dialog.Overlay className="fixed inset-0 bg-black/95 z-50" />
        <Dialog.Content 
          className="fixed inset-0 z-[100] flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
            <Dialog.Title className="text-white font-medium truncate flex-1 mr-4">
              {photo.filename || 'Project Photo'}
            </Dialog.Title>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onEdit(photo)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <Dialog.Close className="text-white/80 hover:text-white p-2">
                <X className="w-6 h-6" />
              </Dialog.Close>
            </div>
          </div>

          {/* Image Container */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-hidden flex items-center justify-center bg-black relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <img
              ref={imageRef}
              src={photo.url}
              alt="Project photo"
              className="max-w-full max-h-full object-contain select-none touch-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              draggable={false}
              crossOrigin="anonymous"
            />
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-black/50 backdrop-blur-sm">
            <div className="flex items-center justify-between text-white/80 text-sm">
              <div className="flex items-center gap-4">
                <span>Zoom: {Math.round(scale * 100)}%</span>
                {photo.isEdited && (
                  <span className="px-2 py-1 bg-green-600/80 rounded text-xs">
                    Edited
                  </span>
                )}
                {photo.metadata?.isLocal && (
                  <span className="px-2 py-1 bg-orange-600/80 rounded text-xs">
                    Local
                  </span>
                )}
              </div>
              <button
                onClick={resetImage}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
              >
                Reset Zoom
              </button>
            </div>
            <div className="text-white/60 text-xs mt-2">
              {photo.uploadedAt && new Date(photo.uploadedAt).toLocaleString('pt-BR')}
              {photo.fileSize && ` • ${(photo.fileSize / 1024 / 1024).toFixed(1)}MB`}
            </div>
          </div>

          {/* Instructions overlay (appears briefly) */}
          <div className="absolute inset-x-4 top-20 text-center text-white/60 text-sm pointer-events-none">
            <div className="bg-black/50 rounded-lg p-3 backdrop-blur-sm">
              Pinch to zoom • Drag to move • Double tap to reset
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
