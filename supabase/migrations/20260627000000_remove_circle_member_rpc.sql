-- =============================================================================
-- Migration: RPC remove_circle_member — rimuove un membro da una cerchia
--
-- PROBLEMA:
--   La rimozione di un membro usava un DELETE diretto su circle_members
--   attraverso il client Supabase, passando da RLS. Nonostante la policy
--   circle_members_delete sembrasse corretta, in alcuni casi il DELETE
--   non aveva effetto (nessun errore ma 0 righe cancellate), probabilmente
--   per come RLS valuta la subquery.
--
-- SOLUZIONE:
--   RPC SECURITY DEFINER che bypassa RLS e cancella il membro atomicamente.
--   Consistente con le altre operazioni sulle cerchie che usano già RPC
--   (join_circle_by_code, create_circle_as_coach, get_circle_members, etc.).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.remove_circle_member(
  p_circle_id UUID,
  p_member_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica che il chiamante sia l'owner della cerchia
  IF NOT EXISTS (
    SELECT 1 FROM public.circles
    WHERE id = p_circle_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Solo il proprietario della cerchia può rimuovere membri.'
      USING HINT = 'verify_owner';
  END IF;

  -- Verifica che il membro esista nella cerchia
  IF NOT EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = p_circle_id AND user_id = p_member_id
  ) THEN
    RAISE EXCEPTION 'L''utente non è membro di questa cerchia.'
      USING HINT = 'not_member';
  END IF;

  -- Impedisce la rimozione del proprietario
  IF p_member_id = auth.uid() THEN
    RAISE EXCEPTION 'Non puoi rimuovere te stesso dalla cerchia. Usa "Esci" se vuoi uscire.'
      USING HINT = 'cannot_remove_self';
  END IF;

  DELETE FROM public.circle_members
  WHERE circle_id = p_circle_id AND user_id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_circle_member(UUID, UUID) TO authenticated;
