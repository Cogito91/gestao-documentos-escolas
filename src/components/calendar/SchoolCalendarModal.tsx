import React, { useMemo, useState } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
} from 'lucide-react';
import { SchoolEvent } from '../../types/database.types';
import { pedagogicalService } from '../../services/pedagogicalService';
import { isSemedOfficialEvent } from '../../data/semedCalendar2026';

interface SchoolCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: SchoolEvent[];
  onRefresh: () => void;
  canEdit?: boolean;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const isDateInRange = (dateStr: string, start: string, end: string) =>
  dateStr >= start && dateStr <= end;

export const SchoolCalendarModal: React.FC<SchoolCalendarModalProps> = ({
  isOpen,
  onClose,
  events,
  onRefresh,
  canEdit = true,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventType, setEventType] = useState<
    'pedagogico' | 'reuniao' | 'conselho' | 'feriado' | 'prova' | 'evento'
  >('pedagogico');
  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] = useState<'annual' | 'monthly' | 'list'>('annual');
  const [activeMonthIdx, setActiveMonthIdx] = useState<number>(() => new Date().getMonth());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Pop-up expansível do dia clicado (efeito FLIP: expande do quadradinho e fecha voltando para ele)
  const [dayPopup, setDayPopup] = useState<{
    dateStr: string;
    originRect: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const [popupAnimPhase, setPopupAnimPhase] = useState<'from' | 'open' | 'closing'>('from');

  const openDayPopup = (dateStr: string, targetEl: HTMLElement) => {
    const rect = targetEl.getBoundingClientRect();
    setSelectedDayStr(dateStr);
    setDayPopup({
      dateStr,
      originRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
    });
    setPopupAnimPhase('from');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPopupAnimPhase('open');
      });
    });
  };

  const closeDayPopup = () => {
    if (!dayPopup) return;
    setPopupAnimPhase('closing');
    setTimeout(() => {
      setDayPopup(null);
    }, 260);
  };

  const calendarYear = 2026;

  const eventsByDate = useMemo(() => {
    const map: Record<string, SchoolEvent[]> = {};
    events.forEach((ev) => {
      if (!map[ev.event_date]) map[ev.event_date] = [];
      map[ev.event_date].push(ev);
    });
    return map;
  }, [events]);

  if (!isOpen) return null;

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;

    setLoading(true);
    try {
      await pedagogicalService.addSchoolEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        event_date: eventDate,
        event_type: eventType,
      });
      setTitle('');
      setDescription('');
      setShowAddForm(false);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao salvar evento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Deseja excluir esta data do calendário escolar?')) return;
    try {
      await pedagogicalService.deleteSchoolEvent(id);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'reuniao':
        return (
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Reunião
          </span>
        );
      case 'conselho':
        return (
          <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Conselho de Classe
          </span>
        );
      case 'feriado':
        return (
          <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Feriado / Recesso
          </span>
        );
      case 'prova':
        return (
          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Avaliações
          </span>
        );
      case 'evento':
        return (
          <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Evento
          </span>
        );
      default:
        return (
          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Pedagógico
          </span>
        );
    }
  };

  const getDayVisualStyle = (dateStr: string, dayEvents: SchoolEvent[]) => {
    // Férias e Recessos contínuos do calendário SEMED 2026
    const isVacation = isDateInRange(dateStr, '2026-01-02', '2026-01-31');
    const isMidYearRecess = isDateInRange(dateStr, '2026-06-25', '2026-07-05');
    const isYearEndRecess = isDateInRange(dateStr, '2026-12-28', '2026-12-31');
    const isCarnaval = isDateInRange(dateStr, '2026-02-16', '2026-02-18');

    const hasHoliday = dayEvents.some((e) => e.event_type === 'feriado');
    const hasConselho = dayEvents.some((e) => e.event_type === 'conselho');
    const hasProva = dayEvents.some((e) => e.event_type === 'prova');
    const hasPedagogico = dayEvents.some((e) => e.event_type === 'pedagogico');
    const hasEvento = dayEvents.some(
      (e) => e.event_type === 'evento' || e.event_type === 'reuniao'
    );

    if (isVacation || isMidYearRecess || isYearEndRecess || isCarnaval || hasHoliday) {
      return {
        cell: 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold',
        dot: 'bg-rose-600',
      };
    }
    if (hasConselho) {
      return {
        cell: 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold',
        dot: 'bg-purple-600',
      };
    }
    if (hasProva) {
      return {
        cell: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold',
        dot: 'bg-amber-600',
      };
    }
    if (hasPedagogico) {
      return {
        cell: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold',
        dot: 'bg-emerald-600',
      };
    }
    if (hasEvento) {
      return {
        cell: 'bg-sky-100 text-sky-900 border-sky-300 font-extrabold',
        dot: 'bg-sky-600',
      };
    }
    return null;
  };

  const buildMonthCells = (monthIdx: number) => {
    const firstDow = new Date(calendarYear, monthIdx, 1).getDay();
    const totalDays = new Date(calendarYear, monthIdx + 1, 0).getDate();
    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: null, dateStr: null });
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${calendarYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  };

  const selectedDayEvents = eventsByDate[selectedDayStr] || [];

  const formatDateBR = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Topo estilo SEMED */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-white/15 rounded-xl shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base truncate">
                Calendário Escolar 2026 • SEMED Manaus
              </h3>
              <p className="text-[11px] text-emerald-100 truncate">
                Ensino Fundamental • Resolução Nº 183/CME/2025 • 200 Dias Letivos / 800h
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/15 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de modos (Anual 12 meses | Mensal | Lista) + Botão Adicionar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('annual')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition flex items-center gap-1 ${
                viewMode === 'annual'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Anual (12 meses)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition flex items-center gap-1 ${
                viewMode === 'monthly'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Mensal</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition flex items-center gap-1 ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista ({events.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://www.manaus.am.gov.br/semed/wp-content/uploads/sites/3/2025/12/Ensino-Fundamental-2026.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-bold transition"
            >
              PDF Oficial SEMED
            </a>
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowAddForm((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Fechar' : 'Nova Data'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Formulário de Nova Data (sob demanda) */}
          {canEdit && showAddForm && (
            <form
              onSubmit={handleAddEvent}
              className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center space-x-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Adicionar Nova Data no Calendário Escolar</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Título do Evento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Conselho de Classe 2º Bimestre"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tipo de Evento
                  </label>
                  <select
                    value={eventType}
                    onChange={(e: any) => setEventType(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="pedagogico">Pedagógico Geral</option>
                    <option value="reuniao">Reunião de Pais/Mestres</option>
                    <option value="conselho">Conselho de Classe</option>
                    <option value="prova">Semana de Provas</option>
                    <option value="feriado">Feriado / Recesso</option>
                    <option value="evento">Evento Cultural / Festa</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Observações
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Não haverá aula para os alunos do turno matutino"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Salvar no Calendário</span>
                </button>
              </div>
            </form>
          )}

          {/* MODO 1: CALENDÁRIO ANUAL (12 MESES ESTILO SEMED) */}
          {viewMode === 'annual' && (
            <>
              {/* Legenda compacta */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                <span className="font-extrabold text-slate-700 mr-1">Legenda:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-600" /> Feriados / Férias / Recessos
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" /> Bimestres / Planejamentos / Notas
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-600" /> Avaliações (Av1/Av2/Av3/ADE)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold">
                  <span className="w-2 h-2 rounded-full bg-purple-600" /> Conselho de Classe
                </span>
              </div>

              {/* Detalhes do dia clicado */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-emerald-950">
                    Dia selecionado: {formatDateBR(selectedDayStr)}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setEventDate(selectedDayStr);
                        setShowAddForm(true);
                      }}
                      className="text-[11px] font-extrabold text-blue-700 hover:underline"
                    >
                      + Adicionar evento da escola neste dia
                    </button>
                  )}
                </div>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhum evento específico marcado nesta data. Toque em qualquer dia colorido abaixo para ver os detalhes.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedDayEvents.map((ev) => {
                      const isSemed = isSemedOfficialEvent(ev.id);
                      return (
                        <div
                          key={ev.id}
                          className="p-2 rounded-lg bg-white border border-emerald-200/80 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-extrabold text-slate-900">{ev.title}</span>
                              {getTypeBadge(ev.event_type)}
                              {isSemed ? (
                                <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                                  SEMED
                                </span>
                              ) : (
                                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                                  Escola
                                </span>
                              )}
                            </div>
                            {ev.description && (
                              <p className="text-[11px] text-slate-600 mt-0.5">{ev.description}</p>
                            )}
                          </div>
                          {canEdit && !isSemed && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition shrink-0"
                              title="Remover evento da escola"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Grade dos 12 meses de 2026 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MONTH_NAMES.map((mName, mIdx) => {
                  const cells = buildMonthCells(mIdx);
                  return (
                    <div
                      key={mName}
                      className="rounded-xl border border-emerald-200 overflow-hidden bg-white shadow-2xs"
                    >
                      <div
                        onClick={() => {
                          setActiveMonthIdx(mIdx);
                          setViewMode('monthly');
                        }}
                        className="px-3 py-1.5 bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-between cursor-pointer hover:bg-emerald-800 transition"
                        title="Clique para abrir este mês ampliado"
                      >
                        <span>{mName}</span>
                        <span className="text-[10px] text-emerald-200 font-semibold">2026</span>
                      </div>
                      <div className="p-2">
                        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1">
                          {WEEKDAY_SHORT.map((w, i) => (
                            <span key={i}>{w}</span>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                          {cells.map((c, idx) => {
                            if (!c.day || !c.dateStr) {
                              return <span key={`empty-${idx}`} className="h-7" />;
                            }
                            const dayEvs = eventsByDate[c.dateStr] || [];
                            const style = getDayVisualStyle(c.dateStr, dayEvs);
                            const isSelected = selectedDayStr === c.dateStr;
                            const dow = idx % 7;
                            const isWeekend = dow === 0 || dow === 6;

                            return (
                              <button
                                key={c.dateStr}
                                type="button"
                                onClick={(e) => openDayPopup(c.dateStr!, e.currentTarget)}
                                title={
                                  dayEvs.length > 0
                                    ? dayEvs.map((e) => e.title).join(' | ')
                                    : formatDateBR(c.dateStr)
                                }
                                className={`h-7 rounded-md border flex flex-col items-center justify-center relative transition ${
                                  isSelected
                                    ? 'ring-2 ring-indigo-600 border-indigo-600 scale-105 z-10'
                                    : 'border-transparent'
                                } ${
                                  style
                                    ? style.cell
                                    : isWeekend
                                    ? 'text-slate-400 bg-slate-50/70'
                                    : 'text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span className="leading-none">{c.day}</span>
                                {dayEvs.length > 0 && (
                                  <span
                                    className={`w-1 h-1 rounded-full mt-0.5 ${
                                      style?.dot || 'bg-emerald-600'
                                    }`}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quadro Resumo de Bimestres e Avaliações (igual rodapé do PDF SEMED) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                  <h5 className="font-extrabold text-emerald-900 uppercase text-[11px]">
                    Bimestres Letivos (50 dias cada)
                  </h5>
                  <p className="text-emerald-900">
                    <strong>1º Bimestre:</strong> 04/02 a 22/04 • <strong>2º Bimestre:</strong> 23/04 a 16/07
                  </p>
                  <p className="text-emerald-900">
                    <strong>3º Bimestre:</strong> 17/07 a 29/09 • <strong>4º Bimestre:</strong> 30/09 a 17/12
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                  <h5 className="font-extrabold text-amber-900 uppercase text-[11px]">
                    Calendário das Avaliações & ADE
                  </h5>
                  <p className="text-amber-950">
                    <strong>1º Bim:</strong> Av1 02/03 • Av2 25/03 • Av3 16/04 | <strong>ADE:</strong> 30/04 e 08/10
                  </p>
                  <p className="text-amber-950">
                    <strong>2º Bim:</strong> 15/05, 09/06, 13/07 • <strong>3º:</strong> 07/08, 01/09, 25/09 • <strong>4º:</strong> 23/10, 19/11, 15/12
                  </p>
                </div>
              </div>
            </>
          )}

          {/* MODO 2: CALENDÁRIO MENSAL AMPLIADO */}
          {viewMode === 'monthly' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-emerald-700 text-white px-4 py-2.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveMonthIdx((m) => (m === 0 ? 11 : m - 1))}
                  className="p-1 hover:bg-white/20 rounded-lg transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h4 className="font-extrabold text-sm sm:text-base uppercase tracking-wider">
                  {MONTH_NAMES[activeMonthIdx]} {calendarYear}
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveMonthIdx((m) => (m === 11 ? 0 : m + 1))}
                  className="p-1 hover:bg-white/20 rounded-lg transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-extrabold text-slate-500">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {buildMonthCells(activeMonthIdx).map((c, idx) => {
                  if (!c.day || !c.dateStr) {
                    return <div key={`m-empty-${idx}`} className="min-h-[68px] rounded-xl bg-slate-50/50" />;
                  }
                  const dayEvs = eventsByDate[c.dateStr] || [];
                  const style = getDayVisualStyle(c.dateStr, dayEvs);
                  const isSelected = selectedDayStr === c.dateStr;
                  return (
                    <button
                      key={c.dateStr}
                      type="button"
                      onClick={(e) => openDayPopup(c.dateStr!, e.currentTarget)}
                      className={`min-h-[68px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition ${
                        isSelected
                          ? 'ring-2 ring-indigo-600 border-indigo-600'
                          : 'border-slate-200 hover:border-emerald-400'
                      } ${style ? style.cell : 'bg-white'}`}
                    >
                      <span className="text-xs font-extrabold">{c.day}</span>
                      <div className="space-y-0.5 w-full">
                        {dayEvs.slice(0, 2).map((ev) => (
                          <span
                            key={ev.id}
                            className="block text-[9px] leading-tight font-bold truncate bg-white/80 text-slate-800 px-1 py-0.5 rounded"
                          >
                            {ev.title}
                          </span>
                        ))}
                        {dayEvs.length > 2 && (
                          <span className="block text-[9px] font-extrabold text-slate-600">
                            +{dayEvs.length - 2} mais
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO 3: LISTA COMPLETA DE EVENTOS */}
          {viewMode === 'list' && (
            <div className="space-y-2.5">
              {events.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                  Nenhum evento registrado no calendário escolar.
                </div>
              ) : (
                events.map((ev) => {
                  const isSemed = isSemedOfficialEvent(ev.id);
                  return (
                    <div
                      key={ev.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition flex items-center justify-between gap-2"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-slate-100 rounded-xl text-center min-w-[50px]">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                              month: 'short',
                            })}
                          </span>
                          <span className="text-base font-extrabold text-slate-800 block leading-tight">
                            {new Date(ev.event_date + 'T00:00:00').getDate()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center flex-wrap gap-1.5">
                            <h5 className="font-bold text-xs sm:text-sm text-slate-800">
                              {ev.title}
                            </h5>
                            {getTypeBadge(ev.event_type)}
                            {isSemed && (
                              <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                SEMED 2026
                              </span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>
                          )}
                        </div>
                      </div>

                      {canEdit && !isSemed && (
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Remover evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* POP-UP EXPANSÍVEL DO DIA CLICADO (ABRE DO QUADRADINHO E FECHA VOLTANDO PARA ELE) */}
      {dayPopup && (() => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 700;
        const targetW = Math.min(440, vw - 24);
        const targetH = Math.min(420, vh - 48);
        const originCx = dayPopup.originRect.left + dayPopup.originRect.width / 2;
        const originCy = dayPopup.originRect.top + dayPopup.originRect.height / 2;
        const dx = originCx - vw / 2;
        const dy = originCy - vh / 2;
        const sx = Math.max(0.12, dayPopup.originRect.width / targetW);
        const sy = Math.max(0.12, dayPopup.originRect.height / targetH);
        const isCollapsed = popupAnimPhase === 'from' || popupAnimPhase === 'closing';
        const popupEvents = eventsByDate[dayPopup.dateStr] || [];
        const dObj = new Date(dayPopup.dateStr + 'T00:00:00');
        const weekdayFull = dObj.toLocaleDateString('pt-BR', { weekday: 'long' });

        return (
          <div
            onClick={closeDayPopup}
            className={`fixed inset-0 z-[70] flex items-center justify-center p-3 transition-colors duration-250 ${
              isCollapsed ? 'bg-slate-950/0 backdrop-blur-none' : 'bg-slate-950/55 backdrop-blur-xs'
            }`}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: targetW,
                maxHeight: '82vh',
                transform: isCollapsed
                  ? `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
                  : 'translate(0px, 0px) scale(1, 1)',
                opacity: popupAnimPhase === 'closing' ? 0 : popupAnimPhase === 'from' ? 0.5 : 1,
                transition:
                  'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
              }}
              className="bg-white rounded-2xl shadow-2xl border border-emerald-200 overflow-hidden flex flex-col origin-center"
            >
              <div className="px-4 py-3 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between shrink-0">
                <div>
                  <h4 className="font-extrabold text-sm capitalize">
                    {weekdayFull} • {formatDateBR(dayPopup.dateStr)}
                  </h4>
                  <p className="text-[11px] text-emerald-100">
                    {popupEvents.length === 0
                      ? 'Nenhum evento marcado nesta data'
                      : `${popupEvents.length} ${
                          popupEvents.length === 1 ? 'evento registrado' : 'eventos registrados'
                        }`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDayPopup}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
                {popupEvents.length === 0 ? (
                  <div className="p-5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    Dia letivo normal sem eventos especiais na SEMED ou na escola.
                  </div>
                ) : (
                  popupEvents.map((ev) => {
                    const isSemed = isSemedOfficialEvent(ev.id);
                    return (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-900">
                              {ev.title}
                            </span>
                            {getTypeBadge(ev.event_type)}
                            {isSemed ? (
                              <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                                SEMED 2026
                              </span>
                            ) : (
                              <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                                Escola
                              </span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              {ev.description}
                            </p>
                          )}
                        </div>
                        {canEdit && !isSemed && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition shrink-0"
                            title="Remover evento da escola"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      const d = dayPopup.dateStr;
                      closeDayPopup();
                      setEventDate(d);
                      setShowAddForm(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar evento da escola</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 font-medium">
                    Sincronizado SEMED & Escola
                  </span>
                )}
                <button
                  type="button"
                  onClick={closeDayPopup}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
