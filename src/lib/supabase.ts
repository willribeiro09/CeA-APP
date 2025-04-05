import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || '';
// @ts-ignore
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

console.log('Configuração do Supabase:');
console.log('URL:', SUPABASE_URL);
console.log('Chave:', SUPABASE_ANON_KEY ? 'Definida (valor oculto por segurança)' : 'Não definida');

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
          // Configurações adicionais para conexão mais robusta
          heartbeatIntervalMs: 5000,
          reconnectMaxRetries: 10,
          reconnectMinDelayMs: 500,
          reconnectMaxDelayMs: 3000
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Inicializar configurações de realtime
export const initializeRealtime = async () => {
  if (!supabase) {
    console.error('Não é possível inicializar realtime: Supabase não configurado');
    return false;
  }
  
  try {
    console.log('Inicializando configurações de realtime...');
    
    // Testar conexão de realtime
    const channel = supabase.channel('realtime_test');
    
    const subscription = channel
      .on('presence', { event: 'sync' }, () => {
        console.log('Realtime funcionando corretamente!');
      })
      .subscribe((status) => {
        console.log('Status da inscrição do canal de teste:', status);
        
        // Após testar, desinscrever para liberar recursos
        if (status === 'SUBSCRIBED') {
          setTimeout(() => {
            channel.unsubscribe();
          }, 2000);
        }
      });
      
    return true;
  } catch (error) {
    console.error('Erro ao inicializar realtime:', error);
    return false;
  }
};

export const isSupabaseConfigured = () => {
  return !!supabase;
};

// Inicializar a tabela de sincronização
export const initSyncTable = async () => {
  if (!supabase) return false;
  
  try {
    console.log('Verificando se a tabela sync_data existe...');
    
    // Tentar acessar a tabela para ver se ela existe
    const { error: checkError } = await supabase
      .from('sync_data')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.log('Erro ao verificar tabela (provavelmente não existe):', checkError.message);
      console.log('Isso é normal na primeira execução. Continuando...');
    } else {
      console.log('Tabela sync_data existe e está acessível');
      
      // Verificar se as configurações de realtime estão habilitadas no projeto
      console.log('Verificando configurações de realtime...');
      
      // Configurar canal de teste para verificar se o realtime está funcionando
      await initializeRealtime();
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar tabela:', error);
    return false;
  }
}; 