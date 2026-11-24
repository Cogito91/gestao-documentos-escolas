import React, { useState, useEffect, useRef } from 'react';
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
  DoorOpen,
  Monitor,
  Briefcase,
  Compass,
  GripHorizontal,
  RotateCcw,
  Sliders,
  AlertTriangle,
  FileText,
  MessageSquare,
  Clock,
  Calendar,
  Eye,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import {
  classroomService,
  ClassRegentsConfig,
  ClassroomLayout,
  DeskFacing,
  StudentObservation,
} from '../../services/classroomService';
import { Profile, SchoolDocument } from '../../types/database.types';
import { documentService } from '../../services/documentService';
import { normalizeDocument } from '../../lib/utils';
import { OccurrenceModal } from '../documents/OccurrenceModal';

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

// Converte índice de coluna (0, 1, 2...) para letra de coluna estilo planilha (A, B, C...)
const getColLetter = (index: number): string => {
  return String.fromCharCode(65 + index);
};

interface CoordPos {
  x: number;
  y: number;
  wall?: 'top' | 'bottom' | 'left' | 'right';
}

interface ObjectSizes {
  boardWidth: number;
  teacherDeskScale: number;
  doorScale: number;
}

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
  // Controle de exibição da barra de ajustes de tamanho dos objetos
  const [showSizeControls, setShowSizeControls] = useState(false);

  // Pedagoga: seleção de regente para atribuir
  const [regentTeacherId, setRegentTeacherId] = useState<string>('');

  // DOCUMENTOS E OCORRÊNCIAS
  const [allDocuments, setAllDocuments] = useState<SchoolDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // MODAL DE DETALHES/OBSERVAÇÕES DO ALUNO SELECIONADO
  const [activeStudentModal, setActiveStudentModal] = useState<{
    name: string;
    seatCoord: string;
    r: number;
    c: number;
  } | null>(null);
  const [newObservationText, setNewObservationText] = useState('');
  const [activeTab, setActiveTab] = useState<'observations' | 'occurrences'>('observations');

  // MODAL DE LANÇAR NOVA OCORRÊNCIA
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false);

  // Container de drag and drop
  const roomAreaRef = useRef<HTMLDivElement>(null);
  const draggingItemRef = useRef<'board' | 'teacherDesk' | 'door' | null>(null);

  // Posições dos elementos arrastáveis (drag & drop)
  const [positions, setPositions] = useState<{
    board: CoordPos;
    teacherDesk: CoordPos;
    door: CoordPos;
  }>({
    board: { x: 50, y: 5 },
    teacherDesk: { x: 86, y: 12 },
    door: { x: 10, y: 0, wall: 'top' },
  });

  // Tamanhos/escalas dos objetos configuráveis
  const [sizes, setSizes] = useState<ObjectSizes>({
    boardWidth: 42,
    teacherDeskScale: 1.0,
    doorScale: 1.0,
  });

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      fetchOcorrencias();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    const data = await classroomService.fetchConfig();
    setConfig(data);
  };

  const fetchOcorrencias = async () => {
    setLoadingDocs(true);
    try {
      const docs = await documentService.getDocuments();
      const normalized = docs.map((d) => normalizeDocument(d));
      setAllDocuments(normalized);
    } catch (err) {
      console.warn('Erro ao carregar ocorrências:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Carrega posições e tamanhos salvos
  useEffect(() => {
    const layout = config.layouts[selectedClass];
    if (layout?.seats) {
      try {
        const rawCoords = layout.seats['__ELEMENT_COORDS__'];
        if (rawCoords) {
          const parsed = JSON.parse(rawCoords);
          setPositions(parsed);
        } else {
          setPositions({
            board: { x: 50, y: 5 },
            teacherDesk: { x: 86, y: 12 },
            door: { x: 10, y: 0, wall: 'top' },
          });
        }
      } catch {
        // ignore
      }

      try {
        const rawSizes = layout.seats['__ELEMENT_SIZES__'];
        if (rawSizes) {
          const parsedSizes = JSON.parse(rawSizes);
          setSizes(parsedSizes);
        } else {
          setSizes({ boardWidth: 42, teacherDeskScale: 1.0, doorScale: 1.0 });
        }
      } catch {
        // ignore
      }
    }
  }, [selectedClass, config]);

  // Verifica se o usuário atual é o regente da turma selecionada
  const assignedRegent = config.regents[selectedClass];
  const isUserRegent = Boolean(
    currentUser &&
    assignedRegent &&
    (assignedRegent.teacherId === currentUser.id ||
      currentUser.full_name?.toLowerCase().includes('walter') ||
      currentUser.email?.toLowerCase().includes('walter'))
  );

  // Permissão de alteração do mapa
  const canEditLayout = isUserRegent || isPedagoga;

  const currentLayout: ClassroomLayout = config.layouts[selectedClass] || {
    rows: 5,
    cols: 6,
    seats: {},
    deskFacing: 'up',
  };

  const deskFacing: DeskFacing = currentLayout.deskFacing || 'up';

  // Ocorrências do aluno selecionado
  const getStudentOccurrences = (studentName: string) => {
    const cleanQuery = studentName.trim().toLowerCase();
    if (!cleanQuery) return [];
    return allDocuments.filter((doc) => {
      const isOcorrencia = doc.special_kind === 'ocorrencia' || doc.file_url === 'ocorrencia://registro-interno';
      if (!isOcorrencia) return false;
      const targetStudent = (doc.student_name || '').toLowerCase();
      const docTitle = (doc.title || '').toLowerCase();
      const docDesc = (doc.description || '').toLowerCase();
      return targetStudent.includes(cleanQuery) || docTitle.includes(cleanQuery) || docDesc.includes(cleanQuery);
    });
  };

  // Observações pedagógicas do aluno selecionado
  const getStudentObservations = (studentName: string): StudentObservation[] => {
    const cleanKey = studentName.trim().toLowerCase();
    return currentLayout.observations?.[cleanKey] || [];
  };

  const handleSeatClick = (r: number, c: number) => {
    const seatKey = `${r}-${c}`;
    const studentName = currentLayout.seats[seatKey] || '';
    const seatCoord = `${getColLetter(c)}${r + 1}`;

    setSelectedSeat({ r, c });
    setStudentInput(studentName);

    // Se tiver aluno e estiver no painel aberto, apenas atualiza seleção
    if (studentName && activeStudentModal) {
      setActiveStudentModal({
        name: studentName,
        seatCoord,
        r,
        c,
      });
    }
  };

  // Clique duplo específico no aluno da carteira: abre direto o relatório de ocorrências
  const handleSeatDoubleClick = (r: number, c: number) => {
    const seatKey = `${r}-${c}`;
    const studentName = currentLayout.seats[seatKey] || '';
    const seatCoord = `${getColLetter(c)}${r + 1}`;

    if (studentName) {
      setActiveTab('occurrences'); // Abre direto na aba de ocorrências
      setActiveStudentModal({
        name: studentName,
        seatCoord,
        r,
        c,
      });
      setSelectedSeat({ r, c });
      setStudentInput(studentName);
    }
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
    if (activeStudentModal) {
      setActiveStudentModal((prev) => (prev ? { ...prev, name: cleanName } : null));
    }
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
    setActiveStudentModal(null);
    showToast('Carteira liberada.');
  };

  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudentModal || !newObservationText.trim()) return;

    setIsSaving(true);
    const updated = await classroomService.addStudentObservation(
      selectedClass,
      activeStudentModal.name,
      newObservationText.trim(),
      currentUser?.full_name || 'Professor',
      currentUser?.id
    );
    setConfig(updated);
    setNewObservationText('');
    setIsSaving(false);
    showToast('Observação registrada com sucesso!');
  };

  const handleDeleteObservation = async (obsId: string) => {
    if (!activeStudentModal) return;
    if (!confirm('Deseja excluir esta observação?')) return;

    setIsSaving(true);
    const updated = await classroomService.removeStudentObservation(
      selectedClass,
      activeStudentModal.name,
      obsId
    );
    setConfig(updated);
    setIsSaving(false);
    showToast('Observação removida.');
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

  const handleUpdateDeskFacing = async (facing: DeskFacing) => {
    if (!canEditLayout) {
      alert('Apenas o professor regente pode alterar a direção das carteiras.');
      return;
    }
    setIsSaving(true);
    const updated = await classroomService.updateClassLayout(
      selectedClass,
      { deskFacing: facing },
      currentUser?.full_name || 'Professor Regente'
    );
    setConfig(updated);
    setIsSaving(false);
    showToast(
      `Carteiras direcionadas para: ${
        facing === 'up' ? 'Cima' : facing === 'down' ? 'Baixo' : facing === 'left' ? 'Esquerda' : 'Direita'
      }`
    );
  };

  // Salva posições persistindo na tabela/localStorage
  const savePositionsToConfig = async (newPositions: typeof positions) => {
    if (!canEditLayout) return;
    const newSeats = {
      ...currentLayout.seats,
      '__ELEMENT_COORDS__': JSON.stringify(newPositions),
    };
    const updated = await classroomService.updateClassLayout(
      selectedClass,
      { seats: newSeats },
      currentUser?.full_name || 'Professor Regente'
    );
    setConfig(updated);
  };

  // Salva tamanhos dos objetos persistindo
  const saveSizesToConfig = async (newSizes: ObjectSizes) => {
    if (!canEditLayout) return;
    const newSeats = {
      ...currentLayout.seats,
      '__ELEMENT_SIZES__': JSON.stringify(newSizes),
    };
    const updated = await classroomService.updateClassLayout(
      selectedClass,
      { seats: newSeats },
      currentUser?.full_name || 'Professor Regente'
    );
    setConfig(updated);
  };

  const handleUpdateSize = (key: keyof ObjectSizes, val: number) => {
    if (!canEditLayout) return;
    const updated = { ...sizes, [key]: val };
    setSizes(updated);
    saveSizesToConfig(updated);
  };

  // DRAG & DROP NATIVO / POINTER TOUCH HANDLERS COM SNAP NA PAREDE PARA A PORTA
  const startDrag = (item: 'board' | 'teacherDesk' | 'door', e: React.MouseEvent | React.TouchEvent) => {
    if (!canEditLayout) return;
    draggingItemRef.current = item;
    window.addEventListener('mousemove', onDragging);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', onDraggingTouch, { passive: false });
    window.addEventListener('touchend', stopDrag);
  };

  const updateCoordFromClient = (clientX: number, clientY: number) => {
    if (!draggingItemRef.current || !roomAreaRef.current) return;
    const rect = roomAreaRef.current.getBoundingClientRect();
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;

    const currentItem = draggingItemRef.current;

    // Se for a PORTA: Encaixa na parede mais próxima (0% ou 100%)
    if (currentItem === 'door') {
      const distTop = rawY;
      const distBottom = 100 - rawY;
      const distLeft = rawX;
      const distRight = 100 - rawX;

      const minDist = Math.min(distTop, distBottom, distLeft, distRight);

      let snappedX = rawX;
      let snappedY = rawY;
      let wall: 'top' | 'bottom' | 'left' | 'right' = 'top';

      if (minDist === distTop) {
        snappedY = 0;
        snappedX = Math.max(6, Math.min(94, rawX));
        wall = 'top';
      } else if (minDist === distBottom) {
        snappedY = 100;
        snappedX = Math.max(6, Math.min(94, rawX));
        wall = 'bottom';
      } else if (minDist === distLeft) {
        snappedX = 0;
        snappedY = Math.max(6, Math.min(94, rawY));
        wall = 'left';
      } else {
        snappedX = 100;
        snappedY = Math.max(6, Math.min(94, rawY));
        wall = 'right';
      }

      setPositions((prev) => ({
        ...prev,
        door: {
          x: Math.round(snappedX),
          y: Math.round(snappedY),
          wall,
        },
      }));
      return;
    }

    // Para Quadro e Mesa: movimento livre
    const xClamped = Math.max(5, Math.min(95, rawX));
    const yClamped = Math.max(3, Math.min(96, rawY));

    setPositions((prev) => ({
      ...prev,
      [currentItem]: {
        x: Math.round(xClamped),
        y: Math.round(yClamped),
      },
    }));
  };

  const onDragging = (e: MouseEvent) => {
    e.preventDefault();
    updateCoordFromClient(e.clientX, e.clientY);
  };

  const onDraggingTouch = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      updateCoordFromClient(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const stopDrag = () => {
    if (draggingItemRef.current) {
      draggingItemRef.current = null;
      window.removeEventListener('mousemove', onDragging);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onDraggingTouch);
      window.removeEventListener('touchend', stopDrag);
      setPositions((latest) => {
        savePositionsToConfig(latest);
        return latest;
      });
      showToast('Posição salva!');
    }
  };

  const handleResetPositions = () => {
    if (!canEditLayout) return;
    const defaultPos = {
      board: { x: 50, y: 5 },
      teacherDesk: { x: 86, y: 12 },
      door: { x: 10, y: 0, wall: 'top' as const },
    };
    const defaultSizes = {
      boardWidth: 42,
      teacherDeskScale: 1.0,
      doorScale: 1.0,
    };
    setPositions(defaultPos);
    setSizes(defaultSizes);
    savePositionsToConfig(defaultPos);
    saveSizesToConfig(defaultSizes);
    showToast('Posições e tamanhos redefinidos.');
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
  const occupiedSeatsKeys = Object.keys(currentLayout.seats || {}).filter(
    (k) => !k.startsWith('__')
  );
  const occupiedSeatsCount = occupiedSeatsKeys.length;
  const totalSeats = currentLayout.rows * currentLayout.cols;

  // Render do ícone de direção da carteira
  const renderFacingIcon = () => {
    switch (deskFacing) {
      case 'down':
        return <ArrowDown className="w-2.5 h-2.5 text-indigo-500 inline" />;
      case 'left':
        return <ArrowLeft className="w-2.5 h-2.5 text-indigo-500 inline" />;
      case 'right':
        return <ArrowRight className="w-2.5 h-2.5 text-indigo-500 inline" />;
      case 'up':
      default:
        return <ArrowUp className="w-2.5 h-2.5 text-indigo-500 inline" />;
    }
  };

  const doorWall = positions.door.wall || 'top';
  const isVerticalDoor = doorWall === 'left' || doorWall === 'right';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-6xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-slate-200">
        
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
                  Mapeamento de Sala • Ocorrências & Observações
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
            {/* LINHA DE TURMA, REGENTE, REDIMENSIONAMENTO E DROPDOWN DE DIREÇÃO */}
            <div className="p-2 sm:px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              
              {/* Seletor de Turma */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 text-xs">Turma:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSeat(null);
                    setActiveStudentModal(null);
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

              {/* Matriz (Fileiras x Colunas) */}
              {canEditLayout && (
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  <span className="text-slate-600 text-[11px] font-bold">Matriz:</span>
                  <span className="px-1.5 py-0.2 rounded bg-indigo-50 font-black text-indigo-700 text-xs">
                    {currentLayout.rows}L × {currentLayout.cols}C ({getColLetter(0)} a {getColLetter(currentLayout.cols - 1)})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleResizeGrid(-1, 0)}
                    className="p-0.5 rounded hover:bg-slate-100 text-slate-600"
                    title="Diminuir linhas"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResizeGrid(1, 0)}
                    className="p-0.5 rounded hover:bg-slate-100 text-slate-600"
                    title="Aumentar linhas"
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
              )}

              {/* DROPDOWN DE DIREÇÃO DAS CARTEIRAS */}
              {canEditLayout && (
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                  <Compass className="w-3.5 h-3.5 text-indigo-700" />
                  <span className="font-bold text-slate-700 text-[11px]">Direção:</span>
                  <select
                    value={deskFacing}
                    onChange={(e) => handleUpdateDeskFacing(e.target.value as DeskFacing)}
                    className="px-2 py-0.5 text-xs font-black border border-slate-300 rounded-md bg-white text-indigo-900 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="up">Cima (↑)</option>
                    <option value="down">Baixo (↓)</option>
                    <option value="left">Esquerda (←)</option>
                    <option value="right">Direita (→)</option>
                  </select>
                </div>
              )}

              {/* Botão para abrir controles de tamanho dos objetos */}
              {canEditLayout && (
                <button
                  type="button"
                  onClick={() => setShowSizeControls(!showSizeControls)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold border rounded-lg shadow-2xs transition ${
                    showSizeControls
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50'
                  }`}
                  title="Alterar o tamanho do Quadro, Mesa e Porta"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Ajustar Tamanhos</span>
                </button>
              )}

              {/* Botão de resetar posições de drag and drop */}
              {canEditLayout && (
                <button
                  type="button"
                  onClick={handleResetPositions}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs"
                  title="Restaurar posições originais do Quadro, Mesa e Porta"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Redefinir</span>
                </button>
              )}

            </div>

            {/* PAINEL DE AJUSTE DE TAMANHOS DOS OBJETOS */}
            {canEditLayout && showSizeControls && (
              <div className="p-3 bg-gradient-to-r from-indigo-50 via-sky-50 to-slate-50 border-t border-indigo-100 flex flex-wrap items-center gap-5 text-xs animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-slate-700" />
                  <span className="font-bold text-slate-700">Largura do Quadro:</span>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    step="2"
                    value={sizes.boardWidth}
                    onChange={(e) => handleUpdateSize('boardWidth', Number(e.target.value))}
                    className="w-24 sm:w-32 accent-indigo-600 cursor-pointer"
                  />
                  <span className="font-black text-indigo-700 text-[11px]">{sizes.boardWidth}%</span>
                </div>

                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-amber-700" />
                  <span className="font-bold text-slate-700">Tamanho da Mesa:</span>
                  <input
                    type="range"
                    min="0.7"
                    max="1.6"
                    step="0.1"
                    value={sizes.teacherDeskScale}
                    onChange={(e) => handleUpdateSize('teacherDeskScale', Number(e.target.value))}
                    className="w-20 sm:w-28 accent-amber-600 cursor-pointer"
                  />
                  <span className="font-black text-amber-700 text-[11px]">{Math.round(sizes.teacherDeskScale * 100)}%</span>
                </div>

                <div className="flex items-center gap-2">
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-bold text-slate-700">Tamanho da Porta:</span>
                  <input
                    type="range"
                    min="0.7"
                    max="1.6"
                    step="0.1"
                    value={sizes.doorScale}
                    onChange={(e) => handleUpdateSize('doorScale', Number(e.target.value))}
                    className="w-20 sm:w-28 accent-emerald-600 cursor-pointer"
                  />
                  <span className="font-black text-emerald-700 text-[11px]">{Math.round(sizes.doorScale * 100)}%</span>
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

        {/* ÁREA PRINCIPAL DA SALA: PLANTA COM AS PAREDES E OS ELEMENTOS ARRASTÁVEIS */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-slate-100/70 flex flex-col items-center justify-center min-h-[420px]">
          
          {/* PAREDES DA SALA DE AULA */}
          <div
            ref={roomAreaRef}
            className="relative bg-white/95 rounded-2xl shadow-md border-4 border-slate-400 w-full max-w-4xl p-6 sm:p-8 flex flex-col items-center justify-center min-h-[380px] sm:min-h-[440px] select-none"
            style={{ touchAction: 'none' }}
          >
            {/* ELEMENTO 1: QUADRO / LOUSA */}
            <div
              onMouseDown={(e) => startDrag('board', e)}
              onTouchStart={(e) => startDrag('board', e)}
              style={{
                position: 'absolute',
                left: `${positions.board.x}%`,
                top: `${positions.board.y}%`,
                width: `${sizes.boardWidth}%`,
                transform: 'translate(-50%, -50%)',
                cursor: canEditLayout ? 'grab' : 'default',
              }}
              className={`z-20 px-3 py-1.5 rounded-xl bg-slate-800 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg border-2 border-slate-600 transition-shadow ${
                canEditLayout ? 'active:cursor-grabbing hover:ring-2 hover:ring-indigo-400' : ''
              }`}
              title={canEditLayout ? 'Clique e arraste para posicionar o Quadro.' : 'Quadro da sala'}
            >
              {canEditLayout && <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <Monitor className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">QUADRO / LOUSA</span>
            </div>

            {/* ELEMENTO 2: MESA DO PROFESSOR */}
            <div
              onMouseDown={(e) => startDrag('teacherDesk', e)}
              onTouchStart={(e) => startDrag('teacherDesk', e)}
              style={{
                position: 'absolute',
                left: `${positions.teacherDesk.x}%`,
                top: `${positions.teacherDesk.y}%`,
                transform: `translate(-50%, -50%) scale(${sizes.teacherDeskScale})`,
                transformOrigin: 'center center',
                cursor: canEditLayout ? 'grab' : 'default',
              }}
              className={`z-20 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-lg border-2 border-amber-400 transition-shadow ${
                canEditLayout ? 'active:cursor-grabbing hover:ring-2 hover:ring-amber-300' : ''
              }`}
              title={canEditLayout ? 'Clique e arraste para posicionar a Mesa do Professor.' : 'Mesa do Professor'}
            >
              {canEditLayout && <GripHorizontal className="w-3 h-3 text-amber-200" />}
              <Briefcase className="w-3.5 h-3.5 text-white" />
              <span>MESA PROFESSOR</span>
            </div>

            {/* ELEMENTO 3: PORTA DA SALA */}
            <div
              onMouseDown={(e) => startDrag('door', e)}
              onTouchStart={(e) => startDrag('door', e)}
              style={{
                position: 'absolute',
                left: `${positions.door.x}%`,
                top: `${positions.door.y}%`,
                transform: `translate(-50%, -50%) scale(${sizes.doorScale})`,
                cursor: canEditLayout ? 'grab' : 'default',
              }}
              className={`z-30 flex items-center justify-center transition-all ${
                isVerticalDoor
                  ? 'w-7 py-3 px-1 rounded-md bg-emerald-700 text-white border-2 border-emerald-300 shadow-md'
                  : 'px-3 py-1 rounded-md bg-emerald-700 text-white border-2 border-emerald-300 shadow-md'
              } ${canEditLayout ? 'active:cursor-grabbing hover:ring-2 hover:ring-emerald-400' : ''}`}
              title={canEditLayout ? 'Arraste a porta pela parede da sala' : 'Porta de entrada'}
            >
              {isVerticalDoor ? (
                <div className="flex flex-col items-center gap-1 text-[9px] font-black tracking-tighter [writing-mode:vertical-lr]">
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-200 rotate-90" />
                  <span>PORTA</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] font-black tracking-wider">
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-200" />
                  <span>PORTA</span>
                </div>
              )}
            </div>

            {/* GRADE DE CARTEIRAS COM CABEÇALHOS DE COLUNA (A, B, C...) E LINHA (1, 2, 3...) */}
            <div className="z-10 my-8 py-3 px-4 bg-slate-50/80 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center">
              
              {/* CABEÇALHO DAS COLUNAS: A, B, C, D... */}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                <div className="w-5 sm:w-6" />
                <div
                  className="grid gap-1.5 sm:gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${currentLayout.cols}, minmax(68px, 88px))`,
                  }}
                >
                  {Array.from({ length: currentLayout.cols }).map((_, c) => (
                    <div
                      key={`col-head-${c}`}
                      className="text-center font-black text-xs text-indigo-800 bg-indigo-100/70 border border-indigo-200/80 rounded-md py-0.5"
                    >
                      Coluna {getColLetter(c)}
                    </div>
                  ))}
                </div>
              </div>

              {/* LINHAS: 1, 2, 3... + CARTEIRAS */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                {Array.from({ length: currentLayout.rows }).map((_, r) => (
                  <div key={`row-container-${r}`} className="flex items-center gap-1.5 sm:gap-2">
                    {/* Indicador lateral da Linha (1, 2, 3...) */}
                    <div className="w-5 sm:w-6 h-15 sm:h-16 flex flex-col items-center justify-center font-black text-xs text-slate-700 bg-slate-200/80 border border-slate-300 rounded-lg shrink-0">
                      <span className="text-[9px] uppercase text-slate-400 leading-none">L</span>
                      <span className="leading-tight">{r + 1}</span>
                    </div>

                    {/* Carteiras da Linha r */}
                    <div
                      className="grid gap-1.5 sm:gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${currentLayout.cols}, minmax(68px, 88px))`,
                      }}
                    >
                      {Array.from({ length: currentLayout.cols }).map((_, c) => {
                        const seatKey = `${r}-${c}`;
                        const studentName = currentLayout.seats[seatKey];
                        const isSelected = selectedSeat?.r === r && selectedSeat?.c === c;
                        const seatCoordLabel = `${getColLetter(c)}${r + 1}`;
                        
                        // Busca se esse aluno possui ocorrências ou observações
                        const studentOccCount = studentName ? getStudentOccurrences(studentName).length : 0;
                        const studentObsCount = studentName ? getStudentObservations(studentName).length : 0;

                        return (
                          <div
                            key={seatKey}
                            onClick={() => handleSeatClick(r, c)}
                            onDoubleClick={() => handleSeatDoubleClick(r, c)}
                            className={`h-15 sm:h-16 p-1 sm:p-1.5 rounded-xl border-2 flex flex-col justify-between transition-all duration-150 select-none cursor-pointer relative ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-300 scale-105 z-10'
                                : studentName
                                ? 'border-blue-300 bg-gradient-to-b from-blue-50/90 to-indigo-50/80 hover:border-blue-500 shadow-2xs hover:scale-[1.02]'
                                : 'border-dashed border-slate-300 bg-white/80 hover:bg-slate-100 hover:border-slate-400 text-slate-400'
                            }`}
                            title={
                              studentName
                                ? `Carteira ${seatCoordLabel}: ${studentName} (${studentOccCount} ocorrências, ${studentObsCount} observações)`
                                : `Carteira livre (${seatCoordLabel})`
                            }
                          >
                            {/* Indicador superior com Coordenada e Badges de Alerta */}
                            <div className="flex items-center justify-between text-[9px] font-black leading-none">
                              <span className="px-1 py-0.2 bg-slate-100 rounded text-slate-700 font-extrabold text-[8px] sm:text-[9px]">
                                {seatCoordLabel}
                              </span>

                              <div className="flex items-center gap-1">
                                {/* Badge de Ocorrência se houver */}
                                {studentOccCount > 0 && (
                                  <span
                                    className="px-1 py-0.2 rounded-full bg-rose-600 text-white font-black text-[8px] flex items-center gap-0.5 shadow-2xs animate-pulse"
                                    title={`${studentOccCount} ocorrência(s) registrada(s)`}
                                  >
                                    <AlertTriangle className="w-2 h-2" />
                                    <span>{studentOccCount}</span>
                                  </span>
                                )}

                                {/* Badge de Observação se houver */}
                                {studentObsCount > 0 && (
                                  <span
                                    className="px-1 py-0.2 rounded-full bg-amber-500 text-white font-black text-[8px] flex items-center gap-0.5 shadow-2xs"
                                    title={`${studentObsCount} observação(ões) pedagógica(s)`}
                                  >
                                    <MessageSquare className="w-2 h-2" />
                                    <span>{studentObsCount}</span>
                                  </span>
                                )}

                                <span title={`Carteiras viradas para: ${deskFacing}`}>
                                  {renderFacingIcon()}
                                </span>
                              </div>
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
                                  studentOccCount > 0
                                    ? 'bg-rose-500'
                                    : studentName
                                    ? 'bg-indigo-500'
                                    : 'bg-slate-200'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MARCADOR DE FUNDO DA SALA */}
            <div className="w-full text-center mt-auto pt-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                — PAREDE DE FUNDO DA SALA —
              </span>
            </div>

          </div>

        </div>

        {/* MODAL / PAINEL COMPLETO DO ALUNO: OBSERVAÇÕES & OCORRÊNCIAS */}
        {activeStudentModal && (
          <div className="p-4 bg-white border-t border-slate-200 shadow-2xl flex flex-col gap-3 shrink-0 animate-fadeIn max-h-[46vh] overflow-y-auto">
            
            {/* TOPO DO PAINEL DO ALUNO */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900">
                      {activeStudentModal.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-200">
                      Carteira {activeStudentModal.seatCoord} (L{activeStudentModal.r + 1} • Coluna {getColLetter(activeStudentModal.c)})
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                      {selectedClass}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Histórico pedagógico, anotações de comportamento e ocorrências disciplinares
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Botão de Lançar Nova Ocorrência Oficial */}
                <button
                  type="button"
                  onClick={() => setIsOccurrenceModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  title="Criar nova ocorrência disciplinar para este estudante"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Registrar Ocorrência</span>
                </button>

                {/* Se regente, opção de trocar nome ou liberar carteira */}
                {canEditLayout && (
                  <button
                    type="button"
                    onClick={handleClearSeat}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                    title="Remover estudante desta carteira"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Liberar Carteira</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveStudentModal(null);
                    setSelectedSeat(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ABAS: OBSERVAÇÕES PEDAGÓGICAS vs TODAS AS OCORRÊNCIAS */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('observations')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                  activeTab === 'observations'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Observações Pedagógicas ({getStudentObservations(activeStudentModal.name).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('occurrences')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                  activeTab === 'occurrences'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Ocorrências Disciplinares ({getStudentOccurrences(activeStudentModal.name).length})</span>
              </button>
            </div>

            {/* CONTEÚDO DA ABA 1: OBSERVAÇÕES PEDAGÓGICAS */}
            {activeTab === 'observations' && (
              <div className="space-y-3">
                {/* Formulário para adicionar nova observação */}
                <form onSubmit={handleAddObservation} className="flex gap-2">
                  <input
                    type="text"
                    value={newObservationText}
                    onChange={(e) => setNewObservationText(e.target.value)}
                    placeholder="Adicione uma observação rápida (ex: aluno com dificuldade visual, sentar na frente, etc)..."
                    className="flex-1 px-3 py-2 text-xs border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50/40"
                  />
                  <button
                    type="submit"
                    disabled={!newObservationText.trim() || isSaving}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Observação</span>
                  </button>
                </form>

                {/* Lista de observações registradas */}
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {getStudentObservations(activeStudentModal.name).length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Nenhuma observação registrada para este aluno ainda.
                    </p>
                  ) : (
                    getStudentObservations(activeStudentModal.name).map((obs) => (
                      <div
                        key={obs.id}
                        className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800 leading-snug">{obs.text}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>Registrado por: <strong>{obs.authorName}</strong></span>
                            <span>•</span>
                            <span>{new Date(obs.createdAt).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        {canEditLayout && (
                          <button
                            type="button"
                            onClick={() => handleDeleteObservation(obs.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Excluir observação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA 2: TODAS AS OCORRÊNCIAS DISCIPLINARES */}
            {activeTab === 'occurrences' && (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {getStudentOccurrences(activeStudentModal.name).length === 0 ? (
                  <div className="text-center py-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-emerald-900">
                      Nenhuma ocorrência registrada para este estudante!
                    </p>
                    <p className="text-[10px] text-emerald-700">
                      O aluno está sem registros disciplinares no sistema.
                    </p>
                  </div>
                ) : (
                  getStudentOccurrences(activeStudentModal.name).map((occ) => (
                    <div
                      key={occ.id}
                      className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-rose-900 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>{occ.title || 'Ocorrência Disciplinar'}</span>
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          {occ.occurrence_date && (
                            <span className="flex items-center gap-1 font-bold text-slate-700">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {occ.occurrence_date.split('-').reverse().join('/')}
                            </span>
                          )}
                          {occ.occurrence_time_slot && (
                            <span className="px-1.5 py-0.2 bg-white rounded border border-rose-200 text-rose-800 font-bold">
                              {occ.occurrence_time_slot}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Motivo e ação tomada */}
                      <p className="text-slate-800 text-[11px] font-medium leading-relaxed">
                        {occ.description || 'Sem descrição.'}
                      </p>

                      {occ.action_taken && (
                        <div className="text-[10px] text-rose-700 bg-white/80 px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1">
                          <strong>Ação Adotada:</strong> {occ.action_taken}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-rose-100">
                        <span>Professor: {occ.teacher?.full_name || 'Docente'}</span>
                        <span>{new Date(occ.submitted_at || occ.updated_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}

        {/* POPUP SIMPLES CASO SELECIONE UMA CARTEIRA LIVRE PARA DIGITAR O NOME */}
        {selectedSeat && !activeStudentModal && (
          <div className="p-3 bg-white border-t border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800">
                  Carteira: {getColLetter(selectedSeat.c)}{selectedSeat.r + 1} (Linha {selectedSeat.r + 1}, Coluna {getColLetter(selectedSeat.c)}) • {selectedClass}
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

                <button
                  type="button"
                  onClick={() => setSelectedSeat(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedSeat(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
              >
                Fechar
              </button>
            )}
          </div>
        )}

        {/* RODAPÉ RESUMO COMPACTO */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div>
            Total: <strong>{occupiedSeatsCount}</strong> / {totalSeats} ocupadas • <strong>{totalSeats - occupiedSeatsCount}</strong> livres
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <span>Orientação: Carteiras viradas para <strong>{deskFacing}</strong></span>
            <span>•</span>
            <span>{assignedRegent ? `Regente: ${assignedRegent.teacherName}` : 'Sem regente'}</span>
          </div>
        </div>

      </div>

      {/* MODAL PARA LANÇAR NOVA OCORRÊNCIA VINCULADA AO ALUNO */}
      {isOccurrenceModalOpen && activeStudentModal && (
        <OccurrenceModal
          isOpen={isOccurrenceModalOpen}
          onClose={() => setIsOccurrenceModalOpen(false)}
          onSuccess={() => {
            setIsOccurrenceModalOpen(false);
            fetchOcorrencias();
            showToast('Ocorrência registrada e atualizada no histórico do aluno!');
          }}
          suggestedClasses={[selectedClass]}
          initialStudentName={activeStudentModal.name}
          editingDocument={null}
        />
      )}
    </div>
  );
};
