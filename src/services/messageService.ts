import { supabase } from '../lib/supabaseClient';
import { Message } from '../types/database.types';

export const messageService = {
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
    return (data || []) as Message[];
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

  // Marcar mensagens como lidas
  async markAsRead(messageIds: string[]): Promise<void> {
    if (!messageIds.length) return;
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .in('id', messageIds);

    if (error) throw error;
  }
};
