-- Drop the old FOR ALL policy that was never properly removed.
-- Migrations tried to drop "Users can view their own session logs"
-- but the actual policy name was "Users can manage their own session logs".
DROP POLICY IF EXISTS "Users can manage their own session logs" ON public.session_logs;

-- Add explicit INSERT policy (was previously covered by the FOR ALL policy).
CREATE POLICY "session_logs_insert" ON public.session_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
