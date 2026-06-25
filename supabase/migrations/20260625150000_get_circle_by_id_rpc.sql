-- =============================================================================
-- Migration: RPC get_circle_by_id — dettaglio cerchia per membri (non solo owner)
--
-- PROBLEMA:
--   La policy circles_select è volutamente limitata a owner_id = auth.uid()
--   per evitare ricorsione RLS. Questo significa che i membri non-owner non
--   possono fare SELECT diretto sulla tabella circles e ricevono null,
--   causando l'errore "Cerchia non trovata o non accessibile".
--
-- SOLUZIONE:
--   RPC SECURITY DEFINER che bypassa RLS e restituisce i dettagli della
--   cerchia solo se l'utente chiamante è owner o membro della cerchia.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_circle_by_id(p_circle_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  owner_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.id, c.name, c.code, c.owner_id, c.created_at
  FROM public.circles c
  WHERE c.id = p_circle_id
    AND (
      c.owner_id = auth.uid()
      OR c.id IN (SELECT public.get_my_circle_ids())
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_circle_by_id(UUID) TO authenticated;

-- =============================================================================
-- Verifica:
--   SELECT * FROM public.get_circle_by_id('id-cerchia');
--   -- deve ritornare la riga se sei owner OPPURE membro
--   -- deve ritornare 0 righe se non sei né owner né membro
-- =============================================================================
