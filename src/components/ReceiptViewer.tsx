import React from 'react';
import { X } from 'lucide-react';
import { ExpenseReceipt } from '../types';

interface ReceiptViewerProps {
  receipt: ExpenseReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptViewer({ receipt, isOpen, onClose }: ReceiptViewerProps) {
  if (!isOpen || !receipt) return null;

  const isImage = receipt.mimeType?.startsWith('image/') || 
                  receipt.filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/);

  const isPDF = receipt.mimeType === 'application/pdf' || 
                receipt.filename.toLowerCase().endsWith('.pdf');

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-60 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-all duration-200"
        aria-label="Close receipt viewer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Content container */}
      <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
        {isImage ? (
          <img
            src={receipt.url}
            alt={receipt.filename}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onError={(e) => {
              console.error('Error loading image:', receipt.url);
              e.currentTarget.style.display = 'none';
              // Show fallback
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'block';
            }}
          />
        ) : isPDF ? (
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-red-600 font-bold text-lg">PDF</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{receipt.filename}</h3>
              <p className="text-sm text-gray-600 mb-4">
                Uploaded on {new Date(receipt.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-3">
              <a
                href={receipt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Open PDF
              </a>
              <a
                href={receipt.url}
                download={receipt.filename}
                className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Download
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-gray-600 font-bold text-xs">FILE</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{receipt.filename}</h3>
              <p className="text-sm text-gray-600 mb-2">
                {receipt.mimeType || 'Unknown file type'}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Uploaded on {new Date(receipt.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-3">
              <a
                href={receipt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open File
              </a>
              <a
                href={receipt.url}
                download={receipt.filename}
                className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Download
              </a>
            </div>
          </div>
        )}

        {/* Fallback for broken images */}
        <div 
          className="bg-white rounded-lg shadow-2xl p-6 max-w-md text-center"
          style={{ display: 'none' }}
        >
          <div className="mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-gray-600 font-bold text-xs">IMG</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">{receipt.filename}</h3>
            <p className="text-sm text-red-600 mb-4">Unable to load image</p>
          </div>
          <div className="space-y-3">
            <a
              href={receipt.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open in New Tab
            </a>
            <a
              href={receipt.url}
              download={receipt.filename}
              className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Download
            </a>
          </div>
        </div>
      </div>

      {/* File info overlay for images */}
      {isImage && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
          <p className="text-sm font-medium">{receipt.filename}</p>
          <p className="text-xs opacity-75">
            {new Date(receipt.uploadedAt).toLocaleDateString()} • 
            {receipt.fileSize ? ` ${(receipt.fileSize / 1024).toFixed(1)} KB` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
