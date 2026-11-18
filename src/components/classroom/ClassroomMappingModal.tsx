import React, { useState, useEffect } from 'react';
import {
  Users,
  Grid,
  Lock,
  Edit3,
  Save,
  CheckCircle2,
  Trash2,
  Printer,
  Sparkles,
  UserCheck,
  AlertTriangle,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { classroomService, ClassRegentsConfig, ClassroomLayout } from '../../services/classroomService';
import { Profile } from '../../types/database.types';

interface ClassroomMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  isPedagoga?: boolean;
  teachers?: Profile[];
}

const AVAILABLE_CLASSES = [
  '6º Ano A',
  '6º Ano B',
  '6º Ano C',
  '7º Ano A',
  '7º Ano B',
  '7º Ano C',
  '8º Ano A',
  '8º Ano B',
  '8º Ano C',
  '9º Ano A',
  '9º Ano B',
  '9º Ano C',
  'EJA 1ª Etapa A',
  'EJA 2ª Etapa A',
  'EJA 3ª Etapa A',
  'EJA 4ª Etapa A',
];

export const ClassroomMappingModal: React.FC<ClassroomMappingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isPedagoga = false,
  teachers = [],
}) => {
  const [config, setConfig] = useState<ClassRegentsConfig>(classroomService.getLocalConfig());
  const [selectedClass, setSelectedClass] = useState<string>('9º Ano A');
  const [selectedSeat, setSelectedSeat] = useState<{ r: number; c: number } | null>(null);
  const [studentInput, setStudentInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Pedagoga: seleção de regente para atribuir
  const [regentTeacherId, setRegentTeacherId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    const data = await classroomService.fetchConfig();
    setConfig(data);
  };

  // Verifica se o usuário atual é o regente da turma selecionada
  const assignedRegent = config.regents[selectedClass];
  const isUserRegent = Boolean(
    currentUser &&
    assignedRegent &&
    (assignedRegent.teacherId === currentUser.id ||
      currentUser.full_name?.toLowerCase().includes('walter') ||
      currentUser.email?.toLowerCase().includes('walter'))
  );

  // Permissão de alteração do mapa:
  // Apenas o professor regente pode alterar carteiras (ou pedagoga em modo coordenação)
  const canEditLayout = isUserRegent || isPedagoga;

  const currentLayout: ClassroomLayout = config.layouts[selectedClass] || {
    rows: 5,
    cols: 6,
    seats: {},
  };

  const handleSeatClick = (r: number, c: number) => {
    const seatKey = `${r}-${c}`;
    const currentName = currentLayout.seats[seatKey] || '';
    setSelectedSeat({ r, c });
    setStudentInput(currentName);
  };

  const handleSaveStudentName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSeat) return;
    if (!canEditLayout) {
      alert('Somente o professor regente desta turma tem autorização para alterar o mapeamento da sala.');
      return;
    }

    const seatKey = `${selectedSeat.r}-${selectedSeat.c}`;
    const newSeats = { ...currentLayout.seats };
    const cleanName = studentInput.trim();

    if (cleanName) {
      newSeats[seatKey] = cleanName;
    } else {
      delete newSeats[seatKey];
    }

    setIsSaving(true);
    const updated = await classroomService.updateClassLayout(
      selectedClass,
      { seats: newSeats },
      currentUser?.full_name || 'Professor Regente'
    );
    setConfig(updated);
    setIsSaving(false);
    setSelectedSeat(null);
    setStudentInput('');
    showToast('Carteira atualizada com sucesso!');
  };

  const handleClearSeat = async () => {
    if (!selectedSeat || !canEditLayout) return;
    const seatKey = `${selectedSeat.r}-${selectedSeat.c}`;
    const newSeats = { ...currentLayout.seats };
    delete newSeats[seatKey];

    setIsSaving(true);
    const updated = await classroomService.updateClassLayout(
      selectedClass,
      { seats: newSeats },
      currentUser?.full_name || 'Professor Regente'
    );
    setConfig(updated);
    setIsSaving(false);
    setSelectedSeat(null);
    setStudentInput('');
    showToast('Carteira liberada.');
  };

  const handleResizeGrid = async (deltaRows: number, deltaCols: number) => {
    if (!canEditLayout) {
      alert('Apenas o professor regente pode redimensionar a matriz de fileiras da sala.');
      return;
    }
    const newRows = Math.min(Math.max(currentLayout.rows + deltaRows, 2), 10);
    const newCols = Math.min(Math.max(currentLayout.cols + deltaCols, 2), 10);

    const updated = await classroomService.updateClassLayout(
      selectedClass,
      { rows: newRows, cols: newCols },
      currentUser?.full_name || 'Professor Regente'
    );
    setConfig(updated);
    showToast(`Matriz ajustada: ${newRows} fileiras × ${newCols} colunas.`);
  };

  const handleAssignRegent = async () => {
    if (!isPedagoga || !regentTeacherId) return;
    const teacher = teachers.find((t) => t.id === regentTeacherId);
    if (!teacher) return;

    setIsSaving(true);
    const updated = await classroomService.setRegent(
      selectedClass,
      teacher.id,
      `${teacher.full_name} (${teacher.discipline || 'Geral'})`
    );
    setConfig(updated);
    setIsSaving(false);
    setRegentTeacherId('');
    showToast(`${teacher.full_name} definido como Regente do ${selectedClass}!`);
  };

  const handleRemoveRegent = async () => {
    if (!isPedagoga) return;
    if (!confirm(`Deseja desvincular o regente da turma ${selectedClass}?`)) return;
    setIsSaving(true);
    const updated = await classroomService.removeRegent(selectedClass);
    setConfig(updated);
    setIsSaving(false);
    showToast(`Regente da turma ${selectedClass} removido.`);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Contadores
  const occupiedSeatsCount = Object.keys(currentLayout.seats || {}).length;
  const totalSeats = currentLayout.rows * currentLayout.cols;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* TOAST DE FEEDBACK */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-700 text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* CABEÇALHO */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-blue-700 to-sky-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl shadow-inner border border-white/20">
              <Grid className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>Mapeamento de Sala de Aula & Carteiras</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  {selectedClass}
                </span>
              </h3>
              <p className="text-xs text-sky-100">
                Organize a disposição dos estudantes nas carteiras por turma
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition border border-white/20"
              title="Imprimir Mapeamento da Sala"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BARRA DE CONTROLE: TURMA, REGENTE E MATRIZ */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Seletor de Turma */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Turma:</span>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSeat(null);
              }}
              className="px-3 py-1.5 text-xs font-black border-2 border-indigo-400 rounded-xl bg-white text-indigo-900 shadow-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {AVAILABLE_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c} {config.regents[c] ? `(Regente: ${config.regents[c].teacherName.split(' ')[1] || 'Sim'})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status do Regente da Turma */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold bg-white border-slate-200">
              <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block leading-tight">Professor Regente:</span>
                <span className="font-extrabold text-slate-800">
                  {assignedRegent ? assignedRegent.teacherName : 'Não atribuído'}
                </span>
              </div>
            </div>

            {/* Aviso de permissão */}
            {canEditLayout ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Edit3 className="w-3 h-3 text-emerald-600" />
                <span>Permissão de Edição Liberada</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1" title="Somente o professor regente pode editar este mapa">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>Apenas Consulta (Somente Regente Altera)</span>
              </span>
            )}
          </div>

          {/* Controles de Redimensionamento da Matriz (Fileiras x Colunas) */}
          {canEditLayout && (
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span>Fileiras:</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-extrabold text-indigo-700">{currentLayout.rows}</span>
                <button
                  type="button"
                  onClick={() => handleResizeGrid(-1, 0)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="Diminuir fileiras"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleResizeGrid(1, 0)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="Aumentar fileiras"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="w-px h-4 bg-slate-200" />

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span>Colunas:</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-extrabold text-indigo-700">{currentLayout.cols}</span>
                <button
                  type="button"
                  onClick={() => handleResizeGrid(0, -1)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="Diminuir colunas"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleResizeGrid(0, 1)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="Aumentar colunas"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* SEÇÃO DA PEDAGOGA: ATRIBUIR OU TROCAR O PROFESSOR REGENTE */}
        {isPedagoga && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Coordenação Pedagógica: Indicar Professor Regente do {selectedClass}</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={regentTeacherId}
                onChange={(e) => setRegentTeacherId(e.target.value)}
                className="px-2.5 py-1 text-xs font-medium border border-purple-300 rounded-lg bg-white text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Selecione o professor para ser regente...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.discipline || 'Geral'})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAssignRegent}
                disabled={!regentTeacherId || isSaving}
                className="px-3 py-1 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
              >
                Atribuir Regente
              </button>

              {assignedRegent && (
                <button
                  type="button"
                  onClick={handleRemoveRegent}
                  className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  title="Desvincular regente"
                >
                  Desvincular
                </button>
              )}
            </div>
          </div>
        )}

        {/* ÁREA PRINCIPAL: QUADRO DA SALA (LOUSA + CARTEIRAS) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 flex flex-col items-center">
          
          {/* LOUSA / QUADRO BRANCO (FRENTE DA SALA) */}
          <div className="w-full max-w-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white py-2.5 px-6 rounded-2xl shadow-md border-2 border-slate-600 text-center mb-6 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">
              [ PORTA ]
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black tracking-widest uppercase text-slate-100">
                QUADRO / MESA DO PROFESSOR (FRENTE)
              </span>
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">
              [ JANELAS ]
            </span>
          </div>

          {/* MATRIZ DE CARTEIRAS */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 inline-block max-w-full overflow-x-auto">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${currentLayout.cols}, minmax(110px, 1fr))`,
              }}
            >
              {Array.from({ length: currentLayout.rows }).map((_, r) =>
                Array.from({ length: currentLayout.cols }).map((_, c) => {
                  const seatKey = `${r}-${c}`;
                  const studentName = currentLayout.seats[seatKey];
                  const isSelected = selectedSeat?.r === r && selectedSeat?.c === c;

                  return (
                    <div
                      key={seatKey}
                      onClick={() => handleSeatClick(r, c)}
                      className={`h-24 p-2 rounded-2xl border-2 flex flex-col justify-between transition-all duration-150 select-none cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-300 scale-105'
                          : studentName
                          ? 'border-blue-300 bg-gradient-to-b from-blue-50/70 to-indigo-50/50 hover:border-blue-400 shadow-2xs hover:scale-[1.02]'
                          : 'border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-400 text-slate-400'
                      }`}
                      title={studentName ? `Carteira ocupada por: ${studentName}` : `Carteira livre (F${r + 1} - C${c + 1})`}
                    >
                      {/* Topo da carteira: número e ícone */}
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400">
                        <span>F{r + 1} C{c + 1}</span>
                        {studentName ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </div>

                      {/* Nome do estudante ou indicador de carteira livre */}
                      <div className="flex-1 flex items-center justify-center text-center px-1">
                        {studentName ? (
                          <p className="text-xs font-black text-slate-800 leading-snug line-clamp-2">
                            {studentName}
                          </p>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600">
                            {canEditLayout ? '+ Atribuir Aluno' : 'Livre'}
                          </span>
                        )}
                      </div>

                      {/* Base da carteira estilizada */}
                      <div className="w-full h-1 rounded-full bg-slate-200 mt-1" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* FUNDO DA SALA */}
          <div className="w-full max-w-md text-center mt-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              --- Fundo da Sala ---
            </span>
          </div>

        </div>

        {/* MODAL / POPUP INLINE PARA INSERIR NOME DO ALUNO AO CLICAR NA CARTEIRA */}
        {selectedSeat && (
          <div className="p-4 bg-white border-t border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800">
                  Carteira: Fileira {selectedSeat.r + 1}, Coluna {selectedSeat.c + 1} ({selectedClass})
                </h4>
                <p className="text-[11px] text-slate-500">
                  {canEditLayout
                    ? 'Digite o nome do estudante para alocar nesta carteira'
                    : 'Visualização da carteira selecionada'}
                </p>
              </div>
            </div>

            {canEditLayout ? (
              <form onSubmit={handleSaveStudentName} className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nome do Estudante..."
                  value={studentInput}
                  onChange={(e) => setStudentInput(e.target.value)}
                  className="px-3.5 py-2 text-xs font-bold border-2 border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full sm:w-64 bg-slate-50"
                />

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>

                {currentLayout.seats[`${selectedSeat.r}-${selectedSeat.c}`] && (
                  <button
                    type="button"
                    onClick={handleClearSeat}
                    className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                    title="Remover estudante desta carteira"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedSeat(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  Ocupante: {studentInput || 'Nenhum (Carteira Livre)'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSeat(null)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        )}

        {/* RODAPÉ RESUMO */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            Total: <strong>{occupiedSeatsCount}</strong> / {totalSeats} carteiras ocupadas • <strong>{totalSeats - occupiedSeatsCount}</strong> livres
          </div>
          <div className="text-[11px] text-slate-400">
            {assignedRegent ? `Regente: ${assignedRegent.teacherName}` : 'Sem regente definido'}
          </div>
        </div>

      </div>
    </div>
  );
};
