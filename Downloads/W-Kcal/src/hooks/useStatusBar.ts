
import { useEffect } from 'react';

export const useStatusBar = () => {
  useEffect(() => {
    const setStatusBar = async () => {
      if (typeof window !== 'undefined') {
        try {
          if ((window as any).Capacitor) {
            const capacitorModule = await import('@capacitor/core').catch(() => null);
            
            if (capacitorModule) {
              const { Capacitor } = capacitorModule;
              
              if (Capacitor.isNativePlatform()) {
                const statusBarModule = await import('@capacitor/status-bar').catch(() => null);
                
                if (statusBarModule) {
                  const { StatusBar, Style } = statusBarModule;
                  
                  // Define o estilo como claro (ícones brancos)
                  await StatusBar.setStyle({ style: Style.Light });
                  
                  // Define a cor de fundo da status bar
                  await StatusBar.setBackgroundColor({ color: '#544DFE' });
                  
                  // NÃO sobrepor - manter a status bar visível
                  await StatusBar.setOverlaysWebView({ overlay: false });
                  
                  // Mostra a status bar
                  await StatusBar.show();
                }
              }
            }
          }
        } catch (error) {
          console.log('Status bar não disponível em ambiente web');
        }
      }
    };

    setStatusBar();
  }, []);
};
