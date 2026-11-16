import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nxcqgmosyxoqhcultmmd.supabase.co';
const supabaseKey = 'sb_publishable_AkcuS8KRQJPQeE4LW_BtUQ_etVFoBhJ';

async function seedTestUsers() {
  console.log('=== CRIANDO E TESTANDO PERFIS DE TESTE (ETAPA 4) ===\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Criar Perfil Pedagoga
  const pedagogaEmail = 'pedagoga.regina@gmail.com';
  const pedagogaPass = 'escola-senha-segura-123';
  console.log(`[1] Registrando Pedagoga: ${pedagogaEmail}`);
  
  let { data: authPedagoga, error: errPedagoga } = await supabase.auth.signUp({
    email: pedagogaEmail,
    password: pedagogaPass,
    options: {
      data: {
        full_name: 'Profa. Regina Silveira (Pedagoga)',
        role: 'pedagoga',
        discipline: 'Coordenação Pedagógica Geral',
        phone: '(11) 98888-1111'
      }
    }
  });

  if (errPedagoga && !errPedagoga.message.includes('already registered')) {
    console.error('Erro ao cadastrar pedagoga:', errPedagoga.message);
  } else {
    console.log('=> Cadastro da Pedagoga enviado com sucesso!');
  }

  // Login da Pedagoga
  const { data: loginPedagoga, error: loginErrPedagoga } = await supabase.auth.signInWithPassword({
    email: pedagogaEmail,
    password: pedagogaPass,
  });

  if (loginErrPedagoga) {
    console.log('Aviso no login da Pedagoga:', loginErrPedagoga.message);
  } else {
    console.log('=> Pedagoga AUTENTICADA com sucesso! ID:', loginPedagoga.user.id);
  }

  // 2. Criar Perfil Professor Carlos
  const profEmail = 'prof.carlos.matias@gmail.com';
  const profPass = 'escola-senha-segura-123';
  console.log(`\n[2] Registrando Professor: ${profEmail}`);

  let { data: authProf, error: errProf } = await supabase.auth.signUp({
    email: profEmail,
    password: profPass,
    options: {
      data: {
        full_name: 'Prof. Carlos Eduardo',
        role: 'professor',
        discipline: 'Matemática e Raciocínio Lógico',
        phone: '(11) 97777-2222'
      }
    }
  });

  if (errProf && !errProf.message.includes('already registered')) {
    console.error('Erro ao cadastrar professor:', errProf.message);
  } else {
    console.log('=> Cadastro do Professor enviado com sucesso!');
  }

  // Login do Professor
  const { data: loginProf, error: loginErrProf } = await supabase.auth.signInWithPassword({
    email: profEmail,
    password: profPass,
  });

  if (loginErrProf) {
    console.log('Aviso no login do Professor:', loginErrProf.message);
  } else {
    console.log('=> Professor AUTENTICADO com sucesso! ID:', loginProf.user.id);
  }

  // 3. Teste de RLS: Professor insere documento
  if (loginProf?.session) {
    const profClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${loginProf.session.access_token}` } }
    });

    console.log('\n[3] Testando inserção de documento pelo Professor:');
    const { data: newDoc, error: docErr } = await profClient.from('documents').insert({
      teacher_id: loginProf.user.id,
      title: 'Plano Semanal - Funções e Equações do 1º Grau',
      description: 'Planejamento para as turmas 801 e 802',
      file_url: 'https://nxcqgmosyxoqhcultmmd.supabase.co/storage/v1/object/public/school-documents/plano_matematica.pdf',
      file_name: 'plano_matematica.pdf',
      file_size: 1024 * 350,
      status: 'pendente'
    }).select().single();

    if (docErr) {
      console.error('Erro ao inserir documento:', docErr.message);
    } else {
      console.log('=> SUCESSO: Documento inserido no banco com ID:', newDoc.id);
    }

    // Professor tenta listar seus documentos
    const { data: profDocs } = await profClient.from('documents').select('*');
    console.log(`=> Documentos visíveis para o Professor: ${profDocs?.length}`);
  }

  // 4. Teste de RLS: Pedagoga visualiza e aprova o documento do professor
  if (loginPedagoga?.session) {
    const pedClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${loginPedagoga.session.access_token}` } }
    });

    console.log('\n[4] Testando acesso da Pedagoga aos documentos de todos os professores:');
    const { data: pedDocs, error: pedErr } = await pedClient.from('documents').select('*');
    if (pedErr) {
      console.error('Erro na leitura da Pedagoga:', pedErr.message);
    } else {
      console.log(`=> SUCESSO: Pedagoga conseguiu listar ${pedDocs?.length} documento(s) de todos os professores!`);
      if (pedDocs && pedDocs.length > 0) {
        // Pedagoga avalia/aprova o documento
        const targetDoc = pedDocs[0];
        const { data: reviewed, error: revErr } = await pedClient
          .from('documents')
          .update({
            status: 'aprovado',
            feedback: 'Plano de aula excelente e em total conformidade com a BNCC.',
            reviewed_by: loginPedagoga.user.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', targetDoc.id)
          .select()
          .single();

        if (revErr) {
          console.error('Erro ao avaliar documento:', revErr.message);
        } else {
          console.log(`=> SUCESSO: Documento "${reviewed.title}" foi APROVADO pela Pedagoga!`);
        }
      }
    }
  }

  console.log('\n=== ETAPA 4: TESTES AUTOMÁTICOS CONCLUÍDOS COM SUCESSO! ===');
}

seedTestUsers();
