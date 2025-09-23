import React from 'react';
import { X, FileText, Image as ImageIcon } from 'lucide-react';
import { ExpenseReceipt } from '../types';

interface ReceiptThumbnailProps {
  receipt: ExpenseReceipt;
  onView: (receipt: ExpenseReceipt) => void;
  onDelete: (receiptId: string) => void;
}

export function ReceiptThumbnail({ receipt, onView, onDelete }: ReceiptThumbnailProps) {
  const isImage = receipt.mimeType?.startsWith('image/') || 
                  receipt.filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/);

  const isPDF = receipt.mimeType === 'application/pdf' || 
                receipt.filename.toLowerCase().endsWith('.pdf');

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(receipt.id);
  };

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
    <div className="relative group flex flex-col">
      {/* Miniatura clicável */}
      <div
        onClick={handleView}
        className="relative w-28 h-28 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition-all duration-200 overflow-hidden bg-white shadow-sm hover:shadow-md"
      >
        {renderThumbnailContent()}
        
        {/* Overlay com informações adicionais no hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
      </div>

      {/* Botão de delete discreto */}
      <button
        onClick={handleDelete}
        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg touch-manipulation z-10"
        title="Remover documento"
        style={{ touchAction: 'manipulation' }}
      >
        <X className="w-4 h-4" />
      </button>

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
