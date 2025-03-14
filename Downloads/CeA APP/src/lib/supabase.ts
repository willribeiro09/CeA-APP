import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Criar cliente Supabase apenas se as credenciais estiverem disponíveis
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Verificar se o Supabase está configurado
export const isSupabaseConfigured = () => {
  return !!supabase;
};

// Inicializar tabela de sincronização
export const initSyncTable = async () => {
  if (!supabase) return false;
  
  try {
    // Verificar se a tabela sync_data existe
    const { error } = await supabase
      .from('sync_data')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Erro ao verificar tabela de sincronização:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao inicializar tabela de sincronização:', error);
    return false;
  }
}; 