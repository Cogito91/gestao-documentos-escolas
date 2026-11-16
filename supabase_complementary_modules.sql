-- ==============================================================================
-- ETAPA 5: MÓDULOS COMPLEMENTARES
-- 1. Horários de Aula dos Professores
-- 2. Calendário Escolar Interativo
-- 3. Aniversariantes do Mês
-- ==============================================================================

-- 1. Tabela de Horários de Aula
CREATE TABLE IF NOT EXISTS public.teacher_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta
    period INTEGER NOT NULL,      -- 1 a 6 (1º ao 6º horário)
    start_time TEXT NOT NULL,     -- Ex: '07:30'
    end_time TEXT NOT NULL,       -- Ex: '08:20'
    class_name TEXT NOT NULL,     -- Ex: '8º Ano A'
    subject TEXT,                 -- Ex: 'Matemática'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Calendário Escolar
CREATE TABLE IF NOT EXISTS public.school_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'pedagogico', -- 'reuniao', 'conselho', 'feriado', 'prova', 'evento'
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Aniversariantes
CREATE TABLE IF NOT EXISTS public.birthdays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    birth_day INTEGER NOT NULL,   -- 1 a 31
    birth_month INTEGER NOT NULL, -- 1 a 12
    role_or_class TEXT,           -- Ex: 'Prof. de História', 'Inspetor', 'Coordenação'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ativar RLS
ALTER TABLE public.teacher_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthdays ENABLE ROW LEVEL SECURITY;

-- Políticas para Horários
DROP POLICY IF EXISTS "Horários visíveis a todos autenticados" ON public.teacher_schedules;
CREATE POLICY "Horários visíveis a todos autenticados"
    ON public.teacher_schedules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Apenas pedagogas e admins gerenciam horários" ON public.teacher_schedules;
CREATE POLICY "Apenas pedagogas e admins gerenciam horários"
    ON public.teacher_schedules FOR ALL TO authenticated
    USING (public.is_pedagoga_or_admin())
    WITH CHECK (public.is_pedagoga_or_admin());

-- Políticas para Calendário Escolar
DROP POLICY IF EXISTS "Eventos visíveis a todos autenticados" ON public.school_events;
CREATE POLICY "Eventos visíveis a todos autenticados"
    ON public.school_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Apenas pedagogas e admins gerenciam eventos" ON public.school_events;
CREATE POLICY "Apenas pedagogas e admins gerenciam eventos"
    ON public.school_events FOR ALL TO authenticated
    USING (public.is_pedagoga_or_admin())
    WITH CHECK (public.is_pedagoga_or_admin());

-- Políticas para Aniversariantes
DROP POLICY IF EXISTS "Aniversariantes visíveis a todos autenticados" ON public.birthdays;
CREATE POLICY "Aniversariantes visíveis a todos autenticados"
    ON public.birthdays FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Apenas pedagogas e admins gerenciam aniversariantes" ON public.birthdays;
CREATE POLICY "Apenas pedagogas e admins gerenciam aniversariantes"
    ON public.birthdays FOR ALL TO authenticated
    USING (public.is_pedagoga_or_admin())
    WITH CHECK (public.is_pedagoga_or_admin());

-- Dados iniciais de exemplo para Calendário e Aniversariantes
INSERT INTO public.school_events (title, description, event_date, event_type)
VALUES
    ('Reunião Pedagógica Inicial', 'Alinhamento dos planos de aula e diretrizes da BNCC', CURRENT_DATE + INTERVAL '3 days', 'reuniao'),
    ('Fechamento do 1º Bimestre', 'Data final para entrega de notas e diários no sistema', CURRENT_DATE + INTERVAL '15 days', 'pedagogico'),
    ('Conselho de Classe Participativo', 'Análise do rendimento escolar por turma', CURRENT_DATE + INTERVAL '20 days', 'conselho')
ON CONFLICT DO NOTHING;

INSERT INTO public.birthdays (name, birth_day, birth_month, role_or_class)
VALUES
    ('Prof. Carlos Eduardo', EXTRACT(DAY FROM CURRENT_DATE)::INTEGER, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, 'Professor de Matemática'),
    ('Profa. Regina Silveira', 18, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, 'Pedagoga Geral'),
    ('Prof. Marcos Aurélio', 25, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, 'Professor de Geografia')
ON CONFLICT DO NOTHING;
