-- =============================================================================
-- Migration: Admin notifications and direct messages
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'system', 'announcement')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.notification_dismissals (
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON public.notification_reads(user_id, notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_dismissals_user ON public.notification_dismissals(user_id, notification_id);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Policies per notifications
DROP POLICY IF EXISTS "Users and admins can view notifications" ON public.notifications;
CREATE POLICY "Users and admins can view notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    public.check_is_admin(auth.uid())
    OR (
      (user_id = auth.uid() OR user_id IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_dismissals nd
        WHERE nd.notification_id = public.notifications.id
        AND nd.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.check_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users and admins can update notifications" ON public.notifications;
CREATE POLICY "Users and admins can update notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    public.check_is_admin(auth.uid()) OR user_id = auth.uid()
  )
  WITH CHECK (
    public.check_is_admin(auth.uid()) OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users and admins can delete notifications" ON public.notifications;
CREATE POLICY "Users and admins can delete notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (
    public.check_is_admin(auth.uid()) OR user_id = auth.uid()
  );

-- Policies per notification_reads
DROP POLICY IF EXISTS "Users and admins can view notification reads" ON public.notification_reads;
CREATE POLICY "Users and admins can view notification reads"
  ON public.notification_reads
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR public.check_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own notification reads" ON public.notification_reads;
CREATE POLICY "Users can insert own notification reads"
  ON public.notification_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- Policies per notification_dismissals
DROP POLICY IF EXISTS "Users and admins can view notification dismissals" ON public.notification_dismissals;
CREATE POLICY "Users and admins can view notification dismissals"
  ON public.notification_dismissals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR public.check_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own notification dismissals" ON public.notification_dismissals;
CREATE POLICY "Users can insert own notification dismissals"
  ON public.notification_dismissals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );
