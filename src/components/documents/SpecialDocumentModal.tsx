import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Plus,
  Printer,
  FileCheck2
} from 'lucide-react';
import { SchoolDocument } from '../../types/database.types';
import { storageService } from '../../services/storageService';
import { documentService } from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';
import { encodeSpecialDocumentDescription, formatAbsenceDateLabel } from '../../lib/utils';

interface SpecialDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'emergencial' | 'atestado';
  onSuccess: () => void;
  editingDocument?: SchoolDocument | null;
}

export const SpecialDocumentModal: React.FC<SpecialDocumentModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSuccess,
  editingDocument,
}) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [dateMode, setDateMode] = useState<'single' | 'period'>('single');
  const [dateInput, setDateInput] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [targetClasses, setTargetClasses] = useState('');
  const [certificateType, setCertificateType] = useState('Atestado Médico');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setError(null);
    setDateInput('');
    setPeriodStart('');
    setPeriodEnd('');
    setDateMode('single');

    if (editingDocument) {
      setDescription(editingDocument.description || '');
      setSelectedDates(editingDocument.absence_dates || []);
      setTargetClasses(editingDocument.target_classes || '');
      setCertificateType(editingDocument.certificate_type || 'Atestado Médico');
    } else {
      setDescription('');
      setSelectedDates([]);
      setTargetClasses('');
      setCertificateType('Atestado Médico');
    }
  }, [isOpen, editingDocument, mode]);

  if (!isOpen) return null;

  const handleAddDate = () => {
    if (!dateInput) return;
    if (!selectedDates.includes(dateInput)) {
      setSelectedDates((prev) => [...prev, dateInput].sort());
    }
    setDateInput('');
    setError(null);
  };

  const handleAddPeriod = () => {
    if (!periodStart || !periodEnd) return;
    if (periodEnd < periodStart) {
      setError('A data final ("Até") não pode ser anterior à data inicial ("De").');
      return;
    }
    const token = periodStart === periodEnd ? periodStart : `${periodStart}..${periodEnd}`;
    if (!selectedDates.includes(token)) {
      setSelectedDates((prev) => [...prev, token].sort());
    }
    setPeriodStart('');
    setPeriodEnd('');
    setError(null);
  };

  const handleRemoveDate = (d: string) => {
    setSelectedDates((prev) => prev.filter((item) => item !== d));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 10 * 1024 * 1024) {
        setError('O arquivo deve ter no máximo 10 MB.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const finalDates = [...selectedDates];
    if (dateInput && !finalDates.includes(dateInput)) {
      finalDates.push(dateInput);
    }
    if (periodStart && periodEnd) {
      if (periodEnd < periodStart) {
        setError('A data final ("Até") não pode ser anterior à data inicial ("De").');
        return;
      }
      const token = periodStart === periodEnd ? periodStart : `${periodStart}..${periodEnd}`;
      if (!finalDates.includes(token)) {
        finalDates.push(token);
      }
    }
    finalDates.sort();

    if (finalDates.length === 0) {
      setError(
        mode === 'emergencial'
          ? 'Informe pelo menos um dia ou período em que você precisará faltar.'
          : 'Informe o dia ou período a que o atestado ou declaração se refere.'
      );
      return;
    }

    if (!file && !editingDocument) {
      setError('Por favor, selecione o arquivo para enviar.');
      return;
    }

    const finalTitle =
      mode === 'atestado'
        ? `${certificateType} - ${finalDates.map(formatAbsenceDateLabel).join(', ')}`
        : `Atividade Emergencial${targetClasses.trim() ? ` (${targetClasses.trim()})` : ''} - ${finalDates.map(formatAbsenceDateLabel).join(', ')}`;

    setLoading(true);
    setError(null);

    try {
      let fileUrl = editingDocument?.file_url || '';
      let fileName = editingDocument?.file_name || '';
      let fileSize = editingDocument?.file_size || 0;
      let fileType = editingDocument?.file_type || 'application/octet-stream';

      if (file) {
        const uploaded = await storageService.uploadDocumentFile(user.id, file);
        fileUrl = uploaded.publicUrl;
        fileName = file.name;
        fileSize = file.size;
        fileType = file.type || 'application/octet-stream';
      }

      const encodedDescription = encodeSpecialDocumentDescription(description, {
        kind: mode,
        absenceDates: finalDates,
        targetClasses: mode === 'emergencial' ? targetClasses.trim() : undefined,
        certificateType: mode === 'atestado' ? certificateType : undefined,
      });

      if (editingDocument) {
        await documentService.updateDocument(editingDocument.id, {
          category_id: null,
          folder_id: null,
          title: finalTitle,
          description: encodedDescription,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
        });
      } else {
        await documentService.createDocument({
          teacher_id: user.id,
          category_id: null,
          folder_id: null,
          title: finalTitle,
          description: encodedDescription,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao enviar documento especial:', err);
      setError(err.message || 'Erro ao salvar documento.');
    } finally {
      setLoading(false);
    }
  };

  const isEmergency = mode === 'emergencial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-2 rounded-lg ${
                isEmergency ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
              }`}
            >
              {isEmergency ? <Printer className="w-5 h-5" /> : <FileCheck2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {editingDocument
                  ? isEmergency
                    ? 'Editar Atividade Emergencial'
                    : 'Editar Atestado / Declaração'
                  : isEmergency
                  ? 'Nova Atividade Emergencial'
                  : 'Enviar Atestado ou Declaração'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEmergency
                  ? 'Para a pedagoga imprimir e aplicar com os alunos na sua ausência'
                  : 'Informe a data referente ao documento e anexe o comprovante'}
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

          {/* Tipo de Documento (apenas para Atestados/Declarações) */}
          {!isEmergency && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Documento *
              </label>
              <select
                value={certificateType}
                onChange={(e) => setCertificateType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Atestado Médico">Atestado Médico</option>
                <option value="Declaração de Comparecimento">Declaração de Comparecimento</option>
                <option value="Declaração de Acompanhamento">Declaração de Acompanhamento</option>
                <option value="Outro Comprovante">Outro Comprovante</option>
              </select>
            </div>
          )}

          {/* Dia ou Período de Falta / Referência */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Calendar className={`w-4 h-4 ${isEmergency ? 'text-amber-600' : 'text-teal-600'}`} />
                <span>
                  {isEmergency
                    ? 'Qual dia (ou período) você precisará faltar? *'
                    : 'Dia(s) ou período a que se refere *'}
                </span>
              </label>

              <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setDateMode('single')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    dateMode === 'single'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dia específico
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode('period')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    dateMode === 'period'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Período (De / Até)
                </button>
              </div>
            </div>

            {dateMode === 'single' ? (
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => {
                    setDateInput(e.target.value);
                    setError(null);
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddDate}
                  disabled={!dateInput}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1 disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar dia</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">De:</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => {
                      setPeriodStart(e.target.value);
                      setError(null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Até:</label>
                    <input
                      type="date"
                      value={periodEnd}
                      min={periodStart || undefined}
                      onChange={(e) => {
                        setPeriodEnd(e.target.value);
                        setError(null);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPeriod}
                    disabled={!periodStart || !periodEnd}
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1 disabled:opacity-40 shrink-0"
                    title="Adicionar período"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Incluir</span>
                  </button>
                </div>
              </div>
            )}

            {selectedDates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedDates.map((d) => (
                  <span
                    key={d}
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isEmergency
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-teal-100 text-teal-800 border border-teal-200'
                    }`}
                  >
                    <span>{formatAbsenceDateLabel(d)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(d)}
                      className="hover:text-rose-600"
                      title="Remover"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              {dateMode === 'single'
                ? 'Para mais de um dia avulso, escolha a data e clique em "Adicionar dia".'
                : 'Escolha a data inicial (De) e a data final (Até) do afastamento ou atestado.'}
            </p>
          </div>

          {/* Turmas (apenas para Atividade Emergencial) */}
          {isEmergency && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Turma(s) / Ano(s) para aplicação
              </label>
              <input
                type="text"
                placeholder="Ex: 6º Ano A, 7º Ano B (1º e 3º horários)"
                value={targetClasses}
                onChange={(e) => setTargetClasses(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          )}

          {/* Arquivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isEmergency
                ? 'Arquivo da Atividade para Imprimir (PDF, Word, Imagem)'
                : 'Arquivo do Atestado / Declaração (PDF, Imagem)'}{' '}
              {editingDocument ? '(Opcional substituir)' : '*'}
            </label>
            <label
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition ${
                file || editingDocument
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
              />
              {file ? (
                <div className="flex items-center space-x-3 text-emerald-700">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  <div className="text-left">
                    <p className="text-xs font-bold truncate max-w-xs">{file.name}</p>
                    <p className="text-[11px] text-emerald-600 font-medium">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Clique para trocar
                    </p>
                  </div>
                </div>
              ) : editingDocument ? (
                <div className="flex items-center space-x-3 text-emerald-700">
                  <FileText className="w-7 h-7 text-emerald-500" />
                  <div className="text-left">
                    <p className="text-xs font-bold truncate max-w-xs">
                      Atual: {editingDocument.file_name}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium">
                      Clique aqui caso queira substituir o arquivo
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-7 h-7 text-slate-400 mb-1.5" />
                  <p className="text-xs font-medium text-slate-700">
                    Clique para selecionar o arquivo
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    PDF, DOCX, Imagens (até 10 MB)
                  </p>
                </>
              )}
            </label>
          </div>

          {/* Instruções / Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isEmergency
                ? 'Instruções para a Pedagoga (impressão, cópias, aplicação)'
                : 'Observações (Opcional)'}
            </label>
            <textarea
              rows={2}
              placeholder={
                isEmergency
                  ? 'Ex: Imprimir 35 cópias frente e verso. Os alunos podem fazer em dupla.'
                  : 'Adicione alguma observação se necessário...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Ações */}
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
              disabled={loading || (!file && !editingDocument)}
              className={`px-5 py-2 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50 ${
                isEmergency
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                  : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/20'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>{editingDocument ? 'Salvar Alterações' : 'Confirmar Envio'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
