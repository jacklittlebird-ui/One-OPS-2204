-- Phase 3B Step 2.3: Final schema cleanup — drop FS-mirror columns from service_reports
-- Atomic: snapshot + drop in a single transaction.

BEGIN;

-- 1. Rollback snapshot
DROP TABLE IF EXISTS public.snapshot_service_reports_pre_phase3b_step2_3;
CREATE TABLE public.snapshot_service_reports_pre_phase3b_step2_3 AS
  TABLE public.service_reports;

-- 2. Drop the five mirror columns
ALTER TABLE public.service_reports
  DROP COLUMN IF EXISTS flight_no,
  DROP COLUMN IF EXISTS station,
  DROP COLUMN IF EXISTS aircraft_type,
  DROP COLUMN IF EXISTS registration,
  DROP COLUMN IF EXISTS route;

COMMIT;