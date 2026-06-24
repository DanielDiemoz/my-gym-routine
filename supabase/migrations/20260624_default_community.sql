-- =============================================================================
-- Migration: Cerchia di default "GymBro Community"
-- Crea un profilo fittizio (il "coach bot" di GymBro) e una cerchia pubblica
-- già pronta a cui ogni utente può unirsi con un tap dalla pagina /cerchia.
-- =============================================================================

-- Profilo fittizio: usato come owner_id della cerchia di default.
-- id == user_id (entrambi 00000000-...-01) è voluto: il profilo non ha un
-- account auth.users associato, ma è valido per soddisfare la FK in circles.
INSERT INTO profiles (id, user_id, display_name, role, onboarded)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'GymBro',
  'coach',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Cerchia di default: codice corto 'GYMBRO' (6 caratteri, espresso a mano).
-- NOTA: 'O' è escluso dall'alfabeto di generate_circle_code(), ma qui stiamo
-- facendo un INSERT diretto — l'unicità del codice è garantita dalla UNIQUE
-- constraint su circles.code.
INSERT INTO circles (id, name, code, owner_id)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'GymBro Community',
  'GYMBRO',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- Verifica con:
--   SELECT * FROM circles WHERE code = 'GYMBRO';
--   SELECT * FROM circle_members WHERE circle_id = '00000000-0000-0000-0000-000000000002';
-- =============================================================================
