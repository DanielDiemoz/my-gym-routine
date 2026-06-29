-- Add weight_kg column to profiles for calorie estimation
ALTER TABLE public.profiles
  ADD COLUMN weight_kg NUMERIC(5,1);
