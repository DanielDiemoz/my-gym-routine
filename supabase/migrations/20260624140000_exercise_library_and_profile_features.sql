-- Migration GymBro — 20260624 14:00
-- Bundle di 2 sotto-modifiche indipendenti:
--   1) exercise_library + exercises.exercise_library_id (Task 1: autocomplete)
--   2) profiles.weight_unit (Task 3: kg/lbs toggle)

-- ───────────────────────────────────────────────────────────────────────────
-- 1) exercise_library  (pubblica, lettura libera)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  name_search TSVECTOR
    GENERATED ALWAYS AS (to_tsvector('italian', name)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON public.exercise_library;
CREATE POLICY "public read" ON public.exercise_library
  FOR SELECT USING (true);

-- Indice GIN sul tsvector per query di ricerca efficienti.
CREATE INDEX IF NOT EXISTS exercise_library_name_search_idx
  ON public.exercise_library USING GIN (name_search);

-- Indice per ordinamento per nome.
CREATE INDEX IF NOT EXISTS exercise_library_name_trgm_idx
  ON public.exercise_library (lower(name));

-- Seed iniziale: ~50 esercizi comuni italiani (idempotente via ON CONFLICT).
INSERT INTO public.exercise_library (name, muscle_group) VALUES
  ('Panca piana', 'Petto'),
  ('Panca inclinata', 'Petto'),
  ('Panca declinata', 'Petto'),
  ('Croci con manubri', 'Petto'),
  ('Croci ai cavi', 'Petto'),
  ('Chest fly macchina', 'Petto'),
  ('Pullover', 'Petto'),
  ('Trazioni presa prona', 'Schiena'),
  ('Trazioni presa supina', 'Schiena'),
  ('Trazioni presa neutra', 'Schiena'),
  ('Rematore bilanciere', 'Schiena'),
  ('Rematore manubrio', 'Schiena'),
  ('Rematore cavo basso', 'Schiena'),
  ('Lat machine avanti', 'Schiena'),
  ('Pulldown presa stretta', 'Schiena'),
  ('Stacco da terra', 'Schiena'),
  ('Good morning', 'Schiena'),
  ('Squat', 'Gambe'),
  ('Front squat', 'Gambe'),
  ('Leg press', 'Gambe'),
  ('Leg extension', 'Gambe'),
  ('Leg curl', 'Gambe'),
  ('Affondi', 'Gambe'),
  ('Affondi camminata', 'Gambe'),
  ('Stacco rumeno', 'Gambe'),
  ('Hip thrust', 'Glutei'),
  ('Glute bridge', 'Glutei'),
  ('Abductor machine', 'Glutei'),
  ('Lento avanti', 'Spalle'),
  ('Lento dietro', 'Spalle'),
  ('Shoulder press manubri', 'Spalle'),
  ('Alzate laterali', 'Spalle'),
  ('Alzate frontali', 'Spalle'),
  ('Alzate posteriori', 'Spalle'),
  ('Tirate al mento', 'Spalle'),
  ('Curl bilanciere', 'Braccia'),
  ('Curl manubri', 'Braccia'),
  ('Curl inclinato', 'Braccia'),
  ('Curl cavo', 'Braccia'),
  ('Hammer curl', 'Braccia'),
  ('French press', 'Braccia'),
  ('Push down cavo', 'Braccia'),
  ('Push down cavo corda', 'Braccia'),
  ('Skull crusher', 'Braccia'),
  ('Dip', 'Braccia'),
  ('Plank', 'Core'),
  ('Crunch', 'Core'),
  ('Russian twist', 'Core'),
  ('Leg raise', 'Core'),
  ('Dead bug', 'Core'),
  ('Cable crunch', 'Core'),
  ('Burpees', 'Altro')
ON CONFLICT DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- 1.bis) exercise_library_id nullable su exercises
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS exercise_library_id UUID
    REFERENCES public.exercise_library(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS exercises_exercise_library_id_idx
  ON public.exercises (exercise_library_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 2) profiles.weight_unit
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg' NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_weight_unit_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_weight_unit_check
        CHECK (weight_unit IN ('kg', 'lbs'));
  END IF;
END $$;
