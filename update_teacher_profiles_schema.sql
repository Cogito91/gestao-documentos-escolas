-- Adicionar campos de turnos, aniversário e arquivo de horário na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shift TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_day INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_month INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS schedule_file_url TEXT;
