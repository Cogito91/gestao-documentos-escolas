import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UserPlus, 
  Clock, 
  Trash2, 
  Loader2, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  ExternalLink,
  CheckSquare,
  Square,
  Cake,
  Eye,
  Sun,
  Sunset,
  Moon,
  RefreshCw,
  Search,
  Calendar
} from 'lucide-react';
import { Profile, TeacherSchedule } from '../../types/database.types';
import { authService } from '../../services/authService';
import { pedagogicalService } from '../../services/pedagogicalService';
import { storageService } from '../../services/storageService';

interface TeacherManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Profile[];
  onRefresh: () => void;
  initialTeacher?: Profile | null;
}

export const TeacherManagerModal: React.FC<TeacherManagerModalProps> = ({
  isOpen,
  onClose,
  teachers,
  onRefresh,
  initialTeacher,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'schedules'>('schedules');
  const [selectedTeacher, setSelectedTeacher] = useState<Profile | null>(initialTeacher || (teachers[0] || null));
  const [schedules, setSchedules] = useState<TeacherSchedule[]>([]);

  // Referência do input de arquivo para acionamento garantido
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulário de Cadastro do Professor
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('escola123');

  // Turnos (Múltipla Seleção)
  const [selectedShifts, setSelectedShifts] = useState<string[]>(['Manhã']);

  // Especialidades
  const defaultSpecialties = [
    'Matemática',
    'Língua Portuguesa',
    'História',
    'Geografia',
    'Ciências',
    'Inglês',
    'Artes',
    'Educação Física',
    'Ensino Religioso',
    'Polivalente / Anos Iniciais'
  ];
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['Matemática']);
  const [customSpecialty, setCustomSpecialty] = useState('');

  // Aniversário com Mini-Calendário discreto
  const [birthDate, setBirthDate] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);

  // Upload e Pré-Visualização de Arquivo de Horário (JPG ou PDF)
  const [uploadingFile, setUploadingFile] = useState(false);
  const [scheduleFileUrl, setScheduleFileUrl] = useState<string | null>(selectedTeacher?.schedule_file_url || null);

  const days = [
    { id: 1, name: 'Segunda-feira' },
    { id: 2, name: 'Terça-feira' },
    { id: 3, name: 'Quarta-feira' },
    { id: 4, name: 'Quinta-feira' },
    { id: 5, name: 'Sexta-feira' },
  ];

  // Filtros de busca na aba Horário do Professor
  const [searchName, setSearchName] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [searchShift, setSearchShift] = useState<string>('all');

  const filteredTeachers = teachers.filter((t) => {
    const matchesName =
      !searchName.trim() ||
      (t.full_name || '').toLowerCase().includes(searchName.trim().toLowerCase());
    const matchesSubject =
      !searchSubject.trim() ||
      (t.discipline || '').toLowerCase().includes(searchSubject.trim().toLowerCase());
    const matchesShift =
      searchShift === 'all' ||
      (t.shift || '').toLowerCase().includes(searchShift.toLowerCase());
    return matchesName && matchesSubject && matchesShift;
  });

  // Garante seleção do professor quando a lista é carregada ou filtrada
  useEffect(() => {
    if (initialTeacher) {
      setSelectedTeacher(initialTeacher);
    }
  }, [initialTeacher]);

  useEffect(() => {
    if (filteredTeachers.length > 0) {
      if (!selectedTeacher || !filteredTeachers.some((t) => t.id === selectedTeacher.id)) {
        setSelectedTeacher(filteredTeachers[0]);
      }
    } else if (!selectedTeacher && teachers.length > 0) {
      setSelectedTeacher(teachers[0]);
    }
  }, [teachers, filteredTeachers, selectedTeacher]);

  useEffect(() => {
    if (selectedTeacher) {
      setScheduleFileUrl(selectedTeacher.schedule_file_url || null);
      loadSchedules(selectedTeacher.id);
    }
  }, [selectedTeacher]);

  // Edição dos Dados do Professor Selecionado
  const [editFullName, setEditFullName] = useState('');
  const [editDiscipline, setEditDiscipline] = useState('');
  const [editShifts, setEditShifts] = useState<string[]>([]);
  const [editPhone, setEditPhone] = useState('');
  const [selectedTurmaForGrid, setSelectedTurmaForGrid] = useState('6º Ano A');
  const [activeShiftTab, setActiveShiftTab] = useState<string>('Manhã');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const loadSchedules = async (tId: string) => {
    try {
      const data = await pedagogicalService.getTeacherSchedules(tId);
      setSchedules(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedTeacher) {
      setEditFullName(selectedTeacher.full_name || '');
      setEditDiscipline(selectedTeacher.discipline || '');
      setEditPhone(selectedTeacher.phone || '');
      const shifts = selectedTeacher.shift ? selectedTeacher.shift.split(',').map(s => s.trim()).filter(Boolean) : [];
      setEditShifts(shifts);
      if (shifts.length > 0 && !shifts.includes(activeShiftTab)) {
        setActiveShiftTab(shifts[0]);
      }
    }
  }, [selectedTeacher]);

  const handleUpdateSelectedTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    setIsUpdatingProfile(true);
    try {
      const shiftStr = editShifts.join(', ');
      await authService.updateTeacherProfile(selectedTeacher.id, {
        full_name: editFullName.trim(),
        discipline: editDiscipline.trim(),
        phone: editPhone.trim(),
        shift: shiftStr,
      });
      setSelectedTeacher({
        ...selectedTeacher,
        full_name: editFullName.trim(),
        discipline: editDiscipline.trim(),
        phone: editPhone.trim(),
        shift: shiftStr,
      });
      onRefresh();
      alert('Cadastro do professor atualizado com sucesso!');
    } catch (err: any) {
      alert('Erro ao atualizar professor: ' + err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Horários dos 5 tempos de acordo com o turno selecionado
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

  const currentPeriods = SHIFT_PERIODS[activeShiftTab] || SHIFT_PERIODS['Manhã'];

  // Cores personalizadas e exclusivas para CADA TURMA (Regular Diurno + Todas as Etapas da EJA Semed)
  const CLASS_COLORS_MAP: Record<string, { bg: string; badge: string; pill: string; dot: string; label: string }> = {
    // --- Ensino Regular (6º ao 9º) ---
    '6º Ano A': {
      bg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      badge: 'bg-emerald-100 text-emerald-950 font-bold',
      pill: 'bg-emerald-50 text-emerald-900 border-emerald-400',
      dot: 'bg-emerald-500',
      label: '🟢 6º Ano A'
    },
    '6º Ano B': {
      bg: 'bg-teal-600 hover:bg-teal-700 text-white',
      badge: 'bg-teal-100 text-teal-950 font-bold',
      pill: 'bg-teal-50 text-teal-900 border-teal-400',
      dot: 'bg-teal-500',
      label: '🟩 6º Ano B'
    },
    '6º Ano C': {
      bg: 'bg-green-700 hover:bg-green-800 text-white',
      badge: 'bg-green-100 text-green-950 font-bold',
      pill: 'bg-green-50 text-green-900 border-green-400',
      dot: 'bg-green-600',
      label: '🌲 6º Ano C'
    },
    '7º Ano A': {
      bg: 'bg-blue-600 hover:bg-blue-700 text-white',
      badge: 'bg-blue-100 text-blue-950 font-bold',
      pill: 'bg-blue-50 text-blue-900 border-blue-400',
      dot: 'bg-blue-500',
      label: '🔵 7º Ano A'
    },
    '7º Ano B': {
      bg: 'bg-cyan-600 hover:bg-cyan-700 text-white',
      badge: 'bg-cyan-100 text-cyan-950 font-bold',
      pill: 'bg-cyan-50 text-cyan-900 border-cyan-400',
      dot: 'bg-cyan-500',
      label: '🧊 7º Ano B'
    },
    '7º Ano C': {
      bg: 'bg-sky-700 hover:bg-sky-800 text-white',
      badge: 'bg-sky-100 text-sky-950 font-bold',
      pill: 'bg-sky-50 text-sky-900 border-sky-400',
      dot: 'bg-sky-600',
      label: '🌊 7º Ano C'
    },
    '8º Ano A': {
      bg: 'bg-amber-600 hover:bg-amber-700 text-white',
      badge: 'bg-amber-100 text-amber-950 font-bold',
      pill: 'bg-amber-50 text-amber-900 border-amber-400',
      dot: 'bg-amber-500',
      label: '🟠 8º Ano A'
    },
    '8º Ano B': {
      bg: 'bg-orange-600 hover:bg-orange-700 text-white',
      badge: 'bg-orange-100 text-orange-950 font-bold',
      pill: 'bg-orange-50 text-orange-900 border-orange-400',
      dot: 'bg-orange-500',
      label: '🍊 8º Ano B'
    },
    '8º Ano C': {
      bg: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      badge: 'bg-yellow-100 text-yellow-950 font-bold',
      pill: 'bg-yellow-50 text-yellow-900 border-yellow-400',
      dot: 'bg-yellow-500',
      label: '⭐ 8º Ano C'
    },
    '9º Ano A': {
      bg: 'bg-purple-600 hover:bg-purple-700 text-white',
      badge: 'bg-purple-100 text-purple-950 font-bold',
      pill: 'bg-purple-50 text-purple-900 border-purple-400',
      dot: 'bg-purple-500',
      label: '🟣 9º Ano A'
    },
    '9º Ano B': {
      bg: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white',
      badge: 'bg-fuchsia-100 text-fuchsia-950 font-bold',
      pill: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-400',
      dot: 'bg-fuchsia-500',
      label: '🌺 9º Ano B'
    },
    '9º Ano C': {
      bg: 'bg-rose-600 hover:bg-rose-700 text-white',
      badge: 'bg-rose-100 text-rose-950 font-bold',
      pill: 'bg-rose-50 text-rose-900 border-rose-400',
      dot: 'bg-rose-500',
      label: '🌹 9º Ano C'
    },

    // --- EJA 2º Segmento (Anos Finais / Noturno - Semed Manaus) ---
    'EJA 1ª Etapa A': {
      bg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      badge: 'bg-indigo-100 text-indigo-950 font-bold',
      pill: 'bg-indigo-50 text-indigo-900 border-indigo-400',
      dot: 'bg-indigo-500',
      label: '🌙 EJA 1ª Etapa A (6º)'
    },
    'EJA 1ª Etapa B': {
      bg: 'bg-indigo-700 hover:bg-indigo-800 text-white',
      badge: 'bg-indigo-100 text-indigo-950 font-bold',
      pill: 'bg-indigo-50 text-indigo-900 border-indigo-500',
      dot: 'bg-indigo-600',
      label: '🌙 EJA 1ª Etapa B (6º)'
    },
    'EJA 2ª Etapa A': {
      bg: 'bg-blue-700 hover:bg-blue-800 text-white',
      badge: 'bg-blue-100 text-blue-950 font-bold',
      pill: 'bg-blue-50 text-blue-900 border-blue-400',
      dot: 'bg-blue-600',
      label: '🌙 EJA 2ª Etapa A (7º)'
    },
    'EJA 2ª Etapa B': {
      bg: 'bg-sky-800 hover:bg-sky-900 text-white',
      badge: 'bg-sky-100 text-sky-950 font-bold',
      pill: 'bg-sky-50 text-sky-900 border-sky-500',
      dot: 'bg-sky-700',
      label: '🌙 EJA 2ª Etapa B (7º)'
    },
    'EJA 3ª Etapa A': {
      bg: 'bg-violet-700 hover:bg-violet-800 text-white',
      badge: 'bg-violet-100 text-violet-950 font-bold',
      pill: 'bg-violet-50 text-violet-900 border-violet-400',
      dot: 'bg-violet-600',
      label: '🌙 EJA 3ª Etapa A (8º)'
    },
    'EJA 3ª Etapa B': {
      bg: 'bg-purple-800 hover:bg-purple-900 text-white',
      badge: 'bg-purple-100 text-purple-950 font-bold',
      pill: 'bg-purple-50 text-purple-900 border-purple-500',
      dot: 'bg-purple-700',
      label: '🌙 EJA 3ª Etapa B (8º)'
    },
    'EJA 4ª Etapa A': {
      bg: 'bg-emerald-800 hover:bg-emerald-900 text-white',
      badge: 'bg-emerald-100 text-emerald-950 font-bold',
      pill: 'bg-emerald-50 text-emerald-900 border-emerald-500',
      dot: 'bg-emerald-700',
      label: '🌙 EJA 4ª Etapa A (9º)'
    },
    'EJA 4ª Etapa B': {
      bg: 'bg-teal-800 hover:bg-teal-900 text-white',
      badge: 'bg-teal-100 text-teal-950 font-bold',
      pill: 'bg-teal-50 text-teal-900 border-teal-500',
      dot: 'bg-teal-700',
      label: '🌙 EJA 4ª Etapa B (9º)'
    },

    // --- EJA 1º Segmento (Anos Iniciais / Alfabetização Semed Manaus) ---
    'EJA Módulo 1 (Alfabetização)': {
      bg: 'bg-pink-700 hover:bg-pink-800 text-white',
      badge: 'bg-pink-100 text-pink-950 font-bold',
      pill: 'bg-pink-50 text-pink-900 border-pink-400',
      dot: 'bg-pink-600',
      label: '📖 EJA Mód. 1 (Alfa)'
    },
    'EJA Módulo 2': {
      bg: 'bg-rose-700 hover:bg-rose-800 text-white',
      badge: 'bg-rose-100 text-rose-950 font-bold',
      pill: 'bg-rose-50 text-rose-900 border-rose-400',
      dot: 'bg-rose-600',
      label: '📖 EJA Módulo 2'
    },
    'EJA Módulo 3': {
      bg: 'bg-amber-700 hover:bg-amber-800 text-white',
      badge: 'bg-amber-100 text-amber-950 font-bold',
      pill: 'bg-amber-50 text-amber-900 border-amber-500',
      dot: 'bg-amber-700',
      label: '📖 EJA Módulo 3'
    },
  };

  const getClassColorStyle = (className: string) => {
    return CLASS_COLORS_MAP[className] || {
      bg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      badge: 'bg-indigo-100 text-indigo-950 font-bold',
      pill: 'bg-indigo-50 text-indigo-800 border-indigo-300',
      dot: 'bg-indigo-500',
      label: className
    };
  };

  const handleToggleCellSchedule = async (dayId: number, periodNum: number) => {
    if (!selectedTeacher) return;
    const existing = schedules.find(s => s.day_of_week === dayId && s.period === periodNum);
    const pInfo = currentPeriods.find(p => p.period === periodNum);
    if (!pInfo) return;

    if (existing) {
      await handleDeleteSchedule(existing.id);
    } else {
      try {
        const discAbbr = selectedTeacher.discipline?.slice(0, 3).toUpperCase() || 'MAT';
        await pedagogicalService.addTeacherSchedule({
          teacher_id: selectedTeacher.id,
          day_of_week: dayId,
          period: periodNum,
          start_time: pInfo.start_time,
          end_time: pInfo.end_time,
          class_name: selectedTurmaForGrid,
          subject: selectedTeacher.discipline || discAbbr,
        });
        await loadSchedules(selectedTeacher.id);
      } catch (err: any) {
        alert('Erro ao marcar horário: ' + err.message);
      }
    }
  };

  const toggleShift = (shift: string) => {
    setSelectedShifts(prev => 
      prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]
    );
  };

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    const allSpecs = [...selectedSpecialties];
    if (customSpecialty.trim() && !allSpecs.includes(customSpecialty.trim())) {
      allSpecs.push(customSpecialty.trim());
    }

    if (allSpecs.length === 0) {
      alert('Selecione pelo menos uma especialidade para o professor.');
      return;
    }

    setSubmitting(true);
    try {
      const shiftStr = selectedShifts.join(', ');
      const specStr = allSpecs.join(', ');

      let bDay: number | undefined;
      let bMonth: number | undefined;

      if (birthDate) {
        const parts = birthDate.split('-');
        if (parts.length === 3) {
          bMonth = parseInt(parts[1], 10);
          bDay = parseInt(parts[2], 10);
        }
      }

      await authService.signUp(
        email, 
        password, 
        fullName, 
        'professor', 
        specStr, 
        phone,
        shiftStr,
        bDay,
        bMonth
      );

      if (bDay && bMonth) {
        try {
          await pedagogicalService.addBirthday({
            name: fullName,
            birth_day: bDay,
            birth_month: bMonth,
            role_or_class: `Prof. de ${specStr} (${shiftStr})`,
          });
        } catch (bdayErr) {
          console.warn('Aniversário não gravado no mural:', bdayErr);
        }
      }

      alert(`Professor(a) ${fullName} cadastrado com sucesso!`);
      setFullName('');
      setEmail('');
      setPhone('');
      setBirthDate('');
      setCustomSpecialty('');
      onRefresh();
      setActiveTab('schedules');
    } catch (err: any) {
      alert('Erro ao cadastrar professor: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTeacher || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    const fileName = file.name.toLowerCase();
    const isJpgOrPdf = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.pdf');
    if (!isJpgOrPdf) {
      alert('Por favor, selecione um arquivo de imagem (JPG / PNG) ou documento PDF.');
      return;
    }

    setUploadingFile(true);
    try {
      const { publicUrl } = await storageService.uploadDocumentFile(selectedTeacher.id, file);

      await authService.updateTeacherProfile(selectedTeacher.id, {
        schedule_file_url: publicUrl,
      });

      setScheduleFileUrl(publicUrl);
      setSelectedTeacher({ ...selectedTeacher, schedule_file_url: publicUrl });
      onRefresh();
      alert('Horário do professor enviado com sucesso!');
    } catch (err: any) {
      alert('Erro no upload do horário: ' + err.message);
    } finally {
      setUploadingFile(false);
      // Limpa o input para permitir selecionar o mesmo arquivo novamente se quiser
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await pedagogicalService.deleteTeacherSchedule(id);
      if (selectedTeacher) {
        await loadSchedules(selectedTeacher.id);
      }
    } catch (err: any) {
      alert('Erro ao remover horário: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Topo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Gestão de Professores & Quadro de Aulas</h3>
              <p className="text-xs text-slate-500">Cadastre docentes e envie o horário de aula de cada professor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 mr-6 transition ${
              activeTab === 'schedules' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📅 Horario do professor
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeTab === 'create' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + Cadastrar Novo Professor
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* ABA 1: HORARIO DO PROFESSOR (COM BOTÃO DE UPLOAD DE JPG OU PDF SEMPRE VISÍVEL) */}
          {activeTab === 'schedules' && (
            <div className="space-y-6">
              
              {/* Barra de Busca por Nome, Matéria e Turno */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1.5">
                    <Search className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Buscar Professor</span>
                  </span>
                  {(searchName || searchSubject || searchShift !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchName('');
                        setSearchSubject('');
                        setSearchShift('all');
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Limpar filtros ({filteredTeachers.length} encontrado{filteredTeachers.length === 1 ? '' : 's'})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="Nome do professor..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={searchSubject}
                    onChange={(e) => setSearchSubject(e.target.value)}
                    placeholder="Matéria / Especialidade..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={searchShift}
                    onChange={(e) => setSearchShift(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Todos os Turnos</option>
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                    <option value="Integral">Integral</option>
                  </select>
                </div>
              </div>

              {/* Barra de Seleção do Professor */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-700">Professor Selecionado:</span>
                  {filteredTeachers.length > 0 ? (
                    <select
                      value={selectedTeacher?.id || ''}
                      onChange={(e) => {
                        const t = filteredTeachers.find(item => item.id === e.target.value);
                        if (t) setSelectedTeacher(t);
                      }}
                      className="px-3 py-1.5 text-xs font-bold border border-indigo-300 rounded-lg bg-white text-indigo-900 shadow-2xs"
                    >
                      {filteredTeachers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name} ({t.discipline || 'Geral'})</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-rose-600 font-semibold">
                      Nenhum professor encontrado para os filtros informados.
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                    {selectedTeacher?.shift || 'Turno Geral'}
                  </span>
                </div>
              </div>

              {/* CARD DE EDIÇÃO COMPLETA DO CADASTRO DO PROFESSOR (NOME, MATÉRIA, TURNO, TELEFONE) */}
              {selectedTeacher && (
                <form onSubmit={handleUpdateSelectedTeacher} className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-indigo-600" />
                      <span>Editar Cadastro & Matéria de {selectedTeacher.full_name}</span>
                    </span>
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1"
                    >
                      {isUpdatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                      <span>Salvar Alterações</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Nome do Docente:</label>
                      <select
                        value={selectedTeacher.id}
                        onChange={(e) => {
                          const t = teachers.find(item => item.id === e.target.value);
                          if (t) setSelectedTeacher(t);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs font-bold border-2 border-indigo-400 bg-white text-indigo-900 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                      >
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.full_name} {t.discipline ? `(${t.discipline})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Matéria / Especialidade:</label>
                      <input
                        type="text"
                        required
                        value={editDiscipline}
                        onChange={(e) => setEditDiscipline(e.target.value)}
                        placeholder="Ex: Matemática"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-indigo-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Telefone / WhatsApp:</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Turnos do Docente */}
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Turnos de Trabalho:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Manhã', 'Tarde', 'Noite', 'Integral'].map((sh) => {
                        const isChecked = editShifts.includes(sh);
                        return (
                          <button
                            key={sh}
                            type="button"
                            onClick={() => {
                              setEditShifts(prev =>
                                prev.includes(sh) ? prev.filter(s => s !== sh) : [...prev, sh]
                              );
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                              isChecked
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isChecked ? '✓ ' : '+ '}{sh}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </form>
              )}

              {/* TABELA DE HORÁRIO INTERATIVA: 5 TEMPOS DE SEGUNDA A SEXTA */}
              {selectedTeacher && (
                <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm space-y-3">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>Tabela de Horário Semanal Interativa (Clique para Lançar/Remover)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Selecione o turno correspondente e clique na célula para preencher ou remover os horários.
                    </p>
                  </div>

                  {/* SELEÇÃO DO TURNO E DA TURMA (SELETOR COMPLETO REGULAR E EJA) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>Turno do Quadro:</span>
                      </span>
                      <select
                        value={activeShiftTab}
                        onChange={(e) => {
                          const newShift = e.target.value;
                          setActiveShiftTab(newShift);
                          // Se mudar para a Noite e a turma atual for diurna, sugere a 1ª Etapa da EJA
                          if (newShift === 'Noite' && !selectedTurmaForGrid.startsWith('EJA')) {
                            setSelectedTurmaForGrid('EJA 1ª Etapa A');
                          } else if (newShift !== 'Noite' && selectedTurmaForGrid.startsWith('EJA')) {
                            setSelectedTurmaForGrid('6º Ano A');
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-black border-2 border-indigo-400 rounded-lg bg-white text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
                      >
                        {(() => {
                          const baseShifts = ['Manhã', 'Tarde', 'Noite', 'Integral'];
                          const teacherShifts = editShifts.length > 0 ? editShifts : baseShifts;
                          const displayShifts = Array.from(new Set([...teacherShifts, ...baseShifts]));
                          return displayShifts.map(sh => (
                            <option key={sh} value={sh}>
                              {sh === 'Manhã' ? '☀️ Manhã (07:30 - 11:30)' : sh === 'Tarde' ? '🌤️ Tarde (13:00 - 17:00)' : sh === 'Noite' ? '🌙 Noite (EJA 18:30 - 22:20)' : '⚡ Integral'}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    {/* SELETOR RÁPIDO DA TURMA PARA LANÇAR NO QUADRO */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Turma ativa p/ preencher:</span>
                      <select
                        value={selectedTurmaForGrid}
                        onChange={(e) => setSelectedTurmaForGrid(e.target.value)}
                        className={`px-3 py-1.5 text-xs font-black border rounded-lg focus:outline-none transition-colors ${getClassColorStyle(selectedTurmaForGrid).pill}`}
                      >
                        {activeShiftTab === 'Noite' ? (
                          <>
                            <optgroup label="EJA 2º Segmento (Anos Finais)">
                              <option value="EJA 1ª Etapa A">EJA 1ª Etapa A (6º)</option>
                              <option value="EJA 1ª Etapa B">EJA 1ª Etapa B (6º)</option>
                              <option value="EJA 2ª Etapa A">EJA 2ª Etapa A (7º)</option>
                              <option value="EJA 2ª Etapa B">EJA 2ª Etapa B (7º)</option>
                              <option value="EJA 3ª Etapa A">EJA 3ª Etapa A (8º)</option>
                              <option value="EJA 3ª Etapa B">EJA 3ª Etapa B (8º)</option>
                              <option value="EJA 4ª Etapa A">EJA 4ª Etapa A (9º)</option>
                              <option value="EJA 4ª Etapa B">EJA 4ª Etapa B (9º)</option>
                            </optgroup>
                            <optgroup label="EJA 1º Segmento (Anos Iniciais / Alfabetização)">
                              <option value="EJA Módulo 1 (Alfabetização)">EJA Módulo 1 (Alfabetização)</option>
                              <option value="EJA Módulo 2">EJA Módulo 2 (2º/3º)</option>
                              <option value="EJA Módulo 3">EJA Módulo 3 (4º/5º)</option>
                            </optgroup>
                            <optgroup label="Outras Turmas Regular">
                              {Object.entries(CLASS_COLORS_MAP)
                                .filter(([name]) => !name.startsWith('EJA'))
                                .map(([name, info]) => (
                                  <option key={name} value={name}>{info.label}</option>
                                ))}
                            </optgroup>
                          </>
                        ) : (
                          <>
                            <optgroup label="Ensino Regular (Diurno)">
                              {Object.entries(CLASS_COLORS_MAP)
                                .filter(([name]) => !name.startsWith('EJA'))
                                .map(([name, info]) => (
                                  <option key={name} value={name}>{info.label}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Opções EJA Semed Manaus">
                              {Object.entries(CLASS_COLORS_MAP)
                                .filter(([name]) => name.startsWith('EJA'))
                                .map(([name, info]) => (
                                  <option key={name} value={name}>{info.label}</option>
                                ))}
                            </optgroup>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Legenda de Cores das Turmas do Turno */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700 mr-1">Legenda ({activeShiftTab === 'Noite' ? 'EJA' : 'Regular'}):</span>
                    {Object.entries(CLASS_COLORS_MAP)
                      .filter(([cName]) => activeShiftTab === 'Noite' ? cName.startsWith('EJA') : !cName.startsWith('EJA'))
                      .map(([cName, info]) => (
                        <span
                          key={cName}
                          onClick={() => setSelectedTurmaForGrid(cName)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer border text-[10px] font-bold transition-all hover:scale-105 ${
                            selectedTurmaForGrid === cName ? 'ring-2 ring-indigo-500 shadow-xs scale-105' : ''
                          } ${info.pill}`}
                          title={`Clique para selecionar ${cName}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${info.dot}`}></span>
                          {cName}
                        </span>
                      ))}
                  </div>

                  {/* Grade Interativa dos 5 Tempos do Turno Atual */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="p-2 border border-slate-200 font-bold w-24">Horário ({activeShiftTab})</th>
                          {days.map(d => (
                            <th key={d.id} className="p-2 border border-slate-200 font-extrabold">
                              {d.name.split('-')[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentPeriods.map((p, pIndex) => (
                          <tr key={p.period} className="hover:bg-slate-50/50">
                            <td className="p-2 border border-slate-200 font-bold bg-slate-50 text-slate-700">
                              <span className="block text-indigo-700">{pIndex + 1}º Tempo</span>
                              <span className="text-[10px] text-slate-400 font-normal">{p.start_time}-{p.end_time}</span>
                            </td>
                            {days.map(d => {
                              const matchSchedule = schedules.find(s => s.day_of_week === d.id && s.period === p.period);
                              const discAbbr = selectedTeacher.discipline?.slice(0, 3).toUpperCase() || 'MAT';
                              const colorStyle = matchSchedule ? getClassColorStyle(matchSchedule.class_name) : null;

                              return (
                                <td
                                  key={d.id}
                                  onClick={() => handleToggleCellSchedule(d.id, p.period)}
                                  className={`p-2 border border-slate-200 cursor-pointer transition-all duration-150 select-none ${
                                    matchSchedule
                                      ? `${colorStyle?.bg} font-extrabold shadow-sm`
                                      : 'bg-white hover:bg-indigo-50/60 text-slate-300 hover:text-indigo-400'
                                  }`}
                                  title={matchSchedule ? `Clique para remover (${matchSchedule.class_name} • ${matchSchedule.subject})` : `Clique para lançar ${selectedTurmaForGrid} no turno ${activeShiftTab}`}
                                >
                                  {matchSchedule ? (
                                    <div>
                                      <span className="block text-xs sm:text-sm font-black tracking-wide">{matchSchedule.class_name}</span>
                                      <span className="text-[10px] font-bold opacity-90 block px-1 py-0.5 rounded bg-black/20 mt-0.5 uppercase tracking-wider">{discAbbr}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] font-bold opacity-40">+</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: CADASTRAR NOVO PROFESSOR */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateTeacher} className="max-w-2xl mx-auto space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo do Docente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prof. Marcos Aurélio de Souza"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Turnos */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Turno(s) de Trabalho:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Manhã', icon: Sun },
                    { id: 'Tarde', icon: Sunset },
                    { id: 'Noite', icon: Moon },
                    { id: 'Integral', icon: Clock }
                  ].map(({ id, icon: Icon }) => {
                    const isChecked = selectedShifts.includes(id);
                    return (
                      <button
                        type="button"
                        key={id}
                        onClick={() => toggleShift(id)}
                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center space-x-2 transition ${
                          isChecked 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                        <Icon className="w-3.5 h-3.5" />
                        <span>{id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Especialidade */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Especialidade * (Disciplinas lecionadas):
                  </label>
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    {selectedSpecialties.length} selecionada(s)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {defaultSpecialties.map(spec => {
                    const isChecked = selectedSpecialties.includes(spec);
                    return (
                      <button
                        type="button"
                        key={spec}
                        onClick={() => toggleSpecialty(spec)}
                        className={`p-2 rounded-lg border text-left text-xs font-medium flex items-center space-x-2 transition ${
                          isChecked 
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {isChecked ? <CheckSquare className="w-4 h-4 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <span className="truncate">{spec}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Outra especialidade (Ex: Filosofia, Sociologia)..."
                    value={customSpecialty}
                    onChange={(e) => setCustomSpecialty(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Opcional</span>
                </div>
              </div>

              {/* Contatos, Acesso e Mini-Calendário Discreto de Aniversário */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail de Acesso *</label>
                  <input
                    type="email"
                    required
                    placeholder="exemplo@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Aniversário Compacto no Cantinho */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center space-x-1">
                    <Cake className="w-3 h-3 text-rose-500" />
                    <span>Aniversário (Dia/Mês)</span>
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Senha Inicial Provisória</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 font-medium text-slate-700"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <span>Concluir Cadastro de Professor</span>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
