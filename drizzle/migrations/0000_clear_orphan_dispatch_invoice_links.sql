ALTER TABLE public.dispatch_assignments
  DROP CONSTRAINT IF EXISTS dispatch_assignments_invoice_id_fkey;

ALTER TABLE public.dispatch_assignments DISABLE TRIGGER trg_protect_invoiced_dispatch;
ALTER TABLE public.dispatch_assignments DISABLE TRIGGER trg_protect_ops_approved_dispatch;

UPDATE public.dispatch_assignments d
SET invoice_id = NULL
WHERE d.invoice_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = d.invoice_id);

ALTER TABLE public.dispatch_assignments ENABLE TRIGGER trg_protect_invoiced_dispatch;
ALTER TABLE public.dispatch_assignments ENABLE TRIGGER trg_protect_ops_approved_dispatch;

ALTER TABLE public.dispatch_assignments
  ADD CONSTRAINT dispatch_assignments_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;