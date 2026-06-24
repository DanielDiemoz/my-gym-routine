-- Fix session_logs_select to only apply to authenticated users
-- (it was public due to not having TO authenticated in original migration)
DROP POLICY IF EXISTS "session_logs_select" ON public.session_logs;
CREATE POLICY "session_logs_select" ON public.session_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT cm.user_id
      FROM public.circle_members cm
      WHERE cm.circle_id IN (SELECT public.get_my_circle_ids())
    )
  );

-- Drop diagnostic function (not needed in production)
DROP FUNCTION IF EXISTS public.diagnose_rls;
