// Exportar tipos
export * from './types';

// Exportar funções de processamento de eventos
export {
  SESSION_ID,
  processChangeEvent,
  applyExpenseChange,
  applyProjectChange,
  applyStockChange,
  applyEmployeeChange,
  applyWillSettingsChange
} from './eventHandlers';

// Exportar funções de publicação de eventos
export { publishChangeEvent } from './publisher';

// Exportar funções de canais
export {
  isReady,
  setAppReady,
  setupEventBasedSync
} from './channels'; 