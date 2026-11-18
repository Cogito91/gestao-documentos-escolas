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
  X,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sliders,
  Maximize2,
  DoorOpen,
  Monitor,
  Briefcase,
  Compass,
} from 'lucide-react';
import {
  classroomService,
  ClassRegentsConfig,
  ClassroomLayout,
  BoardPosition,
  TeacherDeskPosition,
  DoorPosition,
  DeskFacing,
} from '../../services/classroomService';
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

  // Controle de colapso do menu superior para maximizar área de trabalho
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  // Controle de abertura da barra de personalização física (quadro, porta, mesa, orientação)
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);

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
    boardPosition: 'top',
    teacherDeskPosition: 'top-right',
    doorPosition: 'top-left',
    deskFacing: 'up',
  };

  const boardPosition: BoardPosition = currentLayout.boardPosition || 'top';
  const teacherDeskPosition: TeacherDeskPosition = currentLayout.teacherDeskPosition || 'top-right';
  const doorPosition: DoorPosition = currentLayout.doorPosition || 'top-left';
  const deskFacing: DeskFacing = currentLayout.deskFacing || 'up';

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

  const handleUpdateLayoutProperty = async (patch: Partial<ClassroomLayout>) => {
    if (!canEditLayout) {
      alert('Apenas o professor regente tem permissão para reposicionar elementos ou alterar o direcionamento.');
      return;
    }
    setIsSaving(true);
    const updated = await classroomService.updateClassLayout(
      selectedClass,
      patch,
      currentUser?.full_name || 'Professor Regente'
    );
    setConfig(updated);
    setIsSaving(false);
    showToast('Disposição da sala atualizada!');
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

  // Render do ícone de direção da carteira
  const renderFacingIcon = () => {
    switch (deskFacing) {
      case 'down':
        return <ArrowDown className="w-2.5 h-2.5 text-indigo-400 inline" />;
      case 'left':
        return <ArrowLeft className="w-2.5 h-2.5 text-indigo-400 inline" />;
      case 'right':
        return <ArrowRight className="w-2.5 h-2.5 text-indigo-400 inline" />;
      case 'up':
      default:
        return <ArrowUp className="w-2.5 h-2.5 text-indigo-400 inline" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* TOAST DE FEEDBACK */}
        {toastMsg && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-indigo-800 text-white px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 text-xs font-bold animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* CABEÇALHO COMPACTO COM BOTÃO DE COLAPSAR MENU */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-800 via-blue-800 to-sky-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/15 rounded-xl border border-white/20">
              <Grid className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                  Mapeamento de Sala & Carteiras
                </h3>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  {selectedClass}
                </span>
                {assignedRegent && (
                  <span className="hidden sm:inline-block text-[10px] text-sky-200 font-medium">
                    (Regente: {assignedRegent.teacherName.split(' ')[1] || assignedRegent.teacherName})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botão de Colapsar / Expandir Menu Superior */}
            <button
              type="button"
              onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                isMenuCollapsed
                  ? 'bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
              }`}
              title={isMenuCollapsed ? 'Expandir menu superior' : 'Colapsar menu para ampliar tela de trabalho'}
            >
              {isMenuCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Expandir Menu</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ocultar Menu (Ampliar Sala)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-bold transition border border-white/20"
              title="Imprimir Mapeamento da Sala"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ÁREA DE CONTROLES (COLAPSÁVEL) */}
        {!isMenuCollapsed && (
          <div className="bg-slate-50 border-b border-slate-200 transition-all shrink-0">
            {/* LINHA 1: TURMA, REGENTE, DIMENSÕES E BOTÃO DE PERSONALIZAÇÃO */}
            <div className="p-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              
              {/* Seletor de Turma */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 text-xs">Turma:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSeat(null);
                  }}
                  className="px-2.5 py-1 text-xs font-black border border-indigo-300 rounded-lg bg-white text-indigo-900 shadow-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {AVAILABLE_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c} {config.regents[c] ? `★` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status do Regente */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-slate-200">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="text-[11px] text-slate-500">Regente:</span>
                  <span className="font-extrabold text-slate-800 text-xs truncate max-w-[130px] sm:max-w-none">
                    {assignedRegent ? assignedRegent.teacherName : 'Não atribuído'}
                  </span>
                </div>

                {canEditLayout ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <Edit3 className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Edição Liberada</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                    <span>Apenas Leitura</span>
                  </span>
                )}
              </div>

              {/* Matriz (Fileiras x Colunas) & Botão de Disposição */}
              {canEditLayout && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <span className="text-slate-600 text-[11px] font-bold">Grade:</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 font-black text-indigo-700 text-xs">
                      {currentLayout.rows}F × {currentLayout.cols}C
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResizeGrid(-1, 0)}
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-600"
                      title="Diminuir fileiras"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResizeGrid(1, 0)}
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-600"
                      title="Aumentar fileiras"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleResizeGrid(0, -1)}
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-600"
                      title="Diminuir colunas"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResizeGrid(0, 1)}
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-600"
                      title="Aumentar colunas"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Toggle para configurar Quadro, Porta, Mesa e Direcionamento */}
                  <button
                    type="button"
                    onClick={() => setShowLayoutSettings(!showLayoutSettings)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition border shadow-xs ${
                      showLayoutSettings
                        ? 'bg-indigo-600 text-white border-indigo-700'
                        : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Posicionar Sala</span>
                  </button>
                </div>
              )}

            </div>

            {/* PAINEL DE DISPOSIÇÃO FÍSICA: QUADRO, PORTA, MESA DO PROFESSOR, DIRECIONAMENTO CARTEIRAS */}
            {canEditLayout && showLayoutSettings && (
              <div className="p-3 bg-gradient-to-r from-indigo-50 via-sky-50 to-slate-50 border-t border-indigo-100 flex flex-wrap items-center gap-4 text-xs animate-fadeIn">
                
                {/* 1. Direcionamento das Carteiras */}
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-700" />
                  <span className="font-bold text-slate-700">Frente das Carteiras:</span>
                  <div className="flex items-center bg-white rounded-lg border border-slate-300 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateLayoutProperty({ deskFacing: 'up' })}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                        deskFacing === 'up' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Carteiras voltadas para Cima (Topo)"
                    >
                      <ArrowUp className="w-3 h-3" /> Cima
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateLayoutProperty({ deskFacing: 'down' })}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                        deskFacing === 'down' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Carteiras voltadas para Baixo (Fundo)"
                    >
                      <ArrowDown className="w-3 h-3" /> Baixo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateLayoutProperty({ deskFacing: 'left' })}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                        deskFacing === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Carteiras voltadas para a Esquerda"
                    >
                      <ArrowLeft className="w-3 h-3" /> Esq.
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateLayoutProperty({ deskFacing: 'right' })}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                        deskFacing === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Carteiras voltadas para a Direita"
                    >
                      <ArrowRight className="w-3 h-3" /> Dir.
                    </button>
                  </div>
                </div>

                {/* 2. Posição da Lousa / Quadro */}
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-slate-700" />
                  <span className="font-bold text-slate-700">Quadro / Lousa:</span>
                  <select
                    value={boardPosition}
                    onChange={(e) => handleUpdateLayoutProperty({ boardPosition: e.target.value as BoardPosition })}
                    className="px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <option value="top">Parede Superior (Topo)</option>
                    <option value="bottom">Parede Inferior (Fundo)</option>
                    <option value="left">Parede Esquerda</option>
                    <option value="right">Parede Direita</option>
                  </select>
                </div>

                {/* 3. Posição da Mesa do Professor */}
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-amber-700" />
                  <span className="font-bold text-slate-700">Mesa do Professor:</span>
                  <select
                    value={teacherDeskPosition}
                    onChange={(e) => handleUpdateLayoutProperty({ teacherDeskPosition: e.target.value as TeacherDeskPosition })}
                    className="px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <option value="top-right">Topo - Direita</option>
                    <option value="top-left">Topo - Esquerda</option>
                    <option value="top-center">Topo - Centro</option>
                    <option value="bottom-right">Fundo - Direita</option>
                    <option value="bottom-left">Fundo - Esquerda</option>
                    <option value="bottom-center">Fundo - Centro</option>
                    <option value="left-center">Lateral Esquerda</option>
                    <option value="right-center">Lateral Direita</option>
                  </select>
                </div>

                {/* 4. Posição da Porta */}
                <div className="flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-bold text-slate-700">Porta da Sala:</span>
                  <select
                    value={doorPosition}
                    onChange={(e) => handleUpdateLayoutProperty({ doorPosition: e.target.value as DoorPosition })}
                    className="px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <option value="top-left">Topo - Esquerda</option>
                    <option value="top-right">Topo - Direita</option>
                    <option value="left-top">Lateral Esquerda - Superior</option>
                    <option value="left-bottom">Lateral Esquerda - Inferior</option>
                    <option value="right-top">Lateral Direita - Superior</option>
                    <option value="right-bottom">Lateral Direita - Inferior</option>
                    <option value="bottom-left">Fundo - Esquerda</option>
                    <option value="bottom-right">Fundo - Direita</option>
                  </select>
                </div>

              </div>
            )}

            {/* SEÇÃO DA PEDAGOGA: ATRIBUIR OU TROCAR REGENTE */}
            {isPedagoga && (
              <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 border-t border-purple-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Coordenação Pedagógica: Indicar Professor Regente ({selectedClass})</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={regentTeacherId}
                    onChange={(e) => setRegentTeacherId(e.target.value)}
                    className="px-2 py-1 text-xs font-medium border border-purple-300 rounded-lg bg-white text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Selecione o professor regente...</option>
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
                    className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                  >
                    Atribuir Regente
                  </button>

                  {assignedRegent && (
                    <button
                      type="button"
                      onClick={handleRemoveRegent}
                      className="px-2 py-0.5 text-xs text-rose-600 hover:text-rose-800 font-semibold"
                      title="Desvincular regente"
                    >
                      Desvincular
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ÁREA PRINCIPAL DA SALA: PLANTA VISUAL COM QUADRO, PORTA, MESA E CARTEIRAS COMPACTAS */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-3 sm:p-5 bg-slate-100/70 flex flex-col items-center justify-center min-h-[300px]">
          
          {/* CONTAINER DA SALA COM BORDAS ILUSTRANDO AS PAREDES */}
          <div className="relative bg-white/90 p-4 sm:p-6 rounded-3xl shadow-sm border-2 border-slate-300 max-w-full flex flex-col items-center">
            
            {/* PAREDE SUPERIOR (QUADRO OU PORTA OU MESA QUANDO NO TOPO) */}
            <div className="w-full flex items-center justify-between gap-2 mb-3 pb-2 border-b-2 border-slate-200">
              {/* Canto Esquerdo Topo (Porta ou Mesa) */}
              <div className="flex items-center gap-1.5 min-w-[90px]">
                {doorPosition === 'top-left' && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <DoorOpen className="w-3 h-3" /> PORTA
                  </span>
                )}
                {teacherDeskPosition === 'top-left' && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Briefcase className="w-3 h-3" /> MESA PROF.
                  </span>
                )}
              </div>

              {/* Centro Topo (Quadro ou Mesa) */}
              <div className="flex-1 flex justify-center items-center gap-2">
                {boardPosition === 'top' && (
                  <div className="px-4 py-1.5 rounded-xl bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-sm border border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>QUADRO / LOUSA</span>
                  </div>
                )}
                {teacherDeskPosition === 'top-center' && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Briefcase className="w-3 h-3" /> MESA PROFESSOR
                  </span>
                )}
              </div>

              {/* Canto Direito Topo (Porta ou Mesa) */}
              <div className="flex items-center justify-end gap-1.5 min-w-[90px]">
                {doorPosition === 'top-right' && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <DoorOpen className="w-3 h-3" /> PORTA
                  </span>
                )}
                {teacherDeskPosition === 'top-right' && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Briefcase className="w-3 h-3" /> MESA PROF.
                  </span>
                )}
              </div>
            </div>

            {/* CORPO DA SALA COM LATERAIS (ESQUERDA + MATRIZ + DIREITA) */}
            <div className="flex items-center gap-3 w-full justify-center">
              
              {/* PAREDE LATERAL ESQUERDA */}
              <div className="flex flex-col items-center justify-between py-2 border-r-2 border-slate-200 pr-2 min-w-[75px] gap-2">
                {doorPosition === 'left-top' && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black uppercase flex items-center gap-0.5">
                    <DoorOpen className="w-2.5 h-2.5" /> PORTA
                  </span>
                )}
                {boardPosition === 'left' && (
                  <div className="py-3 px-1 rounded-lg bg-slate-800 text-white font-extrabold text-[10px] uppercase [writing-mode:vertical-lr] rotate-180 flex items-center gap-1 shadow-xs">
                    QUADRO / LOUSA
                  </div>
                )}
                {teacherDeskPosition === 'left-center' && (
                  <span className="px-1.5 py-1 rounded bg-amber-600 text-white text-[9px] font-black uppercase flex items-center gap-0.5 [writing-mode:vertical-lr]">
                    MESA PROF
                  </span>
                )}
                {doorPosition === 'left-bottom' && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black uppercase flex items-center gap-0.5">
                    <DoorOpen className="w-2.5 h-2.5" /> PORTA
                  </span>
                )}
              </div>

              {/* GRADE DE CARTEIRAS COMPACTAS (Reduzidas para caber perfeitamente na tela) */}
              <div
                className="grid gap-1.5 sm:gap-2"
                style={{
                  gridTemplateColumns: `repeat(${currentLayout.cols}, minmax(70px, 92px))`,
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
                        className={`h-15 sm:h-16 p-1 sm:p-1.5 rounded-xl border-2 flex flex-col justify-between transition-all duration-150 select-none cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-300 scale-105 z-10'
                            : studentName
                            ? 'border-blue-300 bg-gradient-to-b from-blue-50/90 to-indigo-50/80 hover:border-blue-500 shadow-2xs hover:scale-[1.02]'
                            : 'border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100/90 hover:border-slate-400 text-slate-400'
                        }`}
                        title={studentName ? `Carteira: ${studentName}` : `Carteira livre (F${r + 1}-C${c + 1})`}
                      >
                        {/* Indicador superior com número da fileira/coluna e flecha de direcionamento */}
                        <div className="flex items-center justify-between text-[9px] font-black text-slate-400 leading-none">
                          <span className="text-[8px] sm:text-[9px]">F{r + 1}C{c + 1}</span>
                          <span title={`Carteiras viradas para: ${deskFacing}`}>
                            {renderFacingIcon()}
                          </span>
                        </div>

                        {/* Nome do Estudante / Carteira Vazia */}
                        <div className="flex-1 flex items-center justify-center text-center px-0.5 overflow-hidden">
                          {studentName ? (
                            <p className="text-[10px] sm:text-[11px] font-black text-slate-900 leading-tight line-clamp-2">
                              {studentName}
                            </p>
                          ) : (
                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 group-hover:text-slate-600">
                              {canEditLayout ? '+ Aluno' : 'Livre'}
                            </span>
                          )}
                        </div>

                        {/* Marcador decorativo de carteira com status */}
                        <div className="w-full flex items-center justify-center">
                          <div
                            className={`w-full h-1 rounded-full ${
                              studentName ? 'bg-indigo-500' : 'bg-slate-200'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* PAREDE LATERAL DIREITA */}
              <div className="flex flex-col items-center justify-between py-2 border-l-2 border-slate-200 pl-2 min-w-[75px] gap-2">
                {doorPosition === 'right-top' && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black uppercase flex items-center gap-0.5">
                    <DoorOpen className="w-2.5 h-2.5" /> PORTA
                  </span>
                )}
                {boardPosition === 'right' && (
                  <div className="py-3 px-1 rounded-lg bg-slate-800 text-white font-extrabold text-[10px] uppercase [writing-mode:vertical-lr] flex items-center gap-1 shadow-xs">
                    QUADRO / LOUSA
                  </div>
                )}
                {teacherDeskPosition === 'right-center' && (
                  <span className="px-1.5 py-1 rounded bg-amber-600 text-white text-[9px] font-black uppercase flex items-center gap-0.5 [writing-mode:vertical-lr]">
                    MESA PROF
                  </span>
                )}
                {doorPosition === 'right-bottom' && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black uppercase flex items-center gap-0.5">
                    <DoorOpen className="w-2.5 h-2.5" /> PORTA
                  </span>
                )}
              </div>

            </div>

            {/* PAREDE INFERIOR (FUNDO DA SALA - QUADRO, PORTA OU MESA SE CONFIGURADO NO FUNDO) */}
            <div className="w-full flex items-center justify-between gap-2 mt-3 pt-2 border-t-2 border-slate-200">
              {/* Canto Esquerdo Fundo */}
              <div className="flex items-center gap-1.5 min-w-[90px]">
                {doorPosition === 'bottom-left' && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <DoorOpen className="w-3 h-3" /> PORTA
                  </span>
                )}
                {teacherDeskPosition === 'bottom-left' && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Briefcase className="w-3 h-3" /> MESA PROF.
                  </span>
                )}
              </div>

              {/* Centro Fundo */}
              <div className="flex-1 flex justify-center items-center gap-2">
                {boardPosition === 'bottom' ? (
                  <div className="px-4 py-1.5 rounded-xl bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-sm border border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>QUADRO / LOUSA (FUNDO)</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    --- FUNDO DA SALA ---
                  </span>
                )}
                {teacherDeskPosition === 'bottom-center' && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Briefcase className="w-3 h-3" /> MESA PROFESSOR
                  </span>
                )}
              </div>

              {/* Canto Direito Fundo */}
              <div className="flex items-center justify-end gap-1.5 min-w-[90px]">
                {doorPosition === 'bottom-right' && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <DoorOpen className="w-3 h-3" /> PORTA
                  </span>
                )}
                {teacherDeskPosition === 'bottom-right' && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Briefcase className="w-3 h-3" /> MESA PROF.
                  </span>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* POPUP / MODAL INLINE PARA INSERIR NOME DO ALUNO AO CLICAR NA CARTEIRA */}
        {selectedSeat && (
          <div className="p-3 bg-white border-t border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800">
                  Carteira: F{selectedSeat.r + 1} - C{selectedSeat.c + 1} ({selectedClass})
                </h4>
                <p className="text-[10px] text-slate-500">
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
                  className="px-3 py-1.5 text-xs font-bold border-2 border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full sm:w-60 bg-slate-50"
                />

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>

                {currentLayout.seats[`${selectedSeat.r}-${selectedSeat.c}`] && (
                  <button
                    type="button"
                    onClick={handleClearSeat}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                    title="Remover estudante desta carteira"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedSeat(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
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
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        )}

        {/* RODAPÉ RESUMO COMPACTO */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div>
            Total: <strong>{occupiedSeatsCount}</strong> / {totalSeats} ocupadas • <strong>{totalSeats - occupiedSeatsCount}</strong> livres
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <span>Orientação: Carteiras voltadas para <strong>{deskFacing}</strong></span>
            <span>•</span>
            <span>{assignedRegent ? `Regente: ${assignedRegent.teacherName}` : 'Sem regente'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
