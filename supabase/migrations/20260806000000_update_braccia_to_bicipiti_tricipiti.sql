-- Migration: Update "Braccia" muscle_group to specific "Bicipiti" or "Tricipiti"
-- based on exercise name patterns

-- Update exercises table
-- Bicipiti patterns: curl (any variation)
UPDATE public.exercises
SET muscle_group = 'Bicipiti'
WHERE muscle_group = 'Braccia'
  AND (
    LOWER(name) LIKE '%curl%'
    OR LOWER(name) LIKE '%bicipiti%'
  );

-- Tricipiti patterns: french press, push down, skull crusher, dip, parallele, estensioni, tricipiti
UPDATE public.exercises
SET muscle_group = 'Tricipiti'
WHERE muscle_group = 'Braccia'
  AND (
    LOWER(name) LIKE '%french press%'
    OR LOWER(name) LIKE '%push down%'
    OR LOWER(name) LIKE '%pushdown%'
    OR LOWER(name) LIKE '%skull crusher%'
    OR LOWER(name) LIKE '%dip%'
    OR LOWER(name) LIKE '%parallele%'
    OR LOWER(name) LIKE '%estensioni%'
    OR LOWER(name) LIKE '%tricipiti%'
    OR LOWER(name) LIKE '%overhead%extension%'
  );

-- Update session_logs table (same logic)
-- Bicipiti patterns
UPDATE public.session_logs
SET muscle_group = 'Bicipiti'
WHERE muscle_group = 'Braccia'
  AND (
    LOWER(exercise_name) LIKE '%curl%'
    OR LOWER(exercise_name) LIKE '%bicipiti%'
  );

-- Tricipiti patterns
UPDATE public.session_logs
SET muscle_group = 'Tricipiti'
WHERE muscle_group = 'Braccia'
  AND (
    LOWER(exercise_name) LIKE '%french press%'
    OR LOWER(exercise_name) LIKE '%push down%'
    OR LOWER(exercise_name) LIKE '%pushdown%'
    OR LOWER(exercise_name) LIKE '%skull crusher%'
    OR LOWER(exercise_name) LIKE '%dip%'
    OR LOWER(exercise_name) LIKE '%parallele%'
    OR LOWER(exercise_name) LIKE '%estensioni%'
    OR LOWER(exercise_name) LIKE '%tricipiti%'
    OR LOWER(exercise_name) LIKE '%overhead%extension%'
  );

-- Update exercise_library table (if any still have "Braccia")
-- Bicipiti patterns
UPDATE public.exercise_library
SET muscle_group = 'Bicipiti'
WHERE muscle_group = 'Braccia'
  AND (
    LOWER(name) LIKE '%curl%'
    OR LOWER(name) LIKE '%bicipiti%'
  );

-- Tricipiti patterns
UPDATE public.exercise_library
SET muscle_group = 'Tricipiti'
WHERE muscle_group = 'Braccia'
  AND (
    LOWER(name) LIKE '%french press%'
    OR LOWER(name) LIKE '%push down%'
    OR LOWER(name) LIKE '%pushdown%'
    OR LOWER(name) LIKE '%skull crusher%'
    OR LOWER(name) LIKE '%dip%'
    OR LOWER(name) LIKE '%parallele%'
    OR LOWER(name) LIKE '%estensioni%'
    OR LOWER(name) LIKE '%tricipiti%'
    OR LOWER(name) LIKE '%overhead%extension%'
  );
