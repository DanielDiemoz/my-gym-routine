-- Aggiunge obiettivo settimanale allenamenti al profilo utente GymBro.
-- Default 3 per retrofit dei record esistenti.
-- Aggiungere NOT NULL insieme al DEFAULT: la colonna risulta NOT NULL subito dopo l'ALTER.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_goal INTEGER DEFAULT 3 NOT NULL;

-- Vincolo CHECK per evitare valori fuori range (1-7 allenamenti/settimana).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_weekly_goal_range'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_weekly_goal_range CHECK (weekly_goal BETWEEN 1 AND 7);
  END IF;
END $$;
