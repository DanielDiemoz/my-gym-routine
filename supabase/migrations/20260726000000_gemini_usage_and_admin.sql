-- =============================================================================
-- Migration: gemini_usage table + admin role
-- =============================================================================

-- Aggiungere 'admin' al vincolo CHECK sulla colonna role di profiles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'coach', 'admin'));

-- Tabella per tracciare le chiamate a Gemini
CREATE TABLE IF NOT EXISTS public.gemini_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('image', 'text')),
  exercise_count INTEGER NOT NULL DEFAULT 0,
  plan_name TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indici per query performance
CREATE INDEX IF NOT EXISTS idx_gemini_usage_user_id ON public.gemini_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_gemini_usage_created_at ON public.gemini_usage(created_at DESC);

-- RLS: solo l'utente vede le proprie registrazioni, gli admin vedono tutto
ALTER TABLE public.gemini_usage ENABLE ROW LEVEL SECURITY;

-- Policy: utenti vedono solo le proprie registrazioni
CREATE POLICY "Users can view own gemini usage"
  ON public.gemini_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: admin vedono tutto (verifica role = 'admin')
CREATE POLICY "Admins can view all gemini usage"
  ON public.gemini_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: il server puo inserire (via service role bypassa RLS, ma definiamola per completezza)
CREATE POLICY "Server can insert gemini usage"
  ON public.gemini_usage
  FOR INSERT
  WITH CHECK (true);

-- Funzione RPC per verificare se un utente e admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Grant execute aauthenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
