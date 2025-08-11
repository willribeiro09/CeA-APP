import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || '';
// @ts-ignore
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

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