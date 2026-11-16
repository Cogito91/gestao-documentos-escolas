-- Adicionar coluna bimestre na tabela de categorias de documentos
ALTER TABLE public.document_categories 
ADD COLUMN IF NOT EXISTS bimestre TEXT DEFAULT '1º Bimestre';
