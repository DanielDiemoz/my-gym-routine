-- Force-drop all circle-related policies and recreate them cleanly
-- This is a nuclear fix: drop everything and start fresh for RLS

-- Drop ALL policies on circle_members
DROP POLICY IF EXISTS "circle_members_select" ON public.circle_members;
DROP POLICY IF EXISTS "circle_members_insert" ON public.circle_members;
DROP POLICY IF EXISTS "circle_members_delete" ON public.circle_members;

-- Drop ALL policies on circles
DROP POLICY IF EXISTS "circles_select" ON public.circles;
DROP POLICY IF EXISTS "circles_insert" ON public.circles;
DROP POLICY IF EXISTS "circles_delete" ON public.circles;
DROP POLICY IF EXISTS "circles_update" ON public.circles;

-- Drop ALL policies on sessions that reference circle_members
DROP POLICY IF EXISTS "sessions_select" ON public.sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.sessions;

-- Recreate helper functions to ensure they're correct
CREATE OR REPLACE FUNCTION public.get_my_circle_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT circle_id
  FROM public.circle_members
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_circle_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_circle_member_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT cm.user_id
  FROM public.circle_members cm
  WHERE cm.circle_id IN (SELECT public.get_my_circle_ids());
$$;

GRANT EXECUTE ON FUNCTION public.get_my_circle_member_ids() TO authenticated;

-- Recreate circle_members policies (simple, no recursion)
CREATE POLICY "circle_members_select" ON public.circle_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "circle_members_insert" ON public.circle_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "circle_members_delete" ON public.circle_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR circle_id IN (SELECT id FROM circles WHERE owner_id = auth.uid())
  );

-- Recreate circles policies (simple, no recursion)
CREATE POLICY "circles_select" ON public.circles
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "circles_insert" ON public.circles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'coach'
  );

CREATE POLICY "circles_delete" ON public.circles
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "circles_update" ON public.circles
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- Recreate sessions_select with TO authenticated (so anon users don't evaluate it)
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.sessions;
CREATE POLICY "Users can manage their own sessions" ON public.sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "sessions_select" ON public.sessions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT public.get_my_circle_member_ids())
  );
