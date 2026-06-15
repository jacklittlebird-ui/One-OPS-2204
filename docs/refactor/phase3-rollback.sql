-- ─────────────────────────────────────────────────────────────────────────
-- Phase 3 ROLLBACK SCRIPT (do NOT run unless Phase 3 cleanup is being reverted)
--
-- Restores dispatch_assignments, service_reports, and flight_schedules to
-- the exact state captured in the Phase 3 pre-cleanup snapshots.
--
-- Snapshots:
--   public.snapshot_flight_schedules_pre_phase3
--   public.snapshot_dispatch_assignments_pre_phase3
--   public.snapshot_service_reports_pre_phase3
--
-- Strategy: TRUNCATE + INSERT, wrapped in a single transaction. Foreign
-- key constraints are deferred for the swap. Triggers are temporarily
-- disabled so the snapshot writes don't fan out through the sync triggers
-- (which would either be re-created earlier in this script or are already
-- back in place if rollback follows a partial Phase 3).
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

SET CONSTRAINTS ALL DEFERRED;

-- 1. Quiet the sync triggers for the duration of the restore.
ALTER TABLE public.flight_schedules     DISABLE TRIGGER USER;
ALTER TABLE public.dispatch_assignments DISABLE TRIGGER USER;
ALTER TABLE public.service_reports      DISABLE TRIGGER USER;

-- 2. Restore service_reports (child of dispatch + flight_schedules).
TRUNCATE public.service_reports;
INSERT INTO public.service_reports
  SELECT * FROM public.snapshot_service_reports_pre_phase3;

-- 3. Restore dispatch_assignments.
TRUNCATE public.dispatch_assignments;
INSERT INTO public.dispatch_assignments
  SELECT * FROM public.snapshot_dispatch_assignments_pre_phase3;

-- 4. Restore flight_schedules.
TRUNCATE public.flight_schedules;
INSERT INTO public.flight_schedules
  SELECT * FROM public.snapshot_flight_schedules_pre_phase3;

-- 5. Re-enable triggers.
ALTER TABLE public.flight_schedules     ENABLE TRIGGER USER;
ALTER TABLE public.dispatch_assignments ENABLE TRIGGER USER;
ALTER TABLE public.service_reports      ENABLE TRIGGER USER;

-- 6. Audit
INSERT INTO public.migration_audit_log
  (entity_name, record_id, column_name, action, new_value)
VALUES ('phase3_rollback', NULL, 'restore_from_snapshot', 'phase3_rollback_executed',
        jsonb_build_object('restored_at', now()));

COMMIT;

-- POST-ROLLBACK VERIFICATION (run separately, must all match):
--   SELECT count(*) FROM public.flight_schedules;     -- expect 1949
--   SELECT count(*) FROM public.dispatch_assignments; -- expect 1485
--   SELECT count(*) FROM public.service_reports;      -- expect 1
