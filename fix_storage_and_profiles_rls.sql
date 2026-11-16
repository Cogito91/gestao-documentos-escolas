-- ==============================================================================
-- CORREÇÃO DE POLÍTICAS RLS PARA UPLOAD DE HORÁRIOS PELA PEDAGOGA
-- ==============================================================================

-- 1. Permitir que Pedagoga ou Admin faça upload no Storage para qualquer professor
DROP POLICY IF EXISTS "Upload em pasta pessoal" ON storage.objects;
DROP POLICY IF EXISTS "Upload de documentos - usuario proprio ou pedagoga/admin" ON storage.objects;

CREATE POLICY "Upload de documentos - usuario proprio ou pedagoga/admin"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'school-documents' AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_pedagoga_or_admin()
        )
    );

-- 2. Permitir que Pedagoga ou Admin atualize dados do perfil dos professores (ex: anexar horário)
DROP POLICY IF EXISTS "Atualizacao do proprio perfil ou admin" ON public.profiles;
DROP POLICY IF EXISTS "Atualizacao do proprio perfil ou pedagoga/admin" ON public.profiles;

CREATE POLICY "Atualizacao do proprio perfil ou pedagoga/admin"
    ON public.profiles FOR UPDATE TO authenticated
    USING (
        auth.uid() = id 
        OR public.is_pedagoga_or_admin()
    )
    WITH CHECK (
        auth.uid() = id 
        OR public.is_pedagoga_or_admin()
    );
