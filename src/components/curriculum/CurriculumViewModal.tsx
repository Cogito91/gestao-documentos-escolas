import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  Calculator,
  FlaskConical,
  Landmark,
  Globe2,
  Languages,
  Palette,
  Trophy,
  Heart,
  GraduationCap,
  Search,
  Copy,
  Check,
  ChevronDown,
  Info,
  FileSpreadsheet,
  X,
  Sparkles,
  Calendar,
  FileText,
  Clock,
  CheckSquare,
  Users,
  CheckCircle2,
  ClipboardList,
  Trash2,
  Send,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import {
  curriculumByDiscipline,
  allDisciplinesList,
  MatrixItem,
} from '../../data/curriculumData';
import { pedagogicalService } from '../../services/pedagogicalService';
import { messageService } from '../../services/messageService';
import { supabase } from '../../lib/supabaseClient';

  interface CurriculumViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userDiscipline?: string | null;
  restrictToUserDiscipline?: boolean;
  onRefreshCalendar?: () => void;
  standalone?: boolean;
}

interface SelectedKnowledgeObject {
  key: string;
  code: string;
  text: string;
  componente: string;
  ano: string;
  bimestre: string;
}

// Configuração visual alegre, suave e agradável para cada disciplina
const disciplineMeta: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    activeClasses: string;
    inactiveClasses: string;
    activeBadge: string;
    inactiveBadge: string;
  }
> = {
  'LÍNGUA PORTUGUESA': {
    label: 'Língua Portuguesa',
    icon: BookOpen,
    activeClasses: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-300',
    inactiveClasses: 'bg-white hover:bg-blue-50/80 text-slate-700 border-slate-200 hover:border-blue-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-blue-100 text-blue-800',
  },
  'MATEMÁTICA': {
    label: 'Matemática',
    icon: Calculator,
    activeClasses: 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20 ring-2 ring-teal-300',
    inactiveClasses: 'bg-white hover:bg-teal-50/80 text-slate-700 border-slate-200 hover:border-teal-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-teal-100 text-teal-800',
  },
  'CIÊNCIAS': {
    label: 'Ciências',
    icon: FlaskConical,
    activeClasses: 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-500/20 ring-2 ring-cyan-300',
    inactiveClasses: 'bg-white hover:bg-cyan-50/80 text-slate-700 border-slate-200 hover:border-cyan-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-cyan-100 text-cyan-800',
  },
  'HISTÓRIA': {
    label: 'História',
    icon: Landmark,
    activeClasses: 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 ring-2 ring-amber-300',
    inactiveClasses: 'bg-white hover:bg-amber-50/80 text-slate-700 border-slate-200 hover:border-amber-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-amber-100 text-amber-900',
  },
  'GEOGRAFIA': {
    label: 'Geografia',
    icon: Globe2,
    activeClasses: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-300',
    inactiveClasses: 'bg-white hover:bg-emerald-50/80 text-slate-700 border-slate-200 hover:border-emerald-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-emerald-100 text-emerald-800',
  },
  'LÍNGUA INGLESA': {
    label: 'Língua Inglesa',
    icon: Languages,
    activeClasses: 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-300',
    inactiveClasses: 'bg-white hover:bg-indigo-50/80 text-slate-700 border-slate-200 hover:border-indigo-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-indigo-100 text-indigo-800',
  },
  'ARTE': {
    label: 'Arte',
    icon: Palette,
    activeClasses: 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20 ring-2 ring-rose-300',
    inactiveClasses: 'bg-white hover:bg-rose-50/80 text-slate-700 border-slate-200 hover:border-rose-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-rose-100 text-rose-800',
  },
  'EDUCAÇÃO FÍSICA': {
    label: 'Educação Física',
    icon: Trophy,
    activeClasses: 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-500/20 ring-2 ring-sky-300',
    inactiveClasses: 'bg-white hover:bg-sky-50/80 text-slate-700 border-slate-200 hover:border-sky-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-sky-100 text-sky-800',
  },
  'ENSINO RELIGIOSO': {
    label: 'Ensino Religioso',
    icon: Heart,
    activeClasses: 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20 ring-2 ring-purple-300',
    inactiveClasses: 'bg-white hover:bg-purple-50/80 text-slate-700 border-slate-200 hover:border-purple-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-purple-100 text-purple-800',
  },
  'LETRAM. MATEMÁTICO': {
    label: 'Letram. Matemático',
    icon: GraduationCap,
    activeClasses: 'bg-teal-700 text-white border-teal-700 shadow-md shadow-teal-600/20 ring-2 ring-teal-400',
    inactiveClasses: 'bg-white hover:bg-teal-50/80 text-slate-700 border-slate-200 hover:border-teal-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-teal-100 text-teal-800',
  },
  'LETRAM. CIENTÍFICO': {
    label: 'Letram. Científico',
    icon: GraduationCap,
    activeClasses: 'bg-cyan-700 text-white border-cyan-700 shadow-md shadow-cyan-600/20 ring-2 ring-cyan-400',
    inactiveClasses: 'bg-white hover:bg-cyan-50/80 text-slate-700 border-slate-200 hover:border-cyan-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-cyan-100 text-cyan-800',
  },
  'LETRAM. HUMANIDADE E CIDADANIA': {
    label: 'Letram. Humanidades',
    icon: GraduationCap,
    activeClasses: 'bg-indigo-700 text-white border-indigo-700 shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400',
    inactiveClasses: 'bg-white hover:bg-indigo-50/80 text-slate-700 border-slate-200 hover:border-indigo-300',
    activeBadge: 'bg-white/20 text-white',
    inactiveBadge: 'bg-indigo-100 text-indigo-800',
  },
};

// Siglas curtas e padronizadas para otimizar espaço na matriz
const DISCIPLINE_ABBR: Record<string, string> = {
  'LÍNGUA PORTUGUESA': 'LP',
  'MATEMÁTICA': 'MAT',
  'CIÊNCIAS': 'CIÊN',
  'HISTÓRIA': 'HIST',
  'GEOGRAFIA': 'GEO',
  'LÍNGUA INGLESA': 'LI',
  'ARTE': 'ART',
  'EDUCAÇÃO FÍSICA': 'ED. FÍS.',
  'ENSINO RELIGIOSO': 'ENS. RELI.',
  'LETRAM. MATEMÁTICO': 'LET. MAT',
  'LETRAM. CIENTÍFICO': 'LET. CIÊN',
  'LETRAM. HUMANIDADE E CIDADANIA': 'LET. HUM',
};

// Estilização por Tipo de Coleta (Cores diferenciadas para BNCC/CO, SEQUENCIA DIDATICA, etc.)
const TIPO_COLETA_STYLES: Record<string, { bg: string; text: string; border: string; rowBg?: string }> = {
  'BNCC/CO': {
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    border: 'border-amber-300',
    rowBg: 'bg-amber-50/40 hover:bg-amber-100/50',
  },
  'SEQUENCIA DIDATICA': {
    bg: 'bg-purple-100',
    text: 'text-purple-900',
    border: 'border-purple-300',
    rowBg: 'bg-purple-50/40 hover:bg-purple-100/50',
  },
  'ROTEIRO': {
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    rowBg: 'bg-emerald-50/40 hover:bg-emerald-100/50',
  },
  'ESCOLA ADOLESCENCIA': {
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-300',
    rowBg: 'bg-rose-50/40 hover:bg-rose-100/50',
  },
  'CURRICULO': {
    bg: 'bg-sky-100',
    text: 'text-sky-900',
    border: 'border-sky-200',
    rowBg: '',
  },
};

// Opções de Modalidade e Etapas (Ensino Fundamental Anos Finais & EJA Noturno Semed Manaus)
const anosOptions = [
  { label: 'Todos os Anos / Etapas', value: 'all' },
  { label: '--- Ensino Fundamental (Regular) ---', value: 'sep_regular', disabled: true },
  { label: '6º ANO', value: '6 ANO' },
  { label: '7º ANO', value: '7 ANO' },
  { label: '8º ANO', value: '8 ANO' },
  { label: '9º ANO', value: '9 ANO' },
  { label: '--- EJA 2º Segmento (Noturno) ---', value: 'sep_eja2', disabled: true },
  { label: 'EJA 1ª Etapa (5ª Fase)', value: '6 ANO' },
  { label: 'EJA 2ª Etapa (6ª Fase)', value: '7 ANO' },
  { label: 'EJA 3ª Etapa (7ª Fase)', value: '8 ANO' },
  { label: 'EJA 4ª Etapa (8ª Fase)', value: '9 ANO' },
  { label: '--- EJA 1º Segmento (Iniciais) ---', value: 'sep_eja1', disabled: true },
  { label: 'EJA Alfabetização (1º Ano)', value: '1 ANO' },
  { label: 'EJA Módulo 1 (2º Ano)', value: '2 ANO' },
  { label: 'EJA Módulo 2 (3º Ano)', value: '3 ANO' },
  { label: 'EJA Módulo 3 (4º Ano)', value: '4 ANO' },
  { label: 'EJA Módulo 4 (5º Ano)', value: '5 ANO' },
];

const bimestresOptions = [
  { label: 'Todos os Bimestres', value: 'all' },
  { label: '1º BIM', value: '1 BIM' },
  { label: '2º BIM', value: '2 BIM' },
  { label: '3º BIM', value: '3 BIM' },
  { label: '4º BIM', value: '4 BIM' },
];

export const CurriculumViewModal: React.FC<CurriculumViewModalProps> = ({
  isOpen,
  onClose,
  userDiscipline,
  restrictToUserDiscipline = false,
  onRefreshCalendar,
  standalone = false,
}) => {
  // Lista de todas as disciplinas com dados
  const allValidDisciplines = useMemo(() => {
    return allDisciplinesList.filter((d) => (curriculumByDiscipline[d] || []).length > 0);
  }, []);

  // Seleciona a disciplina inicial com base no cadastro do professor ou URL param
  const initialTab = useMemo(() => {
    const urlMateria = new URLSearchParams(window.location.search).get('materia');
    const rawUserDisc = urlMateria || userDiscipline || (restrictToUserDiscipline ? 'MATEMÁTICA' : null);
    if (!rawUserDisc) return allValidDisciplines[0] || 'LÍNGUA PORTUGUESA';
    const normUser = rawUserDisc
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

    const found = allValidDisciplines.find((d) => {
      const normD = d
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
      return normD.includes(normUser) || normUser.includes(normD);
    });

    return found || (restrictToUserDiscipline ? 'MATEMÁTICA' : allValidDisciplines[0] || 'LÍNGUA PORTUGUESA');
  }, [userDiscipline, restrictToUserDiscipline, allValidDisciplines]);

  // Se for acesso restrito de professor ou modo standalone focado na matéria, exibe somente a disciplina
  const availableDisciplines = useMemo(() => {
    if (restrictToUserDiscipline || standalone) {
      return [initialTab];
    }
    return allValidDisciplines;
  }, [restrictToUserDiscipline, standalone, initialTab, allValidDisciplines]);

  const [activeDiscipline, setActiveDiscipline] = useState<string>(initialTab);
  const [selectedAno, setSelectedAno] = useState<string>('all');
  const [selectedBimestre, setSelectedBimestre] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedHabilidades, setExpandedHabilidades] = useState<Record<number, boolean>>({});

  // Estado de Seleção de Objetos de Conhecimento
  const [selectedObjects, setSelectedObjects] = useState<Record<string, SelectedKnowledgeObject>>({});
  
  // Estado do Menu de Contexto (botão direito)
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
  } | null>(null);

  // Modais de Criação de Avaliação e Atividade
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isMyActivitiesModalOpen, setIsMyActivitiesModalOpen] = useState(false);
  const [isDisciplinesCollapsed, setIsDisciplinesCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [teachersList, setTeachersList] = useState<{ id: string; full_name: string; discipline?: string | null }[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Record<string, boolean>>({});
  const [launchedKeys, setLaunchedKeys] = useState<Record<string, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !restrictToUserDiscipline) return;
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;
        setCurrentUserId(user.id);
        const savedLaunched = localStorage.getItem(`launched_objects_${user.id}`);
        if (savedLaunched) {
          try {
            setLaunchedKeys(JSON.parse(savedLaunched));
          } catch {
            // ignore
          }
        }
        const msgs = await messageService.getMessages();
        if (!mounted) return;
        const nextPending: Record<string, boolean> = {};
        for (const m of msgs) {
          if (m.recipient_id === user.id && m.content?.includes('pendências de envio de objetos de conhecimento')) {
            const lines = m.content.split('\n');
            for (const line of lines) {
              const match = line.match(/^•\s+\[([^\]]+)\]\s+(.+?)\s+\([^)]+\)\s*$/);
              if (match) {
                nextPending[`${match[1]}::${match[2].trim()}`] = true;
              }
            }
            const legacyMatch = m.content.match(/<!--pending_keys:(\[.*?\])-->/);
            if (legacyMatch?.[1]) {
              try {
                const keys: string[] = JSON.parse(legacyMatch[1]);
                for (const k of keys) nextPending[k] = true;
              } catch {
                // ignore
              }
            }
          }
        }
        setPendingKeys(nextPending);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen, restrictToUserDiscipline]);

  const handleToggleLaunchedObject = (lineKey: string) => {
    setLaunchedKeys((prev) => {
      const next = { ...prev, [lineKey]: !prev[lineKey] };
      if (!next[lineKey]) delete next[lineKey];
      if (currentUserId) {
        localStorage.setItem(`launched_objects_${currentUserId}`, JSON.stringify(next));
      }
      return next;
    });
  };
  const [myActivitiesFilter, setMyActivitiesFilter] = useState<'all' | 'assessment' | 'activity'>('all');

  // Listagem de atividades e avaliações salvas
  const [savedAssessments, setSavedAssessments] = useState<any[]>([]);
  const [savedActivities, setSavedActivities] = useState<any[]>([]);

  const loadSavedData = () => {
    try {
      const a = JSON.parse(localStorage.getItem('teacher_scheduled_assessments') || '[]');
      const b = JSON.parse(localStorage.getItem('teacher_scheduled_activities') || '[]');
      setSavedAssessments(a);
      setSavedActivities(b);
    } catch {
      setSavedAssessments([]);
      setSavedActivities([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSavedData();
    }
  }, [isOpen]);

  const handleDeleteSavedItem = (id: number, type: 'assessment' | 'activity') => {
    if (type === 'assessment') {
      if (!confirm('Deseja excluir esta avaliação?')) return;
      const filtered = savedAssessments.filter((item) => item.id !== id);
      localStorage.setItem('teacher_scheduled_assessments', JSON.stringify(filtered));
      setSavedAssessments(filtered);
    } else {
      if (!confirm('Deseja excluir esta atividade?')) return;
      const filtered = savedActivities.filter((item) => item.id !== id);
      localStorage.setItem('teacher_scheduled_activities', JSON.stringify(filtered));
      setSavedActivities(filtered);
    }
    setSuccessToast('Item excluído com sucesso!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Campos do formulário de Avaliação
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    return tomorrow.toISOString().split('T')[0];
  });
  const [assessmentClass, setAssessmentClass] = useState('6º Ano A');
  const [assessmentWeight, setAssessmentWeight] = useState('10,0 pontos');
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [isSavingAssessment, setIsSavingAssessment] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Campos do formulário de Atividade
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDueDate, setActivityDueDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 3);
    return nextWeek.toISOString().split('T')[0];
  });
  const [activityClass, setActivityClass] = useState('6º Ano A');
  const [activityInstructions, setActivityInstructions] = useState('');

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Sincroniza ao abrir com a matéria do professor
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveDiscipline(initialTab);
    }
  }, [isOpen, initialTab]);

  // Fecha o menu de contexto ao clicar em qualquer lugar fora dele
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('contextmenu', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('contextmenu', handleOutsideClick);
    };
  }, [contextMenu]);

  // Alterna a seleção de um objeto de conhecimento ao clicar
  const handleToggleSelectObject = (obj: SelectedKnowledgeObject) => {
    setSelectedObjects((prev) => {
      const copy = { ...prev };
      if (copy[obj.key]) {
        delete copy[obj.key];
      } else {
        copy[obj.key] = obj;
      }
      return copy;
    });
  };

  // Abre o menu de contexto ao clicar com o botão direito sobre um objeto de conhecimento
  const handleContextMenu = (
    e: React.MouseEvent,
    obj: SelectedKnowledgeObject
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Se o item clicado não estiver selecionado, seleciona ele automaticamente
    setSelectedObjects((prev) => {
      if (!prev[obj.key]) {
        return { ...prev, [obj.key]: obj };
      }
      return prev;
    });

    // Calcula posição para não estourar a tela
    const posX = Math.min(e.clientX, window.innerWidth - 250);
    const posY = Math.min(e.clientY, window.innerHeight - 260);

    setContextMenu({
      isOpen: true,
      x: posX,
      y: posY,
    });
  };

  // Copia texto com feedback visual
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const toggleHabilidade = (id: number) => {
    setExpandedHabilidades((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Ações do Menu de Contexto
  const handleOpenCreateAssessment = () => {
    const count = Object.keys(selectedObjects).length;
    const defaultTitle = `Avaliação Bimestral de ${activeMeta.label} (${count} objeto${count > 1 ? 's' : ''})`;
    setAssessmentTitle(defaultTitle);
    setContextMenu(null);
    setIsAssessmentModalOpen(true);
  };

  const handleOpenCreateActivity = () => {
    const count = Object.keys(selectedObjects).length;
    const defaultTitle = `Atividade de Fixação de ${activeMeta.label}`;
    setActivityTitle(defaultTitle);
    setContextMenu(null);
    setIsActivityModalOpen(true);
  };

  const handleCopySelectedObjects = () => {
    const list = Object.values(selectedObjects);
    if (list.length === 0) return;
    const formatted = list
      .map((item, i) => `${i + 1}. [${item.code}] ${item.text}`)
      .join('\n');
    navigator.clipboard.writeText(formatted);
    setSuccessToast(`${list.length} objetos copiados para a área de transferência!`);
    setTimeout(() => setSuccessToast(null), 3000);
    setContextMenu(null);
  };

  const handleClearSelection = () => {
    setSelectedObjects({});
    setContextMenu(null);
  };

  // Salvar Avaliação no Calendário Escolar
  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentTitle.trim() || !assessmentDate) return;

    setIsSavingAssessment(true);
    const selectedList = Object.values(selectedObjects);
    const desc = `Turma: ${assessmentClass} | Disciplina: ${activeDiscipline}\nObjetos de Conhecimento vinculados:\n${selectedList
      .map((o) => `• (${o.code}) ${o.text}`)
      .join('\n')}${assessmentNotes ? `\n\nObs: ${assessmentNotes}` : ''}`;

    try {
      // Tenta salvar evento de avaliação no calendário
      await pedagogicalService.addSchoolEvent({
        title: `📝 [PROVA] ${assessmentTitle.trim()}`,
        description: desc,
        event_date: assessmentDate,
        event_type: 'prova',
      });
      if (onRefreshCalendar) onRefreshCalendar();
    } catch (err) {
      console.warn('Salvando localmente avaliação:', err);
    } finally {
      // Salva no histórico local do professor
      const saved = JSON.parse(localStorage.getItem('teacher_scheduled_assessments') || '[]');
      saved.push({
        id: Date.now(),
        title: assessmentTitle.trim(),
        date: assessmentDate,
        turma: assessmentClass,
        discipline: activeDiscipline,
        weight: assessmentWeight,
        objects: selectedList,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('teacher_scheduled_assessments', JSON.stringify(saved));
      loadSavedData();

      setIsSavingAssessment(false);
      setIsAssessmentModalOpen(false);
      setSuccessToast(`Avaliação agendada com sucesso para ${assessmentDate.split('-').reverse().join('/')}!`);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  // Salvar Atividade
  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim()) return;

    const selectedList = Object.values(selectedObjects);
    const saved = JSON.parse(localStorage.getItem('teacher_scheduled_activities') || '[]');
    saved.push({
      id: Date.now(),
      title: activityTitle.trim(),
      dueDate: activityDueDate,
      turma: activityClass,
      discipline: activeDiscipline,
      instructions: activityInstructions,
      objects: selectedList,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem('teacher_scheduled_activities', JSON.stringify(saved));
    loadSavedData();

    setIsActivityModalOpen(false);
    setSuccessToast(`Atividade "${activityTitle}" criada com sucesso!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Linhas da aba ativa com filtros aplicados, preservando estritamente a ordem oficial do documento
  const filteredItems = useMemo(() => {
    const rawItems = curriculumByDiscipline[activeDiscipline] || [];

    return rawItems.filter((item) => {
      const matchesAno = selectedAno === 'all' || item.ano === selectedAno;
      const matchesBim = selectedBimestre === 'all' || item.bimestre === selectedBimestre;

      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.codigo.toLowerCase().includes(q) ||
        item.objeto.toLowerCase().includes(q) ||
        item.habilidade.toLowerCase().includes(q) ||
        item.tipoColeta.toLowerCase().includes(q) ||
        item.segmento.toLowerCase().includes(q);

      return matchesAno && matchesBim && matchesSearch;
    });
  }, [activeDiscipline, selectedAno, selectedBimestre, searchTerm]);

  const activeMeta = disciplineMeta[activeDiscipline] || {
    label: activeDiscipline,
    icon: BookOpen,
  };
  const ActiveIcon = activeMeta.icon;
  const selectedCount = Object.keys(selectedObjects).length;

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen || standalone ? 'p-0' : 'p-2 sm:p-4'} bg-slate-900/50 backdrop-blur-sm animate-fadeIn`}>
      <div className={`bg-white shadow-2xl w-full ${isFullscreen || standalone ? 'h-screen max-w-none rounded-none' : 'max-w-7xl max-h-[96vh] rounded-3xl'} flex flex-col overflow-hidden border border-slate-200 relative`}>
        
        {/* Toast de Sucesso Flutuante */}
        {successToast && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Cabeçalho com Cores Alegres e Calmas (Gradiente Azul Céu e Índigo) */}
        <div className="px-4 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-sky-500 via-teal-500 to-indigo-600 text-white flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-1.5 bg-white/20 rounded-xl border border-white/30 text-white shadow-inner backdrop-blur-xs shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-extrabold text-xs sm:text-base tracking-tight text-white drop-shadow-2xs truncate">
                Matriz Curricular SEMED Manaus 2026
              </h3>
              <span className="hidden sm:inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/35 uppercase tracking-wider backdrop-blur-2xs shrink-0">
                6º ao 9º Ano
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {restrictToUserDiscipline && (
              <button
                type="button"
                onClick={() => {
                  loadSavedData();
                  setIsMyActivitiesModalOpen(true);
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-white bg-white/20 hover:bg-white/30 rounded-xl transition border border-white/25 flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Visualizar todas as avaliações e atividades criadas"
              >
                <ClipboardList className="w-3.5 h-3.5 text-sky-200" />
                <span className="hidden md:inline">Minhas Atividades</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-indigo-900 shadow-2xs">
                  {savedAssessments.length + savedActivities.length}
                </span>
              </button>
            )}

            {/* Botão Abrir em Nova Aba */}
            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.origin + window.location.pathname);
                url.searchParams.set('matriz', 'standalone');
                url.searchParams.set('materia', activeDiscipline);
                window.open(url.toString(), '_blank');
              }}
              className="p-1.5 text-white bg-white/15 hover:bg-white/25 rounded-xl transition border border-white/25 shadow-xs cursor-pointer"
              title={`Abrir apenas a matriz de ${activeMeta.label} em outra janela`}
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Botão Tela Cheia */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 text-white bg-white/15 hover:bg-white/25 rounded-xl transition border border-white/25 shadow-xs cursor-pointer"
              title={isFullscreen ? 'Sair da tela cheia' : 'Abrir em tela cheia'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 text-xs font-bold text-white hover:text-white bg-white/20 hover:bg-white/30 rounded-xl transition border border-white/25 flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Fechar</span>
            </button>
          </div>
        </div>

        {/* ÁREA DE SELEÇÃO DE DISCIPLINAS (ALEGRE, CLARA E ORGANIZADA) */}
        <div
          className={`${
            isDisciplinesCollapsed ? 'px-3 py-1.5 sm:px-4' : 'p-3 sm:p-4'
          } bg-gradient-to-b from-sky-50/60 via-indigo-50/30 to-white border-b border-sky-100 transition-all`}
        >
          <div className={`flex items-center justify-between gap-2 ${isDisciplinesCollapsed ? '' : 'mb-2'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">
                  {restrictToUserDiscipline
                    ? 'Seu Componente Curricular (6º ao 9º Ano):'
                    : 'Componentes Curriculares (6º ao 9º Ano):'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-block text-[11px] font-bold text-sky-800 bg-white px-2.5 py-0.5 rounded-xl border border-sky-200/80 shadow-2xs">
                {restrictToUserDiscipline ? (
                  <>
                    Acesso Exclusivo: <strong className="text-teal-700 font-black">{activeMeta.label}</strong>
                  </>
                ) : (
                  <>
                    Visualizando: <strong className="text-sky-950 font-black">{activeMeta.label}</strong>
                  </>
                )}
              </span>

              <button
                type="button"
                onClick={() => setIsDisciplinesCollapsed((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                title={isDisciplinesCollapsed ? 'Expandir filtros e disciplinas' : 'Recolher tudo para ampliar a matriz'}
              >
                <span>{isDisciplinesCollapsed ? 'Expandir' : 'Recolher'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isDisciplinesCollapsed ? '' : 'rotate-180'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Cards Coloridos e Aconchegantes das Disciplinas */}
          {!isDisciplinesCollapsed && (
          <div
            className={
              restrictToUserDiscipline
                ? 'flex justify-center'
                : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2'
            }
          >
            {availableDisciplines.map((disc) => {
              const meta = disciplineMeta[disc] || {
                label: disc,
                icon: BookOpen,
                activeClasses: 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-300',
                inactiveClasses: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200',
                activeBadge: 'bg-white/25 text-white',
                inactiveBadge: 'bg-slate-100 text-slate-700',
              };
              const IconComp = meta.icon;
              const isActive = activeDiscipline === disc;
              const count = (curriculumByDiscipline[disc] || []).length;

              return (
                <button
                  key={disc}
                  type="button"
                  onClick={() => setActiveDiscipline(disc)}
                  className={`p-2 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer ${
                    restrictToUserDiscipline ? 'w-full max-w-xs' : ''
                  } ${
                    isActive
                      ? `${meta.activeClasses} scale-[1.02]`
                      : `${meta.inactiveClasses} hover:scale-[1.01] shadow-2xs`
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-1.5 rounded-xl shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100/90 text-slate-600'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-black truncate leading-tight">
                      {meta.label}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                      isActive ? meta.activeBadge : meta.inactiveBadge
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          )}
        </div>

        {/* BARRA DE FILTROS E BUSCA (SERENA E LIMPA) */}
        {!isDisciplinesCollapsed && !standalone && (
        <div className="px-4 py-2.5 bg-white border-b border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">

            {/* Filtro Ano de Ensino (6º ao 9º Ano) */}
            <div className="sm:col-span-4">
              <select
                value={selectedAno}
                onChange={(e) => setSelectedAno(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 border border-slate-300 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-sky-400 focus:outline-none"
              >
                {anosOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled} className={opt.disabled ? 'font-bold text-slate-400 bg-slate-100' : ''}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Bimestre */}
            <div className="sm:col-span-4">
              <select
                value={selectedBimestre}
                onChange={(e) => setSelectedBimestre(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 border border-slate-300 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-sky-400 focus:outline-none"
              >
                {bimestresOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo Busca Rápida */}
            <div className="sm:col-span-4 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
              <input
                type="text"
                placeholder="Buscar código ou palavra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-sky-400 focus:outline-none"
              />
            </div>

          </div>

          {/* Dica de Lançamento e Ação de Clique / Botão Direito */}
          <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-sky-900 bg-sky-50/80 border border-sky-200/80 px-3 py-1 rounded-xl gap-2">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>
                {restrictToUserDiscipline ? (
                  <>
                    <strong>Dica:</strong> Clique para selecionar • <strong>Duplo clique</strong> para riscar lançado • Botão direito para opções.
                  </>
                ) : (
                  <>
                    <strong>Consulta SEMED:</strong> Selecione os objetos para copiar ou enviar solicitação ao professor.
                  </>
                )}
              </span>
            </span>
            <span className="font-bold text-sky-700 shrink-0">
              {selectedCount > 0 ? (
                <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {selectedCount} item(s) selecionado(s)
                </span>
              ) : (
                'Ordem oficial SEMED preservada'
              )}
            </span>
          </div>
        </div>
        )}

        {/* TABELA COM CABEÇALHO EM AZUL MARÍTIMO CALMO E ELEGANTE */}
        <div className="flex-1 overflow-auto bg-slate-50 relative">
          <table className="w-full border-collapse text-xs">
            {/* Cabeçalho Calmo e Alegre em Azul Marítimo */}
            <thead className="sticky top-0 z-20 bg-gradient-to-r from-sky-800 via-[#1b4965] to-indigo-800 text-white shadow-xs">
              <tr>
                <th className="px-3 py-2 text-center font-extrabold border border-sky-900/40 tracking-wider uppercase whitespace-nowrap w-24">
                  TIPO DE COLETA
                </th>
                <th className="px-2.5 py-2 text-center font-extrabold border border-sky-900/40 tracking-wider uppercase whitespace-nowrap w-20">
                  ANO
                </th>
                <th className="px-2 py-2 text-center font-extrabold border border-sky-900/40 tracking-wider uppercase whitespace-nowrap w-16">
                  BIM
                </th>
                <th className="px-2.5 py-2 text-center font-extrabold border border-sky-900/40 tracking-wider uppercase whitespace-nowrap w-20">
                  COMP.
                </th>
                <th className="px-3 py-2 text-center font-extrabold border border-sky-900/40 tracking-wider uppercase whitespace-nowrap w-32">
                  ALFA-NUMÉRICO
                </th>
                <th className="px-4 py-2 text-left font-extrabold border border-sky-900/40 tracking-wider uppercase min-w-[340px]">
                  OBJETOS DE CONHECIMENTO (CLIQUE PARA SELECIONAR • BOTÃO DIREITO PARA AÇÕES)
                </th>
              </tr>
            </thead>

            {/* Linhas de Dados */}
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="font-bold text-slate-700">Nenhum registro encontrado para estes filtros.</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Tente alterar o ano de ensino, o bimestre ou limpar o campo de busca.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, rowIndex) => {
                  const isEven = rowIndex % 2 === 0;
                  const isHabilidadeOpen = expandedHabilidades[item.id];
                  const codeKey = `code-${item.id}`;
                  const tipoStyle = TIPO_COLETA_STYLES[item.tipoColeta] || TIPO_COLETA_STYLES['CURRICULO'];
                  const abbrComponente = DISCIPLINE_ABBR[item.componente] || item.componente;

                  return (
                    <tr
                      key={`row-${item.id}-${item.codigo}`}
                      className={`transition-colors ${
                        tipoStyle.rowBg || (isEven ? 'bg-white hover:bg-sky-50/40' : 'bg-slate-50/50 hover:bg-sky-50/40')
                      }`}
                    >
                      {/* 1. TIPO DE COLETA */}
                      <td className="px-2.5 py-2.5 text-center align-top border border-slate-200 font-bold whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] uppercase font-black border ${tipoStyle.bg} ${tipoStyle.text} ${tipoStyle.border} shadow-2xs`}
                        >
                          {item.tipoColeta || 'CURRÍCULO'}
                        </span>
                      </td>

                      {/* 2. ANO DE ENSINO */}
                      <td className="px-2 py-2.5 text-center align-top border border-slate-200 font-bold text-slate-800 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-100">
                          {item.ano}
                        </span>
                      </td>

                      {/* 3. BIM */}
                      <td className="px-1.5 py-2.5 text-center align-top border border-slate-200 font-bold text-slate-800 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-100">
                          {item.bimestre}
                        </span>
                      </td>

                      {/* 4. COMPONENTE CURRICULAR (SIGLA) */}
                      <td className="px-2 py-2.5 text-center align-top border border-slate-200 font-black text-slate-800 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-100 text-slate-800 border border-slate-200"
                          title={item.componente}
                        >
                          {abbrComponente}
                        </span>
                      </td>

                      {/* 5. ALFA-NUMÉRICO */}
                      <td className="px-2.5 py-2.5 text-center align-top border border-slate-200 whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono font-black text-xs text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 shadow-2xs tracking-wider">
                            {item.codigo}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.codigo, codeKey)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition ${
                              copiedKey === codeKey
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white hover:bg-sky-50 text-slate-700 border border-slate-300 hover:border-sky-300'
                            }`}
                            title="Copiar código alfanumérico para a plataforma"
                          >
                            {copiedKey === codeKey ? (
                              <>
                                <Check className="w-3 h-3 text-white" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-sky-600" />
                                <span>Copiar Código</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 7. OBJETOS DE CONHECIMENTO */}
                      <td className="px-4 py-3 align-top border border-slate-200">
                        <div className="space-y-2">
                          {/* Cada sub-item/bullet separado numerado com seleção por clique e menu de contexto por botão direito */}
                          {item.objetoItems.map((objLine, lineIdx) => {
                            const lineKey = `line-${item.id}-${lineIdx}`;
                            const isCopied = copiedKey === lineKey;
                            const isSelected = !!selectedObjects[lineKey];

                            const objData: SelectedKnowledgeObject = {
                              key: lineKey,
                              code: item.codigo,
                              text: objLine,
                              componente: item.componente,
                              ano: item.ano,
                              bimestre: item.bimestre,
                            };

                            const isLaunched = Boolean(launchedKeys[lineKey]);
                            const isPending =
                              (Boolean(pendingKeys[lineKey]) || Boolean(pendingKeys[`${item.codigo}::${objLine.trim()}`])) &&
                              !isLaunched;

                            return (
                              <div
                                key={lineKey}
                                onClick={() => handleToggleSelectObject(objData)}
                                onDoubleClick={() => restrictToUserDiscipline && handleToggleLaunchedObject(lineKey)}
                                onContextMenu={restrictToUserDiscipline ? (e) => handleContextMenu(e, objData) : undefined}
                                title={
                                  restrictToUserDiscipline
                                    ? 'Clique para selecionar • Duplo clique para riscar/marcar como lançado • Botão direito para opções'
                                    : 'Clique para selecionar'
                                }
                                className={`p-2.5 rounded-xl border transition-all duration-150 flex items-start justify-between gap-2.5 cursor-pointer select-none group ${
                                  isPending
                                    ? 'bg-rose-50 border-rose-500 text-rose-950 ring-1 ring-rose-400 shadow-sm font-semibold'
                                    : isLaunched
                                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-500 opacity-75 line-through decoration-2 decoration-emerald-600'
                                    : isSelected
                                    ? 'bg-sky-50 border-sky-500 shadow-sm ring-1 ring-sky-400 text-sky-950 font-medium'
                                    : isCopied
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs'
                                    : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 text-slate-800'
                                }`}
                              >
                                <div className="flex items-start gap-2.5 flex-1">
                                  {/* Indicador de Seleção / Número */}
                                  <span
                                    className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black shrink-0 transition-colors ${
                                      isSelected
                                        ? 'bg-sky-600 text-white'
                                        : 'bg-sky-100 text-sky-800 group-hover:bg-sky-200'
                                    }`}
                                  >
                                    {isSelected ? <Check className="w-2.5 h-2.5" /> : lineIdx + 1}
                                  </span>

                                  <span className="text-xs leading-relaxed">
                                    {objLine}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {/* Badge Visual de Selecionado */}
                                  {isSelected && (
                                    <span className="text-[10px] font-bold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-md">
                                      Selecionado
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleCopy(objLine, lineKey)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-2xs ${
                                      isCopied
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-50 hover:bg-sky-100 text-slate-700 hover:text-sky-800 border border-slate-200'
                                    }`}
                                    title="Copiar este objeto de conhecimento"
                                  >
                                    {isCopied ? (
                                      <>
                                        <Check className="w-3 h-3 text-white" />
                                        <span>Copiado!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-sky-600" />
                                        <span>Copiar</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Ações Auxiliares: Ver Habilidade CEM e Copiar Tudo */}
                          <div className="pt-1 flex items-center justify-between text-[11px]">
                            <button
                              type="button"
                              onClick={() => toggleHabilidade(item.id)}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
                            >
                              <span>{isHabilidadeOpen ? 'Ocultar Habilidade CEM' : 'Ver Habilidade CEM (BNCC)'}</span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  isHabilidadeOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            {item.objetoItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleCopy(item.objeto, `full-${item.id}`)}
                                className="text-[10px] text-slate-500 hover:text-slate-800 underline flex items-center gap-1"
                              >
                                {copiedKey === `full-${item.id}` ? 'Todos Copiados! ✓' : 'Copiar todo o texto da célula'}
                              </button>
                            )}
                          </div>

                          {/* Descrição da Habilidade CEM Expandida */}
                          {isHabilidadeOpen && (
                            <div className="mt-2 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 leading-relaxed animate-fadeIn">
                              <span className="font-bold text-indigo-900 block mb-0.5">
                                Habilidade CEM ({item.codigo}):
                              </span>
                              {item.habilidade}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BARRA FLUTUANTE DE ITENS SELECIONADOS */}
        {selectedCount > 0 && (
          <div className="p-3 bg-gradient-to-r from-sky-600 to-indigo-700 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg border-t border-sky-400/30 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-white/20 text-white">
                <CheckSquare className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-black">
                  {selectedCount} objeto{selectedCount > 1 ? 's' : ''} de conhecimento selecionado{selectedCount > 1 ? 's' : ''}
                </p>
                <p className="text-[11px] text-sky-100">
                  Pronto para agendar avaliação ou criar atividade para a turma.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!restrictToUserDiscipline && (
                <button
                  type="button"
                  onClick={async () => {
                    setRequestSuccess(false);
                    setIsRequestModalOpen(true);
                    if (teachersList.length === 0) {
                      const { data } = await supabase
                        .from('profiles')
                        .select('id, full_name, discipline')
                        .eq('role', 'professor')
                        .order('full_name');
                      if (data) setTeachersList(data);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-white text-indigo-900 hover:bg-sky-50 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Enviar Solicitação de Inclusão</span>
                </button>
              )}
              {restrictToUserDiscipline && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenCreateAssessment}
                    className="px-3.5 py-1.5 bg-white text-indigo-900 hover:bg-sky-50 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Criar Avaliação / Prova</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCreateActivity}
                    className="px-3.5 py-1.5 bg-indigo-900/60 hover:bg-indigo-900/90 text-white border border-white/20 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-300" />
                    <span>Criar Atividade</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleCopySelectedObjects}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1"
                title="Copiar texto dos itens selecionados"
              >
                <Copy className="w-3 h-3" />
                <span>Copiar</span>
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1.5 text-white/80 hover:text-white text-xs font-semibold rounded-xl hover:bg-white/10 transition"
              >
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* Rodapé Informativo Serena */}
        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-3">
            <span>
              Componente Curricular: <strong className="text-slate-900">{activeMeta.label}</strong>
            </span>
            <span>•</span>
            <span>
              Exibindo <strong>{filteredItems.length}</strong> de {(curriculumByDiscipline[activeDiscipline] || []).length} registros (6º ao 9º Ano)
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            SEMED Manaus • Ensino Fundamental Anos Finais
          </div>
        </div>

        {/* MENU DE CONTEXTO POP-UP (CLIQUE COM O BOTÃO DIREITO) */}
        {contextMenu && (
          <div
            ref={contextMenuRef}
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-1.5 min-w-[240px] animate-fadeIn text-slate-800"
          >
            <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Ações Pedagógicas
              </span>
              <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded-full">
                {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateAssessment}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-sky-50 hover:text-sky-900 transition flex items-center gap-2.5"
            >
              <div className="p-1 rounded-lg bg-sky-100 text-sky-700">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <p className="leading-tight">Criar Avaliação / Prova</p>
                <span className="text-[10px] text-slate-400 font-normal">Agendar data com estes objetos</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateActivity}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-indigo-50 hover:text-indigo-900 transition flex items-center gap-2.5"
            >
              <div className="p-1 rounded-lg bg-indigo-100 text-indigo-700">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <p className="leading-tight">Criar Atividade / Tarefa</p>
                <span className="text-[10px] text-slate-400 font-normal">Exercícios para a turma</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleCopySelectedObjects}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-2.5"
            >
              <div className="p-1 rounded-lg bg-slate-100 text-slate-600">
                <Copy className="w-3.5 h-3.5" />
              </div>
              <span>Copiar Objeto(s) Selecionados</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={handleClearSelection}
              className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2.5"
            >
              <X className="w-3.5 h-3.5 text-rose-500" />
              <span>Limpar Seleção</span>
            </button>
          </div>
        )}

        {/* MODAL: AGENDAR AVALIAÇÃO COM OBJETOS DE CONHECIMENTO */}
        {isAssessmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              
              <div className="px-6 py-4 bg-gradient-to-r from-sky-600 to-indigo-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl text-white">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base">Agendar Avaliação / Prova</h4>
                    <p className="text-xs text-sky-100">
                      Defina o dia e a turma para avaliar estes objetos de conhecimento.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAssessmentModalOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAssessment} className="p-6 space-y-4">
                {/* Título da Avaliação */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título da Avaliação:
                  </label>
                  <input
                    type="text"
                    required
                    value={assessmentTitle}
                    onChange={(e) => setAssessmentTitle(e.target.value)}
                    placeholder="Ex: 1ª Avaliação Bimestral de Língua Inglesa"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {/* Data e Turma */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      <span>Data da Avaliação:</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={assessmentDate}
                      onChange={(e) => setAssessmentDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Turma:</span>
                    </label>
                    <select
                      value={assessmentClass}
                      onChange={(e) => setAssessmentClass(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-semibold"
                    >
                      <optgroup label="Ensino Regular (Diurno)">
                        <option value="6º Ano A">6º Ano A</option>
                        <option value="6º Ano B">6º Ano B</option>
                        <option value="6º Ano C">6º Ano C</option>
                        <option value="7º Ano A">7º Ano A</option>
                        <option value="7º Ano B">7º Ano B</option>
                        <option value="7º Ano C">7º Ano C</option>
                        <option value="8º Ano A">8º Ano A</option>
                        <option value="8º Ano B">8º Ano B</option>
                        <option value="8º Ano C">8º Ano C</option>
                        <option value="9º Ano A">9º Ano A</option>
                        <option value="9º Ano B">9º Ano B</option>
                        <option value="9º Ano C">9º Ano C</option>
                      </optgroup>
                      <optgroup label="EJA 2º Segmento (Noturno)">
                        <option value="EJA 1ª Etapa A">EJA 1ª Etapa A</option>
                        <option value="EJA 1ª Etapa B">EJA 1ª Etapa B</option>
                        <option value="EJA 2ª Etapa A">EJA 2ª Etapa A</option>
                        <option value="EJA 2ª Etapa B">EJA 2ª Etapa B</option>
                        <option value="EJA 3ª Etapa A">EJA 3ª Etapa A</option>
                        <option value="EJA 3ª Etapa B">EJA 3ª Etapa B</option>
                        <option value="EJA 4ª Etapa A">EJA 4ª Etapa A</option>
                        <option value="EJA 4ª Etapa B">EJA 4ª Etapa B</option>
                      </optgroup>
                      <optgroup label="EJA 1º Segmento">
                        <option value="EJA Módulo 1">EJA Módulo 1</option>
                        <option value="EJA Módulo 2">EJA Módulo 2</option>
                        <option value="EJA Módulo 3">EJA Módulo 3</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                {/* Peso / Pontuação */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pontuação / Peso:
                  </label>
                  <input
                    type="text"
                    value={assessmentWeight}
                    onChange={(e) => setAssessmentWeight(e.target.value)}
                    placeholder="Ex: 10,0 pontos"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {/* Objetos de Conhecimento Incluídos */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Objetos de Conhecimento Selecionados ({selectedCount}):</span>
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    {Object.values(selectedObjects).map((obj, i) => (
                      <div
                        key={obj.key}
                        className="p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-start gap-2"
                      >
                        <span className="font-mono text-[10px] font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 shrink-0">
                          {obj.code}
                        </span>
                        <span className="text-[11px] text-slate-700 line-clamp-2">
                          {obj.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observações Opcionais */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Instruções / Conteúdos adicionais (opcional):
                  </label>
                  <textarea
                    rows={2}
                    value={assessmentNotes}
                    onChange={(e) => setAssessmentNotes(e.target.value)}
                    placeholder="Ex: Trazer dicionário de inglês, prova com questões discursivas..."
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAssessmentModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAssessment}
                    className="px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingAssessment ? 'Salvando...' : 'Confirmar e Agendar Avaliação'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CRIAR ATIVIDADE */}
        {isActivityModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              
              <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-sky-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl text-white">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base">Criar Atividade / Tarefa</h4>
                    <p className="text-xs text-teal-100">
                      Organize exercícios e trabalhos práticos com base nos objetos selecionados.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título da Atividade:
                  </label>
                  <input
                    type="text"
                    required
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                    placeholder="Ex: Lista de Exercícios em Dupla"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Data de Entrega / Realização:
                    </label>
                    <input
                      type="date"
                      required
                      value={activityDueDate}
                      onChange={(e) => setActivityDueDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Turma:
                    </label>
                    <select
                      value={activityClass}
                      onChange={(e) => setActivityClass(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-semibold"
                    >
                      <optgroup label="Ensino Regular (Diurno)">
                        <option value="6º Ano A">6º Ano A</option>
                        <option value="6º Ano B">6º Ano B</option>
                        <option value="6º Ano C">6º Ano C</option>
                        <option value="7º Ano A">7º Ano A</option>
                        <option value="7º Ano B">7º Ano B</option>
                        <option value="7º Ano C">7º Ano C</option>
                        <option value="8º Ano A">8º Ano A</option>
                        <option value="8º Ano B">8º Ano B</option>
                        <option value="8º Ano C">8º Ano C</option>
                        <option value="9º Ano A">9º Ano A</option>
                        <option value="9º Ano B">9º Ano B</option>
                        <option value="9º Ano C">9º Ano C</option>
                      </optgroup>
                      <optgroup label="EJA 2º Segmento (Noturno)">
                        <option value="EJA 1ª Etapa A">EJA 1ª Etapa A</option>
                        <option value="EJA 1ª Etapa B">EJA 1ª Etapa B</option>
                        <option value="EJA 2ª Etapa A">EJA 2ª Etapa A</option>
                        <option value="EJA 2ª Etapa B">EJA 2ª Etapa B</option>
                        <option value="EJA 3ª Etapa A">EJA 3ª Etapa A</option>
                        <option value="EJA 3ª Etapa B">EJA 3ª Etapa B</option>
                        <option value="EJA 4ª Etapa A">EJA 4ª Etapa A</option>
                        <option value="EJA 4ª Etapa B">EJA 4ª Etapa B</option>
                      </optgroup>
                      <optgroup label="EJA 1º Segmento">
                        <option value="EJA Módulo 1">EJA Módulo 1</option>
                        <option value="EJA Módulo 2">EJA Módulo 2</option>
                        <option value="EJA Módulo 3">EJA Módulo 3</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Objetos de Conhecimento vinculados ({selectedCount}):
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {Object.values(selectedObjects).map((obj) => (
                      <div
                        key={obj.key}
                        className="p-1.5 bg-white rounded-lg border border-slate-200 text-xs flex items-center gap-2"
                      >
                        <span className="font-mono text-[10px] font-black bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200 shrink-0">
                          {obj.code}
                        </span>
                        <span className="text-[11px] text-slate-700 truncate">
                          {obj.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Instruções da Atividade:
                  </label>
                  <textarea
                    rows={3}
                    value={activityInstructions}
                    onChange={(e) => setActivityInstructions(e.target.value)}
                    placeholder="Orientações aos alunos, páginas do livro ou critérios de correção..."
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsActivityModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white text-xs font-extrabold rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Atividade</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: VISUALIZAR MINHAS ATIVIDADES & AVALIAÇÕES CRIADAS */}
        {isMyActivitiesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
              
              {/* Topo do Modal */}
              <div className="px-6 py-4 bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl text-white">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base">Minhas Atividades & Avaliações</h4>
                    <p className="text-xs text-sky-100">
                      Itens criados e vinculados aos objetos de conhecimento da matriz.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMyActivitiesModalOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filtros de Tipo */}
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMyActivitiesFilter('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                      myActivitiesFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Todos ({savedAssessments.length + savedActivities.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setMyActivitiesFilter('assessment')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      myActivitiesFilter === 'assessment'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    <span>Avaliações ({savedAssessments.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMyActivitiesFilter('activity')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      myActivitiesFilter === 'activity'
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-teal-700 border border-teal-200'
                    }`}
                  >
                    <span>Atividades ({savedActivities.length})</span>
                  </button>
                </div>
              </div>

              {/* Lista dos Itens Criados */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {(() => {
                  const items: any[] = [];
                  if (myActivitiesFilter === 'all' || myActivitiesFilter === 'assessment') {
                    savedAssessments.forEach((a) => items.push({ ...a, _kind: 'assessment' }));
                  }
                  if (myActivitiesFilter === 'all' || myActivitiesFilter === 'activity') {
                    savedActivities.forEach((b) => items.push({ ...b, _kind: 'activity' }));
                  }

                  if (items.length === 0) {
                    return (
                      <div className="p-10 text-center text-slate-400">
                        <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                        <p className="text-sm font-bold text-slate-600">Nenhum item criado ainda.</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Clique em qualquer objeto de conhecimento na tabela e clique com o botão direito para criar sua primeira avaliação ou atividade!
                        </p>
                      </div>
                    );
                  }

                  return items.map((item) => {
                    const isAss = item._kind === 'assessment';
                    const dateFormatted = (item.date || item.dueDate || '').split('-').reverse().join('/');

                    return (
                      <div
                        key={`${item._kind}-${item.id}`}
                        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                isAss
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : 'bg-teal-50 text-teal-800 border-teal-200'
                              }`}
                            >
                              {isAss ? 'Avaliação / Prova' : 'Atividade / Tarefa'}
                            </span>
                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                              Turma: {item.turma}
                            </span>
                            {item.weight && (
                              <span className="text-[11px] font-semibold text-slate-500">
                                {item.weight}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-600 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-sky-600" />
                              <span>{dateFormatted}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDeleteSavedItem(item.id, item._kind)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h5 className="text-sm font-extrabold text-slate-900">
                          {item.title}
                        </h5>

                        {item.instructions && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <strong>Instruções:</strong> {item.instructions}
                          </p>
                        )}

                        {/* Objetos de Conhecimento vinculados */}
                        {item.objects && item.objects.length > 0 && (
                          <div className="pt-1 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Objetos de Conhecimento Vinculados ({item.objects.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.objects.map((obj: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-[11px] bg-sky-50 text-sky-900 border border-sky-200 px-2 py-1 rounded-lg flex items-center gap-1"
                                >
                                  <strong className="font-mono text-indigo-700">{obj.code}</strong>
                                  <span className="truncate max-w-[220px]">{obj.text}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Rodapé */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsMyActivitiesModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
                >
                  Fechar
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODAL: ENVIAR SOLICITAÇÃO DE INCLUSÃO DE OBJETOS PARA O PROFESSOR */}
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-gradient-to-r from-indigo-600 to-sky-600 px-5 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <h4 className="font-extrabold text-sm">Enviar Solicitação de Inclusão de Objetos</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {requestError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold">
                    Erro ao enviar: {requestError}
                  </div>
                )}

                {requestSuccess ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Solicitação enviada com sucesso! Os objetos ficarão destacados em vermelho na matriz do professor.</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Selecione o Professor:
                      </label>
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-800 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                      >
                        <option value="">-- Escolha um professor --</option>
                        {teachersList.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.full_name} {t.discipline ? `(${t.discipline})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1.5">
                      <p className="font-bold text-slate-900">Mensagem que será enviada:</p>
                      <p className="italic text-slate-600">
                        "Caro professor, ainda faltam algumas pendências de envio de objetos de conhecimento. Favor incluir isso no sistema."
                      </p>
                      <p className="text-[11px] font-bold text-indigo-700 pt-1">
                        {Object.keys(selectedObjects).length} objeto(s) selecionado(s)
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition"
                >
                  Fechar
                </button>
                {!requestSuccess && (
                  <button
                    type="button"
                    disabled={!selectedTeacherId || isSendingRequest}
                    onClick={async () => {
                      if (!selectedTeacherId) return;
                      setIsSendingRequest(true);
                      setRequestError(null);
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw new Error('Usuário não autenticado.');
                        const items = Object.values(selectedObjects);
                        const listText = items
                          .map((o) => `• [${o.code}] ${o.text} (${o.ano} • ${o.bimestre})`)
                          .join('\n');
                        const msg = `Caro professor, ainda faltam algumas pendências de envio de objetos de conhecimento. Favor incluir isso no sistema:\n\n${listText}`;
                        await messageService.sendMessage(user.id, selectedTeacherId, msg);
                        setRequestSuccess(true);
                        setSelectedObjects({});
                      } catch (err: any) {
                        console.error('Erro ao enviar solicitação:', err);
                        setRequestError(err?.message || 'Não foi possível enviar a notificação.');
                      } finally {
                        setIsSendingRequest(false);
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingRequest ? 'Enviando...' : 'Enviar Solicitação'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
