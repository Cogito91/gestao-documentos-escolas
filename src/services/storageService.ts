import { supabase } from '../lib/supabaseClient';

const BUCKET_NAME = 'school-documents';

export const storageService = {
  // Upload do arquivo para a pasta do professor: {userId}/{timestamp}_{cleanFileName}
  async uploadDocumentFile(userId: string, file: File): Promise<{ path: string; publicUrl: string }> {
    const cleanFileName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\s+/g, '_');
    const filePath = `${userId}/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro no upload para o storage:', uploadError);
      throw uploadError;
    }

    // Gerar URL assinada válida por 1 ano (31536000 segundos) para pré-visualização segura
    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 31536000);

    if (signedError || !signedData) {
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      return { path: filePath, publicUrl: publicData.publicUrl };
    }

    return { path: filePath, publicUrl: signedData.signedUrl };
  },

  async getDownloadUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600);

    if (error || !data) {
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      return publicData.publicUrl;
    }

    return data.signedUrl;
  },

  async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) throw error;
  }
};
