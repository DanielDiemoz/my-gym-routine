-- =============================================================================
-- Migration: Fix ricorsione infinita nelle policy Cerchie
--
-- PROBLEMA:
--   La policy `circle_members_select` originale era self-referencing:
--     USING (
--       user_id = auth.uid()
--       OR circle_id IN (SELECT circle_id FROM circle_members WHERE user_id = auth.uid())
--     )
--   Per righe con user_id != auth.uid() la subquery interna SELECT su
--   circle_members innesca di nuovo la valutazione della stessa policy,
--   causando infinite recursion. Postgres aborta con errore `infinite
--   recursion detected in policy for relation "circle_members"`. TanStack
--   Query gestisce l'errore silenziosamente → myCircles = [] → l'utente
--   non vede la community né le cerchie create.
--
-- FIX:
--   Introdurre una helper function SECURITY DEFINER che restituisce le
--   circle_id dell'utente corrente bypassando l'RLS (essendo eseguita
--   dal function owner che ha BYPASSRLS). La policy ora usa `circle_id
--   IN (SELECT public.get_my_circle_ids())`. Postgres non valuta più
--   ricorsivamente la policy sulla stessa tabella.
--   Stesso pattern applicato a `circles_select` per coerenza.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper SECURITY DEFINER: restituisce le circle_id dell'utente corrente.
--    Esegue come owner della funzione (BYPASSRLS), quindi nessuna policy
--    RLS viene valutata sulla subquery: niente più ricorsione.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_circle_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT circle_id
  FROM public.circle_members
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_circle_ids() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Ricrea circle_members_select senza subquery self-referencing.
--    Per coerenza rendiamola STABLE-friendly con la helper.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "circle_members_select" ON public.circle_members;
CREATE POLICY "circle_members_select" ON public.circle_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR circle_id IN (SELECT public.get_my_circle_ids())
  );

-- ---------------------------------------------------------------------------
-- 3. Ricrea anche circles_select usando la stessa helper.
--    (La policy originale non era strettamente ricorsiva, ma la subquery
--    `SELECT circle_id FROM circle_members WHERE user_id = auth.uid()`
--    subiva comunque la policy circle_members_select, che ha ora la
--    stessa helper priva di ricorsione.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "circles_select" ON public.circles;
CREATE POLICY "circles_select" ON public.circles
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT public.get_my_circle_ids())
  );

-- =============================================================================
-- Verifica con (eseguito come utente autenticato):
--   SELECT public.get_my_circle_ids();
--   SELECT * FROM public.circle_members;     -- ora ritorna i propri + circlate
--   SELECT * FROM public.circles;             -- ritorna le proprie + circlate
-- =============================================================================
