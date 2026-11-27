import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  RotateCcw, 
  User, 
  Search, 
  MessageSquare, 
  AlertCircle, 
  ExternalLink,
  Settings,
  Calendar,
  Cake,
  UserPlus,
  Check,
  X as XIcon,
  Layers,
  Printer,
  FileCheck2,
  BookOpen,
  Users,
  Grid,
  ShieldCheck,
  UserCheck,
  UserX,
  Loader2
} from 'lucide-react';
import { SchoolDocument, Profile, DocumentCategory, DocumentStatus, Birthday } from '../../types/database.types';
import { authService } from '../../services/authService';
import { ReviewModal } from '../documents/ReviewModal';
import { DocumentThumbnail } from '../documents/DocumentThumbnail';
import { CurriculumViewModal } from '../curriculum/CurriculumViewModal';
import { ClassroomMappingModal } from '../classroom/ClassroomMappingModal';
import { notificationService } from '../../services/notificationService';
import { formatDeadlineLabel, formatAbsenceDateLabel } from '../../lib/utils';

interface PedagogaDashboardProps {
  documents: SchoolDocument[];
  teachers: Profile[];
  categories: DocumentCategory[];
  birthdays: Birthday[];
  onRefresh: () => void;
  onOpenMessagesWithTeacher: (teacher: Profile) => void;
  onOpenSettings: () => void;
  onOpenTeachers: (teacher?: Profile) => void;
  onOpenCalendar: () => void;
  onOpenBirthdays: () => void;
}

export const PedagogaDashboard: React.FC<PedagogaDashboardProps> = ({
  documents,
  teachers,
  categories,
  birthdays,
  onRefresh,
  onOpenMessagesWithTeacher,
  onOpenSettings,
  onOpenTeachers,
  onOpenCalendar,
  onOpenBirthdays,
}) => {
  const [selectedDocForReview, setSelectedDocForReview] = useState<SchoolDocument | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(() => {
    return new URLSearchParams(window.location.search).get('matriz') === 'true';
  });
  const [isClassroomMappingOpen, setIsClassroomMappingOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<'matrix' | 'inadimplentes' | 'teachers' | 'emergency' | 'certificates' | 'occurrences'>(() => {
    const saved = sessionStorage.getItem('pedagoga_active_tab');
    if (saved && ['matrix', 'inadimplentes', 'teachers', 'emergency', 'certificates', 'occurrences'].includes(saved)) {
      return saved as any;
    }
    return 'matrix';
  });

  const setActiveTab = (tab: 'matrix' | 'inadimplentes' | 'teachers' | 'emergency' | 'certificates' | 'occurrences') => {
    setActiveTabState(tab);
    sessionStorage.setItem('pedagoga_active_tab', tab);
  };

  // Entregas do mês atual
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentMonthLabel = monthNames[currentMonthIdx];
  const monthlyDocsCount = documents.filter((d) => {
    if (!d.submitted_at) return false;
    const dt = new Date(d.submitted_at);
    return dt.getMonth() === currentMonthIdx && dt.getFullYear() === currentYear;
  }).length;

  // Professores inadimplentes (com documentos obrigatórios faltando)
  const inadimplentesList = teachers
    .map((t) => {
      const teacherDocs = documents.filter((d) => d.teacher_id === t.id && (!d.special_kind || d.special_kind === 'regular'));
      const missingCategories = categories.filter(
        (cat) => !teacherDocs.some((d) => d.category_id === cat.id)
      );
      return {
        teacher: t,
        missingCategories,
      };
    })
    .filter((item) => item.missingCategories.length > 0);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Filtros do Quadro de Professores (Nome, Matéria e Turno)
  const [teacherSearchName, setTeacherSearchName] = useState('');
  const [teacherSearchSubject, setTeacherSearchSubject] = useState('');
  const [teacherSearchShift, setTeacherSearchShift] = useState<string>('all');

  const filteredTeachersList = teachers.filter((t) => {
    const matchesName =
      !teacherSearchName.trim() ||
      (t.full_name || '').toLowerCase().includes(teacherSearchName.trim().toLowerCase());
    const matchesSubject =
      !teacherSearchSubject.trim() ||
      (t.discipline || '').toLowerCase().includes(teacherSearchSubject.trim().toLowerCase());
    const matchesShift =
      teacherSearchShift === 'all' ||
      (t.shift || '').toLowerCase().includes(teacherSearchShift.toLowerCase());
    return matchesName && matchesSubject && matchesShift;
  });

  // Notificar pendência
  const [notifyingTeacher, setNotifyingTeacher] = useState<Profile | null>(null);
  const [pendingNoticeTitle, setPendingNoticeTitle] = useState('Cobrança de Documento Pendente');
  const [pendingNoticeMsg, setPendingNoticeMsg] = useState('');
  const [sendingNotice, setSendingNotice] = useState(false);

  // Aniversariantes do mês atual
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();
  const thisMonthBirthdays = birthdays.filter(b => b.birth_month === currentMonth);
  const todayBirthdays = thisMonthBirthdays.filter(b => b.birth_day === currentDay);

  // Métricas
  const emergencyDocs = documents.filter(d => d.special_kind === 'emergencial');
  const certificateDocs = documents.filter(d => d.special_kind === 'atestado');
  const occurrenceDocs = documents.filter(d => d.special_kind === 'ocorrencia');
  const totalDocs = documents.length;
  const pendingDocs = documents.filter(d => d.status === 'pendente').length;
  const approvedDocs = documents.filter(d => d.status === 'aprovado').length;
  const returnedDocs = documents.filter(d => d.status === 'devolvido').length;

  // Professores aguardando aprovação
  const pendingTeachers = teachers.filter(t => t.is_active === false);
  const [processingTeacherId, setProcessingTeacherId] = useState<string | null>(null);

  const handleToggleTeacherApproval = async (teacher: Profile, shouldApprove: boolean) => {
    const actionLabel = shouldApprove ? 'aprovar' : 'bloquear';
    if (!confirm(`Deseja realmente ${actionLabel} o acesso do(a) professor(a) "${teacher.full_name}"?`)) {
      return;
    }

    setProcessingTeacherId(teacher.id);
    try {
      await authService.setTeacherActiveStatus(teacher.id, shouldApprove);
      onRefresh();
    } catch (err: any) {
      alert(`Erro ao ${actionLabel} acesso: ` + err.message);
    } finally {
      setProcessingTeacherId(null);
    }
  };

  // Filtragem dos documentos
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.teacher?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesTeacher = teacherFilter === 'all' || doc.teacher_id === teacherFilter;
    const matchesCategory = categoryFilter === 'all' || doc.category_id === categoryFilter;
    return matchesSearch && matchesStatus && matchesTeacher && matchesCategory;
  });

  const handleSendPendingNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyingTeacher || !pendingNoticeMsg.trim()) return;

    setSendingNotice(true);
    try {
      await notificationService.createNotification(
        notifyingTeacher.id,
        pendingNoticeTitle,
        pendingNoticeMsg.trim(),
        'deadline_warning'
      );
      setNotifyingTeacher(null);
      setPendingNoticeMsg('');
      alert(`Notificação enviada com sucesso para ${notifyingTeacher.full_name}!`);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao enviar notificação: ' + err.message);
    } finally {
      setSendingNotice(false);
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'aprovado':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>Aprovado</span>
          </span>
        );
      case 'devolvido':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <RotateCcw className="w-3 h-3 text-rose-600" />
            <span>Devolvido</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pendente</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner de Solicitações de Cadastro Pendentes */}
      {pendingTeachers.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-2xl p-4 shadow-lg border border-amber-300/40 animate-fadeIn">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <ShieldCheck className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">
                  {pendingTeachers.length} Solicitaç{pendingTeachers.length === 1 ? 'ão' : 'ões'} de Cadastro Pendente{pendingTeachers.length === 1 ? '' : 's'}
                </h3>
                <p className="text-xs text-amber-100">
                  Professores que se registraram e aguardam autorização da Pedagoga para acessar os dados da escola.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-amber-900 shadow-sm">
              Segurança Ativa
            </span>
          </div>

          <div className="space-y-2 mt-2">
            {pendingTeachers.map((teacher) => (
              <div 
                key={teacher.id}
                className="bg-white/95 text-slate-800 p-3 rounded-xl flex items-center justify-between gap-2 flex-wrap shadow-sm"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>{teacher.full_name}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Pendente
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>✉ {teacher.email}</span>
                    <span>•</span>
                    <span>📚 {teacher.discipline || 'Disciplina não informada'}</span>
                    {teacher.phone && (
                      <>
                        <span>•</span>
                        <span>📱 {teacher.phone}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={processingTeacherId === teacher.id}
                    onClick={() => handleToggleTeacherApproval(teacher, true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1 disabled:opacity-50"
                  >
                    {processingTeacherId === teacher.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Aprovar Acesso</span>
                  </button>
                  <button
                    type="button"
                    disabled={processingTeacherId === teacher.id}
                    onClick={() => handleToggleTeacherApproval(teacher, false)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 active:scale-95 text-slate-600 font-semibold text-xs rounded-xl transition flex items-center gap-1 disabled:opacity-50"
                    title="Manter bloqueado"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Bloquear</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {thisMonthBirthdays.length > 0 && (
        <div 
          onClick={onOpenBirthdays}
          className="cursor-pointer bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white rounded-2xl p-4 shadow-md flex items-center justify-between hover:opacity-95 transition"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Cake className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm">Mural de Aniversariantes do Mês ({thisMonthBirthdays.length})</span>
                {todayBirthdays.length > 0 && (
                  <span className="bg-amber-300 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    🎉 Aniversário Hoje!
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                {todayBirthdays.length > 0 ? (
                  <strong>Parabéns hoje para: {todayBirthdays.map(b => b.name).join(', ')}!</strong>
                ) : (
                  <span>Próximos: {thisMonthBirthdays.slice(0, 3).map(b => `${b.name} (Dia ${b.birth_day})`).join(' • ')}</span>
                )}
              </p>
            </div>
          </div>
          <span className="text-xs bg-white text-rose-700 font-bold px-3 py-1.5 rounded-xl shadow-sm hidden sm:inline-block">
            Abrir Mural
          </span>
        </div>
      )}

      {/* Barra de Ações Rápidas da Pedagoga (Mobile-First) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div>
          <h2 className="font-bold text-slate-800 text-base">Painel de Supervisão Pedagógica</h2>
          <p className="text-xs text-slate-500 mt-0.5">Acompanhamento de quem já enviou e o que falta enviar no bimestre</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpenTeachers()}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Cadastrar Professor</span>
          </button>

          <button
            onClick={() => onOpenTeachers()}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Gerir Professores</span>
          </button>

          <button
            onClick={() => setIsClassroomMappingOpen(true)}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-gradient-to-r from-indigo-700 to-blue-700 hover:from-indigo-800 hover:to-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition col-span-2"
            title="Mapeamento de Sala de Aula: definir fileiras, carteiras e indicar professor regente"
          >
            <Grid className="w-4 h-4 text-sky-300 shrink-0" />
            <span>Mapeamento de Sala & Regentes (Definir Regentes)</span>
          </button>

          <button
            onClick={() => setIsCurriculumModalOpen(true)}
            className="flex items-center justify-center space-x-1.5 px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] rounded-xl border border-blue-200 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Matriz SEMED</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center space-x-1.5 px-2.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-[11px] rounded-xl border border-purple-200 transition"
          >
            <Settings className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="truncate">Prazos Finais</span>
          </button>

          <button
            onClick={onOpenCalendar}
            className="flex items-center justify-center space-x-1.5 px-2.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[11px] rounded-xl border border-sky-200 transition col-span-2"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Calendário Escolar</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo (Mobile-First: Empilhados com respiro) */}
      <div className="grid grid-cols-1 gap-2.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Entregas de {currentMonthLabel}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{monthlyDocsCount}</h3>
            <span className="text-[11px] text-slate-400">Neste mês</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Pendentes de Avaliação</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-0.5">{pendingDocs}</h3>
            <span className="text-[11px] text-amber-600/80">Aguardando seu parecer</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Devolvidos p/ Ajuste</p>
            <h3 className="text-2xl font-bold text-rose-700 mt-0.5">{returnedDocs}</h3>
            <span className="text-[11px] text-rose-600/80">Com apontamentos</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navegação entre Abas (Empilhada verticalmente para mobile) */}
      <div className="flex flex-col space-y-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('inadimplentes')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-colors relative flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'inadimplentes' ? 'text-rose-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Inadimplentes ({inadimplentesList.length})</span>
          {activeTab === 'inadimplentes' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 text-sm font-bold transition-colors relative flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'matrix' ? 'text-purple-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-600" />
          <span>Mapa de Controle de Entregas (Quem já enviou?)</span>
          {activeTab === 'matrix' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('emergency')}
          className={`pb-3 text-sm font-bold transition-colors relative flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'emergency' ? 'text-amber-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Printer className="w-4 h-4 text-amber-600" />
          <span>Atividades Emergenciais ({emergencyDocs.length})</span>
          {activeTab === 'emergency' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          className={`pb-3 text-sm font-bold transition-colors relative flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'certificates' ? 'text-teal-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-teal-600" />
          <span>Atestados e Declarações ({certificateDocs.length})</span>
          {activeTab === 'certificates' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('occurrences')}
          className={`pb-3 text-sm font-bold transition-colors relative flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'occurrences' ? 'text-rose-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>Ocorrências ({occurrenceDocs.length})</span>
          {activeTab === 'occurrences' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`pb-3 text-sm font-bold transition-colors relative flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'teachers' ? 'text-purple-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Quadro de Professores ({teachers.length})</span>
          {activeTab === 'teachers' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700 rounded-t-full" />
          )}
        </button>
      </div>

      {/* ABA: PROFESSORES INADIMPLENTES */}
      {activeTab === 'inadimplentes' && (
        <div className="space-y-3">
          {inadimplentesList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Nenhum professor inadimplente!</h4>
              <p className="text-xs text-slate-500 mt-1">Todos os professores entregaram os documentos obrigatórios.</p>
            </div>
          ) : (
            inadimplentesList.map(({ teacher, missingCategories }) => (
              <div key={teacher.id} className="bg-white rounded-2xl border border-rose-200 p-4 shadow-sm space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{teacher.full_name}</h4>
                    <p className="text-xs text-slate-500">{teacher.discipline || 'Professor(a)'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifyingTeacher(teacher);
                      setPendingNoticeMsg(
                        `Olá ${teacher.full_name}, notamos pendência nos seguintes documentos: ${missingCategories
                          .map((c) => c.name)
                          .join(', ')}. Por favor, regularize assim que possível.`
                      );
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shrink-0"
                  >
                    Cobrar ({missingCategories.length})
                  </button>
                </div>
                <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                    Documentos em aberto:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {missingCategories.map((cat) => (
                      <span
                        key={cat.id}
                        className="text-[11px] font-semibold bg-white text-rose-800 border border-rose-200 px-2 py-0.5 rounded-lg"
                      >
                        • {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA 1: DOCUMENTOS ENVIADOS (removida da tela principal) */}
      {false && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por título ou professor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium text-slate-700"
              >
                <option value="all">Todos os Status</option>
                <option value="pendente">Pendentes</option>
                <option value="aprovado">Aprovados</option>
                <option value="devolvido">Devolvidos</option>
              </select>

              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium text-slate-700 max-w-[180px]"
              >
                <option value="all">Todos os Professores</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium text-slate-700"
              >
                <option value="all">Todas Categorias</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredDocuments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600">Nenhum documento encontrado</p>
                <p className="text-xs text-slate-400 mt-1">Nenhum registro corresponde aos filtros selecionados.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Documento & Arquivo</th>
                    <th className="px-5 py-3">Professor / Disciplina</th>
                    <th className="px-5 py-3">Categoria & Prazo</th>
                    <th className="px-5 py-3">Data de Envio</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Ações Pedagógicas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{doc.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-1">
                          <span>📎 {doc.file_name}</span>
                          <span>•</span>
                          <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        {doc.feedback && (
                          <div className="mt-1.5 p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                            <strong>Parecer:</strong> {doc.feedback}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{doc.teacher?.full_name || 'Professor'}</div>
                        <div className="text-[11px] text-slate-500">{doc.teacher?.discipline || 'Geral'}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-medium rounded-md text-xs border border-blue-100">
                          {doc.category?.name || 'Geral'}
                        </span>
                        {doc.category && (
                          <span className="block text-[10px] text-slate-400 mt-1">
                            {formatDeadlineLabel(doc.category)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">
                        {new Date(doc.submitted_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Baixar / Visualizar Arquivo"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <button
                            onClick={() => {
                              setSelectedDocForReview(doc);
                              setIsReviewOpen(true);
                            }}
                            className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold rounded-lg text-xs transition border border-purple-200 shadow-sm"
                          >
                            Dar Parecer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: MAPA DE CONTROLE DE ENTREGAS POR PROFESSOR (O QUE JÁ ENVIOU?) */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Mapa Geral de Entregas do Bimestre</h3>
              <p className="text-xs text-slate-500">
                Acompanhe exatamente quais documentos cada professor já entregou e quem está em débito
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Entregue / Aprovado</span>
              </span>
              <span className="flex items-center space-x-1 text-amber-700 font-semibold">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Em Análise</span>
              </span>
              <span className="flex items-center space-x-1 text-rose-700 font-semibold">
                <XIcon className="w-4 h-4 text-rose-500" />
                <span>Não Entregue</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Professor(a)</th>
                  {categories.map(c => (
                    <th key={c.id} className="px-3 py-3 text-center min-w-[120px]">
                      <span className="block truncate">{c.name}</span>
                      <span className="font-normal text-[10px] text-slate-400 block mt-0.5">
                        {formatDeadlineLabel(c).replace('Prazo Final: ', '')}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={categories.length + 2} className="p-8 text-center text-slate-400">
                      Nenhum professor cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  teachers.map(teacher => {
                    const teacherDocs = documents.filter(d => d.teacher_id === teacher.id);
                    let deliveredCount = 0;

                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          <div>{teacher.full_name}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{teacher.discipline || 'Geral'}</div>
                        </td>

                        {categories.map(c => {
                          const doc = teacherDocs.find(d => d.category_id === c.id);
                          if (doc) deliveredCount++;

                          return (
                            <td key={c.id} className="px-3 py-3 text-center">
                              {doc ? (
                                doc.status === 'aprovado' ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>OK</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 text-amber-700 font-bold text-[10px] rounded-full border border-amber-200">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Enviado</span>
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-rose-50 text-rose-700 font-bold text-[10px] rounded-full border border-rose-200">
                                  <XIcon className="w-3 h-3 text-rose-500" />
                                  <span>Pendente</span>
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-4 py-3 text-right">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            deliveredCount === categories.length && categories.length > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : deliveredCount > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {deliveredCount}/{categories.length} Entregues
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: QUADRO DE PROFESSORES */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          
          <div className="flex flex-col-reverse gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Professores Registrados na Escola</h3>
              <p className="text-xs text-slate-500">Cadastre o corpo docente e defina os horários das aulas</p>
            </div>
            <button
              onClick={() => onOpenTeachers()}
              className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Professor</span>
            </button>
          </div>

          {/* Barra de Busca por Nome, Matéria e Turno */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                <span>Filtrar Professores e Horários</span>
              </span>
              {(teacherSearchName || teacherSearchSubject || teacherSearchShift !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setTeacherSearchName('');
                    setTeacherSearchSubject('');
                    setTeacherSearchShift('all');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Limpar filtros ({filteredTeachersList.length} encontrado{filteredTeachersList.length === 1 ? '' : 's'})
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={teacherSearchName}
                  onChange={(e) => setTeacherSearchName(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <input
                type="text"
                value={teacherSearchSubject}
                onChange={(e) => setTeacherSearchSubject(e.target.value)}
                placeholder="Buscar por matéria / especialidade..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={teacherSearchShift}
                onChange={(e) => setTeacherSearchShift(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos os Turnos</option>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
                <option value="Integral">Integral</option>
              </select>
            </div>
          </div>

          {filteredTeachersList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <p className="text-sm font-bold text-slate-700">Nenhum professor encontrado</p>
              <p className="text-xs text-slate-500 mt-1">
                Tente ajustar os filtros de nome, matéria ou turno.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachersList.map((teacher) => {
              const teacherDocs = documents.filter(d => d.teacher_id === teacher.id);
              const teacherPending = teacherDocs.filter(d => d.status === 'pendente').length;
              const teacherReturned = teacherDocs.filter(d => d.status === 'devolvido').length;

              return (
                <div key={teacher.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {teacher.full_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{teacher.full_name}</h4>
                        <p className="text-xs text-slate-500">{teacher.discipline || 'Professor Regente'}</p>
                        {teacher.email && (
                          <p className="text-[11px] font-semibold text-indigo-600 mt-0.5 break-all select-all flex items-center gap-1" title="Email de login do professor">
                            <span>✉ {teacher.email}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {teacher.shift && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                        {teacher.shift}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Total</span>
                      <span className="font-bold text-slate-800 text-sm">{teacherDocs.length}</span>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-xl">
                      <span className="text-[10px] text-amber-700 block">Pendentes</span>
                      <span className="font-bold text-amber-700 text-sm">{teacherPending}</span>
                    </div>
                    <div className="bg-rose-50 p-2 rounded-xl">
                      <span className="text-[10px] text-rose-700 block">Devolvidos</span>
                      <span className="font-bold text-rose-700 text-sm">{teacherReturned}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onOpenTeachers(teacher)}
                      className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition"
                      title="Editar Horários de Aula"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Horários</span>
                    </button>

                    <button
                      onClick={() => onOpenMessagesWithTeacher(teacher)}
                      className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Mensagem</span>
                    </button>

                    <button
                      onClick={() => {
                        setNotifyingTeacher(teacher);
                        setPendingNoticeMsg(`Olá, Professor(a) ${teacher.full_name}. Favor verificar os prazos de entrega do Plano de Aula e Avaliações.`);
                      }}
                      className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Cobrar</span>
                    </button>
                  </div>

                  {/* Controle de Segurança / Status de Aprovação */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${teacher.is_active !== false ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
                      <span className="text-[11px] font-medium text-slate-600">
                        {teacher.is_active !== false ? 'Acesso Liberado' : 'Aguardando Aprovação'}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={processingTeacherId === teacher.id}
                      onClick={() => handleToggleTeacherApproval(teacher, teacher.is_active === false)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition ${
                        teacher.is_active === false
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200'
                      }`}
                    >
                      {processingTeacherId === teacher.id
                        ? 'Aguarde...'
                        : teacher.is_active === false
                        ? 'Aprovar Acesso'
                        : 'Bloquear Acesso'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}

        </div>
      )}

      {/* ABA 4: ATIVIDADES EMERGENCIAIS */}
      {activeTab === 'emergency' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-amber-50/70 flex items-center space-x-2.5">
            <Printer className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Atividades Emergenciais para Impressão</h3>
              <p className="text-xs text-slate-600">
                Atividades enviadas pelos professores para serem impressas e aplicadas em caso de falta.
              </p>
            </div>
          </div>

          {emergencyDocs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Nenhuma atividade emergencial recebida até o momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {emergencyDocs.map(doc => (
                <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <DocumentThumbnail doc={doc} />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{doc.title}</p>
                        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          {doc.teacher?.full_name || 'Professor'}
                        </span>
                      </div>
                      {doc.absence_dates && doc.absence_dates.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-amber-800">Dias da falta:</span>
                          {doc.absence_dates.map(d => (
                              <span key={d} className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-semibold">
                                📅 {formatAbsenceDateLabel(d)}
                              </span>
                          ))}
                        </div>
                      )}
                      {doc.target_classes && (
                        <p className="text-xs text-slate-600"><strong>Turmas:</strong> {doc.target_classes}</p>
                      )}
                      {doc.description && (
                        <p className="text-xs text-slate-500">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200 flex items-center space-x-1 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir / Imprimir</span>
                    </a>
                    <button
                      onClick={() => {
                        setSelectedDocForReview(doc);
                        setIsReviewOpen(true);
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition"
                    >
                      Analisar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 5: ATESTADOS E DECLARAÇÕES */}
      {activeTab === 'certificates' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-teal-50/70 flex items-center space-x-2.5">
            <FileCheck2 className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Atestados e Declarações Recebidos</h3>
              <p className="text-xs text-slate-600">
                Documentos comprobatórios enviados pelos professores com os respectivos dias de referência.
              </p>
            </div>
          </div>

          {certificateDocs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Nenhum atestado ou declaração recebido até o momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {certificateDocs.map(doc => (
                <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <DocumentThumbnail doc={doc} />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{doc.title}</p>
                        {doc.certificate_type && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                            {doc.certificate_type}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          {doc.teacher?.full_name || 'Professor'}
                        </span>
                      </div>
                      {doc.absence_dates && doc.absence_dates.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-teal-800">Referente ao(s) dia(s):</span>
                          {doc.absence_dates.map(d => (
                              <span key={d} className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 text-[11px] font-semibold">
                                📅 {formatAbsenceDateLabel(d)}
                              </span>
                          ))}
                        </div>
                      )}
                      {doc.description && (
                        <p className="text-xs text-slate-500">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg border border-teal-200 flex items-center space-x-1 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </a>
                    <button
                      onClick={() => {
                        setSelectedDocForReview(doc);
                        setIsReviewOpen(true);
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition"
                    >
                      Validar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 6: OCORRÊNCIAS DE ALUNOS */}
      {activeTab === 'occurrences' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-rose-50/70 flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ocorrências de Alunos em Sala de Aula</h3>
              <p className="text-xs text-slate-600">
                Registros lançados pelos professores por turma, com a ação tomada e encaminhamento.
              </p>
            </div>
          </div>

          {occurrenceDocs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Nenhuma ocorrência registrada até o momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {occurrenceDocs.map(doc => (
                <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{doc.student_name || doc.title}</p>
                        {doc.target_classes && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Turma: {doc.target_classes}
                          </span>
                        )}
                        {doc.occurrence_date && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 text-[11px] font-semibold">
                            📅 {formatAbsenceDateLabel(doc.occurrence_date)}
                          </span>
                        )}
                        {doc.occurrence_time_slot && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                            ⏰ {doc.occurrence_time_slot}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          Prof. {doc.teacher?.full_name || 'Professor'}
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-xs text-slate-700"><strong>Ocorrência:</strong> {doc.description}</p>
                      )}
                      {doc.action_taken && (
                        <p className="text-xs text-rose-800 bg-rose-50/70 inline-block px-2.5 py-1 rounded-lg border border-rose-100">
                          <strong>Ação:</strong> {doc.action_taken}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedDocForReview(doc);
                        setIsReviewOpen(true);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition"
                    >
                      Acompanhar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Avaliação / Parecer */}
      <ReviewModal
        isOpen={isReviewOpen}
        document={selectedDocForReview}
        onClose={() => {
          setIsReviewOpen(false);
          setSelectedDocForReview(null);
        }}
        onSuccess={onRefresh}
      />

      {/* Modal de Matriz Curricular SEMED Manaus */}
      <CurriculumViewModal
        isOpen={isCurriculumModalOpen}
        onClose={() => setIsCurriculumModalOpen(false)}
      />

      {/* Modal de Mapeamento de Sala & Regentes */}
      <ClassroomMappingModal
        isOpen={isClassroomMappingOpen}
        onClose={() => setIsClassroomMappingOpen(false)}
        currentUser={{ id: 'pedagoga', full_name: 'Coordenação Pedagógica', email: 'pedagoga@escola.com', role: 'pedagoga', is_active: true, created_at: '', updated_at: '' }}
        isPedagoga={true}
        teachers={teachers}
      />

      {/* Modal de Enviar Cobrança de Pendência */}
      {notifyingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <h3 className="font-bold text-slate-800 text-base mb-1">Notificar Pendência ao Professor</h3>
            <p className="text-xs text-slate-500 mb-4">
              Destinatário: <strong className="text-slate-800">{notifyingTeacher.full_name}</strong>
            </p>

            <form onSubmit={handleSendPendingNotice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Aviso</label>
                <input
                  type="text"
                  required
                  value={pendingNoticeTitle}
                  onChange={(e) => setPendingNoticeTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mensagem de Alerta</label>
                <textarea
                  rows={3}
                  required
                  value={pendingNoticeMsg}
                  onChange={(e) => setPendingNoticeMsg(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNotifyingTeacher(null)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingNotice}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow transition"
                >
                  {sendingNotice ? 'Enviando...' : 'Enviar Alerta de Prazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
