import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { SchoolDocument } from '../../types/database.types';
import { documentService } from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';
import { encodeSpecialDocumentDescription } from '../../lib/utils';
import { VoiceDictationButton } from '../common/VoiceDictationButton';

interface OccurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suggestedClasses?: string[];
  initialStudentName?: string;
  editingDocument?: SchoolDocument | null;
}

const commonOccurrences = [
  'Não fez a atividade',
  'Conversa durante a explicação',
  'Fora do mapa de sala',
  'Linguagem inapropriada',
  'Brigas e/ou discussões',
  'Outros',
];

const actionOptions = [
  'Advertência verbal',
  'Envio para pedagogia',
  'Troca de lugar',
  'Outros',
];

const timeSlotOptions = [
  '1º Tempo',
  '2º Tempo',
  '3º Tempo',
  '4º Tempo',
  '5º Tempo',
];

export const OccurrenceModal: React.FC<OccurrenceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  suggestedClasses = [],
  initialStudentName = '',
  editingDocument,
}) => {
  const { user } = useAuth();
  const [studentName, setStudentName] = useState('');
  const [targetClasses, setTargetClasses] = useState('');
  const [occurrenceDate, setOccurrenceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [occurrenceTimeSlot, setOccurrenceTimeSlot] = useState('1º Tempo');
  const [occurrenceReason, setOccurrenceReason] = useState('Não fez a atividade');
  const [customOccurrence, setCustomOccurrence] = useState('');
  const [description, setDescription] = useState('');
  const [actionOption, setActionOption] = useState('Advertência verbal');
  const [customAction, setCustomAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingDocument && editingDocument.id) {
      setStudentName(editingDocument.student_name || '');
      setTargetClasses(editingDocument.target_classes || '');
      setOccurrenceDate(
        editingDocument.occurrence_date || new Date().toISOString().slice(0, 10)
      );
      setOccurrenceTimeSlot(editingDocument.occurrence_time_slot || '1º Tempo');
      
      const currentDesc = editingDocument.description || '';
      const matchedCommon = commonOccurrences.find(
        (co) => co !== 'Outros' && (currentDesc === co || currentDesc.startsWith(`${co} - `))
      );
      if (matchedCommon) {
        setOccurrenceReason(matchedCommon);
        setCustomOccurrence('');
        setDescription(currentDesc.replace(`${matchedCommon} - `, '').replace(matchedCommon, ''));
      } else if (currentDesc) {
        setOccurrenceReason('Outros');
        setCustomOccurrence(currentDesc);
        setDescription('');
      } else {
        setOccurrenceReason('Não fez a atividade');
        setCustomOccurrence('');
        setDescription('');
      }

      const savedAction = editingDocument.action_taken || 'Advertência verbal';
      if (actionOptions.includes(savedAction) && savedAction !== 'Outros') {
        setActionOption(savedAction);
        setCustomAction('');
      } else {
        setActionOption('Outros');
        setCustomAction(savedAction === 'Outros' ? '' : savedAction);
      }
    } else {
      setStudentName(initialStudentName || '');
      setTargetClasses(suggestedClasses[0] || '');
      setOccurrenceDate(new Date().toISOString().slice(0, 10));
      setOccurrenceTimeSlot('1º Tempo');
      setOccurrenceReason('Não fez a atividade');
      setCustomOccurrence('');
      setDescription('');
      setActionOption('Advertência verbal');
      setCustomAction('');
    }
  }, [isOpen, editingDocument, suggestedClasses, initialStudentName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!studentName.trim()) {
      setError('Informe o nome do aluno.');
      return;
    }
    if (!targetClasses.trim()) {
      setError('Informe a turma do aluno.');
      return;
    }
    const finalOccurrenceText =
      occurrenceReason === 'Outros'
        ? customOccurrence.trim()
        : description.trim()
        ? `${occurrenceReason} - ${description.trim()}`
        : occurrenceReason;

    if (!finalOccurrenceText) {
      setError(
        occurrenceReason === 'Outros'
          ? 'Informe o motivo da ocorrência.'
          : 'Descreva a ocorrência.'
      );
      return;
    }

    const resolvedAction = actionOption === 'Outros' ? customAction.trim() : actionOption;
    if (!resolvedAction) {
      setError('Informe qual foi a ação tomada.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const encodedDescription = encodeSpecialDocumentDescription(finalOccurrenceText, {
        kind: 'ocorrencia',
        absenceDates: occurrenceDate ? [occurrenceDate] : [],
        targetClasses: targetClasses.trim(),
        studentName: studentName.trim(),
        actionTaken: resolvedAction,
        occurrenceDate,
        occurrenceTimeSlot,
      });

      const title = `${studentName.trim()} • ${targetClasses.trim()} (${occurrenceTimeSlot})`;

      if (editingDocument && editingDocument.id) {
        await documentService.updateDocument(editingDocument.id, {
          title,
          description: encodedDescription,
        });
      } else {
        await documentService.createDocument({
          teacher_id: user.id,
          category_id: null,
          folder_id: null,
          title,
          description: encodedDescription,
          file_url: 'ocorrencia://registro-interno',
          file_name: 'Registro de Ocorrência',
          file_size: 0,
          file_type: 'text/plain',
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar ocorrência:', err);
      setError(err.message || 'Erro ao salvar ocorrência.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {editingDocument?.id ? 'Editar Ocorrência de Aluno' : 'Lançar Ocorrência em Sala'}
              </h3>
              <p className="text-xs text-slate-500">
                Registre ocorrências por turma e a ação tomada
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome do Aluno */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Aluno *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: João Pedro Silva"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Turma, Data e Tempo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Turma *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 7º Ano A"
                value={targetClasses}
                onChange={(e) => setTargetClasses(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              {suggestedClasses.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {suggestedClasses.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setTargetClasses(cls)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition ${
                        targetClasses === cls
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data *
              </label>
              <input
                type="date"
                required
                value={occurrenceDate}
                onChange={(e) => setOccurrenceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tempo de Aula *
              </label>
              <select
                value={occurrenceTimeSlot}
                onChange={(e) => setOccurrenceTimeSlot(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {timeSlotOptions.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ocorrência Frequente + Motivo/Observação */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Ocorrência *
            </label>
            <select
              value={occurrenceReason}
              onChange={(e) => setOccurrenceReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {commonOccurrences.map((occ) => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
            </select>

            {occurrenceReason === 'Outros' ? (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Motivo da Ocorrência *
                  </label>
                  <VoiceDictationButton
                    onTranscript={(spoken) =>
                      setCustomOccurrence((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
                    }
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="Diga detalhadamente qual foi o motivo da ocorrência..."
                  value={customOccurrence}
                  onChange={(e) => setCustomOccurrence(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Detalhes adicionais (Opcional)
                  </label>
                  <VoiceDictationButton
                    onTranscript={(spoken) =>
                      setDescription((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
                    }
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Adicione detalhes se necessário (ex: assunto conversado, contexto)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                />
              </div>
            )}
          </div>

          {/* Ação */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Ação *
            </label>
            <select
              value={actionOption}
              onChange={(e) => setActionOption(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {actionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            {actionOption === 'Outros' && (
              <input
                type="text"
                required
                placeholder="Descreva qual foi a ação tomada..."
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            )}
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-rose-500/20 transition flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingDocument ? 'Salvar Alterações' : 'Registrar Ocorrência'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
