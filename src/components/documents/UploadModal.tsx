import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  Trash2,
} from 'lucide-react';
import {
  DocumentCategory,
  CustomFolder,
  SchoolDocument,
} from '../../types/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import { storageService } from '../../services/storageService';
import { encodeDocumentDescription } from '../../lib/utils';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: DocumentCategory[];
  folders: CustomFolder[];
  targetCategory?: DocumentCategory | null;
  initialBimestre?: string;
  editingDocument?: SchoolDocument | null;
  onSuccess: () => void;
}

const DRAFT_KEY = 'upload_modal_draft_v2';

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  categories,
  folders,
  targetCategory,
  initialBimestre,
  editingDocument,
  onSuccess,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');
  const [bimestre, setBimestre] = useState('1º Bimestre');
  const [description, setDescription] = useState('');
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Restaura rascunho ou inicializa com categoria/documento
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccess(false);

    if (editingDocument) {
      setTitle(editingDocument.title || '');
      setCategoryId(editingDocument.category_id || '');
      setFolderId(editingDocument.folder_id || '');
      setBimestre(initialBimestre || '1º Bimestre');
      setDescription(editingDocument.description || '');
      setMainFile(null);
      setEvidenceFiles([]);
      return;
    }

    if (targetCategory) {
      setCategoryId(targetCategory.id);
      setBimestre(targetCategory.bimestre || initialBimestre || '1º Bimestre');
      setTitle(targetCategory.name);
      return;
    }

    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        setTitle(draft.title || '');
        setCategoryId(draft.categoryId || '');
        setFolderId(draft.folderId || '');
        setBimestre(draft.bimestre || '1º Bimestre');
        setDescription(draft.description || '');
      }
    } catch {
      // Ignora erro de rascunho
    }
  }, [isOpen, targetCategory, initialBimestre, editingDocument]);

  // Salva rascunho automaticamente enquanto digita
  useEffect(() => {
    if (!isOpen || editingDocument) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ title, categoryId, folderId, bimestre, description })
      );
    } catch {
      // Ignora erro de quota
    }
  }, [isOpen, editingDocument, title, categoryId, folderId, bimestre, description]);

  if (!isOpen) return null;

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const requiresEvidence = Boolean(selectedCategory?.requires_evidence);

  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedExtensions.includes(ext) && !file.type.startsWith('image/')) {
      setError(`Formato não permitido (${ext}). Envie PDF, Word, Excel ou Imagem.`);
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. O tamanho máximo permitido é 10 MB.');
      e.target.value = '';
      return;
    }
    setError(null);
    setMainFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError(null);
    setEvidenceFiles((prev) => [...prev, ...files]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim()) {
      setError('Informe um título para o documento.');
      return;
    }

    if (!editingDocument && !mainFile) {
      setError('Selecione um arquivo ou foto para enviar.');
      return;
    }

    if (requiresEvidence && evidenceFiles.length === 0 && !editingDocument) {
      setError('Esta categoria exige pelo menos 1 foto ou comprovante de evidência.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      let fileUrl = editingDocument?.file_url || '';
      let fileName = editingDocument?.file_name || '';
      let fileSize = editingDocument?.file_size || 0;
      let fileType = editingDocument?.file_type || '';

      if (mainFile) {
        const uploaded = await storageService.uploadDocumentFile(user.id, mainFile);
        fileUrl = uploaded.publicUrl;
        fileName = mainFile.name;
        fileSize = mainFile.size;
        fileType = mainFile.type;
      }

      const uploadedEvidences: { name: string; url: string }[] = [];
      for (const evFile of evidenceFiles) {
        const ev = await storageService.uploadDocumentFile(user.id, evFile);
        uploadedEvidences.push({ name: evFile.name, url: ev.publicUrl });
      }

      const encodedDesc = encodeDocumentDescription(
        `[${bimestre}] ${description.trim()}`.trim(),
        uploadedEvidences.length > 0 ? uploadedEvidences : undefined
      );

      if (editingDocument) {
        await documentService.updateDocument(editingDocument.id, {
          title: title.trim(),
          category_id: categoryId || null,
          folder_id: folderId || null,
          description: encodedDesc,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
        });
      } else {
        await documentService.createDocument({
          teacher_id: user.id,
          category_id: categoryId || null,
          folder_id: folderId || null,
          title: title.trim(),
          description: encodedDesc,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
        });
      }

      sessionStorage.removeItem(DRAFT_KEY);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Erro no envio:', err);
      const msg = String(err?.message || err || '');
      if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        setError('Falha na conexão com a internet. Verifique sua rede e tente novamente.');
      } else if (msg.toLowerCase().includes('policy') || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('unauthorized') || err?.statusCode === '403') {
        setError('Falta de permissão no servidor para enviar este arquivo. Verifique seu login.');
      } else if (msg.toLowerCase().includes('bucket') || msg.toLowerCase().includes('storage')) {
        setError(`Falha no armazenamento (Storage): ${msg}`);
      } else {
        setError(`Falha ao registrar documento: ${msg || 'Erro inesperado. Tente novamente.'}`);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-[430px] max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-4 py-3.5 bg-blue-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5" />
            <h3 className="font-bold text-sm">
              {editingDocument ? 'Reenviar Documento' : 'Enviar Documento'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário Mobile-First */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Documento enviado com sucesso!</span>
            </div>
          )}

          {/* Seletor de Arquivo Principal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              1. Arquivo ou Foto *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleMainFileChange}
              className="hidden"
            />
            {mainFile ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{mainFile.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {(mainFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMainFile(null)}
                  className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 px-3 border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 rounded-2xl flex flex-col items-center justify-center space-y-1 text-blue-700 transition"
              >
                <UploadCloud className="w-6 h-6" />
                <span className="text-xs font-bold">Toque aqui para escolher arquivo ou foto</span>
                <span className="text-[10px] text-slate-500">PDF, Word, Excel ou Imagem (até 10 MB)</span>
              </button>
            )}
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Título da Entrega *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Plano de Aula - 7º Ano"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Bimestre e Categoria */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bimestre</label>
              <select
                value={bimestre}
                onChange={(e) => setBimestre(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="1º Bimestre">1º Bimestre</option>
                <option value="2º Bimestre">2º Bimestre</option>
                <option value="3º Bimestre">3º Bimestre</option>
                <option value="4º Bimestre">4º Bimestre</option>
                <option value="Anual / Geral">Anual / Geral</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Categoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Geral</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pasta Pessoal */}
          {folders.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pasta Pessoal</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Sem pasta</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Evidências */}
          <div>
            <input
              ref={evidenceInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleEvidenceChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => evidenceInputRef.current?.click()}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                requiresEvidence
                  ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>
                {evidenceFiles.length > 0
                  ? `${evidenceFiles.length} evidência(s) anexada(s) (+ Adicionar)`
                  : requiresEvidence
                  ? 'Anexar Foto/Evidência (Obrigatório) *'
                  : '+ Anexar Evidência (Opcional)'}
              </span>
            </button>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observações</label>
            <textarea
              rows={2}
              placeholder="Detalhes sobre a turma ou aula..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Botão Enviar */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-2 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Confirmar Envio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
