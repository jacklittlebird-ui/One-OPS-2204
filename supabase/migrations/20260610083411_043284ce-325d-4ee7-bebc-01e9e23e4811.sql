-- Normalize dispatch_assignments.review_status
UPDATE public.dispatch_assignments SET review_status = 'Approved'         WHERE review_status ILIKE 'approved';
UPDATE public.dispatch_assignments SET review_status = 'Rejected'         WHERE review_status ILIKE 'rejected';
UPDATE public.dispatch_assignments SET review_status = 'Modified'         WHERE review_status ILIKE 'modified';
UPDATE public.dispatch_assignments SET review_status = 'Draft'            WHERE review_status ILIKE 'draft';
UPDATE public.dispatch_assignments SET review_status = 'Pending Review'   WHERE review_status ILIKE 'pending review';
UPDATE public.dispatch_assignments SET review_status = 'Ready for Billing' WHERE review_status ILIKE 'ready for billing' OR review_status ILIKE 'ready_for_billing';

-- Normalize service_reports.review_status
UPDATE public.service_reports SET review_status = 'Approved'         WHERE review_status ILIKE 'approved';
UPDATE public.service_reports SET review_status = 'Rejected'         WHERE review_status ILIKE 'rejected';
UPDATE public.service_reports SET review_status = 'Modified'         WHERE review_status ILIKE 'modified';
UPDATE public.service_reports SET review_status = 'Draft'            WHERE review_status ILIKE 'draft';
UPDATE public.service_reports SET review_status = 'Pending Review'   WHERE review_status ILIKE 'pending review' OR review_status ILIKE 'pending';
UPDATE public.service_reports SET review_status = 'Ready for Billing' WHERE review_status ILIKE 'ready for billing' OR review_status ILIKE 'ready_for_billing';

-- Enforce canonical values going forward (allow empty for legacy/optional rows).
ALTER TABLE public.dispatch_assignments DROP CONSTRAINT IF EXISTS dispatch_review_status_canonical;
ALTER TABLE public.dispatch_assignments ADD CONSTRAINT dispatch_review_status_canonical
  CHECK (review_status IS NULL OR review_status IN ('', 'Draft','Pending Review','Approved','Modified','Rejected','Ready for Billing'));

ALTER TABLE public.service_reports DROP CONSTRAINT IF EXISTS service_reports_review_status_canonical;
ALTER TABLE public.service_reports ADD CONSTRAINT service_reports_review_status_canonical
  CHECK (review_status IS NULL OR review_status IN ('', 'Draft','Pending Review','Approved','Modified','Rejected','Ready for Billing'));