import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nxcqgmosyxoqhcultmmd.supabase.co';
const supabaseKey = 'sb_publishable_AkcuS8KRQJPQeE4LW_BtUQ_etVFoBhJ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
  const { data, error } = await supabase.from('document_categories').select('*');
  if (error) {
    console.error('Erro ao ler categorias:', error);
  } else {
    console.log('Categorias cadastradas com sucesso:', data.length);
    data.forEach(c => console.log(`- ${c.name} (Dia ${c.deadline_day})`));
  }
}

checkCategories();
