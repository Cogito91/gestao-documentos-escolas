import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nxcqgmosyxoqhcultmmd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AkcuS8KRQJPQeE4LW_BtUQ_etVFoBhJ';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('AVISO: Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão configuradas no .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
