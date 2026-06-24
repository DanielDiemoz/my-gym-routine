-- =============================================================================
-- Migration: Semplifica get_my_circle_member_ids per evitare qualsiasi ricorsione
--
-- PROBLEMA:
--   La funzione get_my_circle_member_ids() fa SELECT su circle_members
--   anche se è SECURITY DEFINER. In alcuni edge cases questo potrebbe ancora
--   causare problemi.
--
-- FIX:
--   Semplifica get_my_circle_member_ids() per usare get_my_circle_ids()
--   che è già SECURITY DEFINER e testata. Questo evita qualsiasi SELECT
--   diretta su circle_members nella funzione.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper SECURITY DEFINER: restituisce gli user_id dei compagni di cerchia
--   Usa get_my_circle_ids() che bypassa RLS, quindi doppio bypass = ancora più sicuro
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_circle_member_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT cm.user_id
  FROM public.circle_members cm
  WHERE cm.circle_id IN (SELECT public.get_my_circle_ids());
$$;

-- =============================================================================
-- Verifica con:
--   SELECT * FROM public.get_my_circle_member_ids();
-- =============================================================================
