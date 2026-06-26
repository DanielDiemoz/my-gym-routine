-- The previous migration (20260625130000) rewrote session_logs_select with an
-- inline subquery on circle_members. But circle_members has RLS restricted to
-- user_id = auth.uid(), so the subquery returns only the current user instead
-- of all circle members. Use get_my_circle_member_ids() (SECURITY DEFINER)
-- instead, which bypasses RLS.

DROP POLICY IF EXISTS "session_logs_select" ON public.session_logs;
CREATE POLICY "session_logs_select" ON public.session_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT public.get_my_circle_member_ids())
  );
