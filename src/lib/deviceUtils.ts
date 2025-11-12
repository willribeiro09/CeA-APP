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
 * Verifica se é um dispositivo iOS
 * @returns boolean indicando se é iOS
 */
export function isIOSDevice(): boolean {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
}

/**
 * Obtém ou gera um ID único para o dispositivo
 * @returns string com ID único do dispositivo
 */
export function getDeviceId(): string {
  const STORAGE_KEY = 'cea_device_id';
  
  // Tentar recuperar ID existente do localStorage
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    // Gerar novo ID único baseado em timestamp + random
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
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