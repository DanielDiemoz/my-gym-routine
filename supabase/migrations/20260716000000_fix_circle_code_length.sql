-- =============================================================================
-- Migration: fix generate_circle_code off-by-one + repair existing codes
--
-- BUG: generate_circle_code() used
--   substr(alphabet, (random() * length(alphabet))::INT + 1, 1)
-- With a 32-char alphabet (indices 1..32), `random()*32` ∈ [0,32), so `+1`
-- gives [1,33]. When the value is 33, substr(...,33,1) returns '' → the
-- 6-iteration loop sometimes appends only 5 characters. The client requires
-- exactly 6 chars, so a 5-char code can never be joined
-- ("il codice deve essere composto da 6 caratteri").
--
-- FIX: keep the index within 1..length(alphabet) using
--   1 + (random() * (length(alphabet) - 1))::INT
-- which yields 1..32 reliably.
--
-- Also repair any rows already created with a code whose length ≠ 6.
-- =============================================================================

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
    code := code || substr(alphabet, 1 + (random() * (length(alphabet) - 1))::INT, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- -----------------------------------------------------------------------------
-- Repair pre-existing circles whose code is not exactly 6 characters.
-- Uses the now-fixed generator with collision-safe retries. Codes are
-- normalized to uppercase first (defensive), then any still-invalid length
-- is regenerated.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_code TEXT;
  v_collision BOOLEAN;
  v_attempt INT;
  updated INT := 0;
BEGIN
  FOR r IN
    SELECT id, code FROM public.circles
    WHERE char_length(upper(trim(code))) <> 6
       OR code IS DISTINCT FROM upper(trim(code))
  LOOP
    v_attempt := 0;
    LOOP
      v_attempt := v_attempt + 1;
      v_code := public.generate_circle_code();
      SELECT EXISTS(
        SELECT 1 FROM public.circles WHERE code = v_code AND id IS DISTINCT FROM r.id
      ) INTO v_collision;
      EXIT WHEN NOT v_collision;
      IF v_attempt >= 20 THEN
        RAISE EXCEPTION 'Impossibile rigenerare un codice univoco per la cerchia %', r.id;
      END IF;
    END LOOP;

    UPDATE public.circles SET code = v_code WHERE id = r.id;
    updated := updated + 1;
  END LOOP;

  RAISE NOTICE 'generate_circle_code fix: riparate % cerchie con codice non valido.', updated;
END;
$$;
