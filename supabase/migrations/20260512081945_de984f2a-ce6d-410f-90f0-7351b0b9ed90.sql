UPDATE public.dispatch_assignments
SET review_status = 'Pending Review',
    reviewed_by = '',
    reviewed_at = NULL
WHERE flight_date IN ('2026-05-10','2026-05-11')
  AND review_status = 'Approved';