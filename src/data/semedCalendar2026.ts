import { SchoolEvent } from '../types/database.types';

/**
 * Calendário Escolar Oficial 2026 — SEMED Manaus (Ensino Fundamental - Zona Urbana / Rural Rodoviária)
 * Fonte: Resolução Nº 183/CME/2025
 */
export interface SemedEventSeed {
  id: string;
  event_date: string; // YYYY-MM-DD
  title: string;
  description: string;
  event_type: SchoolEvent['event_type'];
}

const SEMED_2026_SEEDS: SemedEventSeed[] = [
  // Férias e Feriado de Janeiro
  {
    id: 'semed-2026-01-01',
    event_date: '2026-01-01',
    title: 'Confraternização Universal (Feriado)',
    description: 'Feriado Nacional — Calendário SEMED Manaus 2026',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-01-02',
    event_date: '2026-01-02',
    title: 'Início das Férias Escolares (02 a 31/01)',
    description: 'Recesso/Férias docentes e discentes — SEMED Manaus 2026',
    event_type: 'feriado',
  },

  // Fevereiro
  {
    id: 'semed-2026-02-02',
    event_date: '2026-02-02',
    title: 'Jornada Pedagógica & Início do Ano Escolar',
    description: 'Abertura oficial do ano escolar na rede municipal — SEMED Manaus 2026',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-02-03',
    event_date: '2026-02-03',
    title: 'Planejamento Escolar (SEMED)',
    description: 'Dia de planejamento pedagógico nas escolas',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-02-04',
    event_date: '2026-02-04',
    title: 'Início do Ano Letivo & 1º Bimestre',
    description: 'Início do 1º Bimestre (50 dias letivos: 04/02 a 22/04) e Dia da Solidariedade e da Paz',
    event_type: 'evento',
  },
  {
    id: 'semed-2026-02-16',
    event_date: '2026-02-16',
    title: 'Recesso de Carnaval (16 a 18/02)',
    description: 'Ponto facultativo / Recesso de Carnaval — SEMED Manaus 2026',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-02-17',
    event_date: '2026-02-17',
    title: 'Recesso de Carnaval',
    description: 'Recesso de Carnaval — SEMED Manaus 2026',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-02-18',
    event_date: '2026-02-18',
    title: 'Quarta-feira de Cinzas (Recesso de Carnaval)',
    description: 'Recesso de Carnaval (16 a 18/02) — SEMED Manaus 2026',
    event_type: 'feriado',
  },

  // Março
  {
    id: 'semed-2026-03-02',
    event_date: '2026-03-02',
    title: 'Av1 — 1º Bimestre',
    description: '1ª Avaliação do 1º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-03-20',
    event_date: '2026-03-20',
    title: 'Planejamento Escolar (SEMED)',
    description: 'Dia de planejamento pedagógico',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-03-25',
    event_date: '2026-03-25',
    title: 'Av2 — 1º Bimestre',
    description: '2ª Avaliação do 1º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },

  // Abril
  {
    id: 'semed-2026-04-03',
    event_date: '2026-04-03',
    title: 'Paixão de Cristo (Feriado)',
    description: 'Feriado Nacional — Sexta-feira Santa',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-04-16',
    event_date: '2026-04-16',
    title: 'Av3 — 1º Bimestre',
    description: '3ª Avaliação do 1º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-04-21',
    event_date: '2026-04-21',
    title: 'Tiradentes (Feriado)',
    description: 'Feriado Nacional',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-04-22',
    event_date: '2026-04-22',
    title: 'Término do 1º Bimestre',
    description: 'Encerramento do 1º Bimestre (50 dias letivos)',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-04-23',
    event_date: '2026-04-23',
    title: 'Início do 2º Bimestre & Lançamento de Notas (1º Bim)',
    description: 'Início do 2º Bimestre (23/04 a 16/07) e abertura do lançamento de notas no sistema (23 a 29/04)',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-04-29',
    event_date: '2026-04-29',
    title: 'Último dia: Lançamento de Notas 1º Bimestre',
    description: 'Prazo final do período de lançamento de notas do 1º Bimestre no sistema (23 a 29/04)',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-04-30',
    event_date: '2026-04-30',
    title: 'Aplicação da ADE (1ª edição)',
    description: 'Avaliação de Desempenho Escolar (ADE) — SEMED Manaus 2026',
    event_type: 'prova',
  },

  // Maio
  {
    id: 'semed-2026-05-01',
    event_date: '2026-05-01',
    title: 'Dia do Trabalhador (Feriado)',
    description: 'Feriado Nacional',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-05-06',
    event_date: '2026-05-06',
    title: 'Planejamento Escolar (SEMED)',
    description: 'Dia de planejamento pedagógico',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-05-15',
    event_date: '2026-05-15',
    title: 'Av1 — 2º Bimestre',
    description: '1ª Avaliação do 2º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },

  // Junho
  {
    id: 'semed-2026-06-04',
    event_date: '2026-06-04',
    title: 'Corpus Christi (Feriado / Ponto Facultativo)',
    description: 'Corpus Christi — Calendário SEMED Manaus 2026',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-06-09',
    event_date: '2026-06-09',
    title: 'Av2 — 2º Bimestre',
    description: '2ª Avaliação do 2º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-06-19',
    event_date: '2026-06-19',
    title: 'Planejamento Escolar (SEMED)',
    description: 'Dia de planejamento pedagógico',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-06-25',
    event_date: '2026-06-25',
    title: 'Início do Recesso Escolar (25/06 a 05/07)',
    description: 'Recesso escolar de meio de ano — SEMED Manaus 2026',
    event_type: 'feriado',
  },

  // Julho
  {
    id: 'semed-2026-07-05',
    event_date: '2026-07-05',
    title: 'Término do Recesso Escolar',
    description: 'Último dia do recesso escolar (25/06 a 05/07) — Retorno às aulas em 06/07',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-07-13',
    event_date: '2026-07-13',
    title: 'Av3 — 2º Bimestre',
    description: '3ª Avaliação do 2º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-07-16',
    event_date: '2026-07-16',
    title: 'Término do 2º Bimestre',
    description: 'Encerramento do 2º Bimestre (50 dias letivos)',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-07-17',
    event_date: '2026-07-17',
    title: 'Início do 3º Bimestre & Lançamento de Notas (2º Bim)',
    description: 'Início do 3º Bimestre (17/07 a 29/09) e lançamento de notas no sistema (17 a 23/07)',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-07-23',
    event_date: '2026-07-23',
    title: 'Último dia: Lançamento de Notas 2º Bimestre',
    description: 'Prazo final do período de lançamento de notas do 2º Bimestre no sistema (17 a 23/07)',
    event_type: 'pedagogico',
  },

  // Agosto
  {
    id: 'semed-2026-08-07',
    event_date: '2026-08-07',
    title: 'Av1 — 3º Bimestre',
    description: '1ª Avaliação do 3º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-08-10',
    event_date: '2026-08-10',
    title: 'Planejamento Escolar (SEMED)',
    description: 'Dia de planejamento pedagógico',
    event_type: 'pedagogico',
  },

  // Setembro
  {
    id: 'semed-2026-09-01',
    event_date: '2026-09-01',
    title: 'Av2 — 3º Bimestre',
    description: '2ª Avaliação do 3º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-09-05',
    event_date: '2026-09-05',
    title: 'Elevação do Amazonas à Categoria de Província (Feriado)',
    description: 'Feriado Estadual — Amazonas',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-09-07',
    event_date: '2026-09-07',
    title: 'Independência do Brasil (Feriado)',
    description: 'Feriado Nacional',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-09-21',
    event_date: '2026-09-21',
    title: 'Planejamento Escolar (SEMED)',
    description: 'Dia de planejamento pedagógico',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-09-25',
    event_date: '2026-09-25',
    title: 'Av3 — 3º Bimestre',
    description: '3ª Avaliação do 3º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-09-29',
    event_date: '2026-09-29',
    title: 'Término do 3º Bimestre',
    description: 'Encerramento do 3º Bimestre (50 dias letivos)',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-09-30',
    event_date: '2026-09-30',
    title: 'Início do 4º Bimestre & Lançamento de Notas (3º Bim)',
    description: 'Início do 4º Bimestre (30/09 a 17/12) e lançamento de notas no sistema (30/09 a 06/10)',
    event_type: 'pedagogico',
  },

  // Outubro
  {
    id: 'semed-2026-10-06',
    event_date: '2026-10-06',
    title: 'Último dia: Lançamento de Notas 3º Bimestre',
    description: 'Prazo final do período de lançamento de notas do 3º Bimestre no sistema (30/09 a 06/10)',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-10-08',
    event_date: '2026-10-08',
    title: 'Aplicação da ADE (2ª edição)',
    description: 'Avaliação de Desempenho Escolar (ADE) — SEMED Manaus 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-10-12',
    event_date: '2026-10-12',
    title: 'Nossa Senhora Aparecida (Feriado)',
    description: 'Feriado Nacional',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-10-15',
    event_date: '2026-10-15',
    title: 'Dia do Professor (Feriado / Comemoração Escolar)',
    description: 'Dia do Professor — Calendário SEMED Manaus 2026',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-10-23',
    event_date: '2026-10-23',
    title: 'Av1 — 4º Bimestre',
    description: '1ª Avaliação do 4º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-10-24',
    event_date: '2026-10-24',
    title: 'Aniversário de Manaus (Feriado Municipal)',
    description: 'Feriado Municipal — Manaus/AM',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-10-28',
    event_date: '2026-10-28',
    title: 'Dia do Servidor Público (Ponto Facultativo)',
    description: 'Dia do Servidor Público — Calendário SEMED Manaus 2026',
    event_type: 'feriado',
  },

  // Novembro
  {
    id: 'semed-2026-11-02',
    event_date: '2026-11-02',
    title: 'Finados (Feriado)',
    description: 'Feriado Nacional',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-11-06',
    event_date: '2026-11-06',
    title: 'Planejamento Escolar (SEMED)',
    description: 'Último dia de planejamento pedagógico do ano letivo — SEMED Manaus 2026',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-11-15',
    event_date: '2026-11-15',
    title: 'Proclamação da República (Feriado)',
    description: 'Feriado Nacional',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-11-19',
    event_date: '2026-11-19',
    title: 'Av2 — 4º Bimestre',
    description: '2ª Avaliação do 4º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-11-20',
    event_date: '2026-11-20',
    title: 'Dia da Consciência Negra (Feriado)',
    description: 'Feriado Nacional — Dia Nacional de Zumbi e da Consciência Negra',
    event_type: 'feriado',
  },

  // Dezembro
  {
    id: 'semed-2026-12-08',
    event_date: '2026-12-08',
    title: 'Nossa Senhora da Conceição (Feriado Estadual)',
    description: 'Padroeira do Amazonas — Feriado',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-12-15',
    event_date: '2026-12-15',
    title: 'Av3 — 4º Bimestre',
    description: '3ª Avaliação do 4º Bimestre — Calendário Oficial SEMED 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-12-17',
    event_date: '2026-12-17',
    title: 'Término do 4º Bimestre & Término do Ano Letivo',
    description: 'Encerramento do 4º Bimestre (50 dias) e dos 200 dias letivos (800h) + Lançamento de Notas',
    event_type: 'pedagogico',
  },
  {
    id: 'semed-2026-12-18',
    event_date: '2026-12-18',
    title: 'Recuperação Final (Dia 1 de 3)',
    description: 'Recuperação Final (18, 21 e 22/12) — SEMED Manaus 2026',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-12-21',
    event_date: '2026-12-21',
    title: 'Recuperação Final & Lançamento de Notas',
    description: 'Recuperação Final (dia 2) e Lançamento das Notas no Sistema',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-12-22',
    event_date: '2026-12-22',
    title: 'Recuperação Final (Último dia) & Lançamento de Notas',
    description: 'Último dia de Recuperação Final e Lançamento das Notas no Sistema',
    event_type: 'prova',
  },
  {
    id: 'semed-2026-12-23',
    event_date: '2026-12-23',
    title: 'Conselho de Classe Final',
    description: 'Conselho de Classe — Calendário Oficial SEMED Manaus 2026',
    event_type: 'conselho',
  },
  {
    id: 'semed-2026-12-24',
    event_date: '2026-12-24',
    title: 'Término do Ano Escolar',
    description: 'Encerramento oficial do Ano Escolar 2026 — SEMED Manaus',
    event_type: 'evento',
  },
  {
    id: 'semed-2026-12-25',
    event_date: '2026-12-25',
    title: 'Natal (Feriado)',
    description: 'Feriado Nacional',
    event_type: 'feriado',
  },
  {
    id: 'semed-2026-12-28',
    event_date: '2026-12-28',
    title: 'Recesso Escolar de Fim de Ano (28 a 31/12)',
    description: 'Recesso escolar — SEMED Manaus 2026',
    event_type: 'feriado',
  },
];

export const SEMED_MANAUS_2026_EVENTS: SchoolEvent[] = SEMED_2026_SEEDS.map((item) => ({
  ...item,
  created_at: '2026-01-01T00:00:00.000Z',
}));

export const isSemedOfficialEvent = (id: string) => id.startsWith('semed-');
