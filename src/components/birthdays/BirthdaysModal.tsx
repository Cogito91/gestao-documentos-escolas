import React, { useState } from 'react';
import { X, Cake, Plus, Trash2, Calendar, Sparkles, Heart } from 'lucide-react';
import { Birthday } from '../../types/database.types';
import { pedagogicalService } from '../../services/pedagogicalService';

interface BirthdaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthdays: Birthday[];
  onRefresh: () => void;
  canEdit?: boolean;
}

export const BirthdaysModal: React.FC<BirthdaysModalProps> = ({
  isOpen,
  onClose,
  birthdays,
  onRefresh,
  canEdit = true,
}) => {
  const currentMonth = new Date().getMonth() + 1; // 1 a 12
  const currentDay = new Date().getDate();

  const [name, setName] = useState('');
  const [birthDay, setBirthDay] = useState(currentDay);
  const [birthMonth, setBirthMonth] = useState(currentMonth);
  const [roleOrClass, setRoleOrClass] = useState('');
  const [loading, setLoading] = useState(false);

  const months = [
    { id: 1, name: 'Janeiro' },
    { id: 2, name: 'Fevereiro' },
    { id: 3, name: 'Março' },
    { id: 4, name: 'Abril' },
    { id: 5, name: 'Maio' },
    { id: 6, name: 'Junho' },
    { id: 7, name: 'Julho' },
    { id: 8, name: 'Agosto' },
    { id: 9, name: 'Setembro' },
    { id: 10, name: 'Outubro' },
    { id: 11, name: 'Novembro' },
    { id: 12, name: 'Dezembro' },
  ];

  if (!isOpen) return null;

  const thisMonthBirthdays = birthdays.filter(b => b.birth_month === currentMonth);

  const handleAddBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await pedagogicalService.addBirthday({
        name: name.trim(),
        birth_day: Number(birthDay),
        birth_month: Number(birthMonth),
        role_or_class: roleOrClass.trim() || undefined,
      });
      setName('');
      setRoleOrClass('');
      onRefresh();
    } catch (err: any) {
      alert('Erro ao salvar aniversariante: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBirthday = async (id: string) => {
    if (!confirm('Deseja remover este aniversariante?')) return;
    try {
      await pedagogicalService.deleteBirthday(id);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Topo Festivo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-amber-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-500 text-white rounded-xl shadow-sm shadow-rose-500/20">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Mural de Aniversariantes da Escola</h3>
              <p className="text-xs text-rose-700">Comemorações e homenagens para docentes e funcionários</p>
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
          
          {/* Card Especial: Aniversariantes do Mês Vigente */}
          <div className="bg-gradient-to-r from-rose-500 to-amber-500 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-200" />
              <h4 className="font-bold text-sm uppercase tracking-wider">
                Aniversariantes de {months.find(m => m.id === currentMonth)?.name} ({thisMonthBirthdays.length})
              </h4>
            </div>

            {thisMonthBirthdays.length === 0 ? (
              <p className="text-xs text-rose-100">Nenhum aniversariante cadastrado para este mês.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                {thisMonthBirthdays.map(b => {
                  const isToday = b.birth_day === currentDay;
                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-xl backdrop-blur-md flex items-center justify-between ${
                        isToday 
                          ? 'bg-white text-slate-900 border-2 border-amber-300 shadow-lg' 
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isToday ? 'bg-rose-500 text-white' : 'bg-white/30 text-white'
                        }`}>
                          {b.birth_day}
                        </div>
                        <div>
                          <p className="font-bold text-xs">{b.name} {isToday && '🎉 (HOJE!)'}</p>
                          <p className={`text-[10px] ${isToday ? 'text-slate-500' : 'text-rose-100'}`}>
                            {b.role_or_class || 'Docente'}
                          </p>
                        </div>
                      </div>
                      <Cake className={`w-4 h-4 ${isToday ? 'text-rose-500 animate-bounce' : 'text-amber-200'}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Adicionar Aniversariante */}
          {canEdit && (
            <form onSubmit={handleAddBirthday} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Plus className="w-4 h-4 text-rose-600" />
                <span>Cadastrar Novo Aniversariante</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Profa. Juliana Santos"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Dia</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={birthDay}
                    onChange={(e) => setBirthDay(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mês</label>
                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {months.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cargo / Turma / Disciplina</label>
                <input
                  type="text"
                  placeholder="Ex: Professora de Português / 6º Ano"
                  value={roleOrClass}
                  onChange={(e) => setRoleOrClass(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar no Mural'}
                </button>
              </div>
            </form>
          )}

          {/* Lista Geral de Aniversariantes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Quadro Geral de Aniversários ({birthdays.length})
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {birthdays.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum aniversariante cadastrado ainda.
                </div>
              ) : (
                birthdays
                  .sort((a, b) => a.birth_month - b.birth_month || a.birth_day - b.birth_day)
                  .map(b => (
                    <div key={b.id} className="p-3 bg-white hover:bg-slate-50 transition flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-12 text-center text-xs font-bold bg-slate-100 py-1 rounded-md text-slate-700">
                          {b.birth_day} {months.find(m => m.id === b.birth_month)?.name.slice(0, 3)}
                        </span>
                        <div>
                          <p className="font-semibold text-xs text-slate-800">{b.name}</p>
                          <p className="text-[11px] text-slate-500">{b.role_or_class || 'Docente'}</p>
                        </div>
                      </div>

                      {canEdit && (
                        <button
                          onClick={() => handleDeleteBirthday(b.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
