-- =============================================================================
-- Migration: Remove Circle Chat (rollback di 20260709000000_circle_chat)
-- =============================================================================

-- 1. Drop RPCs (devono essere dropate prima delle tabelle/funzioni dipendenti)
DROP FUNCTION IF EXISTS public.send_circle_message;
DROP FUNCTION IF EXISTS public.get_circle_messages;
DROP FUNCTION IF EXISTS public.mark_circle_read;
DROP FUNCTION IF EXISTS public.get_unread_count;

-- 2. Rimuovi colonna last_read_at da circle_members
ALTER TABLE circle_members DROP COLUMN IF EXISTS last_read_at;

-- 3. Drop tabella circle_messages (cascade elimina indici e policy RLS)
DROP TABLE IF EXISTS circle_messages;
