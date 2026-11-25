import React, { useState, useEffect } from 'react';
import { X, Send, User, MessageSquare, Loader2, Clock, CheckCheck } from 'lucide-react';
import { Profile, Message } from '../../types/database.types';
import { messageService } from '../../services/messageService';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: Profile | null;
}

export const MessagesModal: React.FC<MessagesModalProps> = ({
  isOpen,
  onClose,
  targetUser: initialTargetUser,
}) => {
  const { user, profile } = useAuth();
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [selectedContact, setSelectedContact] = useState<Profile | null>(initialTargetUser || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && initialTargetUser) {
      setSelectedContact(initialTargetUser);
    }
  }, [isOpen, initialTargetUser]);

  // Carrega lista de contatos possíveis de acordo com o perfil
  useEffect(() => {
    if (!isOpen || !user) return;

    const loadContacts = async () => {
      setLoading(true);
      try {
        const contactList =
          profile?.role === 'pedagoga' || profile?.role === 'admin'
            ? await authService.getTeachers()
            : await authService.getPedagogas();
        setContacts(contactList);

        if (!initialTargetUser && contactList.length > 0) {
          // Prioriza selecionar automaticamente o contato que enviou mensagem não lida
          let preferred = selectedContact && contactList.some(c => c.id === selectedContact.id)
            ? selectedContact
            : contactList[0];

          try {
            const allMsgs = await messageService.getMessages();
            const unreadSenderIds = new Set(
              allMsgs
                .filter(
                  (m) =>
                    m.recipient_id === user.id &&
                    m.sender_id !== user.id &&
                    !messageService.isMessageRead(m, user.id)
                )
                .map((m) => m.sender_id)
            );
            const unreadContact = contactList.find((c) => unreadSenderIds.has(c.id));
            if (unreadContact) preferred = unreadContact;
          } catch {
            // mantém contato padrão
          }

          setSelectedContact(preferred);
        }
      } catch (err) {
        console.error('Erro ao carregar contatos:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [isOpen, user, profile]);

  // Carrega histórico de mensagens com o contato selecionado
  const loadConversation = async () => {
    if (!user || !selectedContact) return;
    try {
      const allMsgs = await messageService.getMessages();
      // Filtra estritamente as trocadas entre o usuário atual e o contato selecionado
      const filtered = allMsgs.filter(
        m => (m.sender_id === user.id && m.recipient_id === selectedContact.id) ||
             (m.sender_id === selectedContact.id && m.recipient_id === user.id)
      );
      setMessages(filtered);

      // Marca as recebidas não lidas como lidas (no Supabase e localmente)
      const unreadIds = filtered
        .filter(m => m.recipient_id === user.id && !messageService.isMessageRead(m, user.id))
        .map(m => m.id);
      if (unreadIds.length > 0) {
        await messageService.markAsRead(unreadIds, user.id);
      }
    } catch (err) {
      console.error('Erro ao buscar conversa:', err);
    }
  };

  useEffect(() => {
    if (isOpen && selectedContact) {
      loadConversation();
      const interval = setInterval(loadConversation, 5000); // Polling leve a cada 5s
      return () => clearInterval(interval);
    }
  }, [isOpen, selectedContact, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedContact || !newContent.trim()) return;

    setSending(true);
    try {
      const sent = await messageService.sendMessage(
        user.id,
        selectedContact.id,
        newContent.trim()
      );
      setMessages(prev => [...prev, sent]);
      setNewContent('');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[600px] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Topo Geral */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Canal de Mensagens Privadas</h3>
              <p className="text-[11px] text-slate-500">Comunicação segura e sigilosa entre Professor e Coordenação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Divisão Principal: Lista de Contatos e Chat */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Coluna da Esquerda: Contatos */}
          <div className="w-1/3 border-r border-slate-200 bg-slate-50/50 flex flex-col">
            <div className="p-3 border-b border-slate-200 bg-white">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {profile?.role === 'pedagoga' ? 'Professores' : 'Coordenação Pedagógica'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-blue-600" />
                  Carregando contatos...
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Nenhum contato encontrado.
                </div>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-3 text-left flex items-start space-x-3 transition-colors ${
                      selectedContact?.id === contact.id ? 'bg-blue-50 border-r-2 border-blue-600' : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 text-xs font-bold">
                      {contact.full_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{contact.full_name}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {contact.discipline || (contact.role === 'pedagoga' ? 'Pedagoga' : 'Professor')}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Coluna da Direita: Área da Conversa */}
          <div className="flex-1 flex flex-col bg-white">
            {selectedContact ? (
              <>
                {/* Header do Chat */}
                <div className="px-5 py-3 border-b border-slate-200 flex items-center space-x-3 bg-white">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {selectedContact.full_name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800">{selectedContact.full_name}</h4>
                    <span className="text-[10px] text-slate-500">
                      {selectedContact.role === 'pedagoga' ? 'Pedagoga Geral' : `Professor de ${selectedContact.discipline || 'Ensino'}`}
                    </span>
                  </div>
                </div>

                {/* Balões de Mensagem */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                      <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                      <span>Nenhuma mensagem nesta conversa ainda.</span>
                      <span className="text-[11px] text-slate-400 mt-1">Envie uma mensagem abaixo para iniciar.</span>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <div className={`flex items-center justify-end space-x-1 mt-1 text-[9px] ${
                              isMe ? 'text-blue-100' : 'text-slate-400'
                            }`}>
                              <span>
                                {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && (
                                <CheckCheck className={`w-3 h-3 ${msg.read ? 'text-emerald-300' : 'text-blue-200'}`} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Caixa de Digitação */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 flex items-center space-x-2 bg-white">
                  <input
                    type="text"
                    placeholder={`Escrever mensagem para ${selectedContact.full_name}...`}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="flex-1 px-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newContent.trim()}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Selecione um contato ao lado para visualizar a conversa.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
