import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Plus, Trash2, Tag, Clock, Loader2 } from 'lucide-react';
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
  const [eventType, setEventType] = useState<'pedagogico' | 'reuniao' | 'conselho' | 'feriado' | 'prova' | 'evento'>('pedagogico');
  const [loading, setLoading] = useState(false);

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
        return <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Reunião</span>;
      case 'conselho':
        return <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Conselho de Classe</span>;
      case 'feriado':
        return <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Feriado / Recesso</span>;
      case 'prova':
        return <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Avaliações</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Pedagógico</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Topo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Calendário Escolar & Datas Importantes</h3>
              <p className="text-xs text-slate-500">Cronograma oficial de eventos, reuniões e fechamento de notas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Selo de Integração SEMED Manaus */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-emerald-900">
              <strong className="font-extrabold">Calendário Oficial SEMED Manaus 2026 integrado</strong>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Bimestres, avaliações (Av1/Av2/Av3 e ADE), planejamentos, lançamento de notas, conselho, feriados e recessos (Resolução Nº 183/CME/2025).
              </p>
            </div>
            <a
              href="https://www.manaus.am.gov.br/semed/calendario-escolar/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 transition"
            >
              Portal SEMED
            </a>
          </div>
          
          {/* Adicionar Evento (se for pedagoga/admin) */}
          {canEdit && (
            <form onSubmit={handleAddEvent} className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/70 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center space-x-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Adicionar Nova Data no Calendário Escolar</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Título do Evento *</label>
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Data *</label>
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipo de Evento</label>
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Observações</label>
                  <input
                    type="text"
                    placeholder="Ex: Não haverá aula para os alunos do turno matutino"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Lançar no Calendário'}
                </button>
              </div>
            </form>
          )}

          {/* Lista de Eventos Agendados */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Eventos & Prazos da Escola ({events.length})
            </h4>

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
                            {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                          </span>
                          <span className="text-base font-extrabold text-slate-800 block leading-tight">
                            {new Date(ev.event_date + 'T00:00:00').getDate()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center flex-wrap gap-1.5">
                            <h5 className="font-bold text-xs sm:text-sm text-slate-800">{ev.title}</h5>
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
          </div>

        </div>

      </div>
    </div>
  );
};
