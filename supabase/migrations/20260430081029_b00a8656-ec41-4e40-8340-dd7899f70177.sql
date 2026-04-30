DELETE FROM public.dispatch_assignments
WHERE flight_date BETWEEN '2026-04-19' AND '2026-04-23'
  AND LOWER(COALESCE(service_type,'')) LIKE '%security%';