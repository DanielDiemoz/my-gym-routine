-- =============================================================================
-- Migration: Fix bug Cerchie (join + create) tramite RPC server-side
--
-- PROBLEMI RISOLTI:
--   1. "Entra nella community" falliva perché la policy `circles_select`
--      permette di leggere una cerchia solo a chi è GIÀ owner o membro.
--      Un utente non ancora iscritto non può SELECT-by-code → errore
--      "Codice non trovato" anche se il codice è valido.
--   2. "Crea cerchia" lato client aveva due criticità:
--        a) il check di unicità del codice (`SELECT id FROM circles WHERE
--           code = ?`) subiva la stessa RLS → poteva nascondere collisioni
--           reali con cerchie altrui, portando a INSERT con UNIQUE violation;
--        b) tre roundtrip RPC + INSERT + INSERT senza atomicità, quindi
--           errori inconsistenti in caso di failure parziale.
--
-- FIX: due nuove SECURITY DEFINER function lato DB che eseguono in modalità
-- atomica e bypassano le policy RLS (la logica "puoi/devi?" resta centrale
-- nella funzione stessa, non nelle policy).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. join_circle_by_code(code TEXT)
--    Consente a un utente autenticato di unirsi a una cerchia dato il codice.
--    Bypassa circles_select (che blocca i non-membri) perché SECURITY DEFINER.
--    È idempotente: un utente già membro non genera errori.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_circle_by_code(invite_code TEXT)
RETURNS UUID  -- id della cerchia a cui ci si è uniti
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circle_id UUID;
BEGIN
  -- Cerca la cerchia per codice (normalizzato come sul client).
  -- Le SECURITY DEFINER function girano come owner del DB, quindi vedono
  -- tutte le righe di `circles` indipendentemente da circles_select.
  SELECT id INTO v_circle_id
  FROM public.circles
  WHERE code = upper(trim(invite_code))
  LIMIT 1;

  IF v_circle_id IS NULL THEN
    RAISE EXCEPTION 'Codice non trovato. Controlla e riprova.';
  END IF;

  -- Inserisce il membro corrente. ON CONFLICT rende l'operazione idempotente.
  INSERT INTO public.circle_members (circle_id, user_id)
  VALUES (v_circle_id, auth.uid())
  ON CONFLICT (circle_id, user_id) DO NOTHING;

  RETURN v_circle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_circle_by_code(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. create_circle_as_coach(circle_name TEXT)
--    Crea una nuova cerchia per il coach corrente, in modo atomico:
--      - verifica ruolo coach lato DB (anche le policy RLS lo fanno,
--        ma qui è una validazione "sicura" perché SECURITY DEFINER);
--      - genera un codice univoco con N tentativi (controllo unicità
--        bypassando RLS, quindi non può "perdere" collisioni);
--      - inserisce la cerchia;
--      - inserisce il creator come primo membro;
--      - ritorna la cerchia creata.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_circle_as_coach(circle_name TEXT)
RETURNS public.circles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_trimmed_name TEXT;
  v_code TEXT;
  v_collision BOOLEAN;
  v_attempt INT := 0;
  v_circle public.circles;
BEGIN
  -- Validazione nome obbligatorio, anche se il client già filtra gli input.
  v_trimmed_name := trim(coalesce(circle_name, ''));
  IF v_trimmed_name = '' THEN
    RAISE EXCEPTION 'Il nome della cerchia non può essere vuoto.';
  END IF;

  -- Validazione: solo i coach possono creare cerchie.
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_user_role IS DISTINCT FROM 'coach' THEN
    RAISE EXCEPTION 'Solo i coach possono creare cerchie.';
  END IF;

  -- Genera codice univoco (max 5 tentativi, dimensione alfabeto ~32^6).
  LOOP
    v_attempt := v_attempt + 1;
    v_code := public.generate_circle_code();
    SELECT EXISTS(
      SELECT 1 FROM public.circles WHERE code = v_code
    ) INTO v_collision;
    EXIT WHEN NOT v_collision;
    IF v_attempt >= 5 THEN
      RAISE EXCEPTION 'Impossibile generare un codice univoco, riprova.';
    END IF;
  END LOOP;

  -- Crea la cerchia.
  INSERT INTO public.circles (name, code, owner_id)
  VALUES (v_trimmed_name, v_code, auth.uid())
  RETURNING * INTO v_circle;

  -- Aggiunge il coach come primo membro.
  INSERT INTO public.circle_members (circle_id, user_id)
  VALUES (v_circle.id, auth.uid())
  ON CONFLICT (circle_id, user_id) DO NOTHING;

  RETURN v_circle;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_circle_as_coach(TEXT) TO authenticated;

-- =============================================================================
-- Verifica con:
--   SELECT public.join_circle_by_code('GYMBRO');     -- restituisce un UUID
--   SELECT * FROM public.create_circle_as_coach('Test Circle');
-- =============================================================================
