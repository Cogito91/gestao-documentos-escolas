import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nxcqgmosyxoqhcultmmd.supabase.co';
const supabaseKey = 'sb_publishable_AkcuS8KRQJPQeE4LW_BtUQ_etVFoBhJ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('--- Testando Conexão com o Supabase ---');
  console.log('URL:', supabaseUrl);
  
  try {
    // Testa consulta à tabela profiles
    const { data, error, status } = await supabase.from('profiles').select('*').limit(1);
    console.log('Status HTTP:', status);
    
    if (error) {
      console.log('Retorno:', error.message);
      if (error.code === '42P01') {
        console.log('=> Conexão com Supabase OK! (As tabelas ainda precisam ser criadas via SQL Editor)');
      } else {
        console.log('=> Detalhe do erro:', error);
      }
    } else {
      console.log('=> Conexão bem-sucedida e tabela profiles localizada! Dados:', data);
    }
  } catch (err) {
    console.error('Falha na requisição:', err.message);
  }
}

testConnection();
