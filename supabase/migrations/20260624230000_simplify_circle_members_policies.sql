-- =============================================================================
-- Migration: Semplifica policy circle_members per evitare qualsiasi ricorsione
--
-- PROBLEMA:
--   Anche con le helper functions, c'è ancora rischio di ricorsione se la
--   policy circle_members_select viene valutata in contesti complessi.
--
-- FIX:
--   Semplifica circle_members_select per usare SOLO auth.uid() senza subquery.
--   Per i casi in cui serve vedere i membri della stessa cerchia, le altre
--   policy (profiles, sessions, session_logs) usano già get_my_circle_member_ids().
--   Questo garantisce che circle_members non abbia MAI subquery su se stessa.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Policy circle_members_select: SOLO il proprio record
--   Niente subquery, niente join, niente ricorsione possibile.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "circle_members_select" ON public.circle_members;
CREATE POLICY "circle_members_select" ON public.circle_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Policy circle_members_insert: l'utente può aggiungersi da solo
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "circle_members_insert" ON public.circle_members;
CREATE POLICY "circle_members_insert" ON public.circle_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Policy circle_members_delete: l'utente può rimuovere sé stesso;
--                           l'owner può rimuovere chiunque dalla propria cerchia
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "circle_members_delete" ON public.circle_members;
CREATE POLICY "circle_members_delete" ON public.circle_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR circle_id IN (
      SELECT id FROM circles WHERE owner_id = auth.uid()
    )
  );

-- =============================================================================
-- Verifica con:
--   SELECT * FROM public.circle_members; -- deve ritornare solo i propri record
-- =============================================================================
