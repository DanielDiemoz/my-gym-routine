-- =============================================================================
-- Migration: Cerchie (Circles) feature
-- Esegui questo file nell'SQL Editor di Supabase (Dashboard → SQL Editor)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Aggiungi colonna "role" alla tabella profiles
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'coach'));

-- ---------------------------------------------------------------------------
-- 2. Funzione helper per generare codici cerchia (alfanumerico leggibile)
--    Esclude caratteri ambigui: 0, O, 1, I, l
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_circle_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(alphabet, (random() * length(alphabet))::INT + 1, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Tabella "circles"
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS circles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  owner_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;

-- Lettura: visibile solo all'owner e ai membri
CREATE POLICY "circles_select" ON circles
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
    )
  );

-- Inserimento: solo utenti con role = 'coach'
CREATE POLICY "circles_insert" ON circles
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
  );

-- Eliminazione: solo l'owner
CREATE POLICY "circles_delete" ON circles
  FOR DELETE
  USING (owner_id = auth.uid());

-- Update: solo l'owner (per future funzionalità)
CREATE POLICY "circles_update" ON circles
  FOR UPDATE
  USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Tabella "circle_members"
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS circle_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id  UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

-- Lettura: visibile solo ai membri della stessa cerchia
CREATE POLICY "circle_members_select" ON circle_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR circle_id IN (
      SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
    )
  );

-- Inserimento: l'utente può aggiungersi da solo
CREATE POLICY "circle_members_insert" ON circle_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Eliminazione: l'utente può rimuovere sé stesso;
--              l'owner può rimuovere chiunque dalla propria cerchia
CREATE POLICY "circle_members_delete" ON circle_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR circle_id IN (
      SELECT id FROM circles WHERE owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Estendi RLS di sessions: i compagni di cerchia possono leggere
--    NOTA: se già esistono policy SELECT su sessions, adattare i nomi.
--    In caso di errore "policy already exists", rinomina quella vecchia prima.
-- ---------------------------------------------------------------------------

-- Elimina la vecchia policy SELECT se esiste (cambia il nome se diverso)
DROP POLICY IF EXISTS "sessions_select_owner" ON sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;

-- Nuova policy: proprio proprietario O membro della stessa cerchia
CREATE POLICY "sessions_select" ON sessions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT cm2.user_id
      FROM circle_members cm1
      JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
      WHERE cm1.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Estendi RLS di session_logs (stessa logica di sessions)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "session_logs_select_owner" ON session_logs;
DROP POLICY IF EXISTS "Users can view their own session logs" ON session_logs;

CREATE POLICY "session_logs_select" ON session_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT cm2.user_id
      FROM circle_members cm1
      JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
      WHERE cm1.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Fine migration. Verifica con:
--   SELECT * FROM circles LIMIT 5;
--   SELECT * FROM circle_members LIMIT 5;
--   SELECT generate_circle_code();
-- =============================================================================
