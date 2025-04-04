import React from 'react';
import { X } from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
}

export function ImageViewer({ imageUrl, onClose }: ImageViewerProps) {
  // Prevenir o scroll do corpo quando o visualizador está aberto
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center" onClick={onClose}>
      <button 
        className="absolute top-4 right-4 text-white z-10"
        onClick={onClose}
      >
        <X className="w-8 h-8" />
      </button>
      
      <div className="max-w-full max-h-full p-4" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl} 
          alt="Visualização de recibo" 
          className="max-w-full max-h-[90vh] object-contain"
        />
      </div>
    </div>
  );
} 