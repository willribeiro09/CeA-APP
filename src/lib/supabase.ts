import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Configuração do Supabase:');
console.log('URL:', SUPABASE_URL);
console.log('Chave:', SUPABASE_ANON_KEY ? 'Definida (valor oculto por segurança)' : 'Não definida');

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
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
      }
    })
  : null;

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
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar tabela:', error);
    return false;
  }
}; 