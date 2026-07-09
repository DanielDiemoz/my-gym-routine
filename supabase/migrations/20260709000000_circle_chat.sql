-- =============================================================================
-- Migration: Circle Chat
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabella "circle_messages"
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS circle_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id  UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE circle_messages ENABLE ROW LEVEL SECURITY;

-- Indice per ordinare i messaggi per cerchia
CREATE INDEX IF NOT EXISTS idx_circle_messages_circle_id_created_at
  ON circle_messages (circle_id, created_at ASC);

-- RLS: solo i membri della cerchia possono leggere i messaggi
CREATE POLICY "circle_messages_select" ON circle_messages
  FOR SELECT
  TO authenticated
  USING (
    circle_id IN (SELECT public.get_my_circle_ids())
  );

-- RLS: solo i membri possono inserire messaggi (e solo come sé stessi)
CREATE POLICY "circle_messages_insert" ON circle_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND circle_id IN (SELECT public.get_my_circle_ids())
  );

-- RLS: nessuno può modificare o eliminare messaggi (per ora)

-- ---------------------------------------------------------------------------
-- 2. Aggiungi last_read_at su circle_members per tenere traccia dei messaggi
--    letti/non letti per ogni membro
-- ---------------------------------------------------------------------------
ALTER TABLE circle_members
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------------
-- 3. RPC: conta messaggi non letti per una cerchia
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_unread_count(p_circle_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.circle_messages m
  WHERE m.circle_id = p_circle_id
    AND m.created_at > (
      SELECT COALESCE(cm.last_read_at, '1970-01-01'::TIMESTAMPTZ)
      FROM public.circle_members cm
      WHERE cm.circle_id = p_circle_id AND cm.user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_count TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPC: segna una cerchia come letta
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_circle_read(p_circle_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.circle_members
  SET last_read_at = now()
  WHERE circle_id = p_circle_id AND user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.mark_circle_read TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPC: ottieni i messaggi di una cerchia (con profilo autore)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_circle_messages(p_circle_id UUID)
RETURNS TABLE (
  id UUID,
  circle_id UUID,
  user_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT m.id, m.circle_id, m.user_id, m.content, m.created_at,
         p.display_name, p.avatar_url
  FROM public.circle_messages m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.circle_id = p_circle_id
  ORDER BY m.created_at ASC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.get_circle_messages TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. RPC: invia un messaggio
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_circle_message(p_circle_id UUID, p_content TEXT)
RETURNS TABLE (
  id UUID,
  circle_id UUID,
  user_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_id UUID;
BEGIN
  -- Verifica che l'utente sia membro della cerchia
  IF NOT EXISTS (
    SELECT 1 FROM public.circle_members cm
    WHERE cm.circle_id = p_circle_id AND cm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Non sei membro di questa cerchia';
  END IF;

  -- Inserisci il messaggio
  INSERT INTO public.circle_messages (circle_id, user_id, content)
  VALUES (p_circle_id, auth.uid(), p_content)
  RETURNING circle_messages.id INTO v_msg_id;

  -- Ritorna il messaggio appena creato con i dati del profilo
  RETURN QUERY
  SELECT m.id, m.circle_id, m.user_id, m.content, m.created_at,
         p.display_name, p.avatar_url
  FROM public.circle_messages m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.id = v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_circle_message TO authenticated;
