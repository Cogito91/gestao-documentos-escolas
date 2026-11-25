import { supabase } from '../lib/supabaseClient';
import { Message } from '../types/database.types';

const getLocalReadKey = (userId: string) => `read_message_ids_${userId}`;

export const messageService = {
  getLocalReadIds(userId: string): Set<string> {
    try {
      const raw = localStorage.getItem(getLocalReadKey(userId));
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set<string>();
    }
  },

  addLocalReadIds(userId: string, messageIds: string[]): void {
    if (!userId || !messageIds.length) return;
    try {
      const current = this.getLocalReadIds(userId);
      messageIds.forEach((id) => current.add(id));
      localStorage.setItem(getLocalReadKey(userId), JSON.stringify(Array.from(current)));
    } catch {
      // ignora erro de localStorage
    }
  },

  isMessageRead(msg: { id: string; read?: boolean }, userId?: string): boolean {
    if (msg.read) return true;
    if (!userId) return false;
    return this.getLocalReadIds(userId).has(msg.id);
  },

  // Buscar mensagens privadas entre dois usuários (ou todas as conversas do usuário)
  async getMessages(otherUserId?: string): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        recipient:profiles!messages_recipient_id_fkey(*),
        document:documents(*)
      `)
      .order('created_at', { ascending: true });

    if (otherUserId) {
      query = query.or(`and(sender_id.eq.${otherUserId}),and(recipient_id.eq.${otherUserId})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data || []) as Message[]).filter(
      (m) => !m.content?.startsWith('<!--TEACHER_CALENDAR_SYNC')
    );
  },

  // Enviar mensagem privada
  async sendMessage(senderId: string, recipientId: string, content: string, documentId?: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        content,
        document_id: documentId || null,
        read: false,
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        recipient:profiles!messages_recipient_id_fkey(*)
      `)
      .single();

    if (error) throw error;
    return data as Message;
  },

  // Marcar mensagens como lidas (persiste localmente e no Supabase)
  async markAsRead(messageIds: string[], userId?: string): Promise<void> {
    if (!messageIds.length) return;
    if (userId) {
      this.addLocalReadIds(userId, messageIds);
    }
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .in('id', messageIds);

    if (error) {
      console.warn('Aviso ao marcar mensagens como lidas no Supabase:', error.message);
    }
  }
};
