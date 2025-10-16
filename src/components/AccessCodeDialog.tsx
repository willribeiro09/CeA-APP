import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface AccessCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AccessCodeDialog({ isOpen, onClose, onSuccess }: AccessCodeDialogProps) {
  const [code, setCode] = useState(['', '', '', '', '']);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Código de acesso temporário (será substituído depois)
  const TEMP_ACCESS_CODE = '35487';

  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [isOpen]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(false);

    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 5);
    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    const newCode = pastedData.split('').concat(['', '', '', '', '']).slice(0, 5);
    setCode(newCode);
    
    const nextEmptyIndex = newCode.findIndex(c => !c);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[4]?.focus();
    }
  };

  const handleSubmit = () => {
    const enteredCode = code.join('');
    
    if (enteredCode === TEMP_ACCESS_CODE) {
      setSuccess(true);
      setError(false);
      
      setTimeout(() => {
        onSuccess();
        onClose();
        setCode(['', '', '', '', '']);
        setSuccess(false);
      }, 1500);
    } else {
      setError(true);
      setCode(['', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleClose = () => {
    onClose();
    setCode(['', '', '', '', '']);
    setError(false);
    setSuccess(false);
  };

  const isCodeComplete = code.every(digit => digit !== '');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              success ? 'bg-green-100' : error ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              {success ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : error ? (
                <AlertCircle className="w-8 h-8 text-red-600" />
              ) : (
                <Lock className="w-8 h-8 text-blue-600" />
              )}
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            {success ? 'Access Granted!' : 'Enter Access Code'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {success 
              ? 'Welcome! Redirecting...'
              : error 
                ? 'Invalid code. Please try again.'
                : 'Please enter your 5-digit access code to continue'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-3 my-6">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${
                error
                  ? 'border-red-500 focus:ring-red-500 bg-red-50'
                  : success
                  ? 'border-green-500 focus:ring-green-500 bg-green-50'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              disabled={success}
            />
          ))}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={!isCodeComplete || success}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium"
          >
            {success ? 'Verified ✓' : 'Verify Code'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full h-12"
            disabled={success}
          >
            Cancel
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          Don't have an access code? Contact your administrator.
        </p>
      </DialogContent>
    </Dialog>
  );
}



















