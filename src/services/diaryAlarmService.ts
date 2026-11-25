import { TeacherSchedule } from '../types/database.types';
import { DailyLogEntry } from './teacherCalendarService';

export type DiaryAlarmSoundType = 'suave' | 'escola' | 'alegre' | 'despertador' | 'zen';

export interface DiaryAlarmConfig {
  enabled: boolean;
  atEachPeriodEnd: boolean;
  atFifthPeriodEnd: boolean;
  atEndOfDay: boolean;
  endOfDayTime: string; // HH:MM
  soundEnabled: boolean;
  soundType: DiaryAlarmSoundType;
}

export const DIARY_ALARM_SOUNDS: Array<{
  id: DiaryAlarmSoundType;
  label: string;
  description: string;
}> = [
  { id: 'suave', label: '🔔 Sino Suave', description: 'Três notas leves e agradáveis' },
  { id: 'escola', label: '🏫 Sinal Escolar', description: 'Toque clássico de troca de tempo' },
  { id: 'alegre', label: '✨ Melodia Alegre', description: 'Acorde animado e positivo' },
  { id: 'despertador', label: '⏰ Despertador Digital', description: 'Bipes rítmicos bem nítidos' },
  { id: 'zen', label: '🎵 Gongo Calmo', description: 'Som harmônico suave e longo' },
];

export interface FiredDiaryAlarm {
  key: string;
  title: string;
  message: string;
  date: string;
  targetPeriod?: number;
}

const ALARM_CONFIG_KEY = 'diary_alarm_config_v1';
const FIRED_ALARMS_KEY_PREFIX = 'diary_alarms_fired_';

export const DEFAULT_DIARY_ALARM_CONFIG: DiaryAlarmConfig = {
  enabled: false,
  atEachPeriodEnd: false,
  atFifthPeriodEnd: true,
  atEndOfDay: false,
  endOfDayTime: '17:30',
  soundEnabled: true,
  soundType: 'suave',
};

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
};

const getTodayStr = (now: Date): string => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const normalizeTurma = (t?: string) => (t || '').trim().toLowerCase();

const formatPeriodLabel = (period: number): string => {
  if (period >= 21) return `${period - 20}º Tempo (Noite)`;
  if (period >= 11) return `${period - 10}º Tempo (Tarde)`;
  return `${period}º Tempo`;
};

const getFiredKeys = (dateStr: string): Set<string> => {
  try {
    const raw = localStorage.getItem(`${FIRED_ALARMS_KEY_PREFIX}${dateStr}`);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
};

const markKeyFired = (dateStr: string, key: string): void => {
  try {
    const current = getFiredKeys(dateStr);
    current.add(key);
    localStorage.setItem(`${FIRED_ALARMS_KEY_PREFIX}${dateStr}`, JSON.stringify(Array.from(current)));
  } catch {
    // ignore storage errors
  }
};

export const playDiaryAlarmChime = (soundType: DiaryAlarmSoundType = 'suave'): void => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    const playTone = (
      freq: number,
      offsetSec: number,
      durationSec: number,
      type: OscillatorType = 'sine',
      peakGain = 0.16
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + offsetSec;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + durationSec);
    };

    switch (soundType) {
      case 'escola':
        // Campainha escolar: Mi5 -> Dó5 (2x)
        playTone(659.25, 0.0, 0.25, 'triangle', 0.18);
        playTone(523.25, 0.22, 0.35, 'triangle', 0.18);
        playTone(659.25, 0.65, 0.25, 'triangle', 0.18);
        playTone(523.25, 0.87, 0.45, 'triangle', 0.18);
        break;
      case 'alegre':
        // Arpejo Dó5 -> Mi5 -> Sol5 -> Dó6
        playTone(523.25, 0.0, 0.18, 'sine', 0.15);
        playTone(659.25, 0.1, 0.18, 'sine', 0.15);
        playTone(783.99, 0.2, 0.18, 'sine', 0.15);
        playTone(1046.5, 0.3, 0.55, 'triangle', 0.18);
        break;
      case 'despertador':
        // Bipes rítmicos Lá5
        playTone(880, 0.0, 0.12, 'square', 0.08);
        playTone(880, 0.18, 0.12, 'square', 0.08);
        playTone(880, 0.36, 0.12, 'square', 0.08);
        playTone(880, 0.72, 0.12, 'square', 0.08);
        playTone(880, 0.9, 0.12, 'square', 0.08);
        break;
      case 'zen':
        // Acorde harmônico longo Fá4 + Lá4 + Dó5
        playTone(349.23, 0.0, 1.3, 'sine', 0.12);
        playTone(440.0, 0.05, 1.25, 'sine', 0.1);
        playTone(523.25, 0.1, 1.2, 'sine', 0.09);
        break;
      case 'suave':
      default:
        // Sino suave: Ré5 -> Sol5 -> Si5
        playTone(587.33, 0.0, 0.22, 'sine', 0.15);
        playTone(783.99, 0.14, 0.22, 'sine', 0.15);
        playTone(987.77, 0.28, 0.55, 'sine', 0.16);
        break;
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1800);
  } catch {
    // ignore autoplay restrictions
  }
};

export const diaryAlarmService = {
  getConfig(): DiaryAlarmConfig {
    try {
      const raw = localStorage.getItem(ALARM_CONFIG_KEY);
      if (!raw) return { ...DEFAULT_DIARY_ALARM_CONFIG };
      return { ...DEFAULT_DIARY_ALARM_CONFIG, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_DIARY_ALARM_CONFIG };
    }
  },

  saveConfig(config: DiaryAlarmConfig): void {
    try {
      localStorage.setItem(ALARM_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  },

  // Verifica se algum alarme deve disparar agora
  checkDueAlarms(
    schedules: TeacherSchedule[],
    dailyLogs: DailyLogEntry[],
    now = new Date()
  ): FiredDiaryAlarm | null {
    const config = this.getConfig();
    if (!config.enabled) return null;

    const todayStr = getTodayStr(now);
    const weekday = now.getDay();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const fired = getFiredKeys(todayStr);

    // Deduplica horários do dia por período
    const byPeriod = new Map<number, TeacherSchedule>();
    schedules
      .filter((s) => s.day_of_week === weekday)
      .sort((a, b) => a.period - b.period)
      .forEach((s) => byPeriod.set(s.period, s));
    const todaySchedules = Array.from(byPeriod.values());

    const todayLogs = dailyLogs.filter((l) => (l.date || '').split('T')[0] === todayStr);

    const isSlotLogged = (sc: TeacherSchedule) =>
      todayLogs.some(
        (l) =>
          (l.period === sc.period && normalizeTurma(l.turma) === normalizeTurma(sc.class_name)) ||
          (!l.period && normalizeTurma(l.turma) === normalizeTurma(sc.class_name))
      );

    const unloggedToday = todaySchedules.filter((sc) => !isSlotLogged(sc));

    // 1. Alarme no final de cada tempo
    if (config.atEachPeriodEnd && todaySchedules.length > 0) {
      for (const sc of todaySchedules) {
        if (isSlotLogged(sc)) continue;
        const endMins = toMinutes(sc.end_time);
        if (endMins < 0) continue;

        const key = `period_${sc.period}`;
        if (!fired.has(key) && nowMinutes >= endMins && nowMinutes <= endMins + 5) {
          markKeyFired(todayStr, key);
          return {
            key,
            date: todayStr,
            targetPeriod: sc.period,
            title: `Fim do ${formatPeriodLabel(sc.period)} • ${sc.class_name}`,
            message: `Hora de lançar no Diário de Bordo o que foi dado na turma ${sc.class_name}.`,
          };
        }
      }
    }

    // 2. Alarme no final do 5º tempo
    if (config.atFifthPeriodEnd) {
      const fifthSlots = todaySchedules.filter(
        (sc) => sc.period === 5 || sc.period === 15 || sc.period === 25
      );
      const fifthTargets: Array<{ period: number; endTime: string }> =
        fifthSlots.length > 0
          ? fifthSlots.map((s) => ({ period: s.period, endTime: s.end_time }))
          : [{ period: 5, endTime: '11:30' }];

      for (const target of fifthTargets) {
        const endMins = toMinutes(target.endTime);
        if (endMins < 0) continue;
        const key = `fifth_${target.period}`;

        if (!fired.has(key) && nowMinutes >= endMins && nowMinutes <= endMins + 10) {
          // Só dispara se ainda houver alguma aula do dia sem registro (ou se não houver grade cadastrada)
          if (todaySchedules.length === 0 || unloggedToday.length > 0) {
            markKeyFired(todayStr, key);
            const pendingCount = unloggedToday.length;
            return {
              key,
              date: todayStr,
              targetPeriod: target.period,
              title: 'Fim do 5º Tempo — Diário de Bordo',
              message:
                pendingCount > 0
                  ? `Você ainda tem ${pendingCount} ${pendingCount === 1 ? 'turma' : 'turmas'} de hoje sem lançamento no Diário de Bordo.`
                  : 'Lembrete do 5º tempo: registre suas aulas de hoje no Diário de Bordo.',
            };
          }
        }
      }
    }

    // 3. Alarme no final do dia
    if (config.atEndOfDay) {
      const endDayMins = toMinutes(config.endOfDayTime || '17:30');
      const key = 'end_of_day';
      if (endDayMins >= 0 && !fired.has(key) && nowMinutes >= endDayMins && nowMinutes <= endDayMins + 15) {
        if (todaySchedules.length === 0 || unloggedToday.length > 0) {
          markKeyFired(todayStr, key);
          const pendingCount = unloggedToday.length;
          return {
            key,
            date: todayStr,
            title: 'Lembrete de Fim do Dia — Diário de Bordo',
            message:
              pendingCount > 0
                ? `Antes de encerrar o dia, faltam ${pendingCount} ${pendingCount === 1 ? 'turma' : 'turmas'} para lançar no Diário de Bordo.`
                : 'Lembrete diário: revise e registre as aulas de hoje no Diário de Bordo.',
          };
        }
      }
    }

    return null;
  },
};
