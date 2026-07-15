-- Down: annulla migration 20260715000000_muscle_frequency_and_pr
-- (riporta il DB allo stato precedente, identico all'ultimo commit)
--
-- DA ESEGUIRE in Supabase SQL Editor. Usa IF EXISTS, quindi è sicuro
-- anche se qualche oggetto è già stato rimosso.

DROP TABLE IF EXISTS public.personal_records;
DROP TABLE IF EXISTS public.exercise_muscle_targets;

DROP FUNCTION IF EXISTS public.enforce_target_weight_sum();
DROP FUNCTION IF EXISTS public.upsert_pr(
  p_user_id UUID,
  p_exercise_name TEXT,
  p_record_type TEXT,
  p_value NUMERIC,
  p_reference_weight NUMERIC,
  p_source_session_id UUID,
  p_source_set_id UUID,
  p_achieved_at TIMESTAMPTZ
);

ALTER TABLE public.session_logs DROP COLUMN IF EXISTS exercise_library_id;
ALTER TABLE public.session_logs DROP COLUMN IF EXISTS unit;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS timezone;
