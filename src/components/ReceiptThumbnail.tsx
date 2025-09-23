import React from 'react';
import { FileText } from 'lucide-react';
import { ExpenseReceipt } from '../types';

interface ReceiptThumbnailProps {
  receipt: ExpenseReceipt;
  onView: (receipt: ExpenseReceipt) => void;
}

export function ReceiptThumbnail({ receipt, onView }: ReceiptThumbnailProps) {
  const isImage = receipt.mimeType?.startsWith('image/') || 
                  receipt.filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/);

  const isPDF = receipt.mimeType === 'application/pdf' || 
                receipt.filename.toLowerCase().endsWith('.pdf');

  const handleView = () => {
    onView(receipt);
  };

  const renderThumbnailContent = () => {
    if (isImage) {
      return (
        <img
          src={receipt.url}
          alt={receipt.filename}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            // Se a imagem falhar, mostrar ícone
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="w-full h-full flex items-center justify-center bg-gray-100">
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
              `;
            }
          }}
        />
      );
    } else if (isPDF) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
          <FileText className="w-8 h-8 text-red-500 mb-1" />
          <span className="text-xs text-red-600 font-medium">PDF</span>
        </div>
      );
    } else {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
          <FileText className="w-8 h-8 text-gray-500 mb-1" />
          <span className="text-xs text-gray-600 font-medium">FILE</span>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col">
      {/* Miniatura clicável */}
      <div
        onClick={handleView}
        className="w-28 h-28 rounded-lg border-2 border-gray-200 active:border-gray-400 cursor-pointer transition-all duration-150 overflow-hidden bg-white shadow-sm active:shadow-md touch-manipulation"
        style={{ touchAction: 'manipulation' }}
      >
        {renderThumbnailContent()}
      </div>

      {/* Nome do arquivo abaixo da miniatura */}
      <div className="mt-2 w-full">
        <p className="text-xs text-gray-600 truncate text-center" title={receipt.filename}>
          {receipt.filename}
        </p>
        <p className="text-xs text-gray-400 text-center">
          {new Date(receipt.uploadedAt).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
}
