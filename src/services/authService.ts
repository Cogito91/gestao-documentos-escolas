import { supabase } from '../lib/supabaseClient';
import { Profile, UserRole } from '../types/database.types';

export const authService = {
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  async getCurrentProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }

    if (!data) {
      const fallbackProfile: Profile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
        email: user.email || '',
        role: (user.user_metadata?.role as UserRole) || 'professor',
        discipline: user.user_metadata?.discipline || null,
        phone: user.user_metadata?.phone || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return fallbackProfile;
    }

    return data as Profile;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signUp(
    email: string, 
    password: string, 
    fullName: string, 
    role: UserRole, 
    discipline?: string, 
    phone?: string,
    shift?: string,
    birthDay?: number,
    birthMonth?: number
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          discipline: discipline || null,
          phone: phone || null,
          shift: shift || null,
          birth_day: birthDay || null,
          birth_month: birthMonth || null,
        },
      },
    });
    if (error) throw error;

    if (data.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          email,
          role,
          discipline: discipline || null,
          phone: phone || null,
          shift: shift || null,
          birth_day: birthDay || null,
          birth_month: birthMonth || null,
        });
      } catch (upsertErr) {
        console.warn('Upsert de perfil gerenciado pelo trigger ou schema:', upsertErr);
      }
    }

    return data;
  },

  async updateTeacherProfile(teacherId: string, updates: Partial<Profile>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', teacherId);

    if (error) {
      console.warn('Erro ao atualizar perfil do professor:', error.message);
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getTeachers(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'professor')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data as Profile[];
  },

  async getPedagogas(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['pedagoga', 'admin'])
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data as Profile[];
  }
};
