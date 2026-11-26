import {
  DocumentCategory,
  Profile,
  SchoolDocument,
  TeacherSchedule,
} from '../types/database.types';
import { DailyLogEntry } from '../services/teacherCalendarService';

const DISCIPLINES = [
  'LÍNGUA PORTUGUESA',
  'MATEMÁTICA',
  'CIÊNCIAS',
  'HISTÓRIA',
  'GEOGRAFIA',
  'LÍNGUA INGLESA',
  'ARTE',
  'EDUCAÇÃO FÍSICA',
  'ENSINO RELIGIOSO',
] as const;

const MORNING_TEACHER_NAMES: Record<string, string> = {
  'LÍNGUA PORTUGUESA': 'Profa. Mariana Costa',
  'MATEMÁTICA': 'Prof. Carlos Eduardo',
  'CIÊNCIAS': 'Profa. Fernanda Lima',
  'HISTÓRIA': 'Prof. Ricardo Almeida',
  'GEOGRAFIA': 'Profa. Juliana Rocha',
  'LÍNGUA INGLESA': 'Prof. Lucas Andrade',
  'ARTE': 'Profa. Beatriz Souza',
  'EDUCAÇÃO FÍSICA': 'Prof. Thiago Mendes',
  'ENSINO RELIGIOSO': 'Profa. Patrícia Gomes',
};

const AFTERNOON_TEACHER_NAMES: Record<string, string> = {
  'LÍNGUA PORTUGUESA': 'Prof. Rafael Nogueira',
  'MATEMÁTICA': 'Profa. Aline Ferreira',
  'CIÊNCIAS': 'Prof. Bruno Carvalho',
  'HISTÓRIA': 'Profa. Larissa Martins',
  'GEOGRAFIA': 'Prof. Diego Santana',
  'LÍNGUA INGLESA': 'Profa. Camila Nogueira',
  'ARTE': 'Prof. Gustavo Ribeiro',
  'EDUCAÇÃO FÍSICA': 'Profa. Vanessa Dias',
  'ENSINO RELIGIOSO': 'Prof. Eduardo Castro',
};

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const SIMULATED_PEDAGOGA_PROFILE: Profile = {
  id: 'sim-pedagoga',
  full_name: 'Profa. Regina (Pedagoga — Simulação)',
  email: 'pedagoga.simulacao@escola.am.gov.br',
  role: 'pedagoga',
  discipline: 'Coordenação Pedagógica',
  shift: 'Integral',
  is_active: true,
  created_at: '2026-01-15T08:00:00.000Z',
  updated_at: '2026-02-02T08:00:00.000Z',
};

export const SIMULATED_TEACHERS: Profile[] = [
  ...DISCIPLINES.map((disc, idx): Profile => {
    const slug = slugify(disc);
    return {
      id: `sim-manha-${slug}`,
      full_name: MORNING_TEACHER_NAMES[disc],
      email: `${slug}.manha@escola.am.gov.br`,
      role: 'professor',
      discipline: disc,
      shift: 'Manhã',
      birth_day: ((idx * 3) % 27) + 1,
      birth_month: ((idx + 1) % 12) + 1,
      phone: `(92) 99100-${String(1000 + idx).slice(-4)}`,
      is_active: true,
      created_at: '2026-01-15T08:00:00.000Z',
      updated_at: '2026-02-02T08:00:00.000Z',
    };
  }),
  ...DISCIPLINES.map((disc, idx): Profile => {
    const slug = slugify(disc);
    return {
      id: `sim-tarde-${slug}`,
      full_name: AFTERNOON_TEACHER_NAMES[disc],
      email: `${slug}.tarde@escola.am.gov.br`,
      role: 'professor',
      discipline: disc,
      shift: 'Tarde',
      birth_day: ((idx * 4 + 2) % 27) + 1,
      birth_month: ((idx + 5) % 12) + 1,
      phone: `(92) 99200-${String(2000 + idx).slice(-4)}`,
      is_active: true,
      created_at: '2026-01-15T08:00:00.000Z',
      updated_at: '2026-02-02T08:00:00.000Z',
    };
  }),
];

export const SIMULATED_ENGLISH_MORNING_PROFILE = SIMULATED_TEACHERS.find(
  (t) => t.id === 'sim-manha-lingua-inglesa'
)!;

export const SIMULATED_CATEGORIES: DocumentCategory[] = [
  {
    id: 'sim-cat-plano-ensino-1bim',
    name: 'Plano de Ensino — 1º Bimestre',
    description: 'Planejamento bimestral alinhado à Matriz Curricular SEMED',
    deadline_day: 10,
    deadline_month: 2,
    deadline_date: '2026-02-10',
    bimestre: '1º Bimestre',
    requires_evidence: false,
    is_active: true,
    created_at: '2026-01-20T08:00:00.000Z',
  },
  {
    id: 'sim-cat-plano-aula-fev',
    name: 'Planos de Aula — Fevereiro/Março',
    description: 'Sequência didática e atividades do 1º Bimestre',
    deadline_day: 25,
    deadline_month: 2,
    deadline_date: '2026-02-25',
    bimestre: '1º Bimestre',
    requires_evidence: true,
    is_active: true,
    created_at: '2026-01-20T08:00:00.000Z',
  },
  {
    id: 'sim-cat-avaliacao-av3',
    name: 'Instrumento Avaliativo (Av1/Av2/Av3) — 1º Bimestre',
    description: 'Provas, trabalhos e rubricas do 1º Bimestre',
    deadline_day: 10,
    deadline_month: 4,
    deadline_date: '2026-04-10',
    bimestre: '1º Bimestre',
    requires_evidence: false,
    is_active: true,
    created_at: '2026-01-20T08:00:00.000Z',
  },
  {
    id: 'sim-cat-diario-1bim',
    name: 'Fechamento do Diário de Bordo — 1º Bimestre',
    description: 'Relatório de aulas ministradas (04/02 a 22/04/2026)',
    deadline_day: 22,
    deadline_month: 4,
    deadline_date: '2026-04-22',
    bimestre: '1º Bimestre',
    requires_evidence: false,
    is_active: true,
    created_at: '2026-01-20T08:00:00.000Z',
  },
];

const TURMA_SETS = [
  ['6º Ano A', '6º Ano B', '7º Ano A', '8º Ano A', '9º Ano A'],
  ['6º Ano C', '7º Ano B', '7º Ano C', '8º Ano B', '9º Ano B'],
];

export function buildSimulatedSchedules(): TeacherSchedule[] {
  const result: TeacherSchedule[] = [];
  SIMULATED_TEACHERS.forEach((teacher, tIdx) => {
    const isAfternoon = teacher.shift === 'Tarde';
    const basePeriod = isAfternoon ? 11 : 1;
    const turmas = isAfternoon ? TURMA_SETS[1] : TURMA_SETS[0];

    // Seg (1) a Sex (5)
    for (let dow = 1; dow <= 5; dow++) {
      // Inglês tem 3 tempos na segunda/quarta/sexta e 2 na terça/quinta (total 13 aulas/semana)
      const periodsToday =
        dow % 2 === 1 ? [0, 1, 2] : [2, 3, 4];
      periodsToday.forEach((pOffset, idx) => {
        const periodNum = basePeriod + pOffset;
        const turma = turmas[(dow + idx + tIdx) % turmas.length];
        const slotRange = (TIME_SLOTS_BY_PERIOD[periodNum] || '07:30 - 08:15').split(' - ');
        result.push({
          id: `sim-sch-${teacher.id}-${dow}-${periodNum}`,
          teacher_id: teacher.id,
          day_of_week: dow,
          period: periodNum,
          start_time: slotRange[0] || '07:30',
          end_time: slotRange[1] || '08:15',
          class_name: turma,
          subject: teacher.discipline || 'Disciplina',
          created_at: '2026-01-25T08:00:00.000Z',
        });
      });
    }
  });
  return result;
}

export function buildSimulatedDocuments(categories: DocumentCategory[]): SchoolDocument[] {
  const docs: SchoolDocument[] = [];
  const cats = categories.length > 0 ? categories : SIMULATED_CATEGORIES;

  SIMULATED_TEACHERS.forEach((teacher, tIdx) => {
    const isEnglish = teacher.discipline === 'LÍNGUA INGLESA';

    cats.forEach((cat, cIdx) => {
      // Professor de Inglês (Manhã e Tarde): 100% entregue e aprovado!
      // Demais professores: mistura realista para testar a matriz e inadimplentes
      const shouldDeliver = isEnglish || (tIdx + cIdx) % 4 !== 0;
      if (!shouldDeliver) return;

      const status = isEnglish
        ? 'aprovado'
        : (tIdx + cIdx) % 5 === 0
        ? 'devolvido'
        : (tIdx + cIdx) % 3 === 0
        ? 'em_analise'
        : 'aprovado';

      docs.push({
        id: `sim-doc-${teacher.id}-${cat.id}`,
        teacher_id: teacher.id,
        category_id: cat.id,
        folder_id: null,
        title: `${cat.name} — ${teacher.discipline} (${teacher.shift})`,
        description: isEnglish
          ? 'Documento completo do 1º Bimestre entregue dentro do prazo e validado.'
          : 'Documento enviado para acompanhamento pedagógico.',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        file_name: `${slugify(cat.name)}-${slugify(teacher.full_name)}.pdf`,
        file_size: 245760,
        file_type: 'application/pdf',
        status,
        feedback:
          status === 'aprovado'
            ? 'Aprovado pela Coordenação Pedagógica. Excelente organização!'
            : status === 'devolvido'
            ? 'Ajustar assinatura e detalhar metodologia da 2ª semana.'
            : null,
        reviewed_by: status !== 'em_analise' ? SIMULATED_PEDAGOGA_PROFILE.id : null,
        reviewed_at: status !== 'em_analise' ? '2026-04-20T14:30:00.000Z' : null,
        submitted_at: '2026-02-09T10:15:00.000Z',
        updated_at: '2026-04-20T14:30:00.000Z',
        special_kind: 'regular',
        teacher,
        category: cat,
      });
    });
  });

  return docs;
}

const ENGLISH_TOPICS_1BIM = [
  'Greetings, farewells and personal introductions (EF06LI01)',
  'Reading strategies: skimming and scanning short texts (EF07LI06)',
  'Verb To Be in affirmative, negative and interrogative forms (EF06LI19)',
  'Simple Present: daily routines and habits (EF07LI15)',
  'Vocabulary: school objects, days of the week and months (EF06LI17)',
  'Simple Past: regular and irregular verbs in biographies (EF08LI05)',
  'Modal verbs (can, could, should) in school rules (EF08LI12)',
  'Connecting ideas: linking words in short paragraphs (EF09LI08)',
  'Reading comprehension: comics, posters and digital genres (EF07LI07)',
  'Oral interaction and listening: classroom commands and dialogues (EF06LI03)',
  'Future with going to and will: plans and predictions (EF08LI14)',
  'Revisão geral e preparação para avaliação do 1º Bimestre (Av3)',
];

const SEMED_HOLIDAYS_1BIM = new Set([
  '2026-02-16',
  '2026-02-17',
  '2026-02-18',
  '2026-04-03',
  '2026-04-21',
]);

const TIME_SLOTS_BY_PERIOD: Record<number, string> = {
  1: '07:30 - 08:15',
  2: '08:15 - 09:00',
  3: '09:15 - 10:00',
  4: '10:00 - 10:45',
  5: '10:45 - 11:30',
  11: '13:00 - 13:45',
  12: '13:45 - 14:30',
  13: '14:45 - 15:30',
  14: '15:30 - 16:15',
  15: '16:15 - 17:00',
};

/**
 * Gera todas as aulas lançadas do 1º Bimestre (04/02/2026 a 22/04/2026)
 * para o Professor de Língua Inglesa (Manhã), respeitando feriados SEMED 2026.
 */
export function buildEnglish1BimDailyLogs(schedules: TeacherSchedule[]): DailyLogEntry[] {
  const englishSchedules = schedules.filter(
    (s) => s.teacher_id === SIMULATED_ENGLISH_MORNING_PROFILE.id
  );
  const logs: DailyLogEntry[] = [];

  const start = new Date(2026, 1, 4); // 04/02/2026
  const end = new Date(2026, 3, 22); // 22/04/2026
  let topicIndex = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    if (SEMED_HOLIDAYS_1BIM.has(dateStr)) continue;

    const daySlots = englishSchedules.filter((s) => s.day_of_week === dow);
    daySlots.forEach((slot) => {
      const topic = ENGLISH_TOPICS_1BIM[topicIndex % ENGLISH_TOPICS_1BIM.length];
      topicIndex++;
      logs.push({
        id: `sim-eng-log-${dateStr}-${slot.period}`,
        date: dateStr,
        turma: slot.class_name,
        period: slot.period,
        timeSlot: TIME_SLOTS_BY_PERIOD[slot.period] || '07:30 - 08:15',
        subject: 'LÍNGUA INGLESA',
        activitiesToday: topic,
        classwork: 'Leitura guiada, prática oral em dupla e exercícios no caderno.',
        homework: 'Revisar vocabulário da unidade e concluir atividade da página seguinte.',
        nextLessonPlan: ENGLISH_TOPICS_1BIM[topicIndex % ENGLISH_TOPICS_1BIM.length],
        authorId: SIMULATED_ENGLISH_MORNING_PROFILE.id,
        updatedAt: `${dateStr}T11:30:00.000Z`,
      });
    });
  }

  return logs;
}
