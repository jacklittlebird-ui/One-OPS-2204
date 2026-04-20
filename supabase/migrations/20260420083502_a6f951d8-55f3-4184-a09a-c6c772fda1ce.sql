DROP POLICY IF EXISTS "Admin can delete flight_schedules" ON public.flight_schedules;

CREATE POLICY "Authenticated can delete flight_schedules"
ON public.flight_schedules
FOR DELETE
TO authenticated
USING (true);