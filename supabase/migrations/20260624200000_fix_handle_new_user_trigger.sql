-- =============================================================================
-- Migration: Fix handle_new_user trigger to include all required fields
--
-- PROBLEMA:
--   La funzione handle_new_user() originale nel migration 
--   20260623163824_5bc245e6-c30e-454f-83dc-b7f4e6aef96d.sql non includeva
--   i campi avatar_url e onboarded, che sono invece presenti in schema.sql.
--   Inoltre usava 'display_name' invece di 'full_name' per i metadati.
--   Questo causava inconsistenza tra il trigger e lo schema atteso.
--
-- FIX:
--   Aggiorna la funzione handle_new_user() per includere tutti i campi
--   necessari (avatar_url, onboarded) e usa 'full_name' per coerenza con
--   schema.sql.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, onboarded)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    false
  );
  RETURN NEW;
END;
$$;
