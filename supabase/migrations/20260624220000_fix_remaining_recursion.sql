-- =============================================================================
-- Migration: Fix ricorsione infinita rimanente nelle policy
--
-- PROBLEMA:
--   Le policy profiles_select_circle_members, sessions_select e 
--   session_logs_select fanno self-join su circle_members:
--     SELECT cm.user_id FROM public.circle_members cm WHERE ...
--   Quando PostgreSQL valuta queste policy, la subquery su circle_members
--   attiva la policy circle_members_select, che può causare ancora ricorsione
--   in alcuni edge cases.
--
-- FIX:
--   Crea una funzione helper SECURITY DEFINER che restituisce direttamente
--   gli user_id dei compagni di cerchia, bypassando completamente la tabella
--   circle_members nelle policy. Tutte le policy ora usano questa funzione
--   invece di fare join su circle_members.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper SECURITY DEFINER: restituisce gli user_id dei compagni di cerchia
--    Bypassa RLS completamente, quindi nessuna policy viene valutata.
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
  WHERE cm.circle_id IN (SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.get_my_circle_member_ids() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Aggiorna profiles_select_circle_members per usare la nuova helper
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_circle_members" ON public.profiles;
CREATE POLICY "profiles_select_circle_members" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR id IN (SELECT public.get_my_circle_member_ids())
  );

-- ---------------------------------------------------------------------------
-- 3. Aggiorna sessions_select per usare la nuova helper
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "sessions_select" ON public.sessions;
CREATE POLICY "sessions_select" ON public.sessions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT public.get_my_circle_member_ids())
  );

-- ---------------------------------------------------------------------------
-- 4. Aggiorna session_logs_select per usare la nuova helper
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "session_logs_select" ON public.session_logs;
CREATE POLICY "session_logs_select" ON public.session_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT public.get_my_circle_member_ids())
  );

-- =============================================================================
-- Verifica con (eseguito come utente autenticato in una cerchia):
--   SELECT * FROM public.profiles;
--   SELECT * FROM public.sessions;
--   SELECT * FROM public.session_logs;
-- =============================================================================
