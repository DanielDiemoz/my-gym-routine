-- =============================================================================
-- Migration: Rimuove la cerchia di default "GymBro Community"
--
-- Elimina i dati della community di default (profili fittizi, cerchia e
-- relative membership) che non sono più desiderati.
-- =============================================================================

-- 1. Rimuovi tutti i membri della cerchia di default
DELETE FROM public.circle_members
WHERE circle_id = '00000000-0000-0000-0000-000000000002';

-- 2. Rimuovi la cerchia di default
DELETE FROM public.circles
WHERE id = '00000000-0000-0000-0000-000000000002';

-- 3. Rimuovi il profilo fittizio del bot GymBro (se esiste)
DELETE FROM public.profiles
WHERE id = '00000000-0000-0000-0000-000000000001';

-- =============================================================================
-- Verifica con:
--   SELECT * FROM circles WHERE code = 'GYMBRO';
--   SELECT * FROM circle_members WHERE circle_id = '00000000-0000-0000-0000-000000000002';
-- =============================================================================
