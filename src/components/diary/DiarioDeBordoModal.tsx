import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  BookOpen,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  History,
  ArrowRight,
  Sparkles,
  Users,
  ClipboardList,
  Home,
  Compass,
  Copy,
  Layers,
  BellRing,
  Volume2,
  AlarmClock,
  Printer,
  Search,
} from 'lucide-react';
import { TeacherSchedule } from '../../types/database.types';
import { teacherCalendarService, DailyLogEntry } from '../../services/teacherCalendarService';
import { curriculumByDiscipline, MatrixItem } from '../../data/curriculumData';
import { VoiceDictationButton } from '../common/VoiceDictationButton';
import {
  diaryAlarmService,
  DiaryAlarmConfig,
  DIARY_ALARM_SOUNDS,
  playDiaryAlarmChime,
} from '../../services/diaryAlarmService';
import {
  getNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from '../../lib/browserNotifications';

interface DiarioDeBordoModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: TeacherSchedule[];
  teacherDiscipline?: string | null;
}

interface DayClassSlot {
  slotKey: string;
  period?: number;
  timeSlot?: string;
  turma: string;
  subject: string;
  fromSchedule: boolean;
  log?: DailyLogEntry;
}

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DEFAULT_PERIOD_OPTIONS = [
  { period: 1, label: '1º Tempo (Manhã)', timeSlot: '07:30 - 08:15' },
  { period: 2, label: '2º Tempo (Manhã)', timeSlot: '08:15 - 09:00' },
  { period: 3, label: '3º Tempo (Manhã)', timeSlot: '09:15 - 10:00' },
  { period: 4, label: '4º Tempo (Manhã)', timeSlot: '10:00 - 10:45' },
  { period: 5, label: '5º Tempo (Manhã)', timeSlot: '10:45 - 11:30' },
  { period: 11, label: '1º Tempo (Tarde)', timeSlot: '13:00 - 13:45' },
  { period: 12, label: '2º Tempo (Tarde)', timeSlot: '13:45 - 14:30' },
  { period: 13, label: '3º Tempo (Tarde)', timeSlot: '14:45 - 15:30' },
  { period: 14, label: '4º Tempo (Tarde)', timeSlot: '15:30 - 16:15' },
  { period: 15, label: '5º Tempo (Tarde)', timeSlot: '16:15 - 17:00' },
  { period: 21, label: '1º Tempo (Noite)', timeSlot: '18:30 - 19:15' },
  { period: 22, label: '2º Tempo (Noite)', timeSlot: '19:15 - 20:00' },
  { period: 23, label: '3º Tempo (Noite)', timeSlot: '20:10 - 20:55' },
  { period: 24, label: '4º Tempo (Noite)', timeSlot: '20:55 - 21:40' },
  { period: 25, label: '5º Tempo (Noite)', timeSlot: '21:40 - 22:20' },
];

const DEFAULT_TURMAS = [
  '6º Ano A',
  '6º Ano B',
  '7º Ano A',
  '7º Ano B',
  '8º Ano A',
  '8º Ano B',
  '9º Ano A',
  '9º Ano B',
];

const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatDateBR = (dateStr: string): string => {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const formatShortDateBR = (dateStr: string): string => {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
};

const normalizeTurma = (t?: string): string => (t || '').trim().toLowerCase();

const formatPeriodLabel = (period?: number, includeShift = false): string => {
  if (!period) return 'Aula Avulsa';
  if (period >= 21) return includeShift ? `${period - 20}º Tempo (Noite)` : `${period - 20}º Tempo`;
  if (period >= 11) return includeShift ? `${period - 10}º Tempo (Tarde)` : `${period - 10}º Tempo`;
  return includeShift ? `${period}º Tempo (Manhã)` : `${period}º Tempo`;
};

const formatPeriodShort = (period?: number): string => {
  if (!period) return '•';
  if (period >= 21) return `${period - 20}º`;
  if (period >= 11) return `${period - 10}º`;
  return `${period}º`;
};

const shortenTurmaLabel = (turma: string): string => {
  return turma
    .replace(/EJA\s*/i, 'E')
    .replace(/(\d+)[ºª]?\s*Ano\s*/i, '$1')
    .replace(/(\d+)[ºª]?\s*Etapa\s*/i, '$1')
    .replace(/Módulo\s*/i, 'M')
    .replace(/\s+/g, '')
    .trim();
};

export const DiarioDeBordoModal: React.FC<DiarioDeBordoModalProps> = ({
  isOpen,
  onClose,
  schedules,
  teacherDiscipline,
}) => {
  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);

  const [activeTab, setActiveTab] = useState<'calendar' | 'history'>('calendar');
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateStr(new Date()));
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState<string>('all');
  const [historyTurma, setHistoryTurma] = useState<string>('');

  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([]);

  // Configuração de alarmes do Diário de Bordo
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [alarmConfig, setAlarmConfig] = useState<DiaryAlarmConfig>(() => diaryAlarmService.getConfig());
  const [alarmTestMessage, setAlarmTestMessage] = useState<string | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermission()
  );

  // Estado do Modal de Edição / Adição de Registro de uma Turma
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    date: string;
    turma: string;
    period?: number;
    timeSlot?: string;
    subject: string;
    existingLogId?: string;
    isManualTurma: boolean;
  } | null>(null);

  const [editorTab, setEditorTab] = useState<'form' | 'past'>('form');
  const [isMatrixPickerOpen, setIsMatrixPickerOpen] = useState(false);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixAnoFilter, setMatrixAnoFilter] = useState<string>('all');
  const [matrixBimestreFilter, setMatrixBimestreFilter] = useState<string>('all');
  const [selectedMatrixTopics, setSelectedMatrixTopics] = useState<Array<{ key: string; text: string }>>([]);
  const [formActivities, setFormActivities] = useState('');
  const [formClasswork, setFormClasswork] = useState('');
  const [formHomework, setFormHomework] = useState('');
  const [formNextLesson, setFormNextLesson] = useState('');
  const [formTurma, setFormTurma] = useState('');
  const [formPeriod, setFormPeriod] = useState<number>(1);
  const [formSubject, setFormSubject] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);

  // Estado do Modal de Clonar / Reaproveitar Aula para outra turma
  const [cloneSource, setCloneSource] = useState<{
    date: string;
    turma: string;
    subject: string;
    activitiesToday: string;
    classwork: string;
    homework: string;
    nextLessonPlan: string;
  } | null>(null);
  const [cloneTargetDate, setCloneTargetDate] = useState<string>(todayStr);
  const [cloneSelectedTurmas, setCloneSelectedTurmas] = useState<string[]>([]);
  const [cloneFeedback, setCloneFeedback] = useState<string | null>(null);

  // Estado do Modal de Clonar / Puxar Aula DE outra turma para a turma atual
  const [isImportFromTurmaOpen, setIsImportFromTurmaOpen] = useState(false);
  const [importTurmaFilter, setImportTurmaFilter] = useState<string>('all');
  const [importSearch, setImportSearch] = useState('');

  const buildDemoDailyLogs = (): DailyLogEntry[] => {
    const subject = teacherDiscipline || 'Matemática';
    const nowIso = new Date().toISOString();
    const targetYear = currentMonthDate.getFullYear();
    const targetMonth = currentMonthDate.getMonth();
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    const fallbackByDay: Record<number, Array<{ period: number; timeSlot: string; turma: string }>> = {
      1: [
        { period: 1, timeSlot: '07:30 - 08:15', turma: '9º Ano A' },
        { period: 2, timeSlot: '08:15 - 09:00', turma: '9º Ano B' },
        { period: 3, timeSlot: '09:15 - 10:00', turma: '9º Ano C' },
        { period: 4, timeSlot: '10:00 - 10:45', turma: '6º Ano A' },
        { period: 5, timeSlot: '10:45 - 11:30', turma: '8º Ano C' },
      ],
      2: [
        { period: 1, timeSlot: '07:30 - 08:15', turma: '6º Ano A' },
        { period: 2, timeSlot: '08:15 - 09:00', turma: '7º Ano A' },
        { period: 3, timeSlot: '09:15 - 10:00', turma: '8º Ano C' },
        { period: 4, timeSlot: '10:00 - 10:45', turma: '9º Ano A' },
        { period: 5, timeSlot: '10:45 - 11:30', turma: '9º Ano B' },
      ],
      3: [
        { period: 1, timeSlot: '07:30 - 08:15', turma: '9º Ano A' },
        { period: 2, timeSlot: '08:15 - 09:00', turma: '9º Ano B' },
        { period: 3, timeSlot: '09:15 - 10:00', turma: '9º Ano C' },
        { period: 4, timeSlot: '10:00 - 10:45', turma: '6º Ano A' },
        { period: 5, timeSlot: '10:45 - 11:30', turma: '8º Ano C' },
      ],
      4: [
        { period: 1, timeSlot: '07:30 - 08:15', turma: '7º Ano A' },
        { period: 2, timeSlot: '08:15 - 09:00', turma: '6º Ano A' },
        { period: 3, timeSlot: '09:15 - 10:00', turma: '9º Ano C' },
        { period: 4, timeSlot: '10:00 - 10:45', turma: '8º Ano C' },
        { period: 5, timeSlot: '10:45 - 11:30', turma: '9º Ano A' },
      ],
      5: [
        { period: 1, timeSlot: '07:30 - 08:15', turma: '9º Ano B' },
        { period: 2, timeSlot: '08:15 - 09:00', turma: '9º Ano C' },
        { period: 3, timeSlot: '09:15 - 10:00', turma: '8º Ano C' },
        { period: 4, timeSlot: '10:00 - 10:45', turma: '6º Ano A' },
        { period: 5, timeSlot: '10:45 - 11:30', turma: '7º Ano A' },
      ],
    };

    const topicPool = [
      {
        activity: 'Introdução ao conteúdo do capítulo com exemplos práticos no quadro.',
        classwork: 'Exercícios 1 a 4 do livro didático',
        homework: 'Questões 5 e 6 para a próxima aula',
        next: 'Corrigir tarefa de casa e avançar nos exercícios de fixação.',
      },
      {
        activity: 'Correção comentada da atividade anterior e resolução de problemas em dupla.',
        classwork: 'Lista de fixação em sala (5 questões)',
        homework: 'Revisar anotações do caderno',
        next: 'Aplicar dinâmica de revisão em grupo.',
      },
      {
        activity: 'Aula expositiva dialogada com leitura guiada e construção de resumo no caderno.',
        classwork: 'Mapa mental e exercícios da página seguinte',
        homework: 'Pesquisa curta sobre aplicação do tema no dia a dia',
        next: 'Socializar a pesquisa e iniciar novo tópico.',
      },
      {
        activity: 'Oficina prática de resolução de questões contextualizadas no quadro.',
        classwork: 'Caderno de atividades (itens a até f)',
        homework: 'Concluir os itens pendentes em casa',
        next: 'Mini atividade diagnóstica de acompanhamento.',
      },
      {
        activity: 'Revisão geral dos conceitos trabalhados na semana e tira-dúvidas individual.',
        classwork: 'Roteiro de revisão dirigido',
        homework: 'Estudar para a atividade avaliativa',
        next: 'Iniciar próximo conteúdo da unidade.',
      },
    ];

    const turmaCounter: Record<string, number> = {};
    const result: DailyLogEntry[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(targetYear, targetMonth, day);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;

      const dateStr = toLocalDateStr(d);
      const isFuture = dateStr > todayStr;

      // Usa a grade real do professor se cadastrada; caso contrário usa grade padrão de 5 tempos
      const byPeriod = new Map<number, { period: number; timeSlot?: string; turma: string; subject: string }>();
      schedules
        .filter((s) => s.day_of_week === dow)
        .sort((a, b) => a.period - b.period)
        .forEach((s) => {
          byPeriod.set(s.period, {
            period: s.period,
            timeSlot: s.start_time && s.end_time ? `${s.start_time} - ${s.end_time}` : undefined,
            turma: s.class_name,
            subject: s.subject || subject,
          });
        });

      const daySlots =
        byPeriod.size > 0
          ? Array.from(byPeriod.values())
          : (fallbackByDay[dow] || []).map((f) => ({ ...f, subject }));

      daySlots.forEach((slot) => {
        const count = turmaCounter[slot.turma] || 0;
        turmaCounter[slot.turma] = count + 1;
        const tpl = topicPool[count % topicPool.length];

        result.push({
          id: `demo-log-${dateStr}-${slot.period}-${count}`,
          date: dateStr,
          turma: slot.turma,
          period: slot.period,
          timeSlot: slot.timeSlot,
          subject: slot.subject,
          activitiesToday: tpl.activity,
          classwork: tpl.classwork,
          homework: isFuture ? undefined : tpl.homework,
          nextLessonPlan: isFuture ? undefined : tpl.next,
          updatedAt: nowIso,
        });
      });
    }

    return result;
  };

  const hasDemoLogs = useMemo(
    () => dailyLogs.some((l) => String(l.id).startsWith('demo-log-')),
    [dailyLogs]
  );

  const handleSeedDemoLogs = () => {
    localStorage.removeItem('diary_demo_cleared');
    const demos = buildDemoDailyLogs();
    const withoutOldDemo = dailyLogs.filter((l) => !String(l.id).startsWith('demo-log-'));
    const merged = [...withoutOldDemo, ...demos];
    setDailyLogs(merged);
    teacherCalendarService.saveLocalData({ dailyLogs: merged });
  };

  const handleClearDemoLogs = () => {
    localStorage.setItem('diary_demo_cleared', '1');
    const cleaned = dailyLogs.filter((l) => !String(l.id).startsWith('demo-log-'));
    setDailyLogs(cleaned);
    teacherCalendarService.saveLocalData({ dailyLogs: cleaned });
  };

  const loadData = async () => {
    const local = teacherCalendarService.getLocalData();
    let currentLogs = local.dailyLogs || [];

    try {
      const synced = await teacherCalendarService.syncFromCloud();
      currentLogs = synced.dailyLogs || currentLogs;
    } catch (err) {
      console.warn('Erro ao sincronizar Diário de Bordo com a nuvem:', err);
    }

    const onlyDemoOrEmpty =
      currentLogs.length === 0 ||
      (currentLogs.every((l) => String(l.id).startsWith('demo-log-')) && currentLogs.length <= 12);

    if (onlyDemoOrEmpty && localStorage.getItem('diary_demo_cleared') !== '1') {
      currentLogs = buildDemoDailyLogs();
      teacherCalendarService.saveLocalData({ dailyLogs: currentLogs });
    }

    setDailyLogs(currentLogs);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Verifica se o professor tem mais de um turno nos horários
  const hasMultipleShifts = useMemo(() => {
    const shifts = new Set<string>();
    schedules.forEach((s) => {
      if (s.period >= 21) shifts.add('N');
      else if (s.period >= 11) shifts.add('T');
      else shifts.add('M');
    });
    return shifts.size > 1;
  }, [schedules]);

  // Lista completa de turmas conhecidas (dos horários do professor + registros já salvos)
  const availableTurmas = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.class_name?.trim()) set.add(s.class_name.trim());
    });
    dailyLogs.forEach((l) => {
      if (l.turma?.trim()) set.add(l.turma.trim());
    });
    if (set.size === 0) {
      DEFAULT_TURMAS.forEach((t) => set.add(t));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [schedules, dailyLogs]);

  // Seleciona automaticamente a primeira turma ao abrir a aba Histórico por Turma
  useEffect(() => {
    if (!historyTurma && availableTurmas.length > 0) {
      setHistoryTurma(availableTurmas[0]);
    }
  }, [availableTurmas, historyTurma]);

  // Monta os tempos/turmas referentes a qualquer data (YYYY-MM-DD)
  const getSlotsForDate = useMemo(() => {
    return (dateStr: string, turmaFilter = 'all'): DayClassSlot[] => {
      const weekday = parseLocalDate(dateStr).getDay(); // 0=Dom..6=Sáb
      const rawDaySchedules = schedules
        .filter((s) => s.day_of_week === weekday)
        .sort((a, b) => a.period - b.period);

      // Garante no máximo 1 turma por tempo (evita tempos duplicados vindos do banco)
      const byPeriod = new Map<number, TeacherSchedule>();
      rawDaySchedules.forEach((s) => {
        byPeriod.set(s.period, s);
      });
      const daySchedules = Array.from(byPeriod.values()).sort((a, b) => a.period - b.period);

      const dayLogs = dailyLogs.filter((l) => (l.date || '').split('T')[0] === dateStr);
      const usedLogIds = new Set<string>();

      const slots: DayClassSlot[] = daySchedules.map((sc) => {
        // 1. Tenta match exato por período + turma
        let match = dayLogs.find(
          (l) =>
            !usedLogIds.has(l.id) &&
            l.period === sc.period &&
            normalizeTurma(l.turma) === normalizeTurma(sc.class_name)
        );
        // 2. Fallback: registro sem período definido para a mesma turma
        if (!match) {
          match = dayLogs.find(
            (l) =>
              !usedLogIds.has(l.id) &&
              !l.period &&
              normalizeTurma(l.turma) === normalizeTurma(sc.class_name)
          );
        }
        // 3. Fallback: mesmo período no dia
        if (!match) {
          match = dayLogs.find((l) => !usedLogIds.has(l.id) && l.period === sc.period);
        }

        if (match) usedLogIds.add(match.id);

        return {
          slotKey: `sched-${dateStr}-${sc.id}`,
          period: sc.period,
          timeSlot: sc.start_time && sc.end_time ? `${sc.start_time} - ${sc.end_time}` : undefined,
          turma: sc.class_name,
          subject: sc.subject || teacherDiscipline || 'Aula',
          fromSchedule: true,
          log: match,
        };
      });

      // Adiciona registros extras/avulsos do dia que não estavam na grade fixa
      dayLogs.forEach((log) => {
        if (usedLogIds.has(log.id)) return;
        slots.push({
          slotKey: `log-${log.id}`,
          period: log.period,
          timeSlot: log.timeSlot,
          turma: log.turma || 'Turma Geral',
          subject: log.subject || teacherDiscipline || 'Aula',
          fromSchedule: false,
          log,
        });
      });

      slots.sort((a, b) => (a.period ?? 999) - (b.period ?? 999));

      if (turmaFilter !== 'all') {
        const target = normalizeTurma(turmaFilter);
        return slots.filter((s) => normalizeTurma(s.turma) === target);
      }

      return slots;
    };
  }, [schedules, dailyLogs, teacherDiscipline]);

  // Busca o registro mais recente ANTERIOR a uma data para determinada turma
  const getPreviousLogForTurma = (turma: string, beforeDate: string): DailyLogEntry | null => {
    const target = normalizeTurma(turma);
    if (!target) return null;

    const candidates = dailyLogs
      .filter((l) => normalizeTurma(l.turma) === target && (l.date || '').split('T')[0] < beforeDate)
      .sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return (b.period ?? 0) - (a.period ?? 0);
      });

    return candidates[0] || null;
  };

  // Busca o próximo registro FUTURO planejado após uma data para determinada turma
  const getNextLogForTurma = (turma: string, afterDate: string): DailyLogEntry | null => {
    const target = normalizeTurma(turma);
    if (!target) return null;

    const candidates = dailyLogs
      .filter((l) => normalizeTurma(l.turma) === target && (l.date || '').split('T')[0] > afterDate)
      .sort((a, b) => {
        const cmp = (a.date || '').localeCompare(b.date || '');
        if (cmp !== 0) return cmp;
        return (a.period ?? 0) - (b.period ?? 0);
      });

    return candidates[0] || null;
  };

  // Encontra a próxima data agendada na grade para uma turma (a partir de amanhã ou hoje)
  const getNextScheduledDateForTurma = (turma: string): { date: string; schedule: TeacherSchedule } | null => {
    const target = normalizeTurma(turma);
    const turmaSchedules = schedules
      .filter((s) => normalizeTurma(s.class_name) === target)
      .sort((a, b) => a.day_of_week - b.day_of_week || a.period - b.period);

    if (turmaSchedules.length === 0) return null;

    const base = new Date();
    for (let offset = 1; offset <= 14; offset++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
      const match = turmaSchedules.find((s) => s.day_of_week === d.getDay());
      if (match) {
        return { date: toLocalDateStr(d), schedule: match };
      }
    }
    return null;
  };

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const prevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));

  const goToToday = () => {
    const now = new Date();
    setCurrentMonthDate(now);
    setSelectedDate(toLocalDateStr(now));
  };

  const shiftSelectedDay = (delta: number) => {
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() + delta);
    const nextStr = toLocalDateStr(d);
    setSelectedDate(nextStr);
    if (d.getMonth() !== month || d.getFullYear() !== year) {
      setCurrentMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  // Grade do calendário mensal
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isFuture: boolean;
      isWeekend: boolean;
    }> = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = parseLocalDate(dStr).getDay();
      days.push({
        dayNumber: d,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isFuture: dStr > todayStr,
        isWeekend: dow === 0 || dow === 6,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dow = parseLocalDate(dStr).getDay();
      days.push({
        dayNumber: i,
        dateStr: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isFuture: dStr > todayStr,
        isWeekend: dow === 0 || dow === 6,
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dow = parseLocalDate(dStr).getDay();
      days.push({
        dayNumber: i,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isFuture: dStr > todayStr,
        isWeekend: dow === 0 || dow === 6,
      });
    }

    return days;
  }, [year, month, todayStr]);

  // Dias da semana atual (Seg a Sex/Sáb) para a visão semanal completa dos 5 tempos
  const weekDays = useMemo(() => {
    const base = parseLocalDate(selectedDate);
    const dow = base.getDay(); // 0=Dom..6=Sáb
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() + diffToMonday);

    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dateStr = toLocalDateStr(d);
      return {
        dateStr,
        dayNumber: d.getDate(),
        weekdayName: WEEKDAY_NAMES[d.getDay()],
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      };
    });
  }, [selectedDate, todayStr]);

  const selectedDaySlots = useMemo(
    () => getSlotsForDate(selectedDate, selectedTurmaFilter),
    [getSlotsForDate, selectedDate, selectedTurmaFilter]
  );

  const selectedDayMeta = useMemo(() => {
    const d = parseLocalDate(selectedDate);
    const weekdayName = WEEKDAY_NAMES[d.getDay()];
    const isToday = selectedDate === todayStr;
    const isFuture = selectedDate > todayStr;
    const isPast = selectedDate < todayStr;
    return { weekdayName, isToday, isFuture, isPast };
  }, [selectedDate, todayStr]);

  // Itens da Matriz Curricular filtrados pela disciplina do professor
  const disciplineMatrixItems = useMemo<MatrixItem[]>(() => {
    const keys = Object.keys(curriculumByDiscipline);
    if (!keys.length) return [];
    const norm = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
    const target = norm(teacherDiscipline || '');
    const matchedKey =
      keys.find((k) => norm(k) === target) ||
      keys.find((k) => target && (norm(k).includes(target) || target.includes(norm(k))));
    return matchedKey ? curriculumByDiscipline[matchedKey] || [] : Object.values(curriculumByDiscipline).flat();
  }, [teacherDiscipline]);

  const filteredMatrixItems = useMemo(() => {
    const q = matrixSearch.trim().toLowerCase();
    return disciplineMatrixItems.filter((item) => {
      if (matrixAnoFilter !== 'all' && item.ano !== matrixAnoFilter) return false;
      if (matrixBimestreFilter !== 'all' && !item.bimestre.toUpperCase().startsWith(matrixBimestreFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        item.objeto.toLowerCase().includes(q) ||
        item.objetoItems?.some((sub) => sub.toLowerCase().includes(q)) ||
        item.habilidade.toLowerCase().includes(q) ||
        item.codigo.toLowerCase().includes(q) ||
        item.unidadeTematica.toLowerCase().includes(q)
      );
    });
  }, [disciplineMatrixItems, matrixSearch, matrixAnoFilter, matrixBimestreFilter]);

  const openMatrixPicker = () => {
    const turmaText = (editorState?.isManualTurma ? formTurma : editorState?.turma) || '';
    const gradeMatch = turmaText.match(/([6-9])[ºª]?/);
    setMatrixAnoFilter(gradeMatch ? `${gradeMatch[1]} ANO` : 'all');
    setMatrixBimestreFilter('all');
    setMatrixSearch('');
    setSelectedMatrixTopics([]);
    setIsMatrixPickerOpen(true);
  };

  const toggleMatrixTopic = (key: string, text: string) => {
    setSelectedMatrixTopics((prev) =>
      prev.some((t) => t.key === key) ? prev.filter((t) => t.key !== key) : [...prev, { key, text }]
    );
  };

  const handleConfirmMatrixTopics = () => {
    if (selectedMatrixTopics.length === 0) return;
    const block = selectedMatrixTopics.map((t) => t.text).join('\n');
    setFormActivities((prev) => (prev.trim() ? `${prev.trim()}\n${block}` : block));
    setIsMatrixPickerOpen(false);
    setSelectedMatrixTopics([]);
  };

  // Exportar PDF / Imprimir relatório do Diário de Bordo
  const handleExportPdfOrPrint = () => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const logsToPrint =
      activeTab === 'history' && historyTurma
        ? dailyLogs
            .filter((l) => normalizeTurma(l.turma) === normalizeTurma(historyTurma))
            .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.period ?? 0) - (b.period ?? 0))
        : dailyLogs
            .filter((l) => {
              if (!(l.date || '').startsWith(monthPrefix)) return false;
              if (selectedTurmaFilter !== 'all' && normalizeTurma(l.turma) !== normalizeTurma(selectedTurmaFilter)) {
                return false;
              }
              return true;
            })
            .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.period ?? 0) - (b.period ?? 0));

    const subtitle =
      activeTab === 'history' && historyTurma
        ? `Relatório por Turma: ${historyTurma}`
        : `${MONTH_NAMES[month]} de ${year}${selectedTurmaFilter !== 'all' ? ` • Turma: ${selectedTurmaFilter}` : ' • Todas as Turmas'}`;

    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const rowsHtml =
      logsToPrint.length === 0
        ? `<tr><td colspan="5" style="text-align:center;padding:24px;color:#64748b;">Nenhum registro encontrado para este período.</td></tr>`
        : logsToPrint
            .map(
              (l) => `
          <tr>
            <td style="white-space:nowrap;font-weight:700;">${escapeHtml(formatDateBR(l.date))}</td>
            <td style="white-space:nowrap;">${escapeHtml(l.period ? formatPeriodLabel(l.period, hasMultipleShifts) : '—')}</td>
            <td style="white-space:nowrap;font-weight:700;">${escapeHtml(l.turma || '—')}</td>
            <td>
              <div style="font-weight:600;color:#0f172a;">${escapeHtml(l.activitiesToday || '—')}</div>
              ${l.nextLessonPlan ? `<div style="margin-top:4px;font-size:11px;color:#3730a3;"><strong>Próx. aula:</strong> ${escapeHtml(l.nextLessonPlan)}</div>` : ''}
            </td>
            <td style="font-size:11px;color:#334155;">
              ${l.classwork ? `<div><strong>Sala:</strong> ${escapeHtml(l.classwork)}</div>` : ''}
              ${l.homework ? `<div><strong>Casa:</strong> ${escapeHtml(l.homework)}</div>` : ''}
              ${!l.classwork && !l.homework ? '—' : ''}
            </td>
          </tr>`
            )
            .join('');

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Diário de Bordo - ${escapeHtml(subtitle)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 24px; }
    .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
    h1 { margin: 0; font-size: 20px; color: #065f46; }
    .sub { margin: 4px 0 0; font-size: 13px; color: #475569; font-weight: 600; }
    .meta { font-size: 11px; color: #64748b; text-align: right; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #ecfdf5; color: #065f46; font-weight: 800; font-size: 11px; text-transform: uppercase; }
    tr:nth-child(even) td { background: #f8fafc; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>E.M. Antônio Matias — Diário de Bordo</h1>
      <p class="sub">${escapeHtml(teacherDiscipline || 'Disciplina')} • ${escapeHtml(subtitle)}</p>
    </div>
    <div class="meta">
      <div>Total: ${logsToPrint.length} registro(s)</div>
      <div>Emitido em ${new Date().toLocaleDateString('pt-BR')}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Tempo</th>
        <th>Turma</th>
        <th>O que foi dado / Planejamento</th>
        <th>Tarefas</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=960,height=720');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 250);
    } else {
      // Fallback via iframe oculto caso o navegador bloqueie pop-up
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => iframe.remove(), 1000);
        }, 250);
      }
    }
  };

  const getDraftKey = (date: string, turma: string, period?: number) =>
    `diary_draft_${date}_${normalizeTurma(turma || 'manual')}_${period ?? 1}`;

  // Salva rascunho automático no localStorage enquanto o professor digita (proteção offline)
  useEffect(() => {
    if (!editorState?.isOpen) return;
    const key = getDraftKey(
      editorState.date,
      editorState.isManualTurma ? formTurma : editorState.turma,
      editorState.isManualTurma ? formPeriod : editorState.period
    );
    const hasContent =
      formActivities.trim() || formClasswork.trim() || formHomework.trim() || formNextLesson.trim();
    try {
      if (hasContent) {
        localStorage.setItem(
          key,
          JSON.stringify({
            activitiesToday: formActivities,
            classwork: formClasswork,
            homework: formHomework,
            nextLessonPlan: formNextLesson,
            updatedAt: Date.now(),
          })
        );
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore storage quota errors
    }
  }, [editorState, formTurma, formPeriod, formActivities, formClasswork, formHomework, formNextLesson]);

  const discardCurrentDraft = () => {
    if (!editorState) return;
    const key = getDraftKey(
      editorState.date,
      editorState.isManualTurma ? formTurma : editorState.turma,
      editorState.isManualTurma ? formPeriod : editorState.period
    );
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    const existing = editorState.existingLogId
      ? dailyLogs.find((l) => l.id === editorState.existingLogId)
      : undefined;
    setFormActivities(existing?.activitiesToday || '');
    setFormClasswork(existing?.classwork || '');
    setFormHomework(existing?.homework || '');
    setFormNextLesson(existing?.nextLessonPlan || '');
    setDraftRestored(false);
  };

  // Abrir editor para um slot (turma/tempo) específico do dia
  const openSlotEditor = (slot: DayClassSlot, targetDate = selectedDate) => {
    const existing = slot.log;
    setEditorTab('form');
    setEditorState({
      isOpen: true,
      date: targetDate,
      turma: slot.turma,
      period: slot.period,
      timeSlot: slot.timeSlot,
      subject: slot.subject,
      existingLogId: existing?.id,
      isManualTurma: false,
    });
    setFormTurma(slot.turma);
    setFormPeriod(slot.period ?? 1);
    setFormSubject(slot.subject);

    let restored = false;
    try {
      const rawDraft = localStorage.getItem(getDraftKey(targetDate, slot.turma, slot.period));
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft);
        const differsFromExisting =
          (parsed.activitiesToday || '') !== (existing?.activitiesToday || '') ||
          (parsed.classwork || '') !== (existing?.classwork || '') ||
          (parsed.homework || '') !== (existing?.homework || '') ||
          (parsed.nextLessonPlan || '') !== (existing?.nextLessonPlan || '');
        if (differsFromExisting) {
          setFormActivities(parsed.activitiesToday || '');
          setFormClasswork(parsed.classwork || '');
          setFormHomework(parsed.homework || '');
          setFormNextLesson(parsed.nextLessonPlan || '');
          restored = true;
        }
      }
    } catch {
      // ignore
    }

    if (!restored) {
      setFormActivities(existing?.activitiesToday || '');
      setFormClasswork(existing?.classwork || '');
      setFormHomework(existing?.homework || '');
      setFormNextLesson(existing?.nextLessonPlan || '');
    }
    setDraftRestored(restored);
  };

  // Abrir editor para adicionar turma/tempo avulso no dia selecionado
  const openManualSlotEditor = (targetDate = selectedDate) => {
    const defaultTurma =
      selectedTurmaFilter !== 'all' ? selectedTurmaFilter : availableTurmas[0] || '';
    setEditorState({
      isOpen: true,
      date: targetDate,
      turma: defaultTurma,
      period: 1,
      timeSlot: DEFAULT_PERIOD_OPTIONS[0].timeSlot,
      subject: teacherDiscipline || 'Aula',
      existingLogId: undefined,
      isManualTurma: true,
    });
    setFormTurma(defaultTurma);
    setFormPeriod(1);
    setFormSubject(teacherDiscipline || '');
    setFormActivities('');
    setFormClasswork('');
    setFormHomework('');
    setFormNextLesson('');
    setDraftRestored(false);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorState) return;

    const finalTurma = (editorState.isManualTurma ? formTurma : editorState.turma).trim();
    if (!finalTurma) {
      alert('Por favor, informe a turma.');
      return;
    }

    if (
      !formActivities.trim() &&
      !formClasswork.trim() &&
      !formHomework.trim() &&
      !formNextLesson.trim()
    ) {
      alert('Preencha pelo menos um campo do registro da aula.');
      return;
    }

    const finalPeriod = editorState.isManualTurma ? formPeriod : editorState.period;
    const matchedOpt = DEFAULT_PERIOD_OPTIONS.find((o) => o.period === finalPeriod);
    const finalTimeSlot = editorState.isManualTurma
      ? matchedOpt?.timeSlot
      : editorState.timeSlot || matchedOpt?.timeSlot;
    const finalSubject = (editorState.isManualTurma ? formSubject : editorState.subject).trim() || teacherDiscipline || 'Aula';

    const nowIso = new Date().toISOString();
    const newEntry: DailyLogEntry = {
      id: editorState.existingLogId || `daily-${editorState.date}-${Date.now()}`,
      date: editorState.date,
      turma: finalTurma,
      period: finalPeriod,
      timeSlot: finalTimeSlot,
      subject: finalSubject,
      activitiesToday: formActivities.trim() || undefined,
      classwork: formClasswork.trim() || undefined,
      homework: formHomework.trim() || undefined,
      nextLessonPlan: formNextLesson.trim() || undefined,
      updatedAt: nowIso,
    };

    const updatedLogs = [
      ...dailyLogs.filter((l) => {
        if (editorState.existingLogId && l.id === editorState.existingLogId) return false;
        // Evita duplicar mesmo dia + mesma turma + mesmo tempo
        if (
          !editorState.existingLogId &&
          l.date === newEntry.date &&
          normalizeTurma(l.turma) === normalizeTurma(newEntry.turma) &&
          l.period === newEntry.period
        ) {
          return false;
        }
        return true;
      }),
      newEntry,
    ];

    try {
      localStorage.removeItem(getDraftKey(editorState.date, finalTurma, finalPeriod));
    } catch {
      // ignore
    }
    setDraftRestored(false);
    setDailyLogs(updatedLogs);
    setEditorState(null);
    await teacherCalendarService.saveDailyLogs(updatedLogs);
  };

  const openCloneModalFromEditor = () => {
    if (!editorState) return;
    const currentTurma = (editorState.isManualTurma ? formTurma : editorState.turma).trim();
    setCloneSource({
      date: editorState.date,
      turma: currentTurma,
      subject: (editorState.isManualTurma ? formSubject : editorState.subject) || teacherDiscipline || 'Aula',
      activitiesToday: formActivities.trim(),
      classwork: formClasswork.trim(),
      homework: formHomework.trim(),
      nextLessonPlan: formNextLesson.trim(),
    });
    setCloneTargetDate(editorState.date);
    setCloneSelectedTurmas([]);
    setCloneFeedback(null);
  };

  const openCloneModalFromLog = (log: DailyLogEntry) => {
    setCloneSource({
      date: log.date,
      turma: log.turma || '',
      subject: log.subject || teacherDiscipline || 'Aula',
      activitiesToday: log.activitiesToday || '',
      classwork: log.classwork || '',
      homework: log.homework || '',
      nextLessonPlan: log.nextLessonPlan || '',
    });
    setCloneTargetDate(todayStr);
    setCloneSelectedTurmas([]);
    setCloneFeedback(null);
  };

  const handleConfirmClone = async () => {
    if (!cloneSource || cloneSelectedTurmas.length === 0) return;

    const targetSlots = getSlotsForDate(cloneTargetDate, 'all');
    const nowIso = new Date().toISOString();
    const newEntries: DailyLogEntry[] = cloneSelectedTurmas.map((turmaName, idx) => {
      const matchedSlot = targetSlots.find((s) => normalizeTurma(s.turma) === normalizeTurma(turmaName));
      const period = matchedSlot?.period ?? 1;
      const timeSlot = matchedSlot?.timeSlot ?? DEFAULT_PERIOD_OPTIONS[0].timeSlot;
      return {
        id: `daily-${cloneTargetDate}-${Date.now()}-${idx}`,
        date: cloneTargetDate,
        turma: turmaName,
        period,
        timeSlot,
        subject: matchedSlot?.subject || cloneSource.subject || teacherDiscipline || 'Aula',
        activitiesToday: cloneSource.activitiesToday || undefined,
        classwork: cloneSource.classwork || undefined,
        homework: cloneSource.homework || undefined,
        nextLessonPlan: cloneSource.nextLessonPlan || undefined,
        updatedAt: nowIso,
      };
    });

    const updatedLogs = [
      ...dailyLogs.filter(
        (existing) =>
          !newEntries.some(
            (ne) =>
              existing.date === ne.date &&
              normalizeTurma(existing.turma) === normalizeTurma(ne.turma) &&
              existing.period === ne.period
          )
      ),
      ...newEntries,
    ];

    setDailyLogs(updatedLogs);
    await teacherCalendarService.saveDailyLogs(updatedLogs);
    setCloneFeedback(
      `Aula clonada com sucesso para ${cloneSelectedTurmas.length} ${
        cloneSelectedTurmas.length === 1 ? 'turma' : 'turmas'
      }!`
    );
    setTimeout(() => {
      setCloneSource(null);
      setCloneFeedback(null);
    }, 1100);
  };

  const handleDeleteLog = async (log: DailyLogEntry) => {
    if (!confirm(`Deseja excluir o registro do Diário de Bordo de ${log.turma || 'aula'} (${formatDateBR(log.date)})?`)) {
      return;
    }
    const updatedLogs = dailyLogs.filter((l) => l.id !== log.id);
    setDailyLogs(updatedLogs);
    await teacherCalendarService.saveDailyLogs(updatedLogs);
  };

  // Dados da aba "Histórico por Turma"
  const historyLogsForSelectedTurma = useMemo(() => {
    if (!historyTurma) return { pastAndToday: [] as DailyLogEntry[], future: [] as DailyLogEntry[] };
    const target = normalizeTurma(historyTurma);
    const matching = dailyLogs.filter((l) => normalizeTurma(l.turma) === target);

    const pastAndToday = matching
      .filter((l) => (l.date || '').split('T')[0] <= todayStr)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.period ?? 0) - (a.period ?? 0));

    const future = matching
      .filter((l) => (l.date || '').split('T')[0] > todayStr)
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.period ?? 0) - (b.period ?? 0));

    return { pastAndToday, future };
  }, [dailyLogs, historyTurma, todayStr]);

  const editorPreviousLogs = useMemo(() => {
    if (!editorState) return [] as DailyLogEntry[];
    const t = editorState.isManualTurma ? formTurma : editorState.turma;
    const target = normalizeTurma(t);
    if (!target) return [] as DailyLogEntry[];
    return dailyLogs
      .filter((l) => normalizeTurma(l.turma) === target && (l.date || '').split('T')[0] < editorState.date)
      .sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return (b.period ?? 0) - (a.period ?? 0);
      });
  }, [editorState, formTurma, dailyLogs]);

  const editorPreviousLog = editorPreviousLogs[0] || null;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">
          {/* Cabeçalho dedicado do Diário de Bordo */}
          <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 rounded-2xl border border-white/30 text-white shadow-inner shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-base sm:text-xl tracking-tight text-white">
                    Diário de Bordo
                  </h3>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 uppercase tracking-wider">
                    {teacherDiscipline || 'Aulas & Planejamento'}
                  </span>
                </div>
                <p className="text-xs text-emerald-50 font-medium mt-0.5">
                  Veja o que foi dado na aula passada, registre as turmas de hoje e planeje as próximas aulas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center shrink-0 flex-wrap justify-end">
              <button
                type="button"
                onClick={handleExportPdfOrPrint}
                className="px-2.5 sm:px-3 py-2 text-xs font-bold text-white bg-white/15 hover:bg-white/25 rounded-xl transition border border-white/20 flex items-center gap-1.5"
                title="Imprimir ou Salvar em PDF o Diário de Bordo"
              >
                <Printer className="w-4 h-4" />
                <span>PDF / Imprimir</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAlarmConfig(diaryAlarmService.getConfig());
                  setNotifPerm(getNotificationPermission());
                  setAlarmTestMessage(null);
                  setIsAlarmModalOpen(true);
                }}
                className={`px-2.5 sm:px-3 py-2 text-xs font-extrabold rounded-xl transition border flex items-center gap-1.5 ${
                  alarmConfig.enabled
                    ? 'bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300 shadow-xs'
                    : 'text-white bg-white/15 hover:bg-white/25 border-white/20'
                }`}
                title="Configurar alarmes para lembrar de lançar no Diário de Bordo"
              >
                <AlarmClock className="w-4 h-4" />
                <span>{alarmConfig.enabled ? 'Alarmes Ativos' : 'Alarmes'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-bold text-white bg-white/15 hover:bg-white/25 rounded-xl transition border border-white/20 flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Fechar</span>
              </button>
            </div>
          </div>

          {/* Barra de Navegação Limpa */}
          <div className="px-3 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {/* Abas principais */}
              <div className="grid grid-cols-2 sm:inline-flex bg-slate-200/70 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('calendar')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'calendar'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Calendário</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Por Turma</span>
                </button>
              </div>

              {activeTab === 'calendar' && (
                <div className="flex items-center justify-between gap-2">
                  {/* Alternador Mês / Semana */}
                  <div className="inline-flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCalendarView('month')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                        calendarView === 'month'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Mês
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarView('week')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                        calendarView === 'week'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Semana
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={goToToday}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                    >
                      Hoje
                    </button>

                    {calendarView === 'month' ? (
                      <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={prevMonth}
                          className="p-1.5 text-slate-500 hover:text-slate-800 transition"
                          title="Mês anterior"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-[11px] font-extrabold text-slate-800 min-w-[96px] text-center">
                          {MONTH_NAMES[month]} {year}
                        </span>
                        <button
                          type="button"
                          onClick={nextMonth}
                          className="p-1.5 text-slate-500 hover:text-slate-800 transition"
                          title="Próximo mês"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => shiftSelectedDay(-7)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 transition"
                          title="Semana anterior"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-[11px] font-extrabold text-slate-800 whitespace-nowrap">
                          {formatShortDateBR(weekDays[0].dateStr)} – {formatShortDateBR(weekDays[4].dateStr)}
                        </span>
                        <button
                          type="button"
                          onClick={() => shiftSelectedDay(7)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 transition"
                          title="Próxima semana"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Filtro discreto de Turma no Calendário */}
            {activeTab === 'calendar' && (
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <select
                  value={selectedTurmaFilter}
                  onChange={(e) => setSelectedTurmaFilter(e.target.value)}
                  className="flex-1 sm:flex-none sm:min-w-[180px] px-2.5 py-1 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todas as turmas</option>
                  {availableTurmas.map((t) => (
                    <option key={t} value={t}>
                      Filtrar: {t}
                    </option>
                  ))}
                </select>
                {selectedTurmaFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedTurmaFilter('all')}
                    className="text-[11px] font-bold text-emerald-700 hover:underline shrink-0"
                  >
                    Limpar
                  </button>
                )}

                <button
                  type="button"
                  onClick={hasDemoLogs ? handleClearDemoLogs : handleSeedDemoLogs}
                  className={`ml-auto px-2.5 py-1 rounded-xl text-[11px] font-bold border transition shrink-0 ${
                    hasDemoLogs
                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={hasDemoLogs ? 'Remover anotações de simulação' : 'Gerar anotações de exemplo'}
                >
                  {hasDemoLogs ? 'Limpar simulação' : 'Simular aulas'}
                </button>
              </div>
            )}
          </div>

          {/* CONTEÚDO PRINCIPAL */}
          {activeTab === 'calendar' ? (
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-5 flex flex-col">
              {calendarView === 'week' ? (
                /* VISÃO SEMANAL CLEAN */
                <div className="space-y-2.5">
                  {weekDays.map((wd) => {
                    const slots = getSlotsForDate(wd.dateStr, selectedTurmaFilter);
                    const loggedCount = slots.filter((s) => Boolean(s.log)).length;

                    if (slots.length === 0) {
                      return (
                        <div
                          key={wd.dateStr}
                          className="rounded-xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-400"
                        >
                          <span className="font-bold text-slate-500">
                            {wd.weekdayName} • {formatShortDateBR(wd.dateStr)}
                            {wd.isToday && (
                              <span className="ml-2 text-[10px] font-black text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-full">
                                HOJE
                              </span>
                            )}
                          </span>
                          <span className="text-[11px]">Sem aula</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={wd.dateStr}
                        className={`rounded-2xl border p-3 transition space-y-2 shadow-2xs ${
                          wd.isToday
                            ? 'bg-teal-50/50 border-teal-400 ring-1 ring-teal-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                                wd.isToday
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {wd.weekdayName} • {formatShortDateBR(wd.dateStr)}
                            </span>
                            {wd.isToday && (
                              <span className="text-[10px] font-black text-teal-700 uppercase">Hoje</span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-slate-500">
                            {loggedCount}/{slots.length}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {slots.map((slot) => {
                            const hasLog = Boolean(slot.log);
                            return (
                              <button
                                key={slot.slotKey}
                                type="button"
                                onClick={() => {
                                  setSelectedDate(wd.dateStr);
                                  openSlotEditor(slot, wd.dateStr);
                                }}
                                className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                                  hasLog
                                    ? wd.isFuture
                                      ? 'bg-indigo-50/70 border-indigo-200 hover:border-indigo-400'
                                      : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400'
                                    : 'bg-slate-50/80 border-slate-200 hover:border-emerald-400 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-black shrink-0">
                                    {formatPeriodShort(slot.period)} Tempo
                                  </span>
                                  <span className="font-extrabold text-xs text-slate-900 truncate">
                                    {slot.turma}
                                  </span>
                                </div>
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                                    hasLog
                                      ? wd.isFuture
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                      : 'bg-white text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {hasLog ? (wd.isFuture ? '✓ Planejada' : '✓ Lançada') : 'Lançar →'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              /* CALENDÁRIO MENSAL EM LARGURA TOTAL COM TODOS OS TEMPOS VISÍVEIS */
              <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-4 shadow-2xs flex flex-col flex-1">
                {/* Legenda compacta */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 mb-2.5 px-1">
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Clique em qualquer dia para abrir as turmas e lançar ou consultar anotações.</span>
                  </span>
                  <div className="flex items-center gap-2.5 text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Registrada
                    </span>
                    <span className="flex items-center gap-1 text-indigo-700">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Planejada
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <span className="w-2 h-2 rounded-full border border-slate-400 bg-slate-100" />
                      Prevista
                    </span>
                  </div>
                </div>

                {/* Dias da semana */}
                <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                  <span>Dom</span>
                  <span>Seg</span>
                  <span>Ter</span>
                  <span>Qua</span>
                  <span>Qui</span>
                  <span>Sex</span>
                  <span>Sáb</span>
                </div>

                {/* Grade de dias */}
                <div className="grid grid-cols-7 gap-1 flex-1">
                  {calendarGrid.map((day, idx) => {
                    const slots = getSlotsForDate(day.dateStr, selectedTurmaFilter);
                    const loggedCount = slots.filter((s) => Boolean(s.log)).length;
                    const isSelected = selectedDate === day.dateStr;
                    const allDone = slots.length > 0 && loggedCount === slots.length;

                    return (
                      <button
                        type="button"
                        key={`${day.dateStr}-${idx}`}
                        onClick={() => {
                          setSelectedDate(day.dateStr);
                          setDayModalDate(day.dateStr);
                          if (!day.isCurrentMonth) {
                            const d = parseLocalDate(day.dateStr);
                            setCurrentMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
                          }
                        }}
                        className={`min-h-[86px] sm:min-h-[104px] p-1 sm:p-1.5 rounded-xl border text-left transition-all flex flex-col justify-start cursor-pointer ${
                          !day.isCurrentMonth
                            ? 'bg-slate-50/50 border-slate-100 text-slate-300'
                            : isSelected
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300 shadow-xs'
                            : day.isToday
                            ? 'bg-teal-50/50 border-teal-400 ring-1 ring-teal-300'
                            : day.isWeekend
                            ? 'bg-slate-50/70 border-slate-100 text-slate-400 hover:border-slate-300'
                            : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full gap-0.5 mb-1">
                          <span
                            className={`text-[10px] sm:text-xs font-black inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full shrink-0 ${
                              day.isToday
                                ? 'bg-teal-600 text-white shadow-2xs'
                                : isSelected
                                ? 'bg-emerald-600 text-white'
                                : day.isCurrentMonth
                                ? 'text-slate-700'
                                : 'text-slate-300'
                            }`}
                          >
                            {day.dayNumber}
                          </span>

                          {slots.length > 0 && (
                            <span
                              className={`text-[8px] sm:text-[9px] font-black px-1 rounded-full ${
                                allDone
                                  ? day.isFuture
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                  : loggedCount > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                              title={`${loggedCount} de ${slots.length} aula(s) registrada(s)`}
                            >
                              {loggedCount}/{slots.length}
                            </span>
                          )}
                        </div>

                        {/* Todos os tempos/turmas do dia sem cortar */}
                        <div className="space-y-0.5 w-full">
                          {slots.map((slot) => {
                            const hasLog = Boolean(slot.log);
                            const badgeColor = hasLog
                              ? day.isFuture
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-200 font-bold'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                              : 'bg-slate-50 text-slate-700 border-slate-200';

                            return (
                              <div
                                key={slot.slotKey}
                                className={`text-[7.5px] sm:text-[9px] px-0.5 sm:px-1 py-[1px] rounded border leading-tight whitespace-nowrap flex items-center justify-between gap-0.5 ${badgeColor}`}
                                title={`${formatPeriodLabel(slot.period, hasMultipleShifts)} • ${slot.turma} (${slot.subject})`}
                              >
                                <span className="font-black opacity-75">{formatPeriodShort(slot.period)}</span>
                                <span className="font-extrabold">{shortenTurmaLabel(slot.turma)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}
            </div>
          ) : (
            /* ABA 2: POR TURMA — CLEAN & DIRETO */
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4">
              {/* Seletor horizontal limpo de Turmas */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {availableTurmas.map((turma) => (
                  <button
                    key={turma}
                    type="button"
                    onClick={() => setHistoryTurma(turma)}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border transition shrink-0 ${
                      historyTurma === turma
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    {turma}
                  </button>
                ))}
              </div>

              {historyTurma && (
                <div className="space-y-4">
                  {/* Ação direta para planejar próxima aula da turma */}
                  {(() => {
                    const nextSched = getNextScheduledDateForTurma(historyTurma);
                    const targetDate =
                      nextSched?.date ||
                      (() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        return toLocalDateStr(d);
                      })();

                    return (
                      <button
                        type="button"
                        onClick={() => {
                          openSlotEditor(
                            {
                              slotKey: `plan-${historyTurma}`,
                              period: nextSched?.schedule.period,
                              timeSlot:
                                nextSched?.schedule.start_time && nextSched?.schedule.end_time
                                  ? `${nextSched.schedule.start_time} - ${nextSched.schedule.end_time}`
                                  : undefined,
                              turma: historyTurma,
                              subject: nextSched?.schedule.subject || teacherDiscipline || 'Aula',
                              fromSchedule: Boolean(nextSched),
                              log: dailyLogs.find(
                                (l) =>
                                  l.date === targetDate &&
                                  normalizeTurma(l.turma) === normalizeTurma(historyTurma)
                              ),
                            },
                            targetDate
                          );
                        }}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          Planejar próxima aula de {historyTurma} ({formatShortDateBR(targetDate)}
                          {nextSched ? ` • ${formatPeriodLabel(nextSched.schedule.period, hasMultipleShifts)}` : ''})
                        </span>
                      </button>
                    );
                  })()}

                  {/* Próximas aulas planejadas */}
                  {historyLogsForSelectedTurma.future.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-sm font-black uppercase tracking-wide text-indigo-800 flex items-center gap-1.5 px-0.5">
                        <Compass className="w-4 h-4 text-indigo-600" />
                        <span>Próximas Aulas Planejadas ({historyLogsForSelectedTurma.future.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {historyLogsForSelectedTurma.future.map((log) => (
                          <div
                            key={log.id}
                            className="p-3.5 bg-white rounded-2xl border border-indigo-200 border-l-4 border-l-indigo-500 shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-extrabold text-indigo-950">
                                {formatDateBR(log.date)}
                                {log.period ? ` • ${formatPeriodLabel(log.period, hasMultipleShifts)}` : ''}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openSlotEditor(
                                      {
                                        slotKey: log.id,
                                        period: log.period,
                                        timeSlot: log.timeSlot,
                                        turma: log.turma || historyTurma,
                                        subject: log.subject || teacherDiscipline || 'Aula',
                                        fromSchedule: false,
                                        log,
                                      },
                                      log.date
                                    )
                                  }
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg"
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(log)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {log.activitiesToday && (
                              <p className="text-xs text-slate-800 whitespace-pre-line font-medium">
                                {log.activitiesToday}
                              </p>
                            )}
                            {(log.classwork || log.homework) && (
                              <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                                {log.classwork && <p><strong>Sala:</strong> {log.classwork}</p>}
                                {log.homework && <p><strong>Casa:</strong> {log.homework}</p>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aulas já dadas */}
                  <div className="space-y-2.5">
                    <h4 className="text-sm font-black uppercase tracking-wide text-emerald-800 flex items-center gap-1.5 px-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Aulas Dadas ({historyLogsForSelectedTurma.pastAndToday.length})</span>
                    </h4>

                    {historyLogsForSelectedTurma.pastAndToday.length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        Nenhuma aula registrada ainda para {historyTurma}.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {historyLogsForSelectedTurma.pastAndToday.map((log) => (
                          <div
                            key={log.id}
                            className="p-3.5 bg-white rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-extrabold text-slate-900">
                                {formatDateBR(log.date)}
                                {log.period ? ` • ${formatPeriodLabel(log.period, hasMultipleShifts)}` : ''}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openSlotEditor(
                                      {
                                        slotKey: log.id,
                                        period: log.period,
                                        timeSlot: log.timeSlot,
                                        turma: log.turma || historyTurma,
                                        subject: log.subject || teacherDiscipline || 'Aula',
                                        fromSchedule: false,
                                        log,
                                      },
                                      log.date
                                    )
                                  }
                                  className="p-1 text-slate-400 hover:text-emerald-700 rounded-lg"
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(log)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {log.activitiesToday && (
                              <p className="text-xs text-slate-800 whitespace-pre-line font-medium">
                                {log.activitiesToday}
                              </p>
                            )}
                            {(log.classwork || log.homework) && (
                              <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                                {log.classwork && <p><strong>Sala:</strong> {log.classwork}</p>}
                                {log.homework && <p><strong>Casa:</strong> {log.homework}</p>}
                              </div>
                            )}
                            {log.nextLessonPlan && (
                              <p className="text-[11px] text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-xl font-medium">
                                💡 <strong>Próx. aula:</strong> {log.nextLessonPlan}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: TURMAS DO DIA SELECIONADO (ABERTO AO CLICAR NO DIA DO CALENDÁRIO) */}
      {dayModalDate && (
        <div
          style={{ zIndex: 99990 }}
          className="fixed inset-0 z-[99990] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
        >
          {(() => {
            const modalSlots = getSlotsForDate(dayModalDate, selectedTurmaFilter);
            const d = parseLocalDate(dayModalDate);
            const weekdayName = WEEKDAY_NAMES[d.getDay()];
            const isToday = dayModalDate === todayStr;
            const isFuture = dayModalDate > todayStr;

            const shiftModalDay = (delta: number) => {
              const nextD = parseLocalDate(dayModalDate);
              nextD.setDate(nextD.getDate() + delta);
              const nextStr = toLocalDateStr(nextD);
              setDayModalDate(nextStr);
              setSelectedDate(nextStr);
              if (nextD.getMonth() !== month || nextD.getFullYear() !== year) {
                setCurrentMonthDate(new Date(nextD.getFullYear(), nextD.getMonth(), 1));
              }
            };

            return (
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleIn">
                {/* Cabeçalho do Dia */}
                <div className="px-4 sm:px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => shiftModalDay(-1)}
                      className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition"
                      title="Dia anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftModalDay(1)}
                      className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition"
                      title="Próximo dia"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-center min-w-0 flex-1">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-sm sm:text-base truncate">{weekdayName}</h4>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isToday
                            ? 'bg-white text-emerald-800'
                            : isFuture
                            ? 'bg-indigo-500/80 text-white border border-white/30'
                            : 'bg-black/20 text-white'
                        }`}
                      >
                        {isToday ? 'Hoje' : isFuture ? 'Aula Futura' : 'Aula Passada'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-50 font-mono mt-0.5">
                      {formatDateBR(dayModalDate)} • {modalSlots.length}{' '}
                      {modalSlots.length === 1 ? 'turma no dia' : 'turmas no dia'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDayModalDate(null)}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-white transition shrink-0"
                    title="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Lista de Turmas do Dia (clicáveis) */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
                  {modalSlots.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          Nenhuma aula na grade fixa para {weekdayName.toLowerCase()}.
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Não há turmas agendadas para este dia nos seus horários.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] font-semibold text-slate-500 px-0.5">
                        Clique na turma para ver as anotações anteriores e lançar as atividades do dia:
                      </p>

                      {modalSlots.map((slot) => {
                        const hasLog = Boolean(slot.log);
                        const prevLog = getPreviousLogForTurma(slot.turma, dayModalDate);

                        return (
                          <div
                            key={slot.slotKey}
                            onClick={() => openSlotEditor(slot, dayModalDate)}
                            className={`w-full text-left rounded-2xl border p-3.5 transition-all cursor-pointer space-y-2 shadow-2xs active:scale-[0.99] ${
                              hasLog
                                ? isFuture
                                  ? 'bg-indigo-50/50 border-indigo-200 hover:border-indigo-400'
                                  : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                                : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 text-white text-[11px] font-black">
                                  <Clock className="w-3 h-3 text-emerald-300" />
                                  <span>{formatPeriodLabel(slot.period, hasMultipleShifts)}</span>
                                </span>
                                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-950 border border-emerald-200 text-xs font-extrabold">
                                  {slot.turma}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500">
                                  {slot.subject}
                                  {slot.timeSlot ? ` • ${slot.timeSlot}` : ''}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {hasLog ? (
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                                      isFuture
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{isFuture ? 'Planejada' : 'Registrada'}</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    Lançar
                                  </span>
                                )}
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </div>
                            </div>

                            {slot.log?.activitiesToday ? (
                              <p className="text-xs text-slate-700 bg-white/80 rounded-xl px-2.5 py-2 border border-slate-200/70 line-clamp-2">
                                {slot.log.activitiesToday}
                              </p>
                            ) : prevLog ? (
                              <p className="text-[11px] text-amber-800 bg-amber-50/80 rounded-xl px-2.5 py-1.5 border border-amber-200/70 truncate">
                                <History className="w-3 h-3 inline mr-1 text-amber-600" />
                                <strong>Última ({formatShortDateBR(prevLog.date)}):</strong>{' '}
                                {prevLog.activitiesToday || prevLog.nextLessonPlan || 'Ver anotações'}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* MODAL 2: TURMA CLEAN — LANÇAR AULA | AULAS PASSADAS */}
      {editorState?.isOpen && (
        <div
          style={{ zIndex: 99999 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleIn">
            {/* Cabeçalho limpo */}
            <div
              className={`px-5 py-4 text-white flex items-center justify-between shrink-0 ${
                editorState.date > todayStr
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-700'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-700'
              }`}
            >
              <div className="min-w-0">
                <h4 className="font-extrabold text-base truncate">
                  {editorState.isManualTurma ? formTurma || 'Nova Aula' : editorState.turma}
                </h4>
                <p className="text-[11px] text-white/90 mt-0.5 truncate">
                  {formatDateBR(editorState.date)} ({WEEKDAY_NAMES[parseLocalDate(editorState.date).getDay()].split('-')[0]})
                  {!editorState.isManualTurma &&
                    ` • ${formatPeriodLabel(editorState.period, hasMultipleShifts)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorState(null)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas Limpas: Lançar Aula vs Aulas Passadas */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="grid grid-cols-2 bg-slate-200/70 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setEditorTab('form')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-extrabold transition ${
                    editorTab === 'form'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {editorState.date > todayStr ? 'Planejar Aula' : 'Lançar Aula'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('past')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                    editorTab === 'past'
                      ? 'bg-white text-amber-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Aulas Passadas</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-black">
                    {editorPreviousLogs.length}
                  </span>
                </button>
              </div>
            </div>

            {editorTab === 'form' ? (
              <form onSubmit={handleSaveEntry} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
                {/* Aviso de rascunho automático recuperado (proteção offline) */}
                {draftRestored && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-[11px] text-emerald-900">
                    <span className="font-semibold">
                      Rascunho não salvo recuperado automaticamente.
                    </span>
                    <button
                      type="button"
                      onClick={discardCurrentDraft}
                      className="text-rose-700 font-extrabold hover:underline shrink-0"
                    >
                      Descartar
                    </button>
                  </div>
                )}

                {/* Dica discreta da última aula (1 linha) */}
                {editorPreviousLog && (
                  <div className="px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between gap-2 text-[11px]">
                    <div className="min-w-0 text-amber-950 truncate">
                      <span className="font-bold">Última ({formatShortDateBR(editorPreviousLog.date)}):</span>{' '}
                      <span className="text-amber-900">
                        {editorPreviousLog.nextLessonPlan || editorPreviousLog.activitiesToday}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {editorPreviousLog.nextLessonPlan && !formActivities.trim() && (
                        <button
                          type="button"
                          onClick={() => setFormActivities(editorPreviousLog.nextLessonPlan || '')}
                          className="px-2 py-0.5 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-extrabold text-[10px]"
                        >
                          Usar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditorTab('past')}
                        className="text-amber-800 font-extrabold underline text-[10px]"
                      >
                        Ver todas
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. O que foi dado / Conteúdo planejado */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <label className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {editorState.date > todayStr ? 'Planejamento da aula *' : 'O que foi dado nesta aula *'}
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <VoiceDictationButton
                        onTranscript={(spoken) =>
                          setFormActivities((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
                        }
                      />
                      <button
                        type="button"
                        onClick={openMatrixPicker}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-extrabold transition flex items-center gap-1 shrink-0"
                        title="Selecionar assunto da Matriz Curricular"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Puxar da Matriz</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    required
                    placeholder={
                      editorState.date > todayStr
                        ? 'Ex: Introduzir conteúdo novo, leitura e atividade em dupla...'
                        : 'Ex: Revisão do conteúdo, explicação no quadro e exercícios...'
                    }
                    value={formActivities}
                    onChange={(e) => setFormActivities(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-normal text-slate-700"
                  />
                </div>

                {/* 2. Tarefa de Sala */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>
                        Tarefa de Sala <span className="text-xs text-slate-400 font-medium">(opcional)</span>
                      </span>
                    </label>
                    <VoiceDictationButton
                      onTranscript={(spoken) =>
                        setFormClasswork((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
                      }
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Exercícios 1 a 5 da página 35"
                    value={formClasswork}
                    onChange={(e) => setFormClasswork(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-normal text-slate-700"
                  />
                </div>

                {/* 3. Tarefa de Casa */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>
                        Tarefa de Casa <span className="text-xs text-slate-400 font-medium">(opcional)</span>
                      </span>
                    </label>
                    <VoiceDictationButton
                      onTranscript={(spoken) =>
                        setFormHomework((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
                      }
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Questões 6 e 7 para a próxima aula"
                    value={formHomework}
                    onChange={(e) => setFormHomework(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-normal text-slate-700"
                  />
                </div>

                {/* 4. Planejamento para a Próxima Aula */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="text-sm font-extrabold text-indigo-900 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>
                        Para a próxima aula <span className="text-xs text-indigo-400 font-medium">(opcional)</span>
                      </span>
                    </label>
                    <VoiceDictationButton
                      onTranscript={(spoken) =>
                        setFormNextLesson((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
                      }
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Ex: Corrigir a tarefa de casa e aplicar atividade avaliativa..."
                    value={formNextLesson}
                    onChange={(e) => setFormNextLesson(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-indigo-200 bg-indigo-50/30 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-normal text-slate-700"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setImportTurmaFilter('all');
                        setImportSearch('');
                        setIsImportFromTurmaOpen(true);
                      }}
                      className="px-2.5 py-2 text-xs font-extrabold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition flex items-center gap-1.5"
                      title="Puxar aula já registrada em outra turma"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Clonar de outra turma</span>
                    </button>
                    <button
                      type="button"
                      disabled={
                        !formActivities.trim() &&
                        !formClasswork.trim() &&
                        !formHomework.trim() &&
                        !formNextLesson.trim()
                      }
                      onClick={openCloneModalFromEditor}
                      className="px-2.5 py-2 text-xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 border border-indigo-200 rounded-xl transition flex items-center gap-1.5"
                      title="Enviar esta aula para outra(s) turma(s)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Clonar p/ outra turma</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setEditorState(null)}
                      className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 text-white text-xs font-extrabold rounded-xl shadow-md transition flex items-center gap-1.5 ${
                        editorState.date > todayStr
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editorState.date > todayStr ? 'Salvar Planejamento' : 'Salvar'}</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* ABA DE AULAS PASSADAS DA TURMA (SCROLL ÚNICO E LIMPO) */
              <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto flex-1">
                {editorPreviousLogs.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    Nenhum assunto lançado anteriormente para esta turma até {formatDateBR(editorState.date)}.
                  </div>
                ) : (
                  editorPreviousLogs.map((prev) => (
                    <div
                      key={prev.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 border-l-4 border-l-emerald-500 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900">
                          {formatDateBR(prev.date)} ({WEEKDAY_NAMES[parseLocalDate(prev.date).getDay()].split('-')[0]})
                        </span>
                        <div className="flex items-center gap-1.5">
                          {prev.period && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {formatPeriodLabel(prev.period, hasMultipleShifts)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => openCloneModalFromLog(prev)}
                            className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-extrabold flex items-center gap-1 transition"
                            title="Clonar esta aula para outra turma"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Clonar</span>
                          </button>
                        </div>
                      </div>
                      {prev.activitiesToday && (
                        <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                          {prev.activitiesToday}
                        </p>
                      )}
                      {(prev.classwork || prev.homework) && (
                        <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                          {prev.classwork && <p><strong>Sala:</strong> {prev.classwork}</p>}
                          {prev.homework && <p><strong>Casa:</strong> {prev.homework}</p>}
                        </div>
                      )}
                      {prev.nextLessonPlan && (
                        <p className="text-[11px] text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-xl font-medium">
                          💡 <strong>Próx. aula:</strong> {prev.nextLessonPlan}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* MODAL 3: CONFIGURAÇÃO DE ALARMES DO DIÁRIO DE BORDO */}
      {isAlarmModalOpen && (
        <div
          style={{ zIndex: 99999 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleIn">
            <div className="px-5 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <AlarmClock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">Alarmes do Diário de Bordo</h4>
                  <p className="text-[11px] text-amber-50">
                    Escolha quando deseja ser lembrado de lançar suas aulas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAlarmModalOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Chave Geral */}
              <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                <div>
                  <p className="text-xs font-extrabold text-slate-900">Ativar alarmes de lembrete</p>
                  <p className="text-[11px] text-slate-500">
                    Avisa apenas se houver turma pendente de lançamento no dia
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={alarmConfig.enabled}
                  onChange={(e) =>
                    setAlarmConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </label>

              {/* Opções de Quando Tocar */}
              <div className={`space-y-2.5 transition ${alarmConfig.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 px-0.5">
                  Quando lembrar:
                </p>

                {/* 1. No final de cada tempo */}
                <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alarmConfig.atEachPeriodEnd}
                    onChange={(e) =>
                      setAlarmConfig((prev) => ({ ...prev, atEachPeriodEnd: e.target.checked }))
                    }
                    className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-extrabold text-slate-800">No final de cada tempo</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Lembra ao término de cada aula da sua grade (1º, 2º, 3º, 4º e 5º tempos) caso ainda não tenha lançado.
                    </p>
                  </div>
                </label>

                {/* 2. No final do quinto tempo */}
                <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alarmConfig.atFifthPeriodEnd}
                    onChange={(e) =>
                      setAlarmConfig((prev) => ({ ...prev, atFifthPeriodEnd: e.target.checked }))
                    }
                    className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-extrabold text-slate-800">No final do 5º tempo</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Lembra ao encerrar o 5º tempo do turno (ex.: 11:30 manhã, 17:00 tarde, 22:20 noite).
                    </p>
                  </div>
                </label>

                {/* 3. No final do dia */}
                <div className="p-3 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alarmConfig.atEndOfDay}
                      onChange={(e) =>
                        setAlarmConfig((prev) => ({ ...prev, atEndOfDay: e.target.checked }))
                      }
                      className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-extrabold text-slate-800">No final do dia</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Lembrete único no horário escolhido para revisar todas as turmas do dia.
                      </p>
                    </div>
                  </label>

                  {alarmConfig.atEndOfDay && (
                    <div className="pl-7 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600">Horário:</span>
                      <input
                        type="time"
                        value={alarmConfig.endOfDayTime}
                        onChange={(e) =>
                          setAlarmConfig((prev) => ({ ...prev, endOfDayTime: e.target.value || '17:30' }))
                        }
                        className="px-2.5 py-1 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Som do Alarme */}
                <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-amber-600" />
                      <span>Tocar som ao disparar</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={alarmConfig.soundEnabled}
                      onChange={(e) =>
                        setAlarmConfig((prev) => ({ ...prev, soundEnabled: e.target.checked }))
                      }
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                  </label>

                  {alarmConfig.soundEnabled && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                      <p className="text-[11px] font-bold text-slate-500">Escolha o toque:</p>
                      {DIARY_ALARM_SOUNDS.map((sound) => {
                        const isSelected = (alarmConfig.soundType || 'suave') === sound.id;
                        return (
                          <div
                            key={sound.id}
                            onClick={() => {
                              setAlarmConfig((prev) => ({ ...prev, soundType: sound.id }));
                              playDiaryAlarmChime(sound.id);
                            }}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border cursor-pointer transition ${
                              isSelected
                                ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300'
                                : 'bg-white border-slate-200 hover:border-amber-300'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-800">{sound.label}</p>
                              <p className="text-[10px] text-slate-500 truncate">{sound.description}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAlarmConfig((prev) => ({ ...prev, soundType: sound.id }));
                                playDiaryAlarmChime(sound.id);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition ${
                                isSelected
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900'
                              }`}
                            >
                              Ouvir
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Permissão de Notificação do Navegador/Celular */}
              {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-blue-900">
                    <strong>Notificações no celular/PC:</strong> ative para receber o alerta mesmo em outra aba.
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await requestBrowserNotificationPermission();
                      setNotifPerm(res);
                    }}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl shrink-0"
                  >
                    Ativar
                  </button>
                </div>
              )}

              {alarmTestMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  {alarmTestMessage}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (alarmConfig.soundEnabled) playDiaryAlarmChime(alarmConfig.soundType);
                    await sendBrowserNotification(
                      'Teste de Alarme — Diário de Bordo ⏰',
                      'Seu alarme do Diário de Bordo está funcionando!',
                      'diary-alarm-test'
                    );
                    setAlarmTestMessage('Alarme de teste disparado! Verifique o som e a notificação.');
                  }}
                  className="px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center gap-1.5"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Testar Alarme</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAlarmModalOpen(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      diaryAlarmService.saveConfig(alarmConfig);
                      window.dispatchEvent(new CustomEvent('diary_alarm_config_updated'));
                      setIsAlarmModalOpen(false);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar Alarmes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 4: SELETOR DE ASSUNTO DA MATRIZ CURRICULAR */}
      {isMatrixPickerOpen && (
        <div
          style={{ zIndex: 100000 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleIn">
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-blue-700 text-white flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Puxar da Matriz Curricular</span>
                </h4>
                <p className="text-[11px] text-indigo-100 mt-0.5 truncate">
                  {teacherDiscipline || 'Disciplina'} • Marque um ou mais objetos de conhecimento
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMatrixPickerOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar objeto de conhecimento, habilidade ou código..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={matrixAnoFilter}
                  onChange={(e) => setMatrixAnoFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl outline-none"
                >
                  <option value="all">Todos os anos</option>
                  <option value="6 ANO">6º Ano</option>
                  <option value="7 ANO">7º Ano</option>
                  <option value="8 ANO">8º Ano</option>
                  <option value="9 ANO">9º Ano</option>
                </select>

                <select
                  value={matrixBimestreFilter}
                  onChange={(e) => setMatrixBimestreFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl outline-none"
                >
                  <option value="all">Todos os bimestres</option>
                  <option value="1">1º Bimestre</option>
                  <option value="2">2º Bimestre</option>
                  <option value="3">3º Bimestre</option>
                  <option value="4">4º Bimestre</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 space-y-3 overflow-y-auto flex-1">
              {filteredMatrixItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nenhum item da matriz encontrado para esse filtro.
                </div>
              ) : (
                filteredMatrixItems.slice(0, 60).map((item) => {
                  const individualTopics =
                    item.objetoItems && item.objetoItems.length > 0
                      ? item.objetoItems
                      : [item.objeto];

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                            {item.codigo || item.unidadeTematica}
                          </span>
                          {item.unidadeTematica && item.unidadeTematica !== '-' && (
                            <span className="text-[10px] font-bold text-slate-500">
                              {item.unidadeTematica}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          {item.ano.replace(' ANO', 'º Ano')} • {item.bimestre}
                        </span>
                      </div>

                      {/* Caixas de seleção individuais para cada Objeto de Conhecimento */}
                      <div className="space-y-1.5">
                        {individualTopics.map((topic, idx) => {
                          const key = `${item.id}-${idx}`;
                          const formatted = item.codigo ? `${topic} (${item.codigo})` : topic;
                          const isChecked = selectedMatrixTopics.some((t) => t.key === key);

                          return (
                            <label
                              key={key}
                              className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                                isChecked
                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-950'
                                  : 'bg-slate-50/70 border-slate-200/80 hover:border-indigo-300 text-slate-800'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleMatrixTopic(key, formatted)}
                                className="w-4 h-4 mt-0.5 accent-indigo-600 rounded cursor-pointer shrink-0"
                              />
                              <span className="text-xs font-semibold leading-snug">{topic}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé com contagem e botão de confirmar */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-700">
                  {selectedMatrixTopics.length}{' '}
                  {selectedMatrixTopics.length === 1 ? 'selecionado' : 'selecionados'}
                </span>
                {selectedMatrixTopics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMatrixTopics([])}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMatrixPickerOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={selectedMatrixTopics.length === 0}
                  onClick={handleConfirmMatrixTopics}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Adicionar ({selectedMatrixTopics.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CLONAR / REAPROVEITAR AULA PARA OUTRA TURMA */}
      {cloneSource && (
        <div
          style={{ zIndex: 100001 }}
          className="fixed inset-0 z-[100001] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleIn">
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-700 text-white flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>Clonar Aula para Outra Turma</span>
                </h4>
                <p className="text-[11px] text-indigo-100 mt-0.5 truncate">
                  Origem: {cloneSource.turma || 'Aula atual'} • {formatDateBR(cloneSource.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCloneSource(null)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {cloneSource.activitiesToday && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Conteúdo que será copiado
                  </p>
                  <p className="line-clamp-3 whitespace-pre-line font-medium">
                    {cloneSource.activitiesToday}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Data de destino
                </label>
                <input
                  type="date"
                  value={cloneTargetDate}
                  onChange={(e) => setCloneTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-800">
                    Escolha a(s) turma(s) de destino
                  </label>
                  <span className="text-[11px] font-bold text-indigo-600">
                    {cloneSelectedTurmas.length} selecionada(s)
                  </span>
                </div>

                {availableTurmas.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Nenhuma outra turma encontrada no seu horário.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {availableTurmas.map((turmaName) => {
                      const isSelected = cloneSelectedTurmas.includes(turmaName);
                      const isSameAsSource =
                        normalizeTurma(turmaName) === normalizeTurma(cloneSource.turma) &&
                        cloneTargetDate === cloneSource.date;
                      return (
                        <label
                          key={turmaName}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            isSameAsSource
                              ? 'opacity-45 bg-slate-100 border-slate-200 cursor-not-allowed'
                              : isSelected
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
                              : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={isSameAsSource}
                            checked={isSelected}
                            onChange={() =>
                              setCloneSelectedTurmas((prev) =>
                                prev.includes(turmaName)
                                  ? prev.filter((t) => t !== turmaName)
                                  : [...prev, turmaName]
                              )
                            }
                            className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                          />
                          <span className="truncate">{turmaName}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {cloneFeedback && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{cloneFeedback}</span>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCloneSource(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={cloneSelectedTurmas.length === 0 || Boolean(cloneFeedback)}
                onClick={handleConfirmClone}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Clonar ({cloneSelectedTurmas.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: CLONAR / PUXAR AULA DE OUTRA TURMA PARA A TURMA ATUAL */}
      {isImportFromTurmaOpen && editorState && (
        <div
          style={{ zIndex: 100001 }}
          className="fixed inset-0 z-[100001] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleIn">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                  <History className="w-4 h-4 shrink-0" />
                  <span>Clonar de Outra Turma</span>
                </h4>
                <p className="text-[11px] text-teal-100 mt-0.5 truncate">
                  Escolha uma aula já lançada para preencher {(editorState.isManualTurma ? formTurma : editorState.turma) || 'esta turma'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportFromTurmaOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar assunto ou tarefa..."
                    value={importSearch}
                    onChange={(e) => setImportSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <select
                  value={importTurmaFilter}
                  onChange={(e) => setImportTurmaFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl outline-none"
                >
                  <option value="all">Todas as outras turmas</option>
                  {availableTurmas
                    .filter(
                      (t) =>
                        normalizeTurma(t) !==
                        normalizeTurma((editorState.isManualTurma ? formTurma : editorState.turma) || '')
                    )
                    .map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="p-3.5 space-y-2.5 overflow-y-auto flex-1">
              {(() => {
                const currentTurmaNorm = normalizeTurma(
                  (editorState.isManualTurma ? formTurma : editorState.turma) || ''
                );
                const q = importSearch.trim().toLowerCase();
                const candidates = dailyLogs
                  .filter((l) => {
                    if (normalizeTurma(l.turma) === currentTurmaNorm) return false;
                    if (
                      importTurmaFilter !== 'all' &&
                      normalizeTurma(l.turma) !== normalizeTurma(importTurmaFilter)
                    ) {
                      return false;
                    }
                    if (!l.activitiesToday && !l.classwork && !l.homework && !l.nextLessonPlan) {
                      return false;
                    }
                    if (!q) return true;
                    return (
                      (l.turma || '').toLowerCase().includes(q) ||
                      (l.activitiesToday || '').toLowerCase().includes(q) ||
                      (l.classwork || '').toLowerCase().includes(q) ||
                      (l.homework || '').toLowerCase().includes(q)
                    );
                  })
                  .sort(
                    (a, b) =>
                      (b.date || '').localeCompare(a.date || '') || (b.period ?? 0) - (a.period ?? 0)
                  )
                  .slice(0, 40);

                if (candidates.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhuma aula encontrada em outras turmas para esse filtro.
                    </div>
                  );
                }

                return candidates.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => {
                      const hasExisting =
                        formActivities.trim() ||
                        formClasswork.trim() ||
                        formHomework.trim() ||
                        formNextLesson.trim();
                      if (
                        hasExisting &&
                        !confirm(
                          `Substituir o texto atual pela aula de ${log.turma} (${formatDateBR(log.date)})?`
                        )
                      ) {
                        return;
                      }
                      setFormActivities(log.activitiesToday || '');
                      setFormClasswork(log.classwork || '');
                      setFormHomework(log.homework || '');
                      setFormNextLesson(log.nextLessonPlan || '');
                      setIsImportFromTurmaOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 transition space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                        {log.turma}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {formatDateBR(log.date)}
                        {log.period ? ` • ${formatPeriodLabel(log.period, hasMultipleShifts)}` : ''}
                      </span>
                    </div>
                    {log.activitiesToday && (
                      <p className="text-xs text-slate-800 font-semibold line-clamp-2 whitespace-pre-line">
                        {log.activitiesToday}
                      </p>
                    )}
                    {(log.classwork || log.homework) && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {log.classwork ? `Sala: ${log.classwork}` : ''}
                        {log.classwork && log.homework ? ' • ' : ''}
                        {log.homework ? `Casa: ${log.homework}` : ''}
                      </p>
                    )}
                    <p className="text-[10px] font-extrabold text-teal-700 opacity-80 group-hover:opacity-100">
                      Toque para usar esta aula →
                    </p>
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
