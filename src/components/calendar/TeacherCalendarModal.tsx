import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  FileText,
  GraduationCap,
  Clock,
  Send,
  Trash2,
  Tag,
  Filter,
  Pencil,
  Eraser,
  RotateCcw,
  Plus,
  Sparkles,
  Check,
  Palette,
} from 'lucide-react';
import { DocumentCategory, SchoolEvent } from '../../types/database.types';

interface TeacherCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCategories: DocumentCategory[];
  schoolEvents: SchoolEvent[];
  onOpenUploadForCategory?: (category: DocumentCategory) => void;
}

export const TeacherCalendarModal: React.FC<TeacherCalendarModalProps> = ({
  isOpen,
  onClose,
  pendingCategories,
  schoolEvents,
  onOpenUploadForCategory,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'documents' | 'assessments' | 'activities' | 'events'>('all');
  const [selectedDayEvents, setSelectedDayEvents] = useState<string | null>(null);

  // Carrega atividades e avaliações do professor salvas no localStorage
  const [savedAssessments, setSavedAssessments] = useState<any[]>([]);
  const [savedActivities, setSavedActivities] = useState<any[]>([]);
  const [savedCustomEvents, setSavedCustomEvents] = useState<any[]>([]);

  // Modal rápido de agendamento por duplo clique
  const [quickAddModalDate, setQuickAddModalDate] = useState<string | null>(null);
  const [quickAddType, setQuickAddType] = useState<'activity' | 'assessment' | 'event'>('activity');
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddTurma, setQuickAddTurma] = useState('');
  const [quickAddDetails, setQuickAddDetails] = useState('');

  // Ferramenta Canetinha / Rabiscar sobre o calendário
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawSize, setDrawSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [hasDoodle, setHasDoodle] = useState(false);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapRef = useRef<{ time: number; dateStr: string } | null>(null);

  const loadData = () => {
    try {
      const assessments = JSON.parse(localStorage.getItem('teacher_scheduled_assessments') || '[]');
      const activities = JSON.parse(localStorage.getItem('teacher_scheduled_activities') || '[]');
      const customEvents = JSON.parse(localStorage.getItem('teacher_custom_events') || '[]');
      setSavedAssessments(assessments);
      setSavedActivities(activities);
      setSavedCustomEvents(customEvents);
    } catch {
      setSavedAssessments([]);
      setSavedActivities([]);
      setSavedCustomEvents([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Carrega / redimensiona o desenho do canvas para o mês atual
  const loadDoodleForMonth = () => {
    if (!canvasRef.current || !gridContainerRef.current) return;
    const canvas = canvasRef.current;
    const rect = gridContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const saved = localStorage.getItem(`teacher_calendar_doodle_${year}_${month}`);
    if (saved) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDoodle(true);
      };
      img.src = saved;
    } else {
      setHasDoodle(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        loadDoodleForMonth();
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [isOpen, year, month]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      loadDoodleForMonth();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, year, month]);

  // Handlers da Canetinha
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      return {
        x: e.changedTouches[0].clientX - rect.left,
        y: e.changedTouches[0].clientY - rect.top,
      };
    }
    const mouseEvt = e as React.MouseEvent;
    return {
      x: mouseEvt.clientX - rect.left,
      y: mouseEvt.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawMode || !canvasRef.current) return;
    if ('touches' in e && e.cancelable) e.preventDefault();
    isDrawingRef.current = true;
    const { x, y } = getCanvasCoords(e);
    lastPosRef.current = { x, y };

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = drawSize * 5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawSize;
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDoodle(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !isDrawMode || !canvasRef.current) return;
    if ('touches' in e && e.cancelable) e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPosRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    isDrawingRef.current = false;
    try {
      const data = canvasRef.current.toDataURL();
      localStorage.setItem(`teacher_calendar_doodle_${year}_${month}`, data);
      setHasDoodle(true);
    } catch (err) {
      console.warn('Erro ao salvar doodle:', err);
    }
  };

  const handleClearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    localStorage.removeItem(`teacher_calendar_doodle_${year}_${month}`);
    setHasDoodle(false);
  };

  // Handlers de Duplo Clique & Duplo Toque para adicionar eventos/atividades
  const handleDayDoubleClick = (dateStr: string) => {
    setIsDrawMode(false);
    setQuickAddModalDate(dateStr);
    setQuickAddTitle('');
    setQuickAddTurma('');
    setQuickAddDetails('');
    setQuickAddType('activity');
  };

  const handleDayTouchEnd = (dateStr: string) => {
    if (isDrawMode) return;
    const now = Date.now();
    if (lastTapRef.current && now - lastTapRef.current.time < 350 && lastTapRef.current.dateStr === dateStr) {
      handleDayDoubleClick(dateStr);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, dateStr };
    }
  };

  const handleSaveQuickItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddModalDate || !quickAddTitle.trim()) return;

    const newItem = {
      id: 'custom-' + Date.now().toString(),
      title: quickAddTitle.trim(),
      turma: quickAddTurma.trim() || undefined,
      details: quickAddDetails.trim() || undefined,
    };

    if (quickAddType === 'assessment') {
      const list = JSON.parse(localStorage.getItem('teacher_scheduled_assessments') || '[]');
      list.push({ ...newItem, date: quickAddModalDate });
      localStorage.setItem('teacher_scheduled_assessments', JSON.stringify(list));
    } else if (quickAddType === 'activity') {
      const list = JSON.parse(localStorage.getItem('teacher_scheduled_activities') || '[]');
      list.push({ ...newItem, dueDate: quickAddModalDate });
      localStorage.setItem('teacher_scheduled_activities', JSON.stringify(list));
    } else {
      const list = JSON.parse(localStorage.getItem('teacher_custom_events') || '[]');
      list.push({ ...newItem, event_date: quickAddModalDate });
      localStorage.setItem('teacher_custom_events', JSON.stringify(list));
    }

    loadData();
    setSelectedDayEvents(quickAddModalDate);
    setQuickAddModalDate(null);
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayEvents(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayEvents(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDayEvents(null);
  };

  // Normalização de todos os itens do calendário
  const allCalendarItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      date: string; // YYYY-MM-DD
      type: 'document' | 'assessment' | 'activity' | 'event';
      details?: string;
      meta?: any;
    }> = [];

    // 1. Prazos de Documentação que ainda está faltando
    pendingCategories.forEach((cat) => {
      let dStr = cat.deadline_date;
      if (!dStr && cat.deadline_month && cat.deadline_day) {
        const m = String(cat.deadline_month).padStart(2, '0');
        const d = String(cat.deadline_day).padStart(2, '0');
        dStr = `${year}-${m}-${d}`;
      }
      if (dStr) {
        // Normaliza para formato YYYY-MM-DD se vier ISO completo
        const cleanDate = dStr.split('T')[0];
        items.push({
          id: `doc-${cat.id}`,
          title: `Prazo: ${cat.name}`,
          date: cleanDate,
          type: 'document',
          details: `Documento pendente do ${cat.bimestre || 'bimestre'}.`,
          meta: cat,
        });
      }
    });

    // 2. Avaliações criadas a partir da Matriz Curricular
    savedAssessments.forEach((ass) => {
      if (ass.date) {
        const cleanDate = ass.date.split('T')[0];
        items.push({
          id: `ass-${ass.id}`,
          title: `Avaliação: ${ass.title}`,
          date: cleanDate,
          type: 'assessment',
          details: `Turma: ${ass.turma} • ${ass.objects?.length || 0} objeto(s) vinculados.`,
          meta: ass,
        });
      }
    });

    // 3. Atividades programadas a partir da Matriz Curricular
    savedActivities.forEach((act) => {
      if (act.dueDate) {
        const cleanDate = act.dueDate.split('T')[0];
        items.push({
          id: `act-${act.id}`,
          title: `Atividade: ${act.title}`,
          date: cleanDate,
          type: 'activity',
          details: `Turma: ${act.turma} • ${act.objects?.length || 0} objeto(s) vinculados.`,
          meta: act,
        });
      }
    });

    // 4. Eventos Oficiais da Escola (Reuniões, Conselhos, Feriados)
    schoolEvents.forEach((ev) => {
      if (ev.event_date) {
        const cleanDate = ev.event_date.split('T')[0];
        items.push({
          id: `ev-${ev.id}`,
          title: ev.title,
          date: cleanDate,
          type: 'event',
          details: ev.description || 'Evento oficial da escola',
          meta: ev,
        });
      }
    });

    // 5. Eventos e Lembretes Customizados Criados no Calendário
    savedCustomEvents.forEach((ev) => {
      if (ev.event_date) {
        const cleanDate = ev.event_date.split('T')[0];
        items.push({
          id: ev.id,
          title: ev.title,
          date: cleanDate,
          type: 'event',
          details: ev.details || (ev.turma ? `Turma: ${ev.turma}` : 'Evento / Lembrete'),
          meta: ev,
        });
      }
    });

    return items;
  }, [pendingCategories, savedAssessments, savedActivities, savedCustomEvents, schoolEvents, year]);

  // Filtra itens conforme categoria selecionada
  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') return allCalendarItems;
    if (selectedFilter === 'documents') return allCalendarItems.filter(i => i.type === 'document');
    if (selectedFilter === 'assessments') return allCalendarItems.filter(i => i.type === 'assessment');
    if (selectedFilter === 'activities') return allCalendarItems.filter(i => i.type === 'activity');
    if (selectedFilter === 'events') return allCalendarItems.filter(i => i.type === 'event');
    return allCalendarItems;
  }, [allCalendarItems, selectedFilter]);

  // Mapa de itens por data (YYYY-MM-DD)
  const itemsByDate = useMemo(() => {
    const map: Record<string, typeof filteredItems> = {};
    filteredItems.forEach((item) => {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    });
    return map;
  }, [filteredItems]);

  // Geração da grade do mês
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Seg...
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Dias do mês anterior para preencher a primeira semana
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNumber: i,
        dateStr: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
      });
    }

    // Dias do próximo mês para completar a última semana (múltiplo de 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNumber: i,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    return days;
  }, [year, month]);

  const handleDeleteItem = (item: any) => {
    if (item.type === 'assessment') {
      if (!confirm('Deseja remover esta avaliação programada?')) return;
      const saved = JSON.parse(localStorage.getItem('teacher_scheduled_assessments') || '[]');
      const filtered = saved.filter((a: any) => a.id !== item.meta?.id);
      localStorage.setItem('teacher_scheduled_assessments', JSON.stringify(filtered));
      loadData();
    } else if (item.type === 'activity') {
      if (!confirm('Deseja remover esta atividade programada?')) return;
      const saved = JSON.parse(localStorage.getItem('teacher_scheduled_activities') || '[]');
      const filtered = saved.filter((a: any) => a.id !== item.meta?.id);
      localStorage.setItem('teacher_scheduled_activities', JSON.stringify(filtered));
      loadData();
    } else if (item.type === 'event' && String(item.id).startsWith('custom-')) {
      if (!confirm('Deseja remover este evento/lembrete?')) return;
      const saved = JSON.parse(localStorage.getItem('teacher_custom_events') || '[]');
      const filtered = saved.filter((e: any) => e.id !== item.id && e.id !== item.meta?.id);
      localStorage.setItem('teacher_custom_events', JSON.stringify(filtered));
      loadData();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Cabeçalho Alegre e Calmo */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-white/20 rounded-2xl border border-white/30 text-white shadow-inner">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-xl tracking-tight text-white">
                  Meu Calendário & Prazos
                </h3>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 uppercase tracking-wider">
                  Visão Integrada
                </span>
              </div>
              <p className="text-xs text-sky-100 font-medium mt-0.5">
                Acompanhe os prazos de documentos pendentes, avaliações e atividades programadas da sua turma.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="self-end sm:self-center px-4 py-2 text-xs font-bold text-white hover:text-white bg-white/15 hover:bg-white/25 rounded-xl transition border border-white/20 flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Fechar</span>
          </button>
        </div>

        {/* Barra de Filtros e Legendas Rápidas */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Todos ({allCalendarItems.length})</span>
            </button>

            <button
              onClick={() => setSelectedFilter('documents')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedFilter === 'documents'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Documentos Pendentes ({pendingCategories.length})</span>
            </button>

            <button
              onClick={() => setSelectedFilter('assessments')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedFilter === 'assessments'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Minhas Avaliações ({savedAssessments.length})</span>
            </button>

            <button
              onClick={() => setSelectedFilter('activities')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedFilter === 'activities'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span>Minhas Atividades ({savedActivities.length})</span>
            </button>

            <button
              onClick={() => setSelectedFilter('events')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedFilter === 'events'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Eventos da Escola ({schoolEvents.length})</span>
            </button>
          </div>

          {/* Navegação de Mês + Ferramentas */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition"
            >
              Hoje
            </button>
            <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 text-slate-500 hover:text-slate-800 transition"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-extrabold text-slate-800 min-w-[130px] text-center">
                {monthNames[month]} {year}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 text-slate-500 hover:text-slate-800 transition"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Botão Canetinha e Botão Novo */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsDrawMode(!isDrawMode)}
                className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 shadow-2xs ${
                  isDrawMode
                    ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-300'
                    : hasDoodle
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Rabiscar e desenhar sobre o calendário com uma canetinha"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Caneta / Rabiscar</span>
                {hasDoodle && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleDayDoubleClick(new Date().toISOString().split('T')[0])}
                className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-2xs transition flex items-center gap-1"
                title="Adicionar Atividade ou Evento"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Novo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grade do Calendário + Painel Lateral de Detalhes */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Grade Mensal com suporte a Rabisco/Caneta e Duplo Clique */}
          <div
            ref={gridContainerRef}
            className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex flex-col relative select-none"
          >
            {/* CANVAS TRANSPARENTE PARA DESENHO / CANETINHA SOBRE O CALENDÁRIO */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 z-10 rounded-2xl ${
                isDrawMode ? 'cursor-crosshair pointer-events-auto touch-none' : 'pointer-events-none'
              }`}
              style={{ touchAction: isDrawMode ? 'none' : 'auto' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />

            {/* BARRA DE FERRAMENTAS DO MODO CANETA (QUANDO ATIVO) */}
            {isDrawMode && (
              <div className="mb-2 p-2 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 flex flex-wrap items-center justify-between gap-2 animate-fadeIn z-20">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg">
                    <Pencil className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-200">Caneta Ativa</span>
                  </div>

                  {/* Seletor de Cores */}
                  <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-lg">
                    {[
                      { color: '#ef4444', label: 'Vermelho' },
                      { color: '#eab308', label: 'Amarelo' },
                      { color: '#3b82f6', label: 'Azul' },
                      { color: '#10b981', label: 'Verde' },
                      { color: '#8b5cf6', label: 'Roxo' },
                      { color: '#1e293b', label: 'Grafite' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => {
                          setDrawColor(c.color);
                          setIsEraser(false);
                        }}
                        style={{ backgroundColor: c.color }}
                        className={`w-5 h-5 rounded-full border-2 transition ${
                          !isEraser && drawColor === c.color
                            ? 'border-white scale-110 shadow-xs'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>

                  {/* Espessura */}
                  <div className="flex items-center gap-1 bg-slate-800/90 px-1.5 py-1 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDrawSize(2)}
                      className={`px-1.5 py-0.5 rounded transition ${
                        drawSize === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Fina
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawSize(4)}
                      className={`px-1.5 py-0.5 rounded transition ${
                        drawSize === 4 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Média
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawSize(7)}
                      className={`px-1.5 py-0.5 rounded transition ${
                        drawSize === 7 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Grossa
                    </button>
                  </div>

                  {/* Borracha */}
                  <button
                    type="button"
                    onClick={() => setIsEraser(!isEraser)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition ${
                      isEraser
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                    title="Borracha para apagar traços"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Borracha</span>
                  </button>

                  {/* Limpar Tudo */}
                  {hasDoodle && (
                    <button
                      type="button"
                      onClick={handleClearCanvas}
                      className="flex items-center gap-1 px-2 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition"
                      title="Apagar todos os rabiscos deste mês"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>

                {/* Sair do Modo Caneta */}
                <button
                  type="button"
                  onClick={() => setIsDrawMode(false)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg shadow transition flex items-center gap-1 ml-auto"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Concluir</span>
                </button>
              </div>
            )}

            {/* Dica amigável de duplo clique */}
            {!isDrawMode && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 px-1">
                <span className="flex items-center gap-1 text-slate-600">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Dê um <strong>duplo clique</strong> (ou duplo toque) em qualquer dia para adicionar atividades ou eventos.</span>
                </span>
                {hasDoodle && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold shrink-0 ml-2">
                    Contém anotações a caneta
                  </span>
                )}
              </div>
            )}

            {/* Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-[11px] text-slate-400 uppercase tracking-wider mb-2">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            {/* Células dos Dias */}
            <div className="grid grid-cols-7 gap-1 flex-1">
              {calendarGrid.map((day, idx) => {
                const dayItems = itemsByDate[day.dateStr] || [];
                const isSelected = selectedDayEvents === day.dateStr;

                return (
                  <div
                    key={`${day.dateStr}-${idx}`}
                    onClick={() => {
                      if (isDrawMode) return;
                      if (dayItems.length > 0) {
                        setSelectedDayEvents(day.dateStr === selectedDayEvents ? null : day.dateStr);
                      }
                    }}
                    onDoubleClick={() => handleDayDoubleClick(day.dateStr)}
                    onTouchEnd={() => handleDayTouchEnd(day.dateStr)}
                    title="Clique para ver detalhes • Duplo clique para agendar atividade ou evento"
                    className={`min-h-[82px] p-1.5 rounded-xl border transition-all duration-150 flex flex-col justify-between cursor-pointer select-none ${
                      !day.isCurrentMonth
                        ? 'bg-slate-50/50 border-slate-100 text-slate-300'
                        : day.isToday
                        ? 'bg-sky-50/60 border-sky-400 ring-2 ring-sky-300/60'
                        : isSelected
                        ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300'
                        : 'bg-white border-slate-200/80 hover:border-sky-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black inline-flex items-center justify-center w-5 h-5 rounded-full ${
                          day.isToday
                            ? 'bg-sky-600 text-white shadow-2xs'
                            : isSelected
                            ? 'bg-indigo-600 text-white'
                            : day.isCurrentMonth
                            ? 'text-slate-700'
                            : 'text-slate-300'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {dayItems.length > 0 && (
                        <span className="text-[10px] font-extrabold px-1.5 rounded-full bg-slate-100 text-slate-700">
                          {dayItems.length}
                        </span>
                      )}
                    </div>

                    {/* Marcadores / Badges no dia */}
                    <div className="space-y-0.5 mt-1 overflow-hidden">
                      {dayItems.slice(0, 2).map((item) => {
                        let color = 'bg-slate-100 text-slate-700 border-slate-200';
                        if (item.type === 'document') color = 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
                        else if (item.type === 'assessment') color = 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold';
                        else if (item.type === 'activity') color = 'bg-teal-50 text-teal-800 border-teal-200 font-bold';
                        else if (item.type === 'event') color = 'bg-amber-50 text-amber-900 border-amber-200 font-semibold';

                        return (
                          <div
                            key={item.id}
                            className={`text-[9px] px-1 py-0.2 rounded border truncate leading-tight ${color}`}
                          >
                            {item.title}
                          </div>
                        );
                      })}
                      {dayItems.length > 2 && (
                        <span className="text-[9px] text-slate-400 font-bold block text-right">
                          +{dayItems.length - 2} mais
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Painel Lateral com Lista Cronológica de Prazos e Eventos */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            
            {/* Título da Lista */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>
                    {selectedDayEvents
                      ? `Itens do dia ${selectedDayEvents.split('-').reverse().join('/')}`
                      : 'Próximos Prazos & Compromissos'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  {selectedDayEvents
                    ? 'Clique no dia novamente para ver todos'
                    : 'Listagem cronológica organizada'}
                </p>
              </div>

              {selectedDayEvents && (
                <button
                  type="button"
                  onClick={() => setSelectedDayEvents(null)}
                  className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-lg"
                >
                  Ver todos
                </button>
              )}
            </div>

            {/* Lista dos Itens */}
            <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
              {(selectedDayEvents ? itemsByDate[selectedDayEvents] || [] : filteredItems).length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-emerald-500" />
                  <p className="text-xs font-bold text-slate-600">Nenhum prazo ou compromisso encontrado.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Você pode agendar avaliações ou atividades diretamente pela Matriz Curricular.
                  </p>
                </div>
              ) : (
                (selectedDayEvents ? itemsByDate[selectedDayEvents] || [] : filteredItems).map((item) => {
                  const isDocument = item.type === 'document';
                  const isAssessment = item.type === 'assessment';
                  const isActivity = item.type === 'activity';

                  let badge = {
                    label: 'Evento Oficial',
                    classes: 'bg-amber-100 text-amber-900 border-amber-200',
                  };
                  if (isDocument) {
                    badge = {
                      label: 'Prazo de Documento',
                      classes: 'bg-rose-100 text-rose-800 border-rose-200',
                    };
                  } else if (isAssessment) {
                    badge = {
                      label: 'Minha Avaliação',
                      classes: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                    };
                  } else if (isActivity) {
                    badge = {
                      label: 'Minha Atividade',
                      classes: 'bg-teal-100 text-teal-800 border-teal-200',
                    };
                  }

                  const formattedDate = item.date.split('-').reverse().join('/');

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badge.classes}`}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1 font-mono">
                          <CalendarIcon className="w-3 h-3 text-slate-400" />
                          <span>{formattedDate}</span>
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h5>

                      {item.details && (
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {item.details}
                        </p>
                      )}

                      {/* Ações Específicas */}
                      <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                        {isDocument && onOpenUploadForCategory && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenUploadForCategory(item.meta);
                            }}
                            className="text-[11px] font-extrabold text-rose-700 hover:text-rose-900 flex items-center gap-1 hover:underline"
                          >
                            <Send className="w-3 h-3" />
                            <span>Enviar Documento Agora</span>
                          </button>
                        )}

                        {(isAssessment || isActivity || (item.type === 'event' && String(item.id).startsWith('custom-'))) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition ml-auto"
                            title="Remover agendamento"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Excluir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </div>
    </div>

    {/* MODAL RÁPIDO PARA ADICIONAR ATIVIDADE / EVENTO POR DUPLO CLIQUE */}
    {quickAddModalDate && (
      <div
        style={{ zIndex: 99999 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn"
      >
        <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-scaleIn">
            <div className="px-5 py-4 bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <CalendarIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    Novo Agendamento
                  </h4>
                  <p className="text-[11px] text-sky-100">
                    Adicionar atividade ou evento para {quickAddModalDate.split('-').reverse().join('/')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddModalDate(null)}
                className="p-1 hover:bg-white/20 rounded-lg text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickItem} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Tipo de Agendamento *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickAddType('activity')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                      quickAddType === 'activity'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-teal-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <span>Atividade</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickAddType('assessment')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                      quickAddType === 'assessment'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-800 ring-2 ring-indigo-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span>Avaliação</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickAddType('event')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                      quickAddType === 'event'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Evento / Nota</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Trabalho de Ciências em Grupo"
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Turma (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 9º Ano A (ou deixe vazio para todas)"
                  value={quickAddTurma}
                  onChange={(e) => setQuickAddTurma(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Detalhes / Orientações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Trazer material para elaboração dos cartazes..."
                  value={quickAddDetails}
                  onChange={(e) => setQuickAddDetails(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickAddModalDate(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!quickAddTitle.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Salvar no Calendário</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
