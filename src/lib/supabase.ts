import { createClient } from '@supabase/supabase-js';

// Usar diretamente as credenciais do Supabase
const supabaseUrl = 'https://mnucrulwdurskwofsgwp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udWNydWx3ZHVyc2t3b2ZzZ3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNzg3ODksImV4cCI6MjA1Njc1NDc4OX0.39iA0f1vEH2K8ygEobuv6O_FR8Fm8H2UXHzPkAZmm60';

console.log('Configuração do Supabase:');
console.log('URL:', supabaseUrl);
console.log('Chave:', supabaseAnonKey ? 'Definida (valor oculto por segurança)' : 'Não definida');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  const configured = Boolean(supabaseUrl && supabaseAnonKey);
  console.log('Supabase está configurado:', configured);
  return configured;
}; 