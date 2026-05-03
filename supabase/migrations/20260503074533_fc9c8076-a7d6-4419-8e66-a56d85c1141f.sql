
DROP POLICY IF EXISTS "Authenticated users can update overfly" ON public.overfly_schedules;
DROP POLICY IF EXISTS "Authenticated users can insert overfly" ON public.overfly_schedules;
DROP POLICY IF EXISTS "Authenticated users can delete delays" ON public.service_report_delays;
DROP POLICY IF EXISTS "Authenticated users can insert delays" ON public.service_report_delays;
DROP POLICY IF EXISTS "Authenticated users can update delays" ON public.service_report_delays;
DROP POLICY IF EXISTS "Authenticated users can insert reports" ON public.service_reports;
DROP POLICY IF EXISTS "Authenticated users can update reports" ON public.service_reports;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Admin can insert system notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
