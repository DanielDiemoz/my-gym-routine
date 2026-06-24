-- Create a diagnostic function to check current policies
CREATE OR REPLACE FUNCTION public.diagnose_rls()
RETURNS TABLE (
  tablename text,
  policyname text,
  cmd text,
  roles text,
  definition text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    schemaname || '.' || tablename,
    policyname,
    cmd,
    roles::text,
    qual
  FROM pg_policies
  WHERE tablename IN ('circle_members', 'circles', 'sessions', 'session_logs')
  ORDER BY tablename, policyname;
$$;

GRANT EXECUTE ON FUNCTION public.diagnose_rls() TO authenticated;
