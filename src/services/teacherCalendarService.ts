import { supabase } from '../lib/supabaseClient';

export interface DailyLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  turma?: string;
  activitiesToday?: string;
  classwork?: string;
  homework?: string;
  authorId?: string;
  updatedAt?: string;
}

export interface ScheduledActivityEntry {
  id: string;
  title: string;
  turma?: string;
  details?: string;
  dueDate: string; // YYYY-MM-DD
  updatedAt?: string;
}

export interface ScheduledAssessmentEntry {
  id: string;
  title: string;
  turma?: string;
  details?: string;
  date: string; // YYYY-MM-DD
  updatedAt?: string;
}

export interface TeacherCalendarData {
  dailyLogs: DailyLogEntry[];
  activities: ScheduledActivityEntry[];
  assessments: ScheduledAssessmentEntry[];
  customEvents: any[];
}

const STORAGE_KEY_DAILY_LOGS = 'teacher_daily_logs';
const STORAGE_KEY_ACTIVITIES = 'teacher_scheduled_activities';
const STORAGE_KEY_ASSESSMENTS = 'teacher_scheduled_assessments';
const STORAGE_KEY_CUSTOM_EVENTS = 'teacher_custom_events';
const SYNC_TAG = '<!--TEACHER_CALENDAR_SYNC_v1-->';

export const teacherCalendarService = {
  // Carrega do cache local imediato
  getLocalData(): TeacherCalendarData {
    try {
      const dailyLogs = JSON.parse(localStorage.getItem(STORAGE_KEY_DAILY_LOGS) || '[]');
      const activities = JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVITIES) || '[]');
      const assessments = JSON.parse(localStorage.getItem(STORAGE_KEY_ASSESSMENTS) || '[]');
      const customEvents = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_EVENTS) || '[]');
      return { dailyLogs, activities, assessments, customEvents };
    } catch {
      return { dailyLogs: [], activities: [], assessments: [], customEvents: [] };
    }
  },

  // Salva no cache local
  saveLocalData(data: Partial<TeacherCalendarData>): void {
    if (data.dailyLogs) localStorage.setItem(STORAGE_KEY_DAILY_LOGS, JSON.stringify(data.dailyLogs));
    if (data.activities) localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(data.activities));
    if (data.assessments) localStorage.setItem(STORAGE_KEY_ASSESSMENTS, JSON.stringify(data.assessments));
    if (data.customEvents) localStorage.setItem(STORAGE_KEY_CUSTOM_EVENTS, JSON.stringify(data.customEvents));
  },

  // Sincroniza com o Supabase na nuvem e mescla com o local
  async syncFromCloud(): Promise<TeacherCalendarData> {
    const local = this.getLocalData();

    try {
      // 1. Tenta carregar pela tabela dedicada teacher_daily_logs se ela existir
      const { data: dedicatedLogs, error: dedicatedError } = await supabase
        .from('teacher_daily_logs')
        .select('*')
        .order('date', { ascending: false });

      if (!dedicatedError && dedicatedLogs && dedicatedLogs.length > 0) {
        const mappedLogs: DailyLogEntry[] = dedicatedLogs.map((d: any) => ({
          id: d.id,
          date: d.date,
          turma: d.turma,
          activitiesToday: d.activities_today,
          classwork: d.classwork,
          homework: d.homework,
          authorId: d.teacher_id,
          updatedAt: d.updated_at,
        }));
        local.dailyLogs = mappedLogs;
        this.saveLocalData({ dailyLogs: mappedLogs });
      }

      // 2. Sincroniza estado unificado na nuvem através do canal seguro do Supabase
      const { data: cloudSync, error: syncError } = await supabase
        .from('messages')
        .select('*')
        .like('content', `${SYNC_TAG}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!syncError && cloudSync && cloudSync.length > 0) {
        const payload = cloudSync[0].content.replace(SYNC_TAG, '').trim();
        const parsed: TeacherCalendarData = JSON.parse(payload);

        // Mescla sem perder dados locais mais novos
        if (parsed.dailyLogs) {
          const map = new Map<string, DailyLogEntry>();
          local.dailyLogs.forEach((l) => map.set(l.id || l.date, l));
          parsed.dailyLogs.forEach((l) => map.set(l.id || l.date, l));
          local.dailyLogs = Array.from(map.values());
        }
        if (parsed.activities) {
          const map = new Map<string, ScheduledActivityEntry>();
          local.activities.forEach((a) => map.set(a.id, a));
          parsed.activities.forEach((a) => map.set(a.id, a));
          local.activities = Array.from(map.values());
        }
        if (parsed.assessments) {
          const map = new Map<string, ScheduledAssessmentEntry>();
          local.assessments.forEach((a) => map.set(a.id, a));
          parsed.assessments.forEach((a) => map.set(a.id, a));
          local.assessments = Array.from(map.values());
        }
        if (parsed.customEvents) {
          const map = new Map<string, any>();
          local.customEvents.forEach((e) => map.set(e.id, e));
          parsed.customEvents.forEach((e) => map.set(e.id, e));
          local.customEvents = Array.from(map.values());
        }

        this.saveLocalData(local);
      }
    } catch (err) {
      console.warn('Erro ao sincronizar dados do calendário na nuvem:', err);
    }

    return local;
  },

  // Salva no banco de dados Supabase na nuvem e atualiza o local
  async saveToCloud(data: TeacherCalendarData): Promise<void> {
    this.saveLocalData(data);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const authorId = user?.id || '96d72e68-c5fe-4f1e-8e6d-3d6b5badc434'; // Prof. Walter default

      // Tenta salvar diários na tabela dedicada se disponível
      for (const log of data.dailyLogs) {
        try {
          await supabase.from('teacher_daily_logs').upsert({
            id: log.id.startsWith('daily-') ? undefined : log.id,
            date: log.date,
            turma: log.turma,
            activities_today: log.activitiesToday,
            classwork: log.classwork,
            homework: log.homework,
            teacher_id: authorId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'date,turma' });
        } catch {
          // ignore se tabela dedicada ainda não existir
        }
      }

      // Sincroniza no Supabase para acesso instantâneo em múltiplos dispositivos
      const content = `${SYNC_TAG}${JSON.stringify(data)}`;
      await supabase.from('messages').insert({
        sender_id: authorId,
        recipient_id: authorId,
        content,
        read: true,
      });
    } catch (err) {
      console.warn('Aviso: Falha ao enviar atualização para a nuvem:', err);
    }
  },
};
