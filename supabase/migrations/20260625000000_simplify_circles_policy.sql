-- =============================================================================
-- Migration: Semplifica policy circles per evitare qualsiasi ricorsione
--
-- PROBLEMA:
--   La policy circles_select usa get_my_circle_ids() che fa SELECT su
--   circle_members. Anche se circle_members_select è stata semplificata,
--   c'è ancora rischio di ricorsione in alcuni edge cases.
--
-- FIX:
--   Semplifica circles_select per usare SOLO owner_id = auth.uid() senza subquery.
--   Per vedere le cerchie di cui si è membri, usare la RPC get_my_circles()
--   che bypassa completamente RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Policy circles_select: SOLO le cerchie di cui sei owner
--   Niente subquery, niente join, niente ricorsione possibile.
--   Per vedere tutte le cerchie (incluse quelle di cui sei membro),
--   usare la RPC get_my_circles().
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "circles_select" ON public.circles;
CREATE POLICY "circles_select" ON public.circles
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Policy circles_insert: solo utenti con role = 'coach'
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "circles_insert" ON public.circles;
CREATE POLICY "circles_insert" ON public.circles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
  );

-- ---------------------------------------------------------------------------
-- Policy circles_delete: solo l'owner
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "circles_delete" ON public.circles;
CREATE POLICY "circles_delete" ON public.circles
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Policy circles_update: solo l'owner
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "circles_update" ON public.circles;
CREATE POLICY "circles_update" ON public.circles
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- =============================================================================
-- Verifica con:
--   SELECT * FROM public.circles; -- deve ritornare solo le cerchie di cui sei owner
--   SELECT * FROM public.get_my_circles(); -- deve ritornare tutte le cerchie (owner + membro)
-- =============================================================================
