/**
 * Utilitários para detecção de dispositivo e ambiente
 */

/**
 * Verifica se a aplicação está rodando em um dispositivo móvel
 * @returns boolean indicando se é mobile
 */
export function isMobileDevice(): boolean {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Padrões de regex para detectar dispositivos móveis
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  
  return mobileRegex.test(userAgent);
}

/**
 * Verifica se a aplicação está rodando como PWA instalada
 * @returns boolean indicando se é PWA
 */
export function isPwaInstalled(): boolean {
  // Verifica se está em modo standalone ou fullscreen (indicações de PWA instalado)
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.matchMedia('(display-mode: fullscreen)').matches || 
         (window.navigator as any).standalone === true;
}

/**
 * Obtém informações detalhadas sobre o ambiente de execução
 * @returns Objeto com informações sobre o ambiente
 */
export function getEnvironmentInfo() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = navigator.language;
  const timeZoneOffset = new Date().getTimezoneOffset();
  
  return {
    isMobile: isMobileDevice(),
    isPwa: isPwaInstalled(),
    userAgent: navigator.userAgent,
    timeZone,
    locale,
    timeZoneOffset,
    timeZoneOffsetHours: -timeZoneOffset / 60, // Converter minutos para horas
    dateTime: new Date().toISOString(),
    dateTimeLocal: new Date().toString()
  };
} 