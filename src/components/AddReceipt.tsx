import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Loader } from 'lucide-react';

interface AddReceiptProps {
  onSubmit: (description: string, amount: number, date: string, file: File) => Promise<void>;
  onCancel: () => void;
  scanMode?: boolean;
}

export function AddReceipt({ onSubmit, onCancel, scanMode = false }: AddReceiptProps) {
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Automatically open camera in scan mode
  useEffect(() => {
    if (scanMode && fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 500);
    }
  }, [scanMode]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Clear previous error message
      setErrorMessage(null);
      
      const selectedFile = files[0];
      console.log(`Selected file: ${selectedFile.name}, type: ${selectedFile.type}, size: ${(selectedFile.size / 1024).toFixed(1)}KB`);
      
      // Check file size
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB
        setErrorMessage('File too large. Please select an image smaller than 10MB.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setFile(selectedFile);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.onerror = (e) => {
        console.error("Error reading file:", e);
        setErrorMessage('Error processing image. Please try again.');
      };
      reader.readAsDataURL(selectedFile);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !file) {
      setErrorMessage('Please add a date and an image');
      return;
    }
    
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      console.log('Starting receipt upload...');
      // Using 0 as amount since it's being removed from the UI
      await onSubmit(description, 0, date, file);
      
      console.log('Receipt uploaded successfully!');
    } catch (error) {
      console.error('Error adding receipt:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred while saving the receipt');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };
  
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-4 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">
            {scanMode ? 'Scan Receipt' : 'Add Receipt'}
          </h2>
          <button onClick={onCancel} className="text-gray-500" disabled={isLoading}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{errorMessage}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Receipt description"
              disabled={isLoading}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Image
            </label>
            
            {!imagePreview ? (
              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={handleCameraClick}
                  className="bg-[#5ABB37] text-white px-4 py-2 rounded-md flex items-center"
                  disabled={isLoading}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Camera
                </button>
                
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center"
                  disabled={isLoading}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload
                </button>
              </div>
            ) : (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-48 object-contain border rounded-md"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setImagePreview(null);
                    setErrorMessage(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#5ABB37] text-white rounded-md flex items-center justify-center min-w-[80px]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 