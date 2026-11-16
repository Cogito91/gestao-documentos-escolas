import React, { useState } from 'react';
import { X, Settings, Plus, Trash2, Calendar as CalendarIcon, Check, Layers, Filter, Camera } from 'lucide-react';
import { DocumentCategory } from '../../types/database.types';
import { pedagogicalService } from '../../services/pedagogicalService';
import { formatDeadlineLabel, encodeCategoryDescription } from '../../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: DocumentCategory[];
  onRefresh: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  categories,
  onRefresh,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatBimestre, setNewCatBimestre] = useState('1º Bimestre');
  const [newCatRequiresEvidence, setNewCatRequiresEvidence] = useState(false);
  
  // Data completa para o calendário (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [newCatDate, setNewCatDate] = useState(todayStr);

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>(todayStr);

  // Filtro por Bimestre dentro da janela
  const [selectedBimestreTab, setSelectedBimestreTab] = useState<string>('all');

  const bimestresList = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre', 'Anual / Geral'];

  if (!isOpen) return null;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setLoading(true);
    try {
      const parts = newCatDate.split('-');
      const day = parseInt(parts[2], 10);

      await pedagogicalService.createCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
        deadline_day: day,
        bimestre: newCatBimestre,
        requires_evidence: newCatRequiresEvidence,
      });

      try {
        await pedagogicalService.addSchoolEvent({
          title: `Prazo Final (${newCatBimestre}): ${newCatName.trim()}`,
          description: newCatDesc.trim() || 'Data limite para entrega deste documento pedagógico.',
          event_date: newCatDate,
          event_type: 'pedagogico',
        });
      } catch (evtErr) {
        console.warn('Evento ignorado:', evtErr);
      }

      setNewCatName('');
      setNewCatDesc('');
      setNewCatRequiresEvidence(false);
      setNewCatDate(todayStr);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao criar categoria: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeadlineDate = async (catId: string) => {
    try {
      const parts = editDate.split('-');
      const day = parseInt(parts[2], 10);

      await pedagogicalService.updateCategory(catId, { 
        deadline_day: day
      });
      setEditingId(null);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao atualizar prazo: ' + err.message);
    }
  };

  const handleUpdateBimestre = async (cat: DocumentCategory, newBim: string) => {
    try {
      await pedagogicalService.updateCategory(cat.id, {
        bimestre: newBim,
        description: encodeCategoryDescription(cat.description, cat.requires_evidence, newBim),
      });
      onRefresh();
    } catch (err: any) {
      console.warn('Erro ao atualizar bimestre:', err);
    }
  };

  const handleToggleRequiresEvidence = async (cat: DocumentCategory) => {
    try {
      await pedagogicalService.updateCategory(cat.id, {
        description: encodeCategoryDescription(cat.description, !cat.requires_evidence, cat.bimestre),
      });
      onRefresh();
    } catch (err: any) {
      alert('Erro ao atualizar exigência de evidências: ' + err.message);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Deseja excluir este documento da lista de obrigações?')) return;
    try {
      await pedagogicalService.deleteCategory(catId);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // Filtragem por Bimestre
  const filteredCategories = categories.filter(cat => {
    if (selectedBimestreTab === 'all') return true;
    return (cat.bimestre || '1º Bimestre') === selectedBimestreTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Topo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Controle de Entregas & Prazos por Bimestre</h3>
              <p className="text-xs text-slate-500">Defina os documentos cobrados em cada bimestre e suas datas limites</p>
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
          
          {/* Adicionar Novo Documento com Seleção de Bimestre e Calendário */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200/70">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-3 flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-purple-600" />
              <span>Cadastrar Novo Documento para o Bimestre</span>
            </h4>
            
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Nome do Documento */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nome do Documento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Prova Bimestral com Gabarito"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  />
                </div>

                {/* Seleção do Bimestre */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Bimestre *</span>
                  </label>
                  <select
                    value={newCatBimestre}
                    onChange={(e) => setNewCatBimestre(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium text-slate-700"
                  >
                    {bimestresList.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                
                {/* Calendário para Escolher o Dia e o Mês */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>Data Limite *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newCatDate}
                    onChange={(e) => setNewCatDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium text-slate-700 cursor-pointer shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Instruções / Descrição aos Professores</label>
                <input
                  type="text"
                  placeholder="Ex: Enviar arquivo formatado em PDF pronto para conferência e impressão"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                />
              </div>

              {/* Caixa de seleção para exigir evidências */}
              <label className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-white border border-purple-200/80 cursor-pointer hover:bg-purple-50/40 transition select-none">
                <input
                  type="checkbox"
                  checked={newCatRequiresEvidence}
                  onChange={(e) => setNewCatRequiresEvidence(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-purple-700 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5 text-purple-600" />
                    <span>Exigir que o professor anexe evidências (fotos ou comprovantes) ao postar este documento</span>
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Quando marcado, o professor precisará enviar pelo menos um arquivo de evidência junto com o documento.
                  </span>
                </div>
              </label>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={loading || !newCatName.trim()}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Documento no Bimestre'}
                </button>
              </div>
            </form>
          </div>

          {/* Lista simplificada dos Documentos Cadastrados */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Documentos Cadastrados ({filteredCategories.length})</span>
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {filteredCategories.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Nenhum documento cadastrado ainda.
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <div key={cat.id} className="p-3.5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-800">{cat.name}</span>
                        
                        {/* Badge de Bimestre */}
                        <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                          {cat.bimestre || '1º Bimestre'}
                        </span>

                        {/* Badge de Prazo Final (sem 'todo dia') */}
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200 flex items-center space-x-1">
                          <CalendarIcon className="w-3 h-3 text-indigo-500" />
                          <span>{formatDeadlineLabel(cat)}</span>
                        </span>

                        {cat.requires_evidence && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center space-x-1">
                            <Camera className="w-3 h-3 text-amber-600" />
                            <span>Exige Evidências</span>
                          </span>
                        )}
                      </div>

                      {cat.description && (
                        <p className="text-xs text-slate-500 mt-1">{cat.description}</p>
                      )}
                    </div>

                    {/* Mudar Bimestre ou Alterar Data no Calendário */}
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleRequiresEvidence(cat)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-lg border flex items-center space-x-1 transition ${
                          cat.requires_evidence
                            ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                        title="Alternar exigência de evidências para este documento"
                      >
                        <Camera className="w-3 h-3" />
                        <span>{cat.requires_evidence ? 'Com Evidência' : 'Sem Evidência'}</span>
                      </button>
                      {/* Dropdown rápido para mover de bimestre */}
                      <select
                        value={cat.bimestre || '1º Bimestre'}
                        onChange={(e) => handleUpdateBimestre(cat, e.target.value)}
                        className="text-[11px] px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium"
                        title="Mudar Bimestre"
                      >
                        {bimestresList.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>

                      {editingId === cat.id ? (
                        <div className="flex items-center space-x-1.5 bg-purple-50 p-1.5 rounded-xl border border-purple-200">
                          <CalendarIcon className="w-4 h-4 text-purple-600" />
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="px-2 py-1 text-xs border border-purple-300 rounded-lg bg-white font-medium cursor-pointer"
                          />
                          <button
                            onClick={() => handleUpdateDeadlineDate(cat.id)}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition"
                            title="Confirmar novo prazo"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(cat.id);
                            const now = new Date();
                            const y = now.getFullYear();
                            const m = String(now.getMonth() + 1).padStart(2, '0');
                            const d = String(cat.deadline_day || 5).padStart(2, '0');
                            setEditDate(`${y}-${m}-${d}`);
                          }}
                          className="px-2.5 py-1 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 font-semibold flex items-center space-x-1 transition shadow-sm"
                        >
                          <CalendarIcon className="w-3.5 h-3.5 text-purple-600" />
                          <span>Mudar Data</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Excluir Categoria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
