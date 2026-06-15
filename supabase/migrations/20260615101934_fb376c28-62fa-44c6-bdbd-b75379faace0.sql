
-- ============================================================================
-- Phase 3B.0 — Trigger Refactor (NO schema changes, NO column drops)
-- ============================================================================
-- Rollback strategy: each function below is restorable instantly via
-- CREATE OR REPLACE FUNCTION using the pre-refactor body documented in
-- db-functions context. Triggers themselves are NOT recreated; only the
-- function bodies are swapped.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) sync_flight_schedule_to_dispatch  (AFTER UPDATE on flight_schedules)
--    Before: wrote mirror cols airline/flight_no/station/service_type on
--            dispatch_assignments, refreshed task_sheet_data, and mirrored
--            aircraft_type/handling_type onto service_reports.
--    After:  JSON-only — refreshes dispatch_assignments.task_sheet_data
--            snapshot when the master FS row changes. Top-level mirror
--            columns and service_reports mirror writes are removed.
--            Service-report mirrors are now resolved on every app write
--            by resolveFlightMasterForWrite (Phase 3A.5).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_flight_schedule_to_dispatch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Short-circuit when none of the master flight fields changed
  IF TG_OP = 'UPDATE' AND
       NEW.skd_type       IS NOT DISTINCT FROM OLD.skd_type AND
       NEW.aircraft_type  IS NOT DISTINCT FROM OLD.aircraft_type AND
       NEW.registration   IS NOT DISTINCT FROM OLD.registration AND
       NEW.route          IS NOT DISTINCT FROM OLD.route AND
       NEW.sta            IS NOT DISTINCT FROM OLD.sta AND
       NEW.std            IS NOT DISTINCT FROM OLD.std AND
       NEW.flight_no      IS NOT DISTINCT FROM OLD.flight_no AND
       NEW.arrival_date   IS NOT DISTINCT FROM OLD.arrival_date AND
       NEW.departure_date IS NOT DISTINCT FROM OLD.departure_date AND
       NEW.authority      IS NOT DISTINCT FROM OLD.authority AND
       NEW.clearance_type IS NOT DISTINCT FROM OLD.clearance_type
  THEN
    RETURN NEW;
  END IF;

  -- JSON-only snapshot refresh on linked dispatch rows.
  -- task_sheet_data remains the authoritative cache for the dispatch UI.
  UPDATE public.dispatch_assignments d
  SET task_sheet_data = COALESCE(d.task_sheet_data, '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
           'flight_type',   NULLIF(NEW.skd_type, ''),
           'skd_type',      NULLIF(NEW.skd_type, ''),
           'aircraft_type', NULLIF(NEW.aircraft_type, ''),
           'registration',  NULLIF(NEW.registration, ''),
           'route',         NULLIF(NEW.route, ''),
           'sta',           NULLIF(NEW.sta, ''),
           'std',           NULLIF(NEW.std, ''))),
      updated_at = now()
  WHERE d.flight_schedule_id = NEW.id;

  -- NOTE: service_reports mirror writes intentionally removed.
  --       resolveFlightMasterForWrite() handles those on every app write.

  RETURN NEW;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 2) cleanup_dispatches_for_deleted_flight_schedule  (BEFORE DELETE on FS)
--    Before: cascade-deleted by flight_schedule_id, AND fallback-matched
--            orphans using legacy mirror cols (flight_no/station/service_type
--            plus date and registration/route loose match).
--    After:  strict FK delete by flight_schedule_id only. Safe because
--            current orphan count = 0/1485 (validated in Phase 3B readiness).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_dispatches_for_deleted_flight_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.dispatch_assignments d
  WHERE d.flight_schedule_id = OLD.id;
  RETURN OLD;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 3) sync_security_dispatch_to_flight_schedule  (AFTER INSERT/UPDATE on DA)
--    Reaffirmed: already mirror-free; only writes arrival_date back to FS.
--    Rewritten for clarity only — no behavior change.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_security_dispatch_to_flight_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Phase 3B.0: this trigger MUST NOT write any mirror fields back to FS.
  -- Clearance portal owns: registration, route, aircraft_type, sta, std,
  -- skd_type, clearance_type. Station may only push the operational
  -- flight_date back to the master row.
  IF NEW.flight_schedule_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.flight_schedules
  SET arrival_date = COALESCE(NEW.flight_date::text, arrival_date),
      updated_at   = now()
  WHERE id = NEW.flight_schedule_id;

  RETURN NEW;
END;
$function$;
