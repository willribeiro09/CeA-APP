import { supabase } from '../supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { ChangeEvent } from './types';
import { processChangeEvent } from './eventHandlers';

// Variáveis para sincronização baseada em eventos
let channelChanges: RealtimeChannel | null = null;
let channelData: RealtimeChannel | null = null;
let isAppReady = false;

// Função para verificar se o app está pronto para interação
export const isReady = () => isAppReady;

// Marcar o app como pronto para interação
export const setAppReady = () => {
  if (!isAppReady) {
    isAppReady = true;
    window.dispatchEvent(new CustomEvent('appReady'));
    console.log('App marcado como pronto para interação');
  }
};

// Configurar canais para sincronização baseada em eventos
export const setupEventBasedSync = () => {
  if (!supabase) {
    console.warn('Supabase não configurado, não é possível configurar sincronização baseada em eventos');
    setAppReady(); // Marcar como pronto mesmo sem Supabase
    return;
  }
  
  // Limpar inscrições anteriores
  if (channelChanges) {
    channelChanges.unsubscribe();
  }
  
  if (channelData) {
    channelData.unsubscribe();
  }
  
  // Configurar canal para eventos de alteração
  channelChanges = supabase
    .channel('changes_channel')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public',
        table: 'item_changes' 
      }, 
      (payload: RealtimePostgresChangesPayload<any>) => {
        if (payload.new) {
          processChangeEvent(payload.new as ChangeEvent);
        }
      }
    )
    .subscribe((status: string) => {
      console.log('Status da inscrição do canal de alterações:', status);
      
      // Marcar o app como pronto após a inscrição
      setAppReady();
    });
  
  // Manter canal de dados completos para compatibilidade
  channelData = supabase
    .channel('data_channel')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public',
        table: 'sync_data' 
      }, 
      (payload: RealtimePostgresChangesPayload<any>) => {
        console.log('Alteração em dados completos detectada:', payload);
      }
    )
    .subscribe((status: string) => {
      console.log('Status da inscrição do canal de dados completos:', status);
    });
}; 