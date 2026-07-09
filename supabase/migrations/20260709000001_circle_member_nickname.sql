-- =============================================================================
-- Migration: Circle Member Nickname
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Colonna nickname su circle_members
-- ---------------------------------------------------------------------------
ALTER TABLE circle_members
  ADD COLUMN IF NOT EXISTS nickname TEXT;

-- ---------------------------------------------------------------------------
-- 2. RPC: aggiorna nickname di un membro (solo owner della cerchia)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_circle_member_nickname(
  p_circle_id UUID,
  p_member_id UUID,
  p_nickname TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica che l'utente chiamante sia l'owner della cerchia
  IF NOT EXISTS (
    SELECT 1 FROM public.circles
    WHERE id = p_circle_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Solo il creatore della cerchia può modificare i nickname';
  END IF;

  -- Aggiorna o rimuovi il nickname (stringa vuota → NULL)
  UPDATE public.circle_members
  SET nickname = NULLIF(TRIM(p_nickname), '')
  WHERE circle_id = p_circle_id AND user_id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_circle_member_nickname TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC: ottieni membri di una cerchia con nickname
-- ---------------------------------------------------------------------------
-- Sostituisce la precedente get_circle_members per includere il nickname.
DROP FUNCTION IF EXISTS public.get_circle_members(p_circle_id UUID);
CREATE FUNCTION public.get_circle_members(p_circle_id UUID)
RETURNS TABLE (user_id UUID, nickname TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT cm.user_id, cm.nickname
  FROM public.circle_members cm
  WHERE cm.circle_id = p_circle_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_circle_members TO authenticated;
