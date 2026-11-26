import { supabase } from '../lib/supabaseClient';
import { SchoolDocument, DocumentCategory, CustomFolder, DocumentStatus } from '../types/database.types';
import { normalizeCategory, normalizeDocument } from '../lib/utils';

export const documentService = {
  // Buscar categorias de documentos
  async getCategories(): Promise<DocumentCategory[]> {
    const { data, error } = await supabase
      .from('document_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return (data || []).map(cat => normalizeCategory(cat)) as DocumentCategory[];
  },

  // Buscar pastas de um professor
  async getFolders(teacherId: string): Promise<CustomFolder[]> {
    const { data, error } = await supabase
      .from('custom_folders')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('name');

    if (error) throw error;
    return data as CustomFolder[];
  },

  // Criar nova pasta
  async createFolder(teacherId: string, name: string, color: string = '#3B82F6'): Promise<CustomFolder> {
    const { data, error } = await supabase
      .from('custom_folders')
      .insert({ teacher_id: teacherId, name, color })
      .select()
      .single();

    if (error) throw error;
    return data as CustomFolder;
  },

  // Listar documentos (se professor, RLS filtra automaticamente; se pedagoga, vê todos)
  async getDocuments(filters?: { teacherId?: string; status?: DocumentStatus; categoryId?: string }): Promise<SchoolDocument[]> {
    let query = supabase
      .from('documents')
      .select(`
        *,
        teacher:profiles!documents_teacher_id_fkey(*),
        category:document_categories(*),
        folder:custom_folders(*),
        reviewer:profiles!documents_reviewed_by_fkey(*)
      `)
      .order('submitted_at', { ascending: false });

    if (filters?.teacherId) {
      query = query.eq('teacher_id', filters.teacherId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(doc => normalizeDocument(doc)) as SchoolDocument[];
  },

  // Enviar novo documento
  async createDocument(doc: {
    teacher_id: string;
    category_id?: string | null;
    folder_id?: string | null;
    title: string;
    description?: string;
    file_url: string;
    file_name: string;
    file_size: number;
    file_type?: string;
  }): Promise<SchoolDocument> {
    if (doc.teacher_id.startsWith('sim-')) {
      const SIM_DOCS_KEY = 'sim_uploaded_documents_v1';
      const nowIso = new Date().toISOString();
      const created = normalizeDocument({
        id: `sim-doc-custom-${Date.now()}`,
        teacher_id: doc.teacher_id,
        category_id: doc.category_id ?? null,
        folder_id: doc.folder_id ?? null,
        title: doc.title,
        description: doc.description || null,
        file_url: doc.file_url,
        file_name: doc.file_name,
        file_size: doc.file_size,
        file_type: doc.file_type || null,
        status: 'pendente' as DocumentStatus,
        submitted_at: nowIso,
        updated_at: nowIso,
      }) as SchoolDocument;

      try {
        const list: SchoolDocument[] = JSON.parse(localStorage.getItem(SIM_DOCS_KEY) || '[]');
        list.unshift(created);
        localStorage.setItem(SIM_DOCS_KEY, JSON.stringify(list));
      } catch {
        // ignore storage quota errors
      }
      return created;
    }

    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...doc,
        status: 'pendente' as DocumentStatus,
      })
      .select(`
        *,
        teacher:profiles!documents_teacher_id_fkey(*),
        category:document_categories(*)
      `)
      .single();

    if (error) throw error;
    return normalizeDocument(data) as SchoolDocument;
  },

  // Pedagoga avalia documento: aprova ou devolve com parecer
  async reviewDocument(documentId: string, reviewerId: string, status: 'aprovado' | 'devolvido', feedback?: string): Promise<SchoolDocument> {
    if (documentId.startsWith('sim-')) {
      const SIM_DOCS_KEY = 'sim_uploaded_documents_v1';
      const nowIso = new Date().toISOString();
      try {
        const list: SchoolDocument[] = JSON.parse(localStorage.getItem(SIM_DOCS_KEY) || '[]');
        const idx = list.findIndex((d) => d.id === documentId);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            status,
            feedback: feedback || null,
            reviewed_by: reviewerId,
            reviewed_at: nowIso,
            updated_at: nowIso,
          };
          localStorage.setItem(SIM_DOCS_KEY, JSON.stringify(list));
          return list[idx];
        }
      } catch {
        // ignore
      }
      return {
        id: documentId,
        teacher_id: 'sim-unknown',
        title: 'Documento Simulado',
        file_url: '',
        file_name: 'documento.pdf',
        file_size: 0,
        status,
        feedback: feedback || null,
        reviewed_by: reviewerId,
        reviewed_at: nowIso,
        submitted_at: nowIso,
        updated_at: nowIso,
      };
    }

    const { data, error } = await supabase
      .from('documents')
      .update({
        status,
        feedback: feedback || null,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select(`
        *,
        teacher:profiles!documents_teacher_id_fkey(*),
        category:document_categories(*)
      `)
      .single();

    if (error) throw error;
    return normalizeDocument(data) as SchoolDocument;
  },

  // Atualizar documento existente (enquanto não aprovado)
  async updateDocument(
    documentId: string,
    updates: {
      category_id?: string | null;
      folder_id?: string | null;
      title?: string;
      description?: string | null;
      file_url?: string;
      file_name?: string;
      file_size?: number;
      file_type?: string;
    }
  ): Promise<SchoolDocument> {
    if (documentId.startsWith('sim-')) {
      const SIM_DOCS_KEY = 'sim_uploaded_documents_v1';
      const nowIso = new Date().toISOString();
      const list: SchoolDocument[] = JSON.parse(localStorage.getItem(SIM_DOCS_KEY) || '[]');
      const idx = list.findIndex((d) => d.id === documentId);
      const updated = normalizeDocument({
        ...(idx >= 0 ? list[idx] : { id: documentId, teacher_id: 'sim-unknown', submitted_at: nowIso }),
        ...updates,
        status: 'pendente',
        updated_at: nowIso,
      }) as SchoolDocument;
      if (idx >= 0) {
        list[idx] = updated;
      } else {
        list.unshift(updated);
      }
      localStorage.setItem(SIM_DOCS_KEY, JSON.stringify(list));
      return updated;
    }

    const { data, error } = await supabase
      .from('documents')
      .update({
        ...updates,
        status: 'pendente',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return normalizeDocument(data) as SchoolDocument;
  },

  // Excluir documento pendente
  async deleteDocument(documentId: string): Promise<void> {
    if (documentId.startsWith('sim-')) {
      const SIM_DOCS_KEY = 'sim_uploaded_documents_v1';
      try {
        const list: SchoolDocument[] = JSON.parse(localStorage.getItem(SIM_DOCS_KEY) || '[]');
        localStorage.setItem(
          SIM_DOCS_KEY,
          JSON.stringify(list.filter((d) => d.id !== documentId))
        );
      } catch {
        // ignore
      }
      return;
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  }
};
