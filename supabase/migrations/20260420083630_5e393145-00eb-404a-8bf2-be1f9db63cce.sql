DROP POLICY IF EXISTS "Authenticated can delete flight_schedules" ON public.flight_schedules;
DROP POLICY IF EXISTS "Admin can delete flight_schedules" ON public.flight_schedules;

CREATE POLICY "Admin and clearance can delete flight_schedules"
ON public.flight_schedules
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'clearance'::app_role)
);