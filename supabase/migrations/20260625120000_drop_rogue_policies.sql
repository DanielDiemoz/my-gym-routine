-- Drop rogue policies that were created manually (missing "circle_" prefix)
-- These were never caught by our DROP POLICY IF EXISTS statements
DROP POLICY IF EXISTS "members_select" ON public.circle_members;
DROP POLICY IF EXISTS "members_insert" ON public.circle_members;
DROP POLICY IF EXISTS "members_delete" ON public.circle_members;
