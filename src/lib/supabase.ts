import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || '';
// @ts-ignore
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

console.log('Configuração do Supabase:');
console.log('URL:', SUPABASE_URL);
console.log('Chave:', SUPABASE_ANON_KEY ? 'Definida (valor oculto por segurança)' : 'Não definida');

// Aumentar timeout das requisições para 20 segundos para evitar falhas em redes lentas
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            // 20 segundos de timeout
            signal: AbortSignal.timeout(20000) 
          });
        }
      }
    })
  : null;

// Alternativa ao Supabase Realtime usando polling
let pollingInterval: NodeJS.Timeout | null = null;
const realtimeCallbacks: Array<(data: any) => void> = [];
let lastKnownVersion = 0;

// Iniciar polling para simular realtime
export const startPolling = (intervalMs = 3000, recordId: string = '00000000-0000-0000-0000-000000000000') => {
  if (!supabase) {
    console.error('Não é possível iniciar polling: Supabase não configurado');
    return false;
  }
  
  // Limpar intervalo existente se houver
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  console.log(`Iniciando polling a cada ${intervalMs}ms para o registro ${recordId}`);
  
  // Função para verificar atualizações
  const checkForUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_data')
        .select('*')
        .eq('id', recordId)
        .limit(1)
        .single();
      
      if (error) {
        console.error('Erro ao verificar atualizações:', error);
        return;
      }
      
      if (!data) {
        console.log('Nenhum dado encontrado para o ID:', recordId);
        return;
      }
      
      // Verificar se a versão mudou
      if (data.version && data.version > lastKnownVersion) {
        console.log(`Nova versão detectada: ${data.version} (anterior: ${lastKnownVersion})`);
        lastKnownVersion = data.version;
        
        // Notificar todos os callbacks registrados
        realtimeCallbacks.forEach(callback => {
          try {
            callback(data);
          } catch (err) {
            console.error('Erro ao executar callback de realtime:', err);
          }
        });
      }
    } catch (err) {
      console.error('Erro ao verificar atualizações:', err);
    }
  };
  
  // Verificar imediatamente para obter a versão atual
  checkForUpdates();
  
  // Iniciar intervalo de polling
  pollingInterval = setInterval(checkForUpdates, intervalMs);
  
  return true;
};

// Parar polling
export const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('Polling para atualizações interrompido');
    return true;
  }
  return false;
};

// Registrar callback para receber atualizações
export const onRealtimeUpdate = (callback: (data: any) => void) => {
  realtimeCallbacks.push(callback);
  console.log(`Novo callback registrado. Total: ${realtimeCallbacks.length}`);
  
  // Iniciar polling se ainda não estiver ativo
  if (!pollingInterval) {
    startPolling();
  }
  
  // Retornar função para desregistrar callback
  return () => {
    const index = realtimeCallbacks.indexOf(callback);
    if (index !== -1) {
      realtimeCallbacks.splice(index, 1);
      console.log(`Callback removido. Restantes: ${realtimeCallbacks.length}`);
      
      // Se não houver mais callbacks, parar o polling
      if (realtimeCallbacks.length === 0) {
        stopPolling();
      }
    }
  };
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
      .select('id, version')
      .limit(1);
    
    if (checkError) {
      console.log('Erro ao verificar tabela (provavelmente não existe):', checkError.message);
      console.log('Isso é normal na primeira execução. Continuando...');
    } else {
      console.log('Tabela sync_data existe e está acessível');
      
      // Buscar a última versão conhecida
      const { data } = await supabase
        .from('sync_data')
        .select('version')
        .order('version', { ascending: false })
        .limit(1);
        
      if (data && data.length > 0 && data[0].version) {
        lastKnownVersion = data[0].version;
        console.log('Última versão conhecida:', lastKnownVersion);
      }
      
      // Iniciar polling para atualizações
      startPolling();
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar tabela:', error);
    return false;
  }
}; 