import { supabase } from '../lib/supabaseClient';
import { AppNotification, NotificationType } from '../types/database.types';

export const notificationService = {
  // Buscar notificações do usuário autenticado
  async getNotifications(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    return (data || []) as AppNotification[];
  },

  // Criar notificação (para avisos de devolução, pendência de prazo, etc.)
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'system',
    linkUrl?: string
  ): Promise<AppNotification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        link_url: linkUrl || null,
        read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AppNotification;
  },

  // Marcar como lida
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Marcar todas como lidas
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);

    if (error) throw error;
  }
};
