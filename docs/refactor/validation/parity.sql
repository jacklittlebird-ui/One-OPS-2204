-- Phase 4 parity validation queries. All four must return 0 rows before Phase 5.

-- 1) Operational/billing rows without a master link
SELECT 'dispatch_orphan' AS kind, count(*) AS n FROM public.dispatch_assignments WHERE flight_schedule_id IS NULL
UNION ALL
SELECT 'sr_orphan',               count(*)      FROM public.service_reports     WHERE flight_schedule_id IS NULL;

-- 2) Mirror drift on dispatch_assignments
SELECT count(*) AS dispatch_drift
FROM public.dispatch_assignments d
JOIN public.flight_schedules fs ON fs.id = d.flight_schedule_id
WHERE coalesce(d.task_sheet_data->>'registration','')  <> coalesce(fs.registration,'')
   OR coalesce(d.task_sheet_data->>'route','')         <> coalesce(fs.route,'')
   OR coalesce(d.task_sheet_data->>'aircraft_type','') <> coalesce(fs.aircraft_type,'')
   OR coalesce(d.task_sheet_data->>'sta','')           <> coalesce(fs.sta,'')
   OR coalesce(d.task_sheet_data->>'std','')           <> coalesce(fs.std,'');

-- 3) Mirror drift on service_reports
SELECT count(*) AS sr_drift
FROM public.service_reports s
JOIN public.flight_schedules fs ON fs.id = s.flight_schedule_id
WHERE coalesce(s.aircraft_type,'') <> coalesce(fs.aircraft_type,'')
   OR coalesce(s.flight_no,'')     <> coalesce(fs.flight_no,'')
   OR coalesce(s.registration,'')  <> coalesce(fs.registration,'')
   OR coalesce(s.route,'')         <> coalesce(fs.route,'');

-- 4) Finalized invoices must resolve to a flight_schedules row through their flight_ref
SELECT count(*) AS finalized_invoices_without_master
FROM public.invoices i
LEFT JOIN public.flight_schedules fs
  ON upper(trim(fs.flight_no)) = upper(trim(coalesce(i.flight_ref,'')))
WHERE coalesce(i.status::text,'') ILIKE 'finalized' AND fs.id IS NULL;
