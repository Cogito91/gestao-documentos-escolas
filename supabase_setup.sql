-- ==============================================================================
-- ETAPA 2: CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS, RLS E STORAGE NO SUPABASE
-- Sistema de Gestão Escolar e Controle Pedagógico de Documentos
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Criação dos tipos enumerados
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'pedagoga', 'professor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('pendente', 'em_analise', 'aprovado', 'devolvido');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('document_status', 'new_message', 'deadline_warning', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabela de Perfis de Usuários (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'professor',
    discipline TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela de Categorias Obrigatórias de Documentos
CREATE TABLE IF NOT EXISTS public.document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    deadline_day INTEGER, -- ex: todo dia 5 do mês
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Tabela de Pastas Personalizadas dos Professores
CREATE TABLE IF NOT EXISTS public.custom_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Documentos
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.document_categories(id) ON DELETE SET NULL,
    folder_id UUID REFERENCES public.custom_folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT,
    status document_status NOT NULL DEFAULT 'pendente',
    feedback TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Mensagens Privadas
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'system',
    read BOOLEAN NOT NULL DEFAULT false,
    link_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Trigger automático para criar Perfil na criação de usuário em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, discipline, phone)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'professor'::user_role),
        new.raw_user_meta_data->>'discipline',
        new.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar timestamp updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    new.updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA RLS (ROW LEVEL SECURITY)
-- ==============================================================================

-- Ativar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares para verificação de papel (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_pedagoga_or_admin()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('pedagoga', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Políticas para PROFILES
DROP POLICY IF EXISTS "Perfis podem ser visualizados por usuários autenticados" ON public.profiles;
CREATE POLICY "Perfis podem ser visualizados por usuários autenticados"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Usuário pode atualizar seu próprio perfil ou admin atualiza qualquer" ON public.profiles;
CREATE POLICY "Usuário pode atualizar seu próprio perfil ou admin atualiza qualquer"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id OR public.current_user_role() = 'admin')
    WITH CHECK (auth.uid() = id OR public.current_user_role() = 'admin');

-- 2. Políticas para CATEGORIAS DE DOCUMENTOS
DROP POLICY IF EXISTS "Categorias visíveis a todos autenticados" ON public.document_categories;
CREATE POLICY "Categorias visíveis a todos autenticados"
    ON public.document_categories FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Apenas pedagogas e admins gerenciam categorias" ON public.document_categories;
CREATE POLICY "Apenas pedagogas e admins gerenciam categorias"
    ON public.document_categories FOR ALL
    TO authenticated
    USING (public.is_pedagoga_or_admin())
    WITH CHECK (public.is_pedagoga_or_admin());

-- 3. Políticas para PASTAS PERSONALIZADAS
DROP POLICY IF EXISTS "Visualização de pastas" ON public.custom_folders;
CREATE POLICY "Visualização de pastas"
    ON public.custom_folders FOR SELECT
    TO authenticated
    USING (teacher_id = auth.uid() OR public.is_pedagoga_or_admin());

DROP POLICY IF EXISTS "Gerenciamento de pastas próprias" ON public.custom_folders;
CREATE POLICY "Gerenciamento de pastas próprias"
    ON public.custom_folders FOR ALL
    TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- 4. Políticas para DOCUMENTOS
DROP POLICY IF EXISTS "Visualização de documentos" ON public.documents;
CREATE POLICY "Visualização de documentos"
    ON public.documents FOR SELECT
    TO authenticated
    USING (teacher_id = auth.uid() OR public.is_pedagoga_or_admin());

DROP POLICY IF EXISTS "Inserção de documentos pelo professor" ON public.documents;
CREATE POLICY "Inserção de documentos pelo professor"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (teacher_id = auth.uid() OR public.is_pedagoga_or_admin());

DROP POLICY IF EXISTS "Atualização de documentos" ON public.documents;
CREATE POLICY "Atualização de documentos"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (
        -- Pedagoga ou Admin pode atualizar para aprovar/devolver/revisar
        public.is_pedagoga_or_admin()
        -- Professor pode atualizar apenas seus próprios documentos se não estiverem aprovados
        OR (teacher_id = auth.uid() AND status IN ('pendente', 'devolvido'))
    );

DROP POLICY IF EXISTS "Exclusão de documentos" ON public.documents;
CREATE POLICY "Exclusão de documentos"
    ON public.documents FOR DELETE
    TO authenticated
    USING (
        (teacher_id = auth.uid() AND status = 'pendente')
        OR public.current_user_role() = 'admin'
    );

-- 5. Políticas para MENSAGENS PRIVADAS
DROP POLICY IF EXISTS "Visualização restrita de mensagens" ON public.messages;
CREATE POLICY "Visualização restrita de mensagens"
    ON public.messages FOR SELECT
    TO authenticated
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "Envio de mensagens" ON public.messages;
CREATE POLICY "Envio de mensagens"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Destinatário marca como lida" ON public.messages;
CREATE POLICY "Destinatário marca como lida"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- 6. Políticas para NOTIFICAÇÕES
DROP POLICY IF EXISTS "Usuário visualiza suas próprias notificações" ON public.notifications;
CREATE POLICY "Usuário visualiza suas próprias notificações"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuário atualiza suas próprias notificações" ON public.notifications;
CREATE POLICY "Usuário atualiza suas próprias notificações"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Sistema ou usuários autorizados inserem notificações" ON public.notifications;
CREATE POLICY "Sistema ou usuários autorizados inserem notificações"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ==============================================================================
-- CONFIGURAÇÃO DO STORAGE BUCKET E REGRAS DE ARMAZENAMENTO
-- ==============================================================================

-- Criar bucket 'school-documents' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-documents', 'school-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Regras de Storage no esquema storage.objects
DROP POLICY IF EXISTS "Envio de arquivos em pasta pessoal" ON storage.objects;
CREATE POLICY "Envio de arquivos em pasta pessoal"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'school-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Download de arquivos - professor próprio ou pedagoga/admin" ON storage.objects;
CREATE POLICY "Download de arquivos - professor próprio ou pedagoga/admin"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'school-documents' AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_pedagoga_or_admin()
        )
    );

DROP POLICY IF EXISTS "Exclusão de arquivos próprios pendentes" ON storage.objects;
CREATE POLICY "Exclusão de arquivos próprios pendentes"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'school-documents' AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_pedagoga_or_admin()
        )
    );

-- ==============================================================================
-- DADOS INICIAIS (SEED)
-- ==============================================================================

INSERT INTO public.document_categories (name, description, deadline_day)
VALUES 
    ('Plano de Aula Semanal', 'Planejamento semanal das aulas e conteúdos pedagógicos.', 5),
    ('Avaliação Bimestral', 'Elaboração das provas e gabaritos oficiais para impressão.', 10),
    ('Recuperação Paralela', 'Atividades e avaliações voltadas aos alunos em recuperação.', 15),
    ('Diário de Classe / Frequência', 'Fechamento de faltas, presenças e notas parciais.', 28),
    ('Relatório de Desempenho Pedagógico', 'Acompanhamento de casos especiais e evolução da turma.', 30)
ON CONFLICT DO NOTHING;
