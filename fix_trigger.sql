-- 1. Permitir que o usuário autenticado insira seu próprio perfil se necessário
DROP POLICY IF EXISTS "Insercao do proprio perfil" ON public.profiles;
CREATE POLICY "Insercao do proprio perfil"
    ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- 2. Trigger robusto com tratamento defensivo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_role_val public.user_role := 'professor'::public.user_role;
    meta_role text;
BEGIN
    meta_role := new.raw_user_meta_data->>'role';
    IF meta_role = 'pedagoga' THEN
        user_role_val := 'pedagoga'::public.user_role;
    ELSIF meta_role = 'admin' THEN
        user_role_val := 'admin'::public.user_role;
    ELSE
        user_role_val := 'professor'::public.user_role;
    END IF;

    INSERT INTO public.profiles (
        id, 
        full_name, 
        email, 
        role, 
        discipline, 
        phone
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.email, ''),
        user_role_val,
        new.raw_user_meta_data->>'discipline',
        new.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;
        
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
