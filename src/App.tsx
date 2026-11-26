import React, { useState, useEffect, useRef } from 'react';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { supabase } from './lib/supabaseClient';
import { sendBrowserNotification } from './lib/browserNotifications';
import { Navbar } from './components/layout/Navbar';
import { AuthModal } from './components/auth/AuthModal';
import { PedagogaDashboard } from './components/dashboard/PedagogaDashboard';
import { ProfessorDashboard } from './components/dashboard/ProfessorDashboard';
import { MessagesModal } from './components/messages/MessagesModal';
import { SettingsModal } from './components/pedagoga/SettingsModal';
import { TeacherManagerModal } from './components/pedagoga/TeacherManagerModal';
import { SchoolCalendarModal } from './components/calendar/SchoolCalendarModal';
import { BirthdaysModal } from './components/birthdays/BirthdaysModal';
import { UnreadMessageNotification } from './components/messages/UnreadMessageNotification';
import { 
  SchoolDocument, 
  DocumentCategory, 
  CustomFolder, 
  Profile, 
  AppNotification,
  SchoolEvent,
  Birthday,
  TeacherSchedule
} from './types/database.types';
import { documentService } from './services/documentService';
import { authService } from './services/authService';
import { notificationService } from './services/notificationService';
import { messageService } from './services/messageService';
import { pedagogicalService } from './services/pedagogicalService';
import { CurriculumViewModal } from './components/curriculum/CurriculumViewModal';
import { PwaStatusBar } from './components/common/PwaStatusBar';
import {
  SIMULATED_CATEGORIES,
  SIMULATED_TEACHERS,
  buildSimulatedDocuments,
  buildSimulatedSchedules,
  buildEnglish1BimDailyLogs,
} from './data/simulatedSchoolData';
import { SEMED_MANAUS_2026_EVENTS } from './data/semedCalendar2026';
import { Loader2, AlertCircle } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, profile, loading: authLoading, simulationMode } = useAuth();

  const [documents, setDocuments] = useState<SchoolDocument[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showUnreadMessageAlert, setShowUnreadMessageAlert] = useState(false);
  const hasPromptedUnreadAlertRef = useRef(false);

  // Novos dados modulares (Etapa 5)
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [schedules, setSchedules] = useState<TeacherSchedule[]>([]);

  // Modais com cache temporário em sessionStorage para restaurar após atualizar
  const [isMessagesOpen, setIsMessagesOpen] = useState(() => sessionStorage.getItem('app_active_modal') === 'messages');
  const [targetMessageUser, setTargetMessageUser] = useState<Profile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => sessionStorage.getItem('app_active_modal') === 'settings');
  const [isTeachersModalOpen, setIsTeachersModalOpen] = useState(() => sessionStorage.getItem('app_active_modal') === 'teachers');
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState<Profile | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(() => sessionStorage.getItem('app_active_modal') === 'calendar');
  const [isBirthdaysOpen, setIsBirthdaysOpen] = useState(() => sessionStorage.getItem('app_active_modal') === 'birthdays');

  // Sincroniza modal aberto no sessionStorage e no histórico do navegador (botão Voltar do celular)
  useEffect(() => {
    const active = isMessagesOpen
      ? 'messages'
      : isSettingsOpen
      ? 'settings'
      : isTeachersModalOpen
      ? 'teachers'
      : isCalendarOpen
      ? 'calendar'
      : isBirthdaysOpen
      ? 'birthdays'
      : null;

    if (active) {
      sessionStorage.setItem('app_active_modal', active);
      window.history.pushState({ modal: active }, '');
    } else {
      sessionStorage.removeItem('app_active_modal');
    }
  }, [isMessagesOpen, isSettingsOpen, isTeachersModalOpen, isCalendarOpen, isBirthdaysOpen]);

  // Intercepta o botão Voltar físico/navegador para fechar modais sem sair do app
  useEffect(() => {
    const handlePopState = () => {
      if (isMessagesOpen || isSettingsOpen || isTeachersModalOpen || isCalendarOpen || isBirthdaysOpen) {
        setIsMessagesOpen(false);
        setIsSettingsOpen(false);
        setIsTeachersModalOpen(false);
        setIsCalendarOpen(false);
        setIsBirthdaysOpen(false);
        setTargetMessageUser(null);
        setSelectedTeacherForSchedule(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMessagesOpen, isSettingsOpen, isTeachersModalOpen, isCalendarOpen, isBirthdaysOpen]);

  const [loadingData, setLoadingData] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const [dbStatusWarning, setDbStatusWarning] = useState<string | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const messagesInitializedRef = useRef(false);

  const loadAllData = async () => {
    if (!user) return;
    if (!hasLoadedOnceRef.current) {
      setLoadingData(true);
    }
    setDbStatusWarning(null);

    if (simulationMode) {
      const simCats = SIMULATED_CATEGORIES;
      const simSchedules = buildSimulatedSchedules();
      const simDocs = buildSimulatedDocuments(simCats);
      setCategories(simCats);
      setEvents(SEMED_MANAUS_2026_EVENTS);
      setBirthdays([]);
      setNotifications([]);
      setUnreadMessagesCount(0);

      if (simulationMode === 'pedagoga') {
        setTeachers(SIMULATED_TEACHERS);
        setDocuments(simDocs);
      } else {
        setDocuments(simDocs.filter((d) => d.teacher_id === user.id));
        setSchedules(simSchedules.filter((s) => s.teacher_id === user.id));
        setFolders([]);

        // Garante que o 1º bimestre do Prof. de Inglês esteja 100% lançado no Diário de Bordo
        try {
          const existingLogs = JSON.parse(localStorage.getItem('teacher_daily_logs') || '[]');
          const englishLogs = buildEnglish1BimDailyLogs(simSchedules);
          const existingIds = new Set(existingLogs.map((l: any) => l.id));
          const mergedLogs = [
            ...existingLogs,
            ...englishLogs.filter((l) => !existingIds.has(l.id)),
          ];
          localStorage.setItem('teacher_daily_logs', JSON.stringify(mergedLogs));
        } catch {
          // ignore
        }
      }

      hasLoadedOnceRef.current = true;
      setLoadingData(false);
      return;
    }

    try {
      // 1. Carrega categorias
      try {
        const cats = await pedagogicalService.getCategories();
        setCategories(cats);
      } catch (err: any) {
        if (err?.code === '42P01' || err?.code === 'PGRST205') {
          setDbStatusWarning('As tabelas do banco de dados ainda precisam ser criadas no SQL Editor do Supabase.');
        }
      }

      // 2. Carrega documentos
      try {
        const docs = await documentService.getDocuments(
          profile?.role !== 'pedagoga' ? { teacherId: user.id } : undefined
        );
        setDocuments(docs);
      } catch (err) {
        console.warn('Documentos não puderam ser carregados:', err);
      }

      // 3. Se professor, carrega pastas pessoais e horários de aula
      if (profile?.role === 'professor') {
        try {
          const fldrs = await documentService.getFolders(user.id);
          setFolders(fldrs);
        } catch (err) {
          console.warn('Pastas não carregadas:', err);
        }

        try {
          const mySchedules = await pedagogicalService.getTeacherSchedules(user.id);
          setSchedules(mySchedules);
        } catch (err) {
          console.warn('Horários não carregados:', err);
        }
      }

      // 4. Se pedagoga ou admin, carrega lista de professores
      if (profile?.role === 'pedagoga' || profile?.role === 'admin') {
        try {
          const tchs = await authService.getTeachers();
          setTeachers(tchs);
        } catch (err) {
          console.warn('Professores não carregados:', err);
        }
      }

      // 5. Carrega calendário escolar e aniversariantes
      try {
        const evts = await pedagogicalService.getSchoolEvents();
        setEvents(evts);
      } catch (err) {
        console.warn('Eventos não carregados:', err);
      }

      try {
        const bdays = await pedagogicalService.getBirthdays();
        setBirthdays(bdays);
      } catch (err) {
        console.warn('Aniversariantes não carregados:', err);
      }

      // 6. Carrega notificações
      try {
        const notifs = await notificationService.getNotifications(user.id);
        setNotifications(notifs);
      } catch (err) {
        console.warn('Notificações não carregadas:', err);
      }

      // 7. Mensagens não lidas
      try {
        const msgs = await messageService.getMessages();
        const myUnread = msgs.filter(
          (m) =>
            m.recipient_id === user.id &&
            m.sender_id !== user.id &&
            !messageService.isMessageRead(m, user.id)
        );
        setUnreadMessagesCount(myUnread.length);
        msgs.forEach(m => seenMessageIdsRef.current.add(m.id));
        messagesInitializedRef.current = true;

        // Se o professor abriu o app e tem mensagem não lida, mostra a cartinha animada
        if (profile?.role === 'professor' && myUnread.length > 0 && !hasPromptedUnreadAlertRef.current) {
          hasPromptedUnreadAlertRef.current = true;
          setShowUnreadMessageAlert(true);
        }
      } catch (err) {
        console.warn('Mensagens não carregadas:', err);
      }

    } finally {
      hasLoadedOnceRef.current = true;
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      loadAllData();
    }
  }, [user, profile]);

  // Escuta novas mensagens da coordenação/pedagoga (Realtime + fallback a cada 20s) e dispara notificação no celular/navegador
  useEffect(() => {
    if (!user || !profile) return;

    const notifyIncomingMessage = (msg: { id: string; content: string; sender_id: string; recipient_id: string; read?: boolean }) => {
      if (msg.recipient_id !== user.id || msg.sender_id === user.id) return;
      if (msg.content?.startsWith('<!--TEACHER_CALENDAR_SYNC')) return;
      if (messageService.isMessageRead(msg, user.id)) return;
      if (seenMessageIdsRef.current.has(msg.id)) return;

      seenMessageIdsRef.current.add(msg.id);
      setUnreadMessagesCount(prev => prev + 1);

      if (profile.role === 'professor') {
        setShowUnreadMessageAlert(true);
      }

      const senderLabel = profile.role === 'professor' ? 'Nova mensagem da Coordenação 💬' : 'Nova mensagem recebida 💬';
      sendBrowserNotification(senderLabel, msg.content, `msg-${msg.id}`);
    };

    const channel = supabase
      .channel(`messages-notify-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as { id: string; content: string; sender_id: string; recipient_id: string; read?: boolean };
          if (newMsg) notifyIncomingMessage(newMsg);
        }
      )
      .subscribe();

    const pollInterval = setInterval(async () => {
      if (!messagesInitializedRef.current) return;
      try {
        const msgs = await messageService.getMessages();
        const myUnread = msgs.filter(
          (m) =>
            m.recipient_id === user.id &&
            m.sender_id !== user.id &&
            !messageService.isMessageRead(m, user.id)
        );
        setUnreadMessagesCount(myUnread.length);
        myUnread.forEach(m => notifyIncomingMessage(m));
      } catch {
        // Ignora falhas silenciosas de polling
      }
    }, 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user, profile]);

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    if (!user) return;
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenMessagesWithTeacher = (teacher: Profile) => {
    setTargetMessageUser(teacher);
    setIsMessagesOpen(true);
  };

  const handleOpenTeacherManager = (teacher?: Profile) => {
    setSelectedTeacherForSchedule(teacher || null);
    setIsTeachersModalOpen(true);
  };

  // Contagem de aniversariantes no mês atual
  const currentMonth = new Date().getMonth() + 1;
  const birthdaysThisMonth = birthdays.filter(b => b.birth_month === currentMonth).length;

  const isStandaloneMatriz = new URLSearchParams(window.location.search).get('matriz') === 'standalone';
  const standaloneMateria = new URLSearchParams(window.location.search).get('materia');

  if (isStandaloneMatriz) {
    return (
      <div className="w-screen h-screen bg-slate-900 overflow-hidden flex flex-col">
        <CurriculumViewModal
          isOpen={true}
          onClose={() => window.close()}
          userDiscipline={standaloneMateria}
          standalone={true}
        />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-3" />
        <h2 className="text-lg font-bold">Carregando Sistema Escolar...</h2>
        <p className="text-xs text-slate-400 mt-1">Conectando ao banco de dados Supabase...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 md:bg-slate-800 md:py-6 md:px-4 flex items-center justify-center">
        <div className="w-full max-w-[430px] min-h-screen md:min-h-[820px] md:max-h-[92vh] md:rounded-[2.5rem] md:border-[10px] md:border-slate-950 md:shadow-2xl md:overflow-y-auto bg-slate-900">
          <AuthModal />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 md:bg-slate-800 md:py-6 md:px-4 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen md:min-h-[820px] md:max-h-[92vh] md:rounded-[2.5rem] md:border-[10px] md:border-slate-950 md:shadow-2xl md:overflow-y-auto overflow-x-hidden bg-slate-50 text-slate-800 flex flex-col relative">
      
      {/* Barra de Navegação Superior */}
      <Navbar
        notifications={notifications}
        unreadMessagesCount={unreadMessagesCount}
        birthdaysCountThisMonth={birthdaysThisMonth}
        onOpenMessages={() => {
          setTargetMessageUser(null);
          setIsMessagesOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTeachers={() => handleOpenTeacherManager()}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenBirthdays={() => setIsBirthdaysOpen(true)}
        onOpenMyActivities={() => {
          // Dispara evento customizado para o ProfessorDashboard abrir o modal de atividades
          window.dispatchEvent(new CustomEvent('open_my_activities_modal'));
        }}
        onOpenDiarioDeBordo={() => {
          // Dispara evento customizado para o ProfessorDashboard abrir o Diário de Bordo
          window.dispatchEvent(new CustomEvent('open_diario_de_bordo_modal'));
        }}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
      />

      {/* Banner Informativo se houver pendência de SQL */}
      {dbStatusWarning && (
        <div className="bg-amber-500 text-white px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-between shadow">
          <div className="max-w-7xl mx-auto flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>
              <strong>Atenção:</strong> {dbStatusWarning}
            </span>
          </div>
          <button
            onClick={() => loadAllData()}
            className="px-3 py-1 bg-white text-amber-800 font-bold rounded-lg text-xs hover:bg-amber-50 transition ml-2"
          >
            Verificar Novamente
          </button>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs font-semibold">Atualizando dados escolares...</p>
          </div>
        ) : profile?.role === 'pedagoga' || profile?.role === 'admin' ? (
          <PedagogaDashboard
            documents={documents}
            teachers={teachers}
            categories={categories}
            birthdays={birthdays}
            onRefresh={loadAllData}
            onOpenMessagesWithTeacher={handleOpenMessagesWithTeacher}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenTeachers={handleOpenTeacherManager}
            onOpenCalendar={() => setIsCalendarOpen(true)}
            onOpenBirthdays={() => setIsBirthdaysOpen(true)}
          />
        ) : (
          <ProfessorDashboard
            documents={documents}
            categories={categories}
            folders={folders}
            birthdays={birthdays}
            schedules={schedules}
            events={events}
            onRefresh={loadAllData}
            onOpenMessages={() => {
              setTargetMessageUser(null);
              setIsMessagesOpen(true);
            }}
            onOpenCalendar={() => setIsCalendarOpen(true)}
            onOpenBirthdays={() => setIsBirthdaysOpen(true)}
          />
        )}
      </main>

      {/* Modais da Aplicação */}

      {/* 1. Modal de Mensagens Privadas */}
      <MessagesModal
        isOpen={isMessagesOpen}
        onClose={() => {
          setIsMessagesOpen(false);
          setTargetMessageUser(null);
          loadAllData();
        }}
        targetUser={targetMessageUser}
      />

      {/* 2. Modal de Configurações de Prazos & Categorias (Pedagoga) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        categories={categories}
        onRefresh={loadAllData}
      />

      {/* 3. Modal de Professores & Horários de Aula (Pedagoga) */}
      <TeacherManagerModal
        isOpen={isTeachersModalOpen}
        onClose={() => {
          setIsTeachersModalOpen(false);
          setSelectedTeacherForSchedule(null);
        }}
        teachers={teachers}
        onRefresh={loadAllData}
        initialTeacher={selectedTeacherForSchedule}
      />

      {/* 4. Modal de Calendário Escolar (Pedagoga e Professor) */}
      <SchoolCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        events={events}
        onRefresh={loadAllData}
        canEdit={profile?.role === 'pedagoga' || profile?.role === 'admin'}
      />

      {/* 5. Modal de Aniversariantes do Mês (Pedagoga e Professor) */}
      <BirthdaysModal
        isOpen={isBirthdaysOpen}
        onClose={() => setIsBirthdaysOpen(false)}
        birthdays={birthdays}
        onRefresh={loadAllData}
        canEdit={profile?.role === 'pedagoga' || profile?.role === 'admin'}
      />

      {/* 6. Notificação lúdica de cartinha com mensagem nova para o professor */}
      {showUnreadMessageAlert && unreadMessagesCount > 0 && (
        <UnreadMessageNotification
          unreadCount={unreadMessagesCount}
          onClose={() => setShowUnreadMessageAlert(false)}
          onOpen={() => {
            setShowUnreadMessageAlert(false);
            setTargetMessageUser(null);
            setIsMessagesOpen(true);
          }}
        />
      )}

      {/* Rodapé Institucional */}
      <footer className="bg-white border-t border-slate-200 py-3 mt-auto">
        <div className="px-4 text-center text-[11px] text-slate-400">
          E.M. Antônio Matias • Gestão Pedagógica
        </div>
      </footer>

      <PwaStatusBar />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
