import React, { useState } from 'react';
import { X, CheckCircle, RotateCcw, FileText, Download, ExternalLink, Loader2, AlertTriangle, Camera } from 'lucide-react';
import { SchoolDocument } from '../../types/database.types';
import { documentService } from '../../services/documentService';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';

interface ReviewModalProps {
  document: SchoolDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  document,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<'aprovado' | 'devolvido' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !document) return null;

  const handleReview = async (status: 'aprovado' | 'devolvido') => {
    if (!user) return;
    if (status === 'devolvido' && !feedback.trim()) {
      setError('Por favor, descreva o motivo da devolução e as orientações para o professor.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Atualiza o status e feedback do documento no banco
      await documentService.reviewDocument(document.id, user.id, status, feedback);

      // 2. Dispara notificação automática para o professor
      const notifTitle = status === 'aprovado' 
        ? 'Documento Aprovado pela Coordenação' 
        : 'Documento Devolvido para Ajustes';
      const notifMsg = status === 'aprovado'
        ? `Seu documento "${document.title}" foi aprovado com sucesso.`
        : `O documento "${document.title}" foi devolvido com apontamentos da coordenação: "${feedback.slice(0, 100)}..."`;

      await notificationService.createNotification(
        document.teacher_id,
        notifTitle,
        notifMsg,
        'document_status'
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Falha na revisão:', err);
      setError(err.message || 'Erro ao processar a avaliação pedagógica.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50/50">
          <div>
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Parecer da Coordenação</span>
            <h3 className="font-bold text-slate-800 text-base">{document.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações da Entrega */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Professor:</span>
              <span className="font-semibold text-slate-800">{document.teacher?.full_name || 'Professor'}</span>
            </div>
            {document.teacher?.discipline && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Disciplina:</span>
                <span className="font-medium text-slate-700">{document.teacher.discipline}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Categoria:</span>
              <span className="font-medium text-blue-600">{document.category?.name || 'Geral'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Data de Envio:</span>
              <span className="text-slate-700">
                {new Date(document.submitted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Link para o arquivo */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">
                📎 {document.file_name}
              </span>
              <a
                href={document.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                <span>Abrir / Baixar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Evidências Anexadas pelo Professor */}
            {document.evidence_files && document.evidence_files.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <span className="text-xs font-bold text-amber-800 flex items-center space-x-1">
                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                  <span>Evidências Anexadas ({document.evidence_files.length}):</span>
                </span>
                <div className="space-y-1">
                  {document.evidence_files.map((ev, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-xs text-slate-700 truncate max-w-[210px]">
                        📸 {ev.name}
                      </span>
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline shrink-0"
                      >
                        <span>Abrir / Baixar</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Campo de Feedback / Orientações Pedagógicas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parecer Pedagógico / Observações (Obrigatório em caso de Devolução):
            </label>
            <textarea
              rows={4}
              placeholder="Ex: Favor ajustar os objetivos específicos da aula 3 e incluir os critérios da avaliação diagnóstica..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
            />
          </div>

          {/* Botões de Decisão */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleReview('devolvido')}
              disabled={loading}
              className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading && actionType === 'devolvido' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Devolver com Ajustes</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleReview('aprovado')}
              disabled={loading}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading && actionType === 'aprovado' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Aprovar Documento</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
