-- Esegui questo nel SQL Editor di Supabase per completare il setup admin

-- 1. Aggiungi 'admin' al CHECK constraint della colonna role
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'coach', 'admin'));

-- 2. Imposta il tuo profilo come admin
UPDATE profiles SET role = 'admin' WHERE id = '2fa435ea-d6ea-4c6d-a6cb-f4361625394c';

-- 3. Funzione SECURITY DEFINER per verificare admin (bypassa RLS)
CREATE OR REPLACE FUNCTION public.check_is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role = 'admin'
  );
$$;

-- 4. RLS: admin vede tutti i profili
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

-- 5. RLS: admin vede tutte le sessioni
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.sessions;
CREATE POLICY "Admins can view all sessions"
  ON public.sessions
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

-- 6. RLS: admin vede tutti i session_logs
DROP POLICY IF EXISTS "Admins can view all session_logs" ON public.session_logs;
CREATE POLICY "Admins can view all session_logs"
  ON public.session_logs
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

-- 7. RLS: admin vede tutte le plans
DROP POLICY IF EXISTS "Admins can view all plans" ON public.plans;
CREATE POLICY "Admins can view all plans"
  ON public.plans
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

-- 8. RLS: admin vede tutti gli exercises
DROP POLICY IF EXISTS "Admins can view all exercises" ON public.exercises;
CREATE POLICY "Admins can view all exercises"
  ON public.exercises
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));

-- 9. RLS: admin vede tutti i gemini_usage
DROP POLICY IF EXISTS "Admins can view all gemini usage" ON public.gemini_usage;
CREATE POLICY "Admins can view all gemini usage"
  ON public.gemini_usage
  FOR SELECT
  USING (public.check_is_admin(auth.uid()));
