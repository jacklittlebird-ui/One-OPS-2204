CREATE TABLE public.invoice_number_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  old_invoice_no text,
  new_invoice_no text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_number_history_invoice ON public.invoice_number_history (invoice_id, changed_at DESC);

GRANT SELECT ON public.invoice_number_history TO authenticated;
GRANT ALL ON public.invoice_number_history TO service_role;

ALTER TABLE public.invoice_number_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can read invoice number history"
ON public.invoice_number_history FOR SELECT TO authenticated
USING (public.has_finance_access(auth.uid()) OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_invoice_no_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_no IS DISTINCT FROM OLD.invoice_no THEN
    INSERT INTO public.invoice_number_history (invoice_id, old_invoice_no, new_invoice_no, changed_by)
    VALUES (NEW.id, OLD.invoice_no, NEW.invoice_no, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_invoice_no_change() FROM PUBLIC;

CREATE TRIGGER trg_log_invoice_no_change
AFTER UPDATE OF invoice_no ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.log_invoice_no_change();