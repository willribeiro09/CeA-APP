import { useEffect } from 'react';
import { syncManager } from '../lib/syncManager';

/**
 * Componente responsável por gerenciar a sincronização de dados 
 * quando o app volta do segundo plano ou inicia
 */
export const SyncManagerComponent = () => {
  useEffect(() => {
    // Inicializar o gerenciador de sincronização
    syncManager.init();
    
    // Forçar sincronização na inicialização
    syncManager.syncNow();
    
    // Interceptar cliques na página para garantir sincronização
    const handleUserInteraction = () => {
      // Força uma sincronização antes de qualquer interação do usuário
      syncManager.syncNow();
    };
    
    // Adicionar listener para o primeiro clique após carregar a página
    document.addEventListener('click', handleUserInteraction, { once: true });
    
    return () => {
      // Remover listener ao desmontar o componente
      document.removeEventListener('click', handleUserInteraction);
    };
  }, []);
  
  // Este componente não renderiza nada visualmente
  return null;
};

export default SyncManagerComponent; 