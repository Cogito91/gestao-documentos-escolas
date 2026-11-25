-- ==============================================================================
-- CRIAÇÃO DA TABELA DE DIÁRIO DE BORDO DO PROFESSOR NO SUPABASE
-- Execute este script no SQL Editor do seu painel Supabase:
-- https://supabase.com/dashboard/project/nxcqgmosyxoqhcultmmd/sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    turma TEXT,
    activities_today TEXT,
    classwork TEXT,
    homework TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ativa segurança em nível de linha (RLS)
ALTER TABLE public.teacher_daily_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso livre para leitura e escrita autenticada / sincronização
DROP POLICY IF EXISTS "Leitura de diários de bordo" ON public.teacher_daily_logs;
CREATE POLICY "Leitura de diários de bordo"
    ON public.teacher_daily_logs FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Inserção e atualização de diários de bordo" ON public.teacher_daily_logs;
CREATE POLICY "Inserção e atualização de diários de bordo"
    ON public.teacher_daily_logs FOR ALL
    USING (true)
    WITH CHECK (true);
