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
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  }
};
