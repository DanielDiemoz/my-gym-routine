ALTER TABLE public.sessions ADD COLUMN workout_state JSONB;

CREATE POLICY "Users can read own session workout_state"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own session workout_state"
  ON public.sessions
  FOR UPDATE
  USING (auth.uid() = user_id);
