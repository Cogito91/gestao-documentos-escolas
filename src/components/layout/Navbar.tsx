import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  GraduationCap, 
  LogOut, 
  Bell, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Settings,
  Calendar,
  Cake,
  UserPlus,
  Menu,
  X,
  BookOpen,
  Layers
} from 'lucide-react';
import { AppNotification } from '../../types/database.types';

interface NavbarProps {
  notifications: AppNotification[];
  unreadMessagesCount: number;
  birthdaysCountThisMonth: number;
  onOpenMessages: () => void;
  onOpenSettings?: () => void;
  onOpenTeachers?: () => void;
  onOpenCalendar: () => void;
  onOpenBirthdays: () => void;
  onOpenMyActivities?: () => void;
  onOpenDiarioDeBordo?: () => void;
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllNotificationsAsRead: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  notifications,
  unreadMessagesCount,
  birthdaysCountThisMonth,
  onOpenMessages,
  onOpenSettings,
  onOpenTeachers,
  onOpenCalendar,
  onOpenBirthdays,
  onOpenMyActivities,
  onOpenDiarioDeBordo,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
}) => {
  const { profile, signOut, simulationMode, enterSimulation } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.read);
  const isPedagoga = profile?.role === 'pedagoga' || profile?.role === 'admin';

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'pedagoga':
        return <span className="bg-purple-100 text-purple-700 font-semibold text-xs px-2.5 py-0.5 rounded-full border border-purple-200">Pedagoga</span>;
      case 'admin':
        return <span className="bg-red-100 text-red-700 font-semibold text-xs px-2.5 py-0.5 rounded-full border border-red-200">Administrador</span>;
      default:
        return <span className="bg-blue-100 text-blue-700 font-semibold text-xs px-2.5 py-0.5 rounded-full border border-blue-200">Professor</span>;
    }
  };

  return (
    <>
    {simulationMode ? (
      <div className="bg-emerald-900 text-emerald-50 px-3 py-1.5 text-[11px] flex items-center justify-between gap-2 flex-wrap">
        <span className="font-bold">
          Modo Simulação: {simulationMode === 'pedagoga' ? 'Pedagoga (18 Profs Manhã/Tarde)' : 'Prof. de Inglês — Manhã (1º Bim 100%)'}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => enterSimulation(simulationMode === 'pedagoga' ? 'ingles_manha' : 'pedagoga')}
            className="px-2 py-0.5 rounded-md bg-white text-emerald-900 font-extrabold hover:bg-emerald-100 transition"
          >
            {simulationMode === 'pedagoga' ? 'Ir para Prof. Inglês (1º Bim)' : 'Ir para Pedagoga (18 Profs)'}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="px-2 py-0.5 rounded-md bg-emerald-800 hover:bg-emerald-700 text-white font-bold transition"
          >
            Sair
          </button>
        </div>
      </div>
    ) : isPedagoga ? (
      <div className="bg-slate-900 text-slate-100 px-3 py-1.5 text-[11px] flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold text-slate-300">
          Ambiente real ativo (mostrando apenas cadastros reais do banco).
        </span>
        <button
          type="button"
          onClick={() => enterSimulation('pedagoga')}
          className="px-2.5 py-0.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold transition shrink-0"
        >
          Ativar Simulação (18 Profs Manhã/Tarde)
        </button>
      </div>
    ) : null}
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="px-3">
        <div className="flex justify-between h-14 items-center gap-2">
          
          {/* Botão Menu Lateral Esquerdo + Logo */}
          <div className="flex items-center space-x-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition shrink-0"
              title="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm text-slate-900 tracking-tight truncate block">E.M. Antônio Matias</span>
              <p className="text-[10px] text-slate-500 truncate">Gestão Pedagógica</p>
            </div>
          </div>

          {/* Menus Centrais ocultos no layout mobile-first */}
          <div className="hidden">
            {/* Calendário Escolar */}
            <button
              onClick={onOpenCalendar}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Calendário</span>
            </button>

            {/* Aniversariantes do Mês */}
            <button
              onClick={onOpenBirthdays}
              className="relative flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
            >
              <Cake className="w-4 h-4 text-rose-500" />
              <span>Aniversariantes</span>
              {birthdaysCountThisMonth > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-bold">
                  {birthdaysCountThisMonth}
                </span>
              )}
            </button>

            {/* Menus Exclusivos da Pedagoga */}
            {isPedagoga && (
              <>
                <button
                  onClick={onOpenTeachers}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                >
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span>Professores & Horários</span>
                </button>

                <button
                  onClick={onOpenSettings}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                >
                  <Settings className="w-4 h-4 text-purple-600" />
                  <span>Configurar Prazos</span>
                </button>
              </>
            )}
          </div>

          {/* Ações do Usuário: Notificações, Mensagens, Perfil e Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Botão Mobile para Aniversários */}
            <button
              onClick={onOpenBirthdays}
              className="lg:hidden p-2 text-rose-600 hover:bg-rose-50 rounded-lg relative"
              title="Aniversariantes do Mês"
            >
              <Cake className="w-5 h-5" />
              {birthdaysCountThisMonth > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            {/* Botão Mobile para Calendário */}
            <button
              onClick={onOpenCalendar}
              className="lg:hidden p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Calendário Escolar"
            >
              <Calendar className="w-5 h-5" />
            </button>

            {/* Botão de Mensagens Privadas */}
            <button
              onClick={onOpenMessages}
              className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Mensagens Privadas"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            {/* Menu Dropdown de Notificações */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notificações e Avisos"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="fixed right-3 top-14 w-[calc(100vw-24px)] max-w-xs bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-slate-800">Notificações</span>
                      {unreadNotifications.length > 0 && (
                        <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">
                          {unreadNotifications.length} nova(s)
                        </span>
                      )}
                    </div>
                    {unreadNotifications.length > 0 && (
                      <button
                        onClick={onMarkAllNotificationsAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-sm">
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => onMarkNotificationAsRead(notif.id)}
                          className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start space-x-3 ${
                            !notif.read ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {notif.type === 'document_status' ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : notif.type === 'deadline_warning' ? (
                              <Clock className="w-4 h-4 text-amber-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800">{notif.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 self-center" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Divisor */}
            <div className="h-6 w-px bg-slate-200" />

            {/* Informações do Usuário */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-800 leading-tight">
                  {profile?.full_name || 'Usuário'}
                </span>
                <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                  {getRoleBadge(profile?.role)}
                  {profile?.discipline && (
                    <span className="text-xs text-slate-500">• {profile.discipline}</span>
                  )}
                </div>
              </div>

              {/* Botão de Sair */}
              <button
                onClick={signOut}
                className="flex items-center space-x-1 p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sair do Sistema"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline text-xs font-medium">Sair</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>

    {/* Menu Lateral Esquerdo (Drawer Mobile-First) */}
    {isDrawerOpen && (
      <div className="fixed inset-0 z-50 flex">
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setIsDrawerOpen(false)}
        />
        <aside className="relative w-72 max-w-[82vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-fadeIn">
          {/* Cabeçalho do Menu */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{profile?.full_name || 'Usuário'}</p>
              <p className="text-[11px] text-blue-100 truncate">
                {isPedagoga ? 'Pedagoga / Coordenação' : `Professor(a) • ${profile?.discipline || 'Geral'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Opções Principais */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {isPedagoga && onOpenTeachers && (
              <button
                type="button"
                onClick={() => { setIsDrawerOpen(false); onOpenTeachers(); }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition text-left"
              >
                <UserPlus className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Professores & Horários</span>
              </button>
            )}

            {isPedagoga && onOpenSettings && (
              <button
                type="button"
                onClick={() => { setIsDrawerOpen(false); onOpenSettings(); }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition text-left"
              >
                <Settings className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Configurar Prazos Finais</span>
              </button>
            )}

            {!isPedagoga && onOpenDiarioDeBordo && (
              <button
                type="button"
                onClick={() => { setIsDrawerOpen(false); onOpenDiarioDeBordo(); }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 transition text-left border border-emerald-200/80"
              >
                <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Diário de Bordo</span>
              </button>
            )}

            {!isPedagoga && onOpenMyActivities && (
              <button
                type="button"
                onClick={() => { setIsDrawerOpen(false); onOpenMyActivities(); }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition text-left"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Minhas Atividades Agendadas</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { setIsDrawerOpen(false); onOpenCalendar(); }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition text-left"
            >
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Calendário Escolar</span>
            </button>

            <button
              type="button"
              onClick={() => { setIsDrawerOpen(false); onOpenBirthdays(); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition text-left"
            >
              <div className="flex items-center space-x-3">
                <Cake className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Aniversariantes do Mês</span>
              </div>
              {birthdaysCountThisMonth > 0 && (
                <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-full font-bold">
                  {birthdaysCountThisMonth}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setIsDrawerOpen(false); onOpenMessages(); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition text-left"
            >
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Mensagens</span>
              </div>
              {unreadMessagesCount > 0 && (
                <span className="px-2 py-0.5 bg-sky-600 text-white text-[10px] rounded-full font-bold">
                  {unreadMessagesCount}
                </span>
              )}
            </button>
          </nav>

          {/* Rodapé do Menu */}
          <div className="p-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => { setIsDrawerOpen(false); signOut(); }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition text-left"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </aside>
      </div>
    )}
    </>
  );
};
