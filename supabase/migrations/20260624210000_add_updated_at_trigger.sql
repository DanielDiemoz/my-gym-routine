-- =============================================================================
-- Migration: Add updated_at trigger for profiles table
--
-- PROBLEMA:
--   La tabella profiles ha una colonna updated_at ma non c'è un trigger
--   per aggiornarla automaticamente quando la riga viene modificata.
--   Questo può causare problemi di consistenza dei dati.
--
-- FIX:
--   Aggiunge una funzione e un trigger per aggiornare automaticamente
--   updated_at quando la riga profiles viene modificata.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
