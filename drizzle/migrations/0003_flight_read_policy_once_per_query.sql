ALTER POLICY "Internal staff can read flight_schedules" ON public.flight_schedules
  USING ((SELECT public.has_internal_access((SELECT auth.uid()))));