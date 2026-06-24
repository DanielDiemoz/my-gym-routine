-- =============================================================================
-- Migration: Fix profiles RLS per le Cerchie
--
-- PROBLEMA:
--   La policy `own profile select` su public.profiles permette solo di
--   leggere il PROPRIO profilo (auth.uid() = id). Quando la pagina di
--   dettaglio cerchia tenta di caricare i profili degli altri membri
--   (`SELECT * FROM profiles WHERE id IN (...)`), l'RLS blocca tutto
--   tranne il profilo dell'utente corrente → lista membri vuota.
--
--   Stesso problema per sessions e session_logs: le policy originali
--   (`own sessions all` e `own session logs all`) non sono state droppate
--   dalla migration cerchie perché i nomi non corrispondevano. I nuovi
--   policy `sessions_select` e `session_logs_select` convivono con quelli
--   vecchi via OR, quindi funzionano, ma usano una self-join su
--   circle_members che è meno performante e meno chiara.
--
-- FIX:
--   1. Aggiunta policy `profiles_select_circle_members` che permette
--      di leggere i profili dei compagni di cerchia, usando la funzione
--      helper `get_my_circle_ids()` (SECURITY DEFINER) per evitare
--      ricorsione RLS.
--   2. (Opzionale) Sostituzione delle policy `sessions_select` e
--      `session_logs_select` con versioni che usano `get_my_circle_ids()`
--      per coerenza e performance.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Aggiungi policy profiles per i compagni di cerchia.
--    Manteniamo la policy originale `own profile select` e aggiungiamo
--    questa: PostgreSQL le valuta in OR, quindi il comportamento
--    risultante è "il mio profilo OPPURE il profilo di un compagno".
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_circle_members" ON public.profiles;
CREATE POLICY "profiles_select_circle_members" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR id IN (
      SELECT cm.user_id
      FROM public.circle_members cm
      WHERE cm.circle_id IN (SELECT public.get_my_circle_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Rimpiazza le policy di sessions e session_logs con versioni più pulite
--    che usano direttamente get_my_circle_ids() invece della self-join.
--    (La self-join funzionava, ma questa versione è più performante e
--    coerente con il fix della ricorsione.)
-- ---------------------------------------------------------------------------

-- sessions: sostituisci la policy circle-aware
DROP POLICY IF EXISTS "sessions_select" ON public.sessions;
CREATE POLICY "sessions_select" ON public.sessions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT cm.user_id
      FROM public.circle_members cm
      WHERE cm.circle_id IN (SELECT public.get_my_circle_ids())
    )
  );

-- session_logs: sostituisci la policy circle-aware
DROP POLICY IF EXISTS "session_logs_select" ON public.session_logs;
CREATE POLICY "session_logs_select" ON public.session_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT cm.user_id
      FROM public.circle_members cm
      WHERE cm.circle_id IN (SELECT public.get_my_circle_ids())
    )
  );

-- =============================================================================
-- Verifica con (eseguito come utente autenticato in una cerchia):
--   SELECT * FROM public.profiles;
--   -- Deve restituire il proprio profilo + quelli dei compagni di cerchia.
--   SELECT * FROM public.sessions;
--   -- Deve restituire le sessioni proprie + quelle dei compagni di cerchia.
--   SELECT * FROM public.session_logs;
--   -- Deve restituire i log propri + quelli dei compagni di cerchia.
-- =============================================================================
