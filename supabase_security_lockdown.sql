-- ==============================================================================
-- SISTEMA DE SEGURANÇA E CONTROLE DE ACESSO - E.M. ANTÔNIO MATIAS
-- Arquivo: supabase_security_lockdown.sql
-- Executar este script no Supabase SQL Editor para blindar o banco de dados.
-- ==============================================================================

-- 1. Tabela de Configurações de Segurança da Escola
CREATE TABLE IF NOT EXISTS public.school_security_settings (
    id text PRIMARY KEY DEFAULT 'default',
    school_name text NOT NULL DEFAULT 'E.M. Antônio Matias',
    invite_code text NOT NULL DEFAULT 'MATIAS2026',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir registro padrão se não existir
INSERT INTO public.school_security_settings (id, school_name, invite_code)
VALUES ('default', 'E.M. Antônio Matias', 'MATIAS2026')
ON CONFLICT (id) DO NOTHING;

-- Ativar RLS na tabela de configurações de segurança
ALTER TABLE public.school_security_settings ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares para verificação segura de papel e status ativo
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_pedagoga_or_admin()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role IN ('pedagoga', 'admin')
          AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Políticas RLS para school_security_settings
-- Apenas Pedagogas ou Admins APROVADOS podem consultar ou atualizar o código de convite da escola
DROP POLICY IF EXISTS "Apenas gestores aprovados leem config seguranca" ON public.school_security_settings;
CREATE POLICY "Apenas gestores aprovados leem config seguranca"
    ON public.school_security_settings FOR SELECT
    TO authenticated
    USING (public.is_pedagoga_or_admin());

DROP POLICY IF EXISTS "Apenas gestores aprovados editam config seguranca" ON public.school_security_settings;
CREATE POLICY "Apenas gestores aprovados editam config seguranca"
    ON public.school_security_settings FOR UPDATE
    TO authenticated
    USING (public.is_pedagoga_or_admin())
    WITH CHECK (public.is_pedagoga_or_admin());

-- RPC para recuperar o código de convite da escola (exclusivo para Pedagoga/Admin autenticada)
CREATE OR REPLACE FUNCTION public.get_school_invite_code()
RETURNS text AS $$
DECLARE
    current_code text;
BEGIN
    IF NOT public.is_pedagoga_or_admin() THEN
        RAISE EXCEPTION 'Acesso negado: Somente coordenação pedagógica pode visualizar o código de convite.';
    END IF;

    SELECT invite_code INTO current_code FROM public.school_security_settings WHERE id = 'default' LIMIT 1;
    RETURN COALESCE(current_code, 'MATIAS2026');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para alterar o código de convite da escola (exclusivo para Pedagoga/Admin autenticada)
CREATE OR REPLACE FUNCTION public.update_school_invite_code(new_code text)
RETURNS boolean AS $$
BEGIN
    IF NOT public.is_pedagoga_or_admin() THEN
        RAISE EXCEPTION 'Acesso negado: Somente coordenação pedagógica pode alterar o código de convite.';
    END IF;

    IF new_code IS NULL OR length(trim(new_code)) < 4 THEN
        RAISE EXCEPTION 'O código de convite deve conter pelo menos 4 caracteres.';
    END IF;

    UPDATE public.school_security_settings
    SET invite_code = trim(upper(new_code)),
        updated_at = timezone('utc'::text, now())
    WHERE id = 'default';

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Hardening da Função e Trigger de Novos Usuários (handle_new_user)
-- Impede auto-atribuição de 'pedagoga'/'admin' via cliente e valida código de convite da escola
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    valid_invite text;
    supplied_invite text;
    is_first_user boolean;
BEGIN
    -- Obter código de convite configurado
    SELECT invite_code INTO valid_invite FROM public.school_security_settings WHERE id = 'default' LIMIT 1;
    IF valid_invite IS NULL THEN
        valid_invite := 'MATIAS2026';
    END IF;

    -- Obter código informado pelo usuário no cadastro
    supplied_invite := trim(upper(COALESCE(new.raw_user_meta_data->>'invite_code', '')));

    -- Verificar se é o primeiro usuário absoluto do sistema (para permitir criação inicial da primeira pedagoga se a base for nova)
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first_user;

    -- Validar código de convite (obrigatório se não for o primeiríssimo usuário)
    IF NOT is_first_user AND (supplied_invite = '' OR supplied_invite <> upper(valid_invite)) THEN
        RAISE EXCEPTION 'Código de convite da escola inválido ou não fornecido. Solicite o código correto à Pedagoga da escola.';
    END IF;

    -- Regra de Segurança: auto-cadastros são SEMPRE 'professor' e 'is_active = false' (aguardando liberação da Pedagoga)
    -- Exceção: Se for o primeiro usuário da história do banco, torna-se pedagoga ativa para administrar o sistema
    IF is_first_user THEN
        INSERT INTO public.profiles (
            id,
            full_name,
            email,
            role,
            discipline,
            phone,
            is_active
        ) VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
            new.email,
            'pedagoga'::user_role,
            'Coordenação Pedagógica',
            COALESCE(new.raw_user_meta_data->>'phone', NULL),
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email;
    ELSE
        INSERT INTO public.profiles (
            id,
            full_name,
            email,
            role,
            discipline,
            phone,
            is_active
        ) VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
            new.email,
            'professor'::user_role, -- Segurança: nunca confia em 'pedagoga' vindo do client
            COALESCE(new.raw_user_meta_data->>'discipline', NULL),
            COALESCE(new.raw_user_meta_data->>'phone', NULL),
            false -- Requer aprovação manual da Pedagoga
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Blindagem das Políticas RLS (Somente contas com is_active = true acessam dados)
-- ==============================================================================

-- PROFILES
-- Usuário pode sempre ver seu próprio perfil (para saber se está pendente) e Pedagoga pode ver todos
DROP POLICY IF EXISTS "Perfis podem ser visualizados por usuários autenticados" ON public.profiles;
CREATE POLICY "Perfis podem ser visualizados por usuários autenticados"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id 
        OR (public.is_approved_user() AND public.is_pedagoga_or_admin())
        OR (public.is_approved_user() AND is_active = true)
    );

-- Atualização de perfis (Pedagoga aprova/bloqueia professores; professor altera seus dados básicos sem mudar papel nem status de aprovação)
DROP POLICY IF EXISTS "Usuário pode atualizar seu próprio perfil ou admin atualiza qualquer" ON public.profiles;
CREATE POLICY "Gestão aprova/atualiza qualquer perfil ou usuário edita o seu próprio aprovado"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        public.is_pedagoga_or_admin()
        OR (auth.uid() = id AND is_active = true)
    )
    WITH CHECK (
        public.is_pedagoga_or_admin()
        OR (auth.uid() = id AND is_active = true)
    );

-- DOCUMENT_CATEGORIES
DROP POLICY IF EXISTS "Categorias visíveis a todos autenticados" ON public.document_categories;
CREATE POLICY "Categorias visíveis apenas para usuários aprovados"
    ON public.document_categories FOR SELECT
    TO authenticated
    USING (public.is_approved_user());

-- CUSTOM_FOLDERS
DROP POLICY IF EXISTS "Visualização de pastas" ON public.custom_folders;
CREATE POLICY "Visualização de pastas apenas para usuários aprovados"
    ON public.custom_folders FOR SELECT
    TO authenticated
    USING (public.is_approved_user() AND (teacher_id = auth.uid() OR public.is_pedagoga_or_admin()));

DROP POLICY IF EXISTS "Gerenciamento de pastas próprias" ON public.custom_folders;
CREATE POLICY "Gerenciamento de pastas próprias por usuários aprovados"
    ON public.custom_folders FOR ALL
    TO authenticated
    USING (public.is_approved_user() AND teacher_id = auth.uid())
    WITH CHECK (public.is_approved_user() AND teacher_id = auth.uid());

-- DOCUMENTS
DROP POLICY IF EXISTS "Visualização de documentos" ON public.documents;
CREATE POLICY "Visualização de documentos apenas para usuários aprovados"
    ON public.documents FOR SELECT
    TO authenticated
    USING (public.is_approved_user() AND (teacher_id = auth.uid() OR public.is_pedagoga_or_admin()));

DROP POLICY IF EXISTS "Inserção de documentos pelo professor" ON public.documents;
CREATE POLICY "Inserção de documentos apenas por usuários aprovados"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (public.is_approved_user() AND (teacher_id = auth.uid() OR public.is_pedagoga_or_admin()));

DROP POLICY IF EXISTS "Atualização de documentos" ON public.documents;
CREATE POLICY "Atualização de documentos por usuários aprovados"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (
        public.is_approved_user() AND (
            public.is_pedagoga_or_admin()
            OR (teacher_id = auth.uid() AND status IN ('pendente', 'devolvido'))
        )
    );

DROP POLICY IF EXISTS "Exclusão de documentos" ON public.documents;
CREATE POLICY "Exclusão de documentos por usuários aprovados"
    ON public.documents FOR DELETE
    TO authenticated
    USING (
        public.is_approved_user() AND (
            (teacher_id = auth.uid() AND status = 'pendente')
            OR public.is_pedagoga_or_admin()
        )
    );

-- TABELAS AUXILIARES (SE EXISTIREM)
DO $$
BEGIN
    -- teacher_schedules
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teacher_schedules') THEN
        ALTER TABLE public.teacher_schedules ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Horários visíveis para usuários aprovados" ON public.teacher_schedules;
        CREATE POLICY "Horários visíveis para usuários aprovados"
            ON public.teacher_schedules FOR SELECT
            TO authenticated
            USING (public.is_approved_user());

        DROP POLICY IF EXISTS "Gestão gerencia horários" ON public.teacher_schedules;
        CREATE POLICY "Gestão gerencia horários"
            ON public.teacher_schedules FOR ALL
            TO authenticated
            USING (public.is_pedagoga_or_admin())
            WITH CHECK (public.is_pedagoga_or_admin());
    END IF;

    -- school_events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_events') THEN
        ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Eventos visíveis para usuários aprovados" ON public.school_events;
        CREATE POLICY "Eventos visíveis para usuários aprovados"
            ON public.school_events FOR SELECT
            TO authenticated
            USING (public.is_approved_user());

        DROP POLICY IF EXISTS "Gestão gerencia eventos" ON public.school_events;
        CREATE POLICY "Gestão gerencia eventos"
            ON public.school_events FOR ALL
            TO authenticated
            USING (public.is_pedagoga_or_admin())
            WITH CHECK (public.is_pedagoga_or_admin());
    END IF;

    -- birthdays
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'birthdays') THEN
        ALTER TABLE public.birthdays ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Aniversariantes visíveis para usuários aprovados" ON public.birthdays;
        CREATE POLICY "Aniversariantes visíveis para usuários aprovados"
            ON public.birthdays FOR SELECT
            TO authenticated
            USING (public.is_approved_user());
    END IF;

    -- messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Mensagens visíveis apenas pelos participantes aprovados" ON public.messages;
        CREATE POLICY "Mensagens visíveis apenas pelos participantes aprovados"
            ON public.messages FOR SELECT
            TO authenticated
            USING (public.is_approved_user() AND (sender_id = auth.uid() OR receiver_id = auth.uid()));

        DROP POLICY IF EXISTS "Envio de mensagens por participantes aprovados" ON public.messages;
        CREATE POLICY "Envio de mensagens por participantes aprovados"
            ON public.messages FOR INSERT
            TO authenticated
            WITH CHECK (public.is_approved_user() AND sender_id = auth.uid());
    END IF;

    -- notifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Notificações visíveis apenas para o destinatário aprovado" ON public.notifications;
        CREATE POLICY "Notificações visíveis apenas para o destinatário aprovado"
            ON public.notifications FOR SELECT
            TO authenticated
            USING (public.is_approved_user() AND user_id = auth.uid());
    END IF;
END $$;
