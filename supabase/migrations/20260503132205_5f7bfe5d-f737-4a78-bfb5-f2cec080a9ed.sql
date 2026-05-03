UPDATE invoices
SET invoice_no = invoice_no || '-SEC',
    description = 'Security — ' || description,
    notes = 'Security ' || COALESCE(notes, '')
WHERE status = 'Draft'
  AND invoice_no NOT LIKE '%-SEC%'
  AND notes ILIKE '%dispatch%'
  AND notes ILIKE '%0 service-report%';