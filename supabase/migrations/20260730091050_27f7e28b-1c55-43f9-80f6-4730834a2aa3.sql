DROP INDEX IF EXISTS public.idx_invoices_flight_ref;
CREATE INDEX idx_invoices_flight_ref ON public.invoices USING btree (left(flight_ref, 200)) WHERE flight_ref IS NOT NULL;