-- =============================================================================
-- Migration: RPC get_circle_members — ottiene i membri di una cerchia
--
-- PROBLEMA:
--   La policy circle_members_select è stata semplificata a
--   `USING (user_id = auth.uid())` per evitare ricorsione, quindi una
--   SELECT diretta su circle_members con filtro circle_id restituisce solo
--   il record dell'utente corrente.
--
--   La pagina di dettaglio cerchia ha bisogno di tutti gli user_id dei
--   membri di una specifica cerchia per caricare profili, sessioni e log.
--
-- SOLUZIONE:
--   RPC SECURITY DEFINER che bypassa RLS e restituisce gli user_id dei
--   membri della cerchia, ma solo se l'utente chiamante è a sua volta
--   membro della cerchia (verificato via get_my_circle_ids()).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_circle_members(p_circle_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT user_id
  FROM public.circle_members
  WHERE circle_id = p_circle_id
    AND p_circle_id IN (SELECT public.get_my_circle_ids());
$$;

GRANT EXECUTE ON FUNCTION public.get_circle_members(UUID) TO authenticated;

-- =============================================================================
-- Verifica con:
--   SELECT public.get_circle_members('id-della-tua-cerchia');
-- =============================================================================
