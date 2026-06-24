-- =============================================================================
-- Migration: RPC get_my_circles() — bypass totale di RLS per la lista cerchie
--
-- PROBLEMA PERSISTENTE:
--   Anche dopo aver sistemato la ricorsione di circle_members_select, la
--   query myCircles lato client fa N+1 step (members → circles → count
--   per cerchia) ciascuno passibile di RLS edge cases. Se uno qualsiasi
--   fallisce silenziosamente (errore filtrato da Tanstack retry: 1 +
--   throwOnError: false), myCircles = [].
--
-- FIX DEFINITIVO:
--   Una SECURITY DEFINER RPC che restituisce TUTTE le cerchie dell'utente
--   in un solo round-trip, calcolando anche il count membri. Nessuna
--   valutazione RLS coinvolta (giriamo come postgres, BYPASSRLS).
--   self-contained: la RPC è atomica e indipendente dalle policy.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_circles()
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  owner_id UUID,
  created_at TIMESTAMPTZ,
  member_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.code,
    c.owner_id,
    c.created_at,
    (SELECT count(*) FROM public.circle_members cm2 WHERE cm2.circle_id = c.id)::BIGINT AS member_count
  FROM public.circles c
  JOIN public.circle_members cm ON c.id = cm.circle_id
  WHERE cm.user_id = auth.uid()
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_circles() TO authenticated;

-- =============================================================================
-- Verifica:
--   SELECT * FROM public.get_my_circles();
--   -- deve ritornare 1 riga dopo il join della community GymBro
--   -- deve ritornare N righe dopo N cerchie create/joinate
-- =============================================================================
