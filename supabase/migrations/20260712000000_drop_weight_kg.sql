-- Drop weight_kg column from profiles: no longer used (calorie estimation removed)
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS weight_kg;
