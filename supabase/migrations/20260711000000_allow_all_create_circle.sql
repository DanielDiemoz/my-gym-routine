-- =============================================================================
-- Migration: chiunque può creare una cerchia
--
-- PRIMA: la RPC `create_circle_as_coach` permetteva la creazione solo agli
--   utenti con role = 'coach'. I privilegi di gestione (elimina cerchia,
--   rimuovi membro, modifica nickname) erano già legati a owner_id, ovvero
--   a chi ha creato la cerchia.
--
-- ADESSO: la creazione è aperta a tutti gli utenti autenticati. Chi crea
--   diventa automaticamente owner_id e ottiene i privilegi di gestione.
--   Rinominiamo la funzione in `create_circle` per riflettere il nuovo
--   comportamento.
-- =============================================================================

-- Rimuove la vecchia RPC legata al coach.
DROP FUNCTION IF EXISTS public.create_circle_as_coach(TEXT);

-- -----------------------------------------------------------------------------
-- create_circle(circle_name TEXT)
--   Crea una nuova cerchia per l'utente corrente, in modo atomico:
--     - genera un codice univoco con N tentativi (controllo unicità
--       bypassando RLS, quindi non può "perdere" collisioni);
--     - inserisce la cerchia con owner_id = auth.uid();
--     - inserisce il creator come primo membro;
--     - ritorna la cerchia creata.
--   Accessibile a qualsiasi utente autenticato.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_circle(circle_name TEXT)
RETURNS public.circles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  -- Crea la cerchia. Il creator diventa owner e ottiene i privilegi di gestione.
  INSERT INTO public.circles (name, code, owner_id)
  VALUES (v_trimmed_name, v_code, auth.uid())
  RETURNING * INTO v_circle;

  -- Aggiunge il creator come primo membro.
  INSERT INTO public.circle_members (circle_id, user_id)
  VALUES (v_circle.id, auth.uid())
  ON CONFLICT (circle_id, user_id) DO NOTHING;

  RETURN v_circle;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_circle(TEXT) TO authenticated;
