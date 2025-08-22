import React, { useState, useEffect } from 'react';

interface ConflictEvent {
  message: string;
  type: 'warning' | 'info' | 'error';
}

export function ConflictNotification() {
  const [notification, setNotification] = useState<ConflictEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleConflict = (event: CustomEvent<ConflictEvent>) => {
      console.log('🔔 Exibindo notificação de conflito:', event.detail);
      setNotification(event.detail);
      setIsVisible(true);

      // Auto-hide após 5 segundos
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setNotification(null), 300); // Aguardar animação
      }, 5000);
    };

    window.addEventListener('syncConflict', handleConflict as EventListener);

    return () => {
      window.removeEventListener('syncConflict', handleConflict as EventListener);
    };
  }, []);

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (notification.type) {
      case 'warning':
        return 'text-yellow-800';
      case 'error':
        return 'text-red-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 max-w-sm p-4 border rounded-lg shadow-lg z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-full'
      } ${getBgColor()}`}
    >
      <div className="flex items-start space-x-3">
        <div className="text-lg">
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className={`text-sm font-medium ${getTextColor()}`}>
            Sincronização Inteligente
          </div>
          <div className={`text-sm mt-1 ${getTextColor()}`}>
            {notification.message}
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className={`text-lg ${getTextColor()} hover:opacity-75`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
