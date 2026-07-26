-- Esegui questo nel SQL Editor di Supabase per completare il setup admin

-- 1. Aggiungi 'admin' al CHECK constraint della colonna role
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'coach', 'admin'));

-- 2. Imposta il tuo profilo come admin
UPDATE profiles SET role = 'admin' WHERE id = '2fa435ea-d6ea-4c6d-a6cb-f4361625394c';
