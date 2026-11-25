import { supabase } from '../lib/supabaseClient';
import { 
  DocumentCategory, 
  TeacherSchedule, 
  SchoolEvent, 
  Birthday 
} from '../types/database.types';
import { encodeCategoryDescription, normalizeCategory } from '../lib/utils';
import { SEMED_MANAUS_2026_EVENTS } from '../data/semedCalendar2026';

export const pedagogicalService = {
  // ================= CATEGORIAS E PRAZOS =================
  async getCategories(): Promise<DocumentCategory[]> {
    const { data, error } = await supabase
      .from('document_categories')
      .select('*')
      .order('deadline_day', { ascending: true });

    if (error) throw error;
    return (data || []).map(cat => normalizeCategory(cat)) as DocumentCategory[];
  },

  async updateCategory(id: string, updates: Partial<DocumentCategory>): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_categories')
        .update(updates)
        .eq('id', id);

      if (error) {
        // Se a coluna bimestre não existir ainda, atualiza os campos seguros (incluindo description com tag de bimestre)
        const { bimestre, ...safeUpdates } = updates;
        if (Object.keys(safeUpdates).length > 0) {
          await supabase
            .from('document_categories')
            .update(safeUpdates)
            .eq('id', id);
        }
      }
    } catch (err) {
      console.warn('Erro ao atualizar categoria:', err);
    }
  },

  async createCategory(category: {
    name: string;
    description?: string;
    deadline_day?: number;
    bimestre?: string;
    requires_evidence?: boolean;
  }): Promise<DocumentCategory> {
    const encodedDescription = encodeCategoryDescription(
      category.description,
      category.requires_evidence,
      category.bimestre
    );

    try {
      const { data, error } = await supabase
        .from('document_categories')
        .insert({
          name: category.name,
          description: encodedDescription,
          deadline_day: category.deadline_day || 5,
          bimestre: category.bimestre || '1º Bimestre',
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        // Fallback sem a coluna bimestre se o SQL ainda não tiver sido executado
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('document_categories')
          .insert({
            name: category.name,
            description: encodedDescription,
            deadline_day: category.deadline_day || 5,
            is_active: true,
          })
          .select()
          .single();

        if (fallbackError) throw fallbackError;
        return normalizeCategory({
          ...fallbackData,
          bimestre: category.bimestre || '1º Bimestre',
        }) as DocumentCategory;
      }
      return normalizeCategory(data) as DocumentCategory;
    } catch (err: any) {
      throw err;
    }
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('document_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ================= HORÁRIOS DE AULA =================
  async getTeacherSchedules(teacherId?: string): Promise<TeacherSchedule[]> {
    try {
      let query = supabase.from('teacher_schedules').select('*').order('period', { ascending: true });
      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TeacherSchedule[];
    } catch (err: any) {
      console.warn('Fallback local para teacher_schedules:', err.message);
      const stored = localStorage.getItem('local_teacher_schedules');
      let list: TeacherSchedule[] = stored ? JSON.parse(stored) : [];
      if (teacherId) {
        list = list.filter(item => item.teacher_id === teacherId);
      }
      return list;
    }
  },

  async addTeacherSchedule(schedule: Omit<TeacherSchedule, 'id' | 'created_at'>): Promise<TeacherSchedule> {
    try {
      const { data, error } = await supabase
        .from('teacher_schedules')
        .insert(schedule)
        .select()
        .single();

      if (error) throw error;
      return data as TeacherSchedule;
    } catch (err: any) {
      console.warn('Salvando horário localmente por falta da tabela no Supabase:', err.message);
      const stored = localStorage.getItem('local_teacher_schedules');
      const list: TeacherSchedule[] = stored ? JSON.parse(stored) : [];
      const newSchedule: TeacherSchedule = {
        ...schedule,
        id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        created_at: new Date().toISOString()
      };
      // Remove any existing schedule for same teacher, day and period
      const filtered = list.filter(s => !(s.teacher_id === schedule.teacher_id && s.day_of_week === schedule.day_of_week && s.period === schedule.period));
      filtered.push(newSchedule);
      localStorage.setItem('local_teacher_schedules', JSON.stringify(filtered));
      return newSchedule;
    }
  },

  async deleteTeacherSchedule(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('teacher_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.warn('Deletando horário localmente:', err.message);
      const stored = localStorage.getItem('local_teacher_schedules');
      if (stored) {
        const list: TeacherSchedule[] = JSON.parse(stored);
        const filtered = list.filter(s => s.id !== id);
        localStorage.setItem('local_teacher_schedules', JSON.stringify(filtered));
      }
    }
  },

  // ================= CALENDÁRIO ESCOLAR =================
  async getSchoolEvents(): Promise<SchoolEvent[]> {
    let customEvents: SchoolEvent[] = [];
    try {
      const { data, error } = await supabase
        .from('school_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        console.warn('Tabela school_events não inicializada ainda:', error.message);
      } else {
        customEvents = (data || []) as SchoolEvent[];
      }
    } catch (err) {
      console.warn('Usando apenas calendário oficial SEMED offline:', err);
    }

    // Mescla eventos da escola com o Calendário Oficial SEMED Manaus 2026 sem duplicar
    const seenKeys = new Set(
      customEvents.map((ev) => `${ev.event_date}::${ev.title.trim().toLowerCase()}`)
    );
    const merged: SchoolEvent[] = [
      ...customEvents,
      ...SEMED_MANAUS_2026_EVENTS.filter(
        (ev) => !seenKeys.has(`${ev.event_date}::${ev.title.trim().toLowerCase()}`)
      ),
    ];

    return merged.sort((a, b) => a.event_date.localeCompare(b.event_date));
  },

  async addSchoolEvent(event: Omit<SchoolEvent, 'id' | 'created_at'>): Promise<SchoolEvent> {
    const { data, error } = await supabase
      .from('school_events')
      .insert(event)
      .select()
      .single();

    if (error) throw error;
    return data as SchoolEvent;
  },

  async deleteSchoolEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('school_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ================= ANIVERSARIANTES =================
  async getBirthdays(): Promise<Birthday[]> {
    const { data, error } = await supabase
      .from('birthdays')
      .select('*')
      .order('birth_day', { ascending: true });

    if (error) {
      console.warn('Tabela birthdays não inicializada ainda:', error.message);
      return [];
    }
    return (data || []) as Birthday[];
  },

  async addBirthday(birthday: Omit<Birthday, 'id' | 'created_at'>): Promise<Birthday> {
    const { data, error } = await supabase
      .from('birthdays')
      .insert(birthday)
      .select()
      .single();

    if (error) throw error;
    return data as Birthday;
  },

  async deleteBirthday(id: string): Promise<void> {
    const { error } = await supabase
      .from('birthdays')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
