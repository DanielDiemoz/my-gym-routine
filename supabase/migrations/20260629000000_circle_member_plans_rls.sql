-- Allow circle members to view each other's plans and exercises
-- (same pattern used for sessions and session_logs)

CREATE POLICY "Circle members can view plans" ON public.plans FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (
    SELECT cm.user_id FROM public.circle_members cm
    WHERE cm.circle_id IN (SELECT public.get_my_circle_ids())
  )
);

CREATE POLICY "Circle members can view exercises" ON public.exercises FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (
    SELECT cm.user_id FROM public.circle_members cm
    WHERE cm.circle_id IN (SELECT public.get_my_circle_ids())
  )
);
