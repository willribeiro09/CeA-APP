import React, { useState, useRef, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Camera, Check, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface ReceiptScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceiptScanner({ isOpen, onClose, onSuccess }: ReceiptScannerProps) {
  const [mode, setMode] = useState<'camera' | 'preview' | 'form'>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Iniciar câmera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Câmera traseira
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check permissions.');
    }
  }, []);

  // Parar câmera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Capturar foto
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    // Converter para blob
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
        setMode('form');
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  }, [stopCamera]);

  // Resetar e tirar nova foto
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setMode('camera');
    startCamera();
  }, [startCamera]);

  // Salvar receipt
  const handleSave = async () => {
    if (!capturedBlob || !description.trim()) {
      setError('Please fill in the description');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload da imagem para o bucket
      const filename = `receipt_${uuidv4()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filename, capturedBlob, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filename);

      // Salvar no banco de dados
      const { error: dbError } = await supabase
        .from('receipts')
        .insert({
          description: description.trim(),
          amount: amountValue,
          photo_url: urlData.publicUrl,
          filename: filename
        });

      if (dbError) throw dbError;

      // Limpar e fechar
      setCapturedImage(null);
      setCapturedBlob(null);
      setDescription('');
      setAmount('');
      setMode('camera');
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving receipt:', err);
      setError('Failed to save receipt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Efeitos para abrir/fechar câmera
  React.useEffect(() => {
    if (isOpen && mode === 'camera') {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, mode, startCamera, stopCamera]);

  // Reset ao fechar
  React.useEffect(() => {
    if (!isOpen) {
      setCapturedImage(null);
      setCapturedBlob(null);
      setDescription('');
      setAmount('');
      setMode('camera');
      setError(null);
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
        <Dialog.Content className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:max-h-[90vh] w-full h-full md:h-auto bg-black md:bg-white md:rounded-2xl shadow-lg flex flex-col z-50 overflow-hidden">
          
          {mode === 'camera' && (
            <>
              {/* Camera View */}
              <div className="relative flex-1 bg-black flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Scan overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-8 border-2 border-white/50 rounded-lg">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                  </div>
                  <div className="absolute top-12 left-0 right-0 text-center">
                    <p className="text-white text-sm font-medium bg-black/30 px-4 py-2 rounded-full inline-block">
                      Position receipt within frame
                    </p>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Error message */}
                {error && (
                  <div className="absolute top-20 left-4 right-4 bg-red-500 text-white text-sm p-3 rounded-lg text-center">
                    {error}
                  </div>
                )}
              </div>

              {/* Capture button */}
              <div className="bg-black p-6 flex justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <div className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-700" />
                  </div>
                </button>
              </div>

              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}

          {mode === 'form' && capturedImage && (
            <>
              {/* Header */}
              <div className="bg-[#073863] px-4 py-3 flex items-center justify-between flex-shrink-0">
                <button
                  onClick={retakePhoto}
                  className="p-1.5 rounded-full hover:bg-[#052a4a] transition-colors flex items-center gap-1 text-white text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake
                </button>
                <h2 className="text-lg font-semibold text-white">New Receipt</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-[#052a4a] transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 bg-white">
                {/* Image preview */}
                <div className="mb-4">
                  <img 
                    src={capturedImage} 
                    alt="Receipt" 
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="Enter description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-3 pl-8 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Saving...' : (
                    <>
                      <Check className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

