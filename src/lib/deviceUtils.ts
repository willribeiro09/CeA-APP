/**
 * Utilitários para detecção de dispositivo e ambiente
 */

/**
 * Verifica se o dispositivo é móvel com base no user-agent
 */
export const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
};

/**
 * Verifica se o aplicativo está instalado como PWA
 */
export const isPwaInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

/**
 * Retorna informações sobre o ambiente
 */
export const getEnvironmentInfo = (): { isMobile: boolean; isPwa: boolean; isOnline: boolean } => {
  return {
    isMobile: isMobileDevice(),
    isPwa: isPwaInstalled(),
    isOnline: navigator.onLine
  };
}; 