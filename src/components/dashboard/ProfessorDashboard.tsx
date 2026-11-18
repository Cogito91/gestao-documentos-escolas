import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  RotateCcw,
  FolderPlus,
  Folder,
  AlertCircle,
  ExternalLink,
  Trash2,
  Calendar,
  Cake,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  X,
  Star,
  Camera,
  Pencil,
  BellRing,
  Printer,
  FileCheck2,
  Plus,
  AlertTriangle,
  Search,
  History,
  BookOpen
} from 'lucide-react';
import {
  getNotificationPermission,
  isNotificationSupported,
  requestBrowserNotificationPermission,
  sendBrowserNotification
} from '../../lib/browserNotifications';
import {
  SchoolDocument,
  DocumentCategory,
  CustomFolder,
  Birthday,
  TeacherSchedule,
  SchoolEvent
} from '../../types/database.types';
import { UploadModal } from '../documents/UploadModal';
import { DocumentThumbnail } from '../documents/DocumentThumbnail';
import { SpecialDocumentModal } from '../documents/SpecialDocumentModal';
import { OccurrenceModal } from '../documents/OccurrenceModal';
import { CurriculumViewModal } from '../curriculum/CurriculumViewModal';
import { TeacherCalendarModal } from '../calendar/TeacherCalendarModal';
import { documentService } from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';
import { formatDeadlineLabel } from '../../lib/utils';
import { formatAbsenceDateLabel } from '../../lib/utils';

interface ProfessorDashboardProps {
  documents: SchoolDocument[];
  categories: DocumentCategory[];
  folders: CustomFolder[];
  birthdays: Birthday[];
  schedules: TeacherSchedule[];
  events?: SchoolEvent[];
  onRefresh: () => void;
  onOpenMessages: () => void;
  onOpenCalendar: () => void;
  onOpenBirthdays: () => void;
}

type ViewTab = 'todo' | 'files' | 'emergency' | 'certificates';

export const ProfessorDashboard: React.FC<ProfessorDashboardProps> = ({
  documents,
  categories,
  folders,
  birthdays,
  schedules,
  events = [],
  onRefresh,
  onOpenCalendar,
  onOpenBirthdays,
}) => {
  const { user, profile } = useAuth();
  const [activeView, setActiveView] = useState<ViewTab>('todo');
  const [isUploadOpen, setIsUploadOpenState] = useState(() => sessionStorage.getItem('prof_upload_open') === '1');
  const setIsUploadOpen = (open: boolean) => {
    setIsUploadOpenState(open);
    if (open) sessionStorage.setItem('prof_upload_open', '1');
    else sessionStorage.removeItem('prof_upload_open');
  };
  const [selectedCategoryForUpload, setSelectedCategoryForUpload] = useState<DocumentCategory | null>(null);
  const [editingDocument, setEditingDocument] = useState<SchoolDocument | null>(null);
  const [specialModalMode, setSpecialModalMode] = useState<'emergencial' | 'atestado' | null>(null);
  const [editingSpecialDoc, setEditingSpecialDoc] = useState<SchoolDocument | null>(null);
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<SchoolDocument | null>(null);
  const [selectedOccurrenceClassFilter, setSelectedOccurrenceClassFilter] = useState<string>('all');
  const [occurrenceSearch, setOccurrenceSearch] = useState('');
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<{
    studentName: string;
    turma?: string;
  } | null>(null);
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(() => {
    return new URLSearchParams(window.location.search).get('matriz') === 'true';
  });
  const [isTeacherCalendarOpen, setIsTeacherCalendarOpen] = useState(false);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedScheduleShift, setSelectedScheduleShift] = useState<string>('Manhã');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermission()
  );
  const [dismissedNotifBanner, setDismissedNotifBanner] = useState(false);
  const [sporadicReminder, setSporadicReminder] = useState<{
    category: DocumentCategory;
    message: string;
  } | null>(null);
  const [selectedBimestre, setSelectedBimestre] = useState<string>(() => {
    return sessionStorage.getItem('hyperframes_prof_bimestre') || '1º Bimestre';
  });

  const handleSelectBimestre = (bim: string) => {
    setSelectedBimestre(bim);
    sessionStorage.setItem('hyperframes_prof_bimestre', bim);
    wasUpToDateRef.current = null;
  };

  const bimestresList = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre', 'Anual / Geral'];

  // Aniversariantes do mês atual
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();
  const thisMonthBirthdays = birthdays.filter(b => b.birth_month === currentMonth);
  const todayBirthdays = thisMonthBirthdays.filter(b => b.birth_day === currentDay);

  // Separação entre entregas regulares do bimestre, atividades emergenciais, atestados e ocorrências
  const regularDocuments = documents.filter(d => !d.special_kind || d.special_kind === 'regular');
  const emergencyDocuments = documents.filter(d => d.special_kind === 'emergencial');
  const certificateDocuments = documents.filter(d => d.special_kind === 'atestado');
  const occurrenceDocuments = documents.filter(d => d.special_kind === 'ocorrencia');

  // Carregar atividades e avaliações REAIS agendadas pelo professor (da Matriz Curricular)
  const [scheduledMatrizActivities, setScheduledMatrizActivities] = useState<any[]>([]);
  const [isScheduledActivitiesModalOpen, setIsScheduledActivitiesModalOpen] = useState(false);

  const loadScheduledActivities = () => {
    try {
      const activities = JSON.parse(localStorage.getItem('teacher_scheduled_activities') || '[]');
      const assessments = JSON.parse(localStorage.getItem('teacher_scheduled_assessments') || '[]');
      
      const mappedActs = activities.map((act: any) => ({
        id: act.id,
        title: act.title,
        type: 'activity',
        turma: act.turma || 'Turma Geral',
        date: act.dueDate,
        details: `Turma: ${act.turma} • ${act.objects?.length || 0} objeto(s) vinculados.`
      }));

      const mappedAss = assessments.map((ass: any) => ({
        id: ass.id,
        title: ass.title,
        type: 'assessment',
        turma: ass.turma || 'Turma Geral',
        date: ass.date,
        details: `Turma: ${ass.turma} • ${ass.objects?.length || 0} objeto(s) vinculados.`
      }));

      setScheduledMatrizActivities([...mappedActs, ...mappedAss]);
    } catch {
      setScheduledMatrizActivities([]);
    }
  };

  useEffect(() => {
    loadScheduledActivities();

    const handleOpenActivitiesEvent = () => {
      setIsScheduledActivitiesModalOpen(true);
    };
    window.addEventListener('open_my_activities_modal', handleOpenActivitiesEvent);
    return () => {
      window.removeEventListener('open_my_activities_modal', handleOpenActivitiesEvent);
    };
  }, [documents, isTeacherCalendarOpen]);

  const handleDeleteScheduledMatrizItem = (id: string, type: string) => {
    try {
      if (type === 'activity') {
        const stored = JSON.parse(localStorage.getItem('teacher_scheduled_activities') || '[]');
        const filtered = stored.filter((a: any) => a.id !== id);
        localStorage.setItem('teacher_scheduled_activities', JSON.stringify(filtered));
      } else {
        const stored = JSON.parse(localStorage.getItem('teacher_scheduled_assessments') || '[]');
        const filtered = stored.filter((a: any) => a.id !== id);
        localStorage.setItem('teacher_scheduled_assessments', JSON.stringify(filtered));
      }
      loadScheduledActivities();
    } catch (e) {
      console.error(e);
    }
  };

  const suggestedOccurrenceClasses = Array.from(
    new Set([
      ...schedules.map(s => s.class_name).filter(Boolean),
      ...occurrenceDocuments.map(d => d.target_classes).filter(Boolean) as string[],
    ])
  ).sort();

  const studentHistoryDocs: SchoolDocument[] = selectedStudentHistory
    ? occurrenceDocuments
        .filter(
          (d: SchoolDocument) =>
            (d.student_name || '').trim().toLowerCase() ===
            selectedStudentHistory.studentName.trim().toLowerCase()
        )
        .sort((a: SchoolDocument, b: SchoolDocument) => (b.occurrence_date || b.submitted_at).localeCompare(a.occurrence_date || a.submitted_at))
    : [];

  // Filtragem das categorias por Bimestre escolhido
  const bimestreCategories = categories.filter(
    cat => (cat.bimestre || '1º Bimestre') === selectedBimestre
  );

  // Classificação clara das entregas por categoria
  const pendingCategories = bimestreCategories.filter(
    cat => !regularDocuments.some(d => d.category_id === cat.id)
  );
  const deliveredCategories = bimestreCategories.filter(cat =>
    regularDocuments.some(d => d.category_id === cat.id)
  );

  const myReturnedDocs = regularDocuments.filter(d => d.status === 'devolvido');
  const myPendingAnalysisCount = regularDocuments.filter(d => d.status === 'pendente').length;
  const myApprovedCount = regularDocuments.filter(d => d.status === 'aprovado').length;

  const totalCategories = bimestreCategories.length;
  const completedCount = deliveredCategories.length;
  const progressPercent = totalCategories > 0 ? Math.round((completedCount / totalCategories) * 100) : 0;
  const isUpToDate = totalCategories > 0 && pendingCategories.length === 0;

  // Gamificação: Animação de estrelinha ao enviar o último documento
  const [showStarCelebration, setShowStarCelebration] = useState(false);
  const wasUpToDateRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (totalCategories === 0) return;

    const justUploaded = sessionStorage.getItem('hyperframes_just_uploaded') === '1';

    if (justUploaded && isUpToDate) {
      sessionStorage.removeItem('hyperframes_just_uploaded');
      wasUpToDateRef.current = isUpToDate;
      setShowStarCelebration(true);
      return;
    }

    if (justUploaded && !isUpToDate) {
      sessionStorage.removeItem('hyperframes_just_uploaded');
    }

    if (wasUpToDateRef.current === null) {
      wasUpToDateRef.current = isUpToDate;
      return;
    }

    if (!wasUpToDateRef.current && isUpToDate) {
      setShowStarCelebration(true);
    }

    wasUpToDateRef.current = isUpToDate;
  }, [isUpToDate, totalCategories]);

  useEffect(() => {
    if (!showStarCelebration) return;

    // Efeito sonoro de premiação via Web Audio API
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const notes = [523.25, 659.25, 783.99, 1046.5]; // Dó5, Mi5, Sol5, Dó6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + i * 0.1;
          const duration = i === notes.length - 1 ? 0.65 : 0.25;

          osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + duration);
        });
        setTimeout(() => {
          ctx.close().catch(() => {});
        }, 1400);
      }
    } catch {
      // Ignora caso o navegador bloqueie áudio automático
    }

    const timer = setTimeout(() => setShowStarCelebration(false), 3800);
    return () => clearTimeout(timer);
  }, [showStarCelebration]);

  const firstName = profile?.full_name?.split(' ')[0] || 'Professor(a)';

  const days = [
    { id: 1, name: 'Segunda-feira' },
    { id: 2, name: 'Terça-feira' },
    { id: 3, name: 'Quarta-feira' },
    { id: 4, name: 'Quinta-feira' },
    { id: 5, name: 'Sexta-feira' },
  ];

  const getDocBimestre = (doc: SchoolDocument): string => {
    const cat = doc.category || categories.find((c) => c.id === doc.category_id);
    if (cat?.bimestre) return cat.bimestre;
    if (doc.description) {
      const found = bimestresList.find((b) => doc.description?.includes(`[${b}]`));
      if (found) return found;
    }
    return '1º Bimestre';
  };

  // Documentos filtrados pelo Bimestre selecionado
  const bimestreDocuments = regularDocuments.filter((doc) => getDocBimestre(doc) === selectedBimestre);

  // Filtragem por pasta na aba de Arquivos (apenas do bimestre selecionado)
  const filteredDocuments = bimestreDocuments.filter(doc => {
    if (selectedFolderFilter === 'all') return true;
    if (selectedFolderFilter === 'none') return !doc.folder_id;
    return doc.folder_id === selectedFolderFilter;
  });

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newFolderName.trim()) return;

    setFolderLoading(true);
    try {
      await documentService.createFolder(user.id, newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar pasta: ' + err.message);
    } finally {
      setFolderLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Deseja realmente excluir este documento?')) return;
    try {
      await documentService.deleteDocument(docId);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const openUploadFor = (category: DocumentCategory | null) => {
    setEditingDocument(null);
    setSelectedCategoryForUpload(category);
    setIsUploadOpen(true);
  };

  const openEditFor = (doc: SchoolDocument) => {
    setSelectedCategoryForUpload(null);
    setEditingDocument(doc);
    setIsUploadOpen(true);
  };

  const handleEnableNotifications = async () => {
    const result = await requestBrowserNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      sendBrowserNotification(
        'Notificações ativadas! 🔔',
        'Você receberá avisos quando a coordenação enviar mensagens e lembretes de documentos.',
        'notif-welcome'
      );
    }
  };

  // Lembretes esporádicos de documentos pendentes (1x por semana quando houver pendências)
  useEffect(() => {
    if (pendingCategories.length === 0) {
      setSporadicReminder(null);
      return;
    }

    const REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 1x por semana (7 dias)

    const triggerSporadicReminderIfDue = () => {
      const lastRaw = localStorage.getItem('hyperframes_last_doc_reminder_at');
      const lastAt = lastRaw ? Number(lastRaw) : 0;
      const now = Date.now();

      if (!lastAt || now - lastAt >= REMINDER_INTERVAL_MS) {
        const idxRaw = localStorage.getItem('hyperframes_reminder_idx');
        const idx = (idxRaw ? Number(idxRaw) : 0) % pendingCategories.length;
        const cat = pendingCategories[idx];
        const message = `Olá, prof.! No aguardo do envio do documento "${cat.name}". Obrigado pela parceria!! ☺️👍🏻`;

        localStorage.setItem('hyperframes_last_doc_reminder_at', String(now));
        localStorage.setItem('hyperframes_reminder_idx', String(idx + 1));

        setSporadicReminder({ category: cat, message });
        sendBrowserNotification('Lembrete de Documento 📋', message, `doc-reminder-${cat.id}`);
      }
    };

    const initialTimer = setTimeout(triggerSporadicReminderIfDue, 2500);
    const periodicTimer = setInterval(triggerSporadicReminderIfDue, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(periodicTimer);
    };
  }, [pendingCategories.length, selectedBimestre]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Convite para ativar notificações no celular / navegador */}
      {isNotificationSupported() && notifPermission === 'default' && !dismissedNotifBanner && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl shadow-sm">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                Ativar notificações no celular e navegador
              </p>
              <p className="text-[11px] sm:text-xs text-slate-600">
                Receba alertas quando a pedagoga enviar mensagens e lembretes amigáveis de documentos pendentes.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              Permitir Notificações
            </button>
            <button
              type="button"
              onClick={() => setDismissedNotifBanner(true)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Aviso discreto de Aniversariantes do Mês */}
      {thisMonthBirthdays.length > 0 && (
        <button
          onClick={onOpenBirthdays}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 rounded-xl text-left transition"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <Cake className="w-4 h-4 text-rose-500 shrink-0" />
            <p className="text-xs text-rose-900 truncate">
              {todayBirthdays.length > 0 ? (
                <span>
                  <strong>Aniversário hoje:</strong> {todayBirthdays.map(b => b.name).join(', ')} 🎉
                </span>
              ) : (
                <span>
                  <strong>Aniversariantes do mês ({thisMonthBirthdays.length}):</strong>{' '}
                  {thisMonthBirthdays.slice(0, 3).map(b => `${b.name} (${b.birth_day})`).join(' • ')}
                </span>
              )}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-rose-700 shrink-0 ml-3">Ver mural →</span>
        </button>
      )}

      {/* Cabeçalho Clean com Ações Principais */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Olá, {firstName}
              </h1>
              {isUpToDate && (
                <span
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold"
                  title="Todos os documentos do bimestre foram enviados!"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span>Em dia</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {profile?.discipline || 'Polivalente'} • Turno {profile?.shift || 'Geral'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={() => setIsCurriculumModalOpen(true)}
              className="px-2 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 text-blue-800 font-bold text-[11px] leading-tight rounded-xl transition flex items-center justify-center space-x-1.5 shadow-xs"
              title="Consultar Matriz Curricular SEMED da sua disciplina"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Matriz Curricular</span>
            </button>

            <button
              onClick={() => setIsTeacherCalendarOpen(true)}
              className="px-2 py-2.5 bg-gradient-to-r from-sky-50 to-teal-50 hover:from-sky-100 hover:to-teal-100 border border-sky-200 text-sky-900 font-bold text-[11px] leading-tight rounded-xl transition flex items-center justify-center space-x-1.5 shadow-xs"
              title="Visualizar Meu Calendário: datas de entrega pendentes e suas avaliações/atividades"
            >
              <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Meu Calendário</span>
              {pendingCategories.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-2xs shrink-0">
                  {pendingCategories.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-2 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-[11px] leading-tight rounded-xl transition flex items-center justify-center space-x-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Meus Horários</span>
            </button>

            <button
              onClick={() => openUploadFor(null)}
              className="px-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] leading-tight rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5 shrink-0" />
              <span>Enviar Documento</span>
            </button>
          </div>
        </div>

        {/* Área de Atividades Programadas para as Turmas na Semana */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/60 to-purple-50/70 border border-indigo-100 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                    Você tem atividades agendadas para as turmas:
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atividades e avaliações agendadas para aplicação em sala
                  </p>
                </div>
              </div>

              {scheduledMatrizActivities.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsScheduledActivitiesModalOpen(true)}
                  className="text-xs font-bold text-indigo-700 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs hover:bg-indigo-50 transition flex items-center gap-1"
                >
                  <span>Ver todas ({scheduledMatrizActivities.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Lista exatamente no formato do card: Tag MINHA ATIVIDADE / AVALIAÇÃO + Data + Atividade + Turma + Excluir */}
            <div className="space-y-2.5">
              {scheduledMatrizActivities.length > 0 ? (
                scheduledMatrizActivities.slice(0, 4).map((act) => {
                  const formattedDate = act.date ? act.date.split('T')[0].split('-').reverse().join('/') : '';
                  const isAssessment = act.type === 'assessment';

                  return (
                    <div
                      key={act.id}
                      className="p-3.5 bg-white rounded-2xl border border-blue-200/90 shadow-2xs hover:border-indigo-300 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          isAssessment
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                        }`}>
                          {isAssessment ? 'MINHA AVALIAÇÃO' : 'MINHA ATIVIDADE'}
                        </span>
                        {formattedDate && (
                          <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formattedDate}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                        {isAssessment ? 'Avaliação: ' : 'Atividade: '}
                        <span className="text-indigo-950">{act.title}</span>
                      </h4>

                      {act.details && (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {act.details}
                        </p>
                      )}

                      <div className="pt-1.5 flex items-center justify-end border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleDeleteScheduledMatrizItem(act.id, act.type)}
                          className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
                          title="Remover agendamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white/80 p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  Nenhuma atividade agendada no momento. Agende avaliações ou atividades pelo botão <strong>"Matriz Curricular"</strong>.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de Bimestre + Navegação Simples por Abas */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200/90 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">
            Bimestre:
          </span>
          {bimestresList.map((bim) => (
            <button
              key={bim}
              onClick={() => handleSelectBimestre(bim)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedBimestre === bim
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {bim}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 gap-4">
        <div className="flex items-center space-x-5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveView('todo')}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeView === 'todo'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>O que preciso enviar</span>
            {(pendingCategories.length + myReturnedDocs.length) > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800">
                {pendingCategories.length + myReturnedDocs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('files')}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeView === 'files'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Meus Arquivos ({bimestreDocuments.length})</span>
          </button>

          <button
            onClick={() => setActiveView('emergency')}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeView === 'emergency'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Atividades Emergenciais ({emergencyDocuments.length})</span>
          </button>

          <button
            onClick={() => setActiveView('certificates')}
            className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeView === 'certificates'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Atestados e Declarações ({certificateDocuments.length})</span>
          </button>
        </div>
        </div>
      </div>

      {/* ABA 1: CHECKLIST INTUITIVA — O QUE FALTA E O QUE JÁ FOI ENVIADO */}
      {activeView === 'todo' && (
        <div className="space-y-6">

          {/* 1. Documentos Devolvidos para Ajuste (Prioridade Máxima) */}
          {myReturnedDocs.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center space-x-1.5 px-1">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Precisa de Ajuste ({myReturnedDocs.length})</span>
              </h2>

              <div className="bg-white rounded-2xl border border-rose-200 divide-y divide-rose-100 overflow-hidden shadow-sm">
                {myReturnedDocs.map(doc => (
                  <div
                    key={doc.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/30"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0 mt-0.5">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{doc.title}</p>
                        <p className="text-xs text-rose-800 mt-0.5">
                          <strong>Parecer da coordenação:</strong> {doc.feedback || 'Verificar ajustes solicitados.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openUploadFor(doc.category || null)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition shrink-0 flex items-center justify-center space-x-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Reenviar</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Faltam Enviar */}
          <section className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5 px-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Faltam Enviar ({pendingCategories.length})</span>
            </h2>

            {pendingCategories.length === 0 ? (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-6 text-center">
                <Sparkles className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-900">Tudo em dia!</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Você já enviou todos os documentos previstos para este bimestre.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                {pendingCategories.map(cat => (
                  <div
                    key={cat.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                            {cat.bimestre || '1º Bimestre'}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {formatDeadlineLabel(cat)}
                          </span>
                          {cat.requires_evidence && (
                            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              <Camera className="w-3 h-3 text-amber-600" />
                              <span>Exige evidências</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {cat.description || 'Entrega obrigatória do bimestre'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => openUploadFor(cat)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shrink-0 flex items-center space-x-1.5"
                    >
                      <span>Enviar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Já Enviados */}
          {deliveredCategories.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 px-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Já Enviados ({deliveredCategories.length})</span>
              </h2>

              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {deliveredCategories.map(cat => {
                  const catDocs = documents.filter(d => d.category_id === cat.id);
                  const isApproved = catDocs.some(d => d.status === 'aprovado');
                  const latestDoc = catDocs[0];

                  return (
                    <div
                      key={cat.id}
                      className="p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        {latestDoc ? (
                          <DocumentThumbnail doc={latestDoc} />
                        ) : (
                          <div className={`p-2.5 rounded-xl shrink-0 ${
                            isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {isApproved ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-800">{cat.name}</h3>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isApproved
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {isApproved ? 'Aprovado' : 'Em análise'}
                            </span>
                          </div>
                          {latestDoc && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                              Enviado em {new Date(latestDoc.submitted_at).toLocaleDateString('pt-BR')} • {latestDoc.file_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {latestDoc && (
                          <a
                            href={latestDoc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Abrir arquivo enviado"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {latestDoc && latestDoc.status !== 'aprovado' && (
                          <>
                            <button
                              onClick={() => openEditFor(latestDoc)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Editar documento enviado"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(latestDoc.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Deletar documento enviado"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openUploadFor(cat)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                        >
                          Novo Envio
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ABA 2: MEUS ARQUIVOS & PASTAS */}
      {activeView === 'files' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedFolderFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedFolderFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({bimestreDocuments.length})
              </button>

              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderFilter(folder.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    selectedFolderFilter === folder.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>{folder.name}</span>
                </button>
              ))}
            </div>

            {isCreatingFolder ? (
              <form onSubmit={handleCreateFolder} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Nome da pasta..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={folderLoading || !newFolderName.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>Nova Pasta</span>
              </button>
            )}
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-slate-600">
                Nenhum arquivo postado no {selectedBimestre}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Clique em "Enviar Documento" para adicionar um arquivo neste bimestre.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <DocumentThumbnail doc={doc} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{doc.title}</p>
                        {doc.status === 'aprovado' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Aprovado</span>
                          </span>
                        )}
                        {doc.status === 'devolvido' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700">
                            <RotateCcw className="w-3 h-3" />
                            <span>Devolvido</span>
                          </span>
                        )}
                        {doc.status === 'pendente' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
                            <Clock className="w-3 h-3" />
                            <span>Em análise</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {doc.category?.name || 'Geral'} • {doc.file_name} • {new Date(doc.submitted_at).toLocaleDateString('pt-BR')}
                      </p>
                      {doc.feedback && (
                        <p className="text-xs text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg mt-2 border border-amber-200/70">
                          <strong>Parecer:</strong> {doc.feedback}
                        </p>
                      )}
                      {doc.evidence_files && doc.evidence_files.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-800">
                            <Camera className="w-3 h-3 text-amber-600" />
                            <span>{doc.evidence_files.length} evidência(s):</span>
                          </span>
                          {doc.evidence_files.map((ev, idx) => (
                            <a
                              key={idx}
                              href={ev.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 truncate max-w-[160px]"
                            >
                              {ev.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Abrir / Baixar Arquivo"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {doc.status !== 'aprovado' && (
                      <>
                        <button
                          onClick={() => openEditFor(doc)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Editar Documento"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir Documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: ATIVIDADES EMERGENCIAIS (PARA FALTAS) */}
      {activeView === 'emergency' && (
        <div className="space-y-4">
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Atividades Emergenciais para Faltas
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Vai precisar faltar? Poste aqui uma atividade e informe os dias de ausência para a pedagoga imprimir e aplicar com seus alunos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSpecialDoc(null);
                setSpecialModalMode('emergencial');
              }}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Postar Atividade</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {emergencyDocuments.length === 0 ? (
              <div className="p-12 text-center">
                <Printer className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                <p className="text-sm font-semibold text-slate-600">
                  Nenhuma atividade emergencial postada
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Quando precisar faltar, envie a atividade por aqui para a coordenação imprimir.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {emergencyDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <DocumentThumbnail doc={doc} />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{doc.title}</p>
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            doc.status === 'aprovado'
                              ? 'bg-emerald-50 text-emerald-700'
                              : doc.status === 'devolvido'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            <span>
                              {doc.status === 'aprovado'
                                ? 'Impressa / Recebida'
                                : doc.status === 'devolvido'
                                ? 'Devolvida'
                                : 'Aguardando impressão'}
                            </span>
                          </span>
                        </div>

                        {doc.absence_dates && doc.absence_dates.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-amber-800">
                              Dias da falta:
                            </span>
                            {doc.absence_dates.map(d => (
                                <span
                                  key={d}
                                  className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-semibold"
                                >
                                  📅 {formatAbsenceDateLabel(d)}
                                </span>
                            ))}
                          </div>
                        )}

                        {doc.target_classes && (
                          <p className="text-xs text-slate-600">
                            <strong>Turmas:</strong> {doc.target_classes}
                          </p>
                        )}
                        {doc.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{doc.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 self-end sm:self-center">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Abrir / Imprimir Arquivo"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      {doc.status !== 'aprovado' && (
                        <>
                          <button
                            onClick={() => {
                              setEditingSpecialDoc(doc);
                              setSpecialModalMode('emergencial');
                            }}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Editar Atividade"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Excluir Atividade"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: ATESTADOS E DECLARAÇÕES */}
      {activeView === 'certificates' && (
        <div className="space-y-4">
          <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Atestados Médicos e Declarações
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Envie seus atestados ou declarações informando exatamente o dia (ou dias) a que o documento se refere.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSpecialDoc(null);
                setSpecialModalMode('atestado');
              }}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Enviar Atestado / Declaração</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {certificateDocuments.length === 0 ? (
              <div className="p-12 text-center">
                <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                <p className="text-sm font-semibold text-slate-600">
                  Nenhum atestado ou declaração enviado
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Clique em &ldquo;Enviar Atestado / Declaração&rdquo; acima para anexar seu comprovante.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {certificateDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <DocumentThumbnail doc={doc} />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{doc.title}</p>
                          {doc.certificate_type && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                              {doc.certificate_type}
                            </span>
                          )}
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            doc.status === 'aprovado'
                              ? 'bg-emerald-50 text-emerald-700'
                              : doc.status === 'devolvido'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            <span>
                              {doc.status === 'aprovado'
                                ? 'Validado'
                                : doc.status === 'devolvido'
                                ? 'Devolvido'
                                : 'Em análise'}
                            </span>
                          </span>
                        </div>

                        {doc.absence_dates && doc.absence_dates.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-teal-800">
                              Referente ao(s) dia(s):
                            </span>
                            {doc.absence_dates.map(d => (
                                <span
                                  key={d}
                                  className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 text-[11px] font-semibold"
                                >
                                  📅 {formatAbsenceDateLabel(d)}
                                </span>
                            ))}
                          </div>
                        )}

                        {doc.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{doc.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 self-end sm:self-center">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Abrir / Baixar Documento"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      {doc.status !== 'aprovado' && (
                        <>
                          <button
                            onClick={() => {
                              setEditingSpecialDoc(doc);
                              setSpecialModalMode('atestado');
                            }}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Editar Documento"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Excluir Documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Horários de Aula do Professor */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Minha Grade Horária de Aulas</h3>
                  <p className="text-xs text-slate-500">Consulte sua rotina de turmas e horários na escola</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SELEÇÃO DO TURNO (MENU DROPDOWN) PARA O PROFESSOR */}
            <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Escolha o Turno do Horário:</span>
                </span>
                <select
                  value={selectedScheduleShift}
                  onChange={(e) => setSelectedScheduleShift(e.target.value)}
                  className="px-3 py-1.5 text-xs font-black border-2 border-blue-400 rounded-lg bg-white text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
                >
                  {(() => {
                    const profShifts = profile?.shift ? profile.shift.split(',').map(s => s.trim()).filter(Boolean) : [];
                    const baseShifts = ['Manhã', 'Tarde', 'Noite', 'Integral'];
                    const availableShifts = Array.from(new Set([...(profShifts.length > 0 ? profShifts : baseShifts), ...baseShifts]));
                    return availableShifts.map(sh => (
                      <option key={sh} value={sh}>
                        {sh === 'Manhã' ? '☀️ Turno Manhã (07:30 - 11:30)' : sh === 'Tarde' ? '🌤️ Turno Tarde (13:00 - 17:00)' : sh === 'Noite' ? '🌙 Turno Noite (18:30 - 22:20)' : '⚡ Turno Integral'}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <span className="text-[11px] font-extrabold text-blue-800 bg-blue-100/80 px-2.5 py-1 rounded-full border border-blue-300">
                Turno: <strong>{selectedScheduleShift}</strong>
              </span>
            </div>

            {/* GRADE MATRIZ INTERATIVA DE HORÁRIOS DO TURNO SELECIONADO */}
            {(() => {
              const SHIFT_PERIODS: Record<string, Array<{ period: number; start_time: string; end_time: string; label: string }>> = {
                'Manhã': [
                  { period: 1, start_time: '07:30', end_time: '08:15', label: '1º Horário' },
                  { period: 2, start_time: '08:15', end_time: '09:00', label: '2º Horário' },
                  { period: 3, start_time: '09:15', end_time: '10:00', label: '3º Horário' },
                  { period: 4, start_time: '10:00', end_time: '10:45', label: '4º Horário' },
                  { period: 5, start_time: '10:45', end_time: '11:30', label: '5º Horário' },
                ],
                'Tarde': [
                  { period: 11, start_time: '13:00', end_time: '13:45', label: '1º Horário' },
                  { period: 12, start_time: '13:45', end_time: '14:30', label: '2º Horário' },
                  { period: 13, start_time: '14:45', end_time: '15:30', label: '3º Horário' },
                  { period: 14, start_time: '15:30', end_time: '16:15', label: '4º Horário' },
                  { period: 15, start_time: '16:15', end_time: '17:00', label: '5º Horário' },
                ],
                'Noite': [
                  { period: 21, start_time: '18:30', end_time: '19:15', label: '1º Horário' },
                  { period: 22, start_time: '19:15', end_time: '20:00', label: '2º Horário' },
                  { period: 23, start_time: '20:10', end_time: '20:55', label: '3º Horário' },
                  { period: 24, start_time: '20:55', end_time: '21:40', label: '4º Horário' },
                  { period: 25, start_time: '21:40', end_time: '22:20', label: '5º Horário' },
                ],
                'Integral': [
                  { period: 1, start_time: '07:30', end_time: '08:15', label: '1º Horário' },
                  { period: 2, start_time: '08:15', end_time: '09:00', label: '2º Horário' },
                  { period: 3, start_time: '09:15', end_time: '10:00', label: '3º Horário' },
                  { period: 4, start_time: '10:00', end_time: '10:45', label: '4º Horário' },
                  { period: 5, start_time: '10:45', end_time: '11:30', label: '5º Horário' },
                ]
              };

              const CLASS_COLORS_MAP: Record<string, { bg: string }> = {
                // Regular Diurno
                '6º Ano A': { bg: 'bg-emerald-600 text-white' },
                '6º Ano B': { bg: 'bg-teal-600 text-white' },
                '6º Ano C': { bg: 'bg-green-700 text-white' },
                '7º Ano A': { bg: 'bg-blue-600 text-white' },
                '7º Ano B': { bg: 'bg-cyan-600 text-white' },
                '7º Ano C': { bg: 'bg-sky-700 text-white' },
                '8º Ano A': { bg: 'bg-amber-600 text-white' },
                '8º Ano B': { bg: 'bg-orange-600 text-white' },
                '8º Ano C': { bg: 'bg-yellow-600 text-white' },
                '9º Ano A': { bg: 'bg-purple-600 text-white' },
                '9º Ano B': { bg: 'bg-fuchsia-600 text-white' },
                '9º Ano C': { bg: 'bg-rose-600 text-white' },
                // EJA 2º Segmento (Noturno)
                'EJA 1ª Etapa A': { bg: 'bg-indigo-600 text-white' },
                'EJA 1ª Etapa B': { bg: 'bg-indigo-700 text-white' },
                'EJA 2ª Etapa A': { bg: 'bg-blue-700 text-white' },
                'EJA 2ª Etapa B': { bg: 'bg-sky-800 text-white' },
                'EJA 3ª Etapa A': { bg: 'bg-violet-700 text-white' },
                'EJA 3ª Etapa B': { bg: 'bg-purple-800 text-white' },
                'EJA 4ª Etapa A': { bg: 'bg-emerald-800 text-white' },
                'EJA 4ª Etapa B': { bg: 'bg-teal-800 text-white' },
                // EJA 1º Segmento (Anos Iniciais)
                'EJA Módulo 1 (Alfabetização)': { bg: 'bg-pink-700 text-white' },
                'EJA Módulo 2': { bg: 'bg-rose-700 text-white' },
                'EJA Módulo 3': { bg: 'bg-amber-700 text-white' },
              };

              const currentShiftPeriods = SHIFT_PERIODS[selectedScheduleShift] || SHIFT_PERIODS['Manhã'];
              const weekDays = [
                { id: 1, name: 'Segunda-feira' },
                { id: 2, name: 'Terça-feira' },
                { id: 3, name: 'Quarta-feira' },
                { id: 4, name: 'Quinta-feira' },
                { id: 5, name: 'Sexta-feira' },
              ];

              return (
                <div className="mb-5 overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="p-2 border border-slate-200 font-bold w-24">Horário ({selectedScheduleShift})</th>
                        {weekDays.map(d => (
                          <th key={d.id} className="p-2 border border-slate-200 font-extrabold">
                            {d.name.split('-')[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentShiftPeriods.map((p, pIndex) => (
                        <tr key={p.period} className="hover:bg-slate-50/50">
                          <td className="p-2 border border-slate-200 font-bold bg-slate-50 text-slate-700">
                            <span className="block text-blue-700">{pIndex + 1}º Tempo</span>
                            <span className="text-[10px] text-slate-400 font-normal">{p.start_time}-{p.end_time}</span>
                          </td>
                          {weekDays.map(d => {
                            const matchSchedule = schedules.find(s => s.day_of_week === d.id && s.period === p.period);
                            const discAbbr = (profile?.discipline || 'MAT').slice(0, 3).toUpperCase();
                            const colorClass = matchSchedule ? (CLASS_COLORS_MAP[matchSchedule.class_name]?.bg || 'bg-blue-600 text-white') : '';

                            return (
                              <td
                                key={d.id}
                                className={`p-2 border border-slate-200 select-none ${
                                  matchSchedule
                                    ? `${colorClass} font-extrabold shadow-xs`
                                    : 'bg-white text-slate-300'
                                }`}
                              >
                                {matchSchedule ? (
                                  <div>
                                    <span className="block text-xs sm:text-sm font-black tracking-wide">{matchSchedule.class_name}</span>
                                    <span className="text-[10px] font-bold opacity-90 block px-1 py-0.5 rounded bg-black/20 mt-0.5 uppercase tracking-wider">{discAbbr}</span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-normal text-slate-300">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {profile?.schedule_file_url ? (
              <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-900">Arquivo Oficial do Horário:</span>
                  <a
                    href={profile.schedule_file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 font-bold underline flex items-center space-x-1"
                  >
                    <span>Abrir / Baixar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {profile.schedule_file_url.match(/\.(jpeg|jpg|png|webp)/i) ? (
                  <img
                    src={profile.schedule_file_url}
                    alt="Horário do Professor"
                    className="w-full max-h-80 object-contain rounded-lg border border-slate-200 bg-white"
                  />
                ) : profile.schedule_file_url.match(/\.pdf/i) ? (
                  <iframe
                    src={profile.schedule_file_url}
                    title="Horário PDF"
                    className="w-full h-72 rounded-lg border"
                  />
                ) : (
                  <div className="p-4 bg-white rounded-lg border border-dashed flex items-center space-x-2 text-xs font-semibold text-slate-700">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                    <span>Planilha de Horário Anexada pela Coordenação</span>
                  </div>
                )}
              </div>
            ) : null}

            {schedules.length === 0 && !profile?.schedule_file_url ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Nenhum horário de aula cadastrado ainda pela coordenação pedagógica.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {schedules
                  .sort((a, b) => a.day_of_week - b.day_of_week || a.period - b.period)
                  .map(sc => (
                    <div key={sc.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">
                          {days.find(d => d.id === sc.day_of_week)?.name || `Dia ${sc.day_of_week}`}
                        </span>
                        <p className="text-slate-500">
                          {sc.period}º Horário ({sc.start_time} - {sc.end_time})
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200">
                        {sc.class_name} • {sc.subject || 'Aula'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Upload / Edição */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setSelectedCategoryForUpload(null);
          setEditingDocument(null);
        }}
        categories={categories}
        folders={folders}
        onSuccess={() => {
          sessionStorage.setItem('hyperframes_just_uploaded', '1');
          onRefresh();
        }}
        targetCategory={selectedCategoryForUpload}
        initialBimestre={selectedBimestre}
        editingDocument={editingDocument}
      />

      {/* Modal de Atividade Emergencial / Atestados e Declarações */}
      {specialModalMode && (
        <SpecialDocumentModal
          isOpen={Boolean(specialModalMode)}
          onClose={() => {
            setSpecialModalMode(null);
            setEditingSpecialDoc(null);
          }}
          mode={specialModalMode}
          onSuccess={onRefresh}
          editingDocument={editingSpecialDoc}
        />
      )}

      {/* Modal de Ocorrências de Alunos */}
      <OccurrenceModal
        isOpen={isOccurrenceModalOpen}
        onClose={() => {
          setIsOccurrenceModalOpen(false);
          setEditingOccurrence(null);
        }}
        onSuccess={onRefresh}
        suggestedClasses={suggestedOccurrenceClasses}
        editingDocument={editingOccurrence}
      />

      {/* Modal de Histórico do Aluno (Reunião de Entrega de Boletim) */}
      {selectedStudentHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Histórico do Aluno: {selectedStudentHistory.studentName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudentHistory.turma ? `Turma: ${selectedStudentHistory.turma} • ` : ''}
                    {studentHistoryDocs.length}{' '}
                    {studentHistoryDocs.length === 1 ? 'ocorrência registrada' : 'ocorrências registradas'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentHistory(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {studentHistoryDocs.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">
                        #{studentHistoryDocs.length - idx}
                      </span>
                      {item.occurrence_date && (
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-100">
                          📅 {formatAbsenceDateLabel(item.occurrence_date)}
                        </span>
                      )}
                      {item.occurrence_time_slot && (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                          ⏰ {item.occurrence_time_slot}
                        </span>
                      )}
                      {item.target_classes && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-xs font-semibold">
                          {item.target_classes}
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.status === 'aprovado'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.status === 'aprovado' ? 'Acompanhada pela Pedagoga' : 'Registrada'}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                      <strong>Ocorrência:</strong> {item.description}
                    </p>
                  )}

                  {item.action_taken && (
                    <p className="text-xs text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                      <strong>Ação Tomada:</strong> {item.action_taken}
                    </p>
                  )}

                  {item.feedback && (
                    <p className="text-xs text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                      <strong>Parecer da Coordenação:</strong> {item.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Visualização organizada para reunião com os responsáveis
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentHistory(null)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dedicado: Minhas Atividades Agendadas */}
      {isScheduledActivitiesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 shrink-0">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Minhas Atividades Agendadas</h3>
                  <p className="text-xs text-slate-500">
                    Acompanhe e gerencie as atividades e avaliações agendadas para suas turmas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduledActivitiesModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {scheduledMatrizActivities.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nenhuma atividade agendada até o momento.
                </div>
              ) : (
                scheduledMatrizActivities.map((act) => {
                  const formattedDate = act.date ? act.date.split('T')[0].split('-').reverse().join('/') : '';
                  const isAssessment = act.type === 'assessment';

                  return (
                    <div
                      key={act.id}
                      className="p-4 bg-white rounded-2xl border border-blue-200 shadow-2xs hover:border-indigo-300 transition space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          isAssessment
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                        }`}>
                          {isAssessment ? 'MINHA AVALIAÇÃO' : 'MINHA ATIVIDADE'}
                        </span>
                        {formattedDate && (
                          <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formattedDate}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {isAssessment ? 'Avaliação: ' : 'Atividade: '}
                        <span className="text-indigo-950">{act.title}</span>
                      </h4>

                      {act.details && (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {act.details}
                        </p>
                      )}

                      <div className="pt-2 flex items-center justify-end border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleDeleteScheduledMatrizItem(act.id, act.type)}
                          className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
                          title="Remover agendamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Total: <strong>{scheduledMatrizActivities.length}</strong> atividade(s)
              </span>
              <button
                type="button"
                onClick={() => setIsScheduledActivitiesModalOpen(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Matriz Curricular SEMED Manaus */}
      <CurriculumViewModal
        isOpen={isCurriculumModalOpen}
        onClose={() => setIsCurriculumModalOpen(false)}
        userDiscipline={profile?.discipline || 'MATEMÁTICA'}
        restrictToUserDiscipline={true}
      />

      {/* Modal Integrado: Meu Calendário & Prazos */}
      <TeacherCalendarModal
        isOpen={isTeacherCalendarOpen}
        onClose={() => setIsTeacherCalendarOpen(false)}
        pendingCategories={pendingCategories}
        schoolEvents={events || []}
        onOpenUploadForCategory={(cat) => openUploadFor(cat)}
      />

      {/* Estrelinha Fixada no Canto da Tela quando o Professor está Em Dia */}
      {isUpToDate && (
        <button
          type="button"
          onClick={() => setShowStarCelebration(true)}
          title="Você está em dia! Todos os documentos do bimestre foram enviados."
          className="fixed bottom-5 right-5 z-40 flex items-center space-x-2 px-3.5 py-2.5 bg-white/95 backdrop-blur-sm border border-amber-200 rounded-full shadow-lg shadow-amber-500/15 hover:scale-105 transition-transform"
        >
          <span className="relative flex items-center justify-center">
            <Star className="w-5 h-5 fill-amber-400 text-amber-500 drop-shadow-sm" />
          </span>
          <span className="text-xs font-bold text-amber-800">Em dia</span>
        </button>
      )}

      {/* Animação de Estrelinha ao Enviar o Último Documento */}
      {showStarCelebration && (
        <div
          onClick={() => setShowStarCelebration(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-[2px] p-4 cursor-pointer overflow-hidden"
        >
          {/* Estrela cadente 1 passando pela tela */}
          <div className="fixed top-12 left-0 pointer-events-none animate-shooting-star flex items-center">
            <div className="w-36 h-1.5 rounded-full bg-gradient-to-r from-transparent via-amber-300/80 to-yellow-200 blur-[0.5px]" />
            <div className="-ml-2 p-1.5 rounded-full bg-amber-300/40 shadow-[0_0_20px_#fde047]">
              <Star className="w-7 h-7 fill-yellow-300 text-amber-400 drop-shadow-[0_0_10px_#facc15]" />
            </div>
          </div>

          {/* Estrela cadente 2 (menor, atrasada) */}
          <div className="fixed top-28 left-0 pointer-events-none animate-shooting-star-delayed flex items-center opacity-0">
            <div className="w-24 h-1 rounded-full bg-gradient-to-r from-transparent via-yellow-200/75 to-white blur-[0.5px]" />
            <div className="-ml-1.5">
              <Star className="w-4 h-4 fill-amber-200 text-yellow-300 drop-shadow-[0_0_8px_#fde047]" />
            </div>
          </div>

          <div className="animate-star-pop relative bg-white rounded-3xl shadow-2xl border border-amber-200 px-8 py-7 text-center max-w-xs w-full">
            <button
              type="button"
              onClick={() => setShowStarCelebration(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center mb-3">
              <div className="absolute inset-0 rounded-full bg-amber-100/80 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-400/40">
                <Star className="w-9 h-9 fill-white text-white" />
              </div>
              <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-sparkle-float" />
              <Sparkles className="w-4 h-4 text-yellow-500 absolute bottom-0 -left-1 animate-sparkle-float" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900">Parabéns, {firstName}!</h3>
            <p className="text-xs text-slate-600 mt-1">
              Você enviou todos os documentos do bimestre e agora está <strong className="text-amber-700">em dia</strong>!
            </p>
            <span className="inline-block mt-3 text-[11px] font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              ⭐ Estrela de Entrega Completa
            </span>
          </div>
        </div>
      )}

      {/* Lembrete Esporádico Amigável de Documento Pendente */}
      {sporadicReminder && (
        <div className="fixed bottom-5 left-5 z-40 max-w-sm bg-white border border-blue-200 rounded-2xl shadow-xl p-4 flex items-start space-x-3 animate-fadeIn">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shrink-0">
            <BellRing className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900">Lembrete da Coordenação</p>
            <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
              {sporadicReminder.message}
            </p>
            <div className="flex items-center space-x-2 mt-2.5">
              <button
                type="button"
                onClick={() => {
                  const cat = sporadicReminder.category;
                  setSporadicReminder(null);
                  openUploadFor(cat);
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg transition"
              >
                Enviar agora
              </button>
              <button
                type="button"
                onClick={() => setSporadicReminder(null)}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
              >
                Depois
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSporadicReminder(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
            title="Fechar lembrete"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
};
