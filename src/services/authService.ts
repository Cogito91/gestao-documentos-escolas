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
      // Fallback seguro: se não encontrar no banco, mantém is_active como false
      const fallbackProfile: Profile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
        email: user.email || '',
        role: (user.user_metadata?.role as UserRole) || 'professor',
        discipline: user.user_metadata?.discipline || null,
        phone: user.user_metadata?.phone || null,
        is_active: false,
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
    role: UserRole = 'professor', 
    discipline?: string, 
    phone?: string,
    shift?: string,
    birthDay?: number,
    birthMonth?: number,
    inviteCode?: string
  ) {
    // Normaliza código de convite
    const normalizedInvite = (inviteCode || '').trim().toUpperCase();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'professor', // Força papel professor para auto-cadastro
          discipline: discipline || null,
          phone: phone || null,
          shift: shift || null,
          birth_day: birthDay || null,
          birth_month: birthMonth || null,
          invite_code: normalizedInvite,
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
          role: 'professor',
          discipline: discipline || null,
          phone: phone || null,
          shift: shift || null,
          birth_day: birthDay || null,
          birth_month: birthMonth || null,
          is_active: false, // Novos professores iniciam inativos aguardando aprovação
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
      throw error;
    }
  },

  async setTeacherActiveStatus(teacherId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', teacherId);

    if (error) {
      console.error('Erro ao alterar status de ativação do professor:', error.message);
      throw error;
    }
  },

  async getSchoolInviteCode(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('get_school_invite_code');
      if (!error && data) {
        return data as string;
      }
    } catch (rpcErr) {
      console.warn('RPC get_school_invite_code não disponível, tentando tabela direta:', rpcErr);
    }

    try {
      const { data, error } = await supabase
        .from('school_security_settings')
        .select('invite_code')
        .eq('id', 'default')
        .maybeSingle();

      if (!error && data?.invite_code) {
        return data.invite_code;
      }
    } catch (tableErr) {
      console.warn('Tabela school_security_settings ainda não criada:', tableErr);
    }

    // Código padrão de fallback
    return 'MATIAS2026';
  },

  async updateSchoolInviteCode(newCode: string): Promise<void> {
    const code = newCode.trim().toUpperCase();
    if (code.length < 4) {
      throw new Error('O código de convite deve ter no mínimo 4 caracteres.');
    }

    try {
      const { error: rpcErr } = await supabase.rpc('update_school_invite_code', { new_code: code });
      if (!rpcErr) return;
      console.warn('RPC falhou, tentando fallback em tabela:', rpcErr.message);
    } catch (e) {
      console.warn('RPC update_school_invite_code não disponível:', e);
    }

    const { error } = await supabase
      .from('school_security_settings')
      .upsert({
        id: 'default',
        school_name: 'E.M. Antônio Matias',
        invite_code: code,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
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
    return (data || []) as Profile[];
  },

  async getPedagogas(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['pedagoga', 'admin'])
      .order('full_name', { ascending: true });

    if (error) throw error;
    return (data || []) as Profile[];
  }
};
