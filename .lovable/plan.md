# Single Source of Truth Refactor — `flight_schedules` as Master

Zero-downtime, incremental, fully reversible migration for the Link Aero production ground-handling system (~9,000 flights/month). No columns, tables, triggers, or FKs are dropped in this plan — deprecation only. Drops are gated behind Phase 7 and explicit approval.

---

## 1. Target Architecture

- **`flight_schedules`** — sole owner of master flight data: `flight_no`, `registration`, `aircraft_type`, `route`, `sta`, `std`, `arrival_date`, `departure_date`, `clearance_type`, `skd_type`, `status`, `airline_id`, `authority`.
- **`dispatch_assignments`** — operational only: `shift_start`, `shift_end`, `ata`, `atd`, `remarks`, `staff`, `observers`, `task_sheet_data`, `review_status`, `status`, `flight_schedule_id`.
- **`service_reports`** — billing/report only: `handling_type`, `review_status`, `approved_by`, `approved_at`, `flight_schedule_id`, plus sub-tables (`service_report_delays`, `_fuel`, `_catering`, `_hotac`).
- All portals read master fields via JOIN or VIEW. Writes to master fields go only to `flight_schedules` (Station gets explicit RLS to update an allow-listed subset).

---

## 2. Schema Analysis (to confirm in Phase 1 before any change)

Inventory deliverable: `docs/refactor/schema-inventory.md`. Contents:
- Duplicated columns in `dispatch_assignments` vs `flight_schedules` (and inside `task_sheet_data` JSON): `registration`, `route`, `aircraft_type`, `sta`, `std`, `skd_type`, `flight_type`, `flight_no`, `airline`, `station`, `service_type`, `arrival_date`, `departure_date`.
- Duplicated columns in `service_reports` vs `flight_schedules`: `flight_no`, `aircraft_type`, `registration`, `route`, `sta`, `std`, `arrival_date`, `departure_date`, `airline_id`, `station`, `handling_type` (kept — billing concept), etc.
- Triggers touching these columns: `sync_flight_schedule_to_dispatch`, `sync_security_dispatch_to_flight_schedule`, `cleanup_dispatches_for_deleted_flight_schedule`, `guard_dispatch_status_vs_review`, `calc_invoice_totals`, `update_journal_totals`.
- FKs: `dispatch_assignments.flight_schedule_id → flight_schedules.id`, `service_reports.flight_schedule_id → flight_schedules.id` (verify; backfill where NULL).
- Frontend / RPC / hook usage map (all 23 files listed in §6).
- Invoice + print dependency map (`finalize-invoice` edge function, `SecurityInvoicePrintView`, `InvoicePrintView`, `securityInvoiceDetail`, `securityChargeCalculator`, `securityDownloadFields`).

---

## 3. Migration Phases (no destructive ops before Phase 7)

### Phase 1 — Introduce new structures (additive only)
SQL migration:
- `CREATE TABLE public.migration_audit_log (id, entity_name, record_id, column_name, old_value jsonb, new_value jsonb, action text, migrated_by uuid, migrated_at timestamptz default now())` + GRANTs + RLS (`service_role` ALL, `authenticated` SELECT WHERE admin).
- Snapshot tables (empty shells now; populated in Phase 2 right before backfill):
  `flight_schedules_snapshot_YYYYMMDD`, `dispatch_assignments_snapshot_YYYYMMDD`, `service_reports_snapshot_YYYYMMDD` — created via `CREATE TABLE ... AS SELECT * FROM ... WITH NO DATA` then populated by `INSERT`.
- VIEWs (read-side; base tables unchanged):
  - `v_dispatch_with_flight` — `dispatch_assignments d LEFT JOIN flight_schedules fs ON fs.id = d.flight_schedule_id`, exposing `fs_*` aliased master fields.
  - `v_service_report_with_flight` — same pattern for `service_reports`.
  - `security_pending_approval_view` — `flight_schedules fs LEFT JOIN dispatch_assignments d ON d.flight_schedule_id = fs.id LEFT JOIN service_reports s ON s.flight_schedule_id = fs.id` filtered to `fs.status = 'Pending'` and the existing purpose/remarks rules. Read-only.
- GRANT `SELECT` on all three views to `authenticated`; `ALL` to `service_role`.
- Station write-allowlist function: `public.update_flight_master_from_station(_id uuid, _patch jsonb)` SECURITY DEFINER, validates caller role (`station_ops` / `station_manager` / `admin`), updates only allow-listed keys (`arrival_date`, `departure_date`, `registration`, `aircraft_type`, `route`, `sta`, `std`), logs to `migration_audit_log`.

### Phase 2 — Backfill (idempotent, batched)
- Populate snapshot tables.
- Backfill missing `flight_schedule_id` on `dispatch_assignments` and `service_reports` using `flightRefMatch` rules (flight_no + date + station) inside a SQL function `backfill_flight_schedule_links()` that logs each match to `migration_audit_log`.
- Reconcile drift: where mirror differs from master, write the master value into the mirror (so triggers + legacy reads stay consistent) and log the change. Master wins by definition.
- Re-runnable; guarded by `WHERE flight_schedule_id IS NULL` and drift predicates.

### Phase 3 — Frontend refactor (module by module, behind a feature flag `useFlightMaster` defaulted ON in dev, gradual rollout in prod)
Per-module work:
1. Add `flight_schedules:flight_schedule_id(*)` to existing Supabase selects (or switch source to the relevant view).
2. Route every read of a master field through new adapter `src/lib/flightMaster.ts` → `getMasterFields(row, fs)` (prefers `fs.*`, falls back to mirror so legacy rows keep working).
3. Keep writes to mirrors in place (triggers handle propagation) so rollback stays trivial.
4. Add explicit Station writes for amendments via `update_flight_master_from_station` RPC.

### Phase 4 — Parity validation
SQL parity scripts saved under `docs/refactor/validation/*.sql`:
```text
-- flights with operational rows but no FK
SELECT 'dispatch_orphan' AS kind, count(*) FROM dispatch_assignments WHERE flight_schedule_id IS NULL;
SELECT 'sr_orphan' AS kind, count(*) FROM service_reports WHERE flight_schedule_id IS NULL;

-- master vs mirror drift
SELECT count(*) FROM dispatch_assignments d JOIN flight_schedules fs ON fs.id=d.flight_schedule_id
WHERE coalesce(d.task_sheet_data->>'registration','')  <> coalesce(fs.registration,'')
   OR coalesce(d.task_sheet_data->>'route','')         <> coalesce(fs.route,'')
   OR coalesce(d.task_sheet_data->>'aircraft_type','') <> coalesce(fs.aircraft_type,'')
   OR coalesce(d.task_sheet_data->>'sta','')           <> coalesce(fs.sta,'')
   OR coalesce(d.task_sheet_data->>'std','')           <> coalesce(fs.std,'');

SELECT count(*) FROM service_reports s JOIN flight_schedules fs ON fs.id=s.flight_schedule_id
WHERE coalesce(s.aircraft_type,'') <> coalesce(fs.aircraft_type,'')
   OR coalesce(s.flight_no,'')     <> coalesce(fs.flight_no,'');

-- invoice integrity: every finalized invoice still resolves to a flight_schedules row
SELECT count(*) FROM invoices i
LEFT JOIN service_reports s ON s.id = ANY(i.service_report_ids)
LEFT JOIN flight_schedules fs ON fs.id = s.flight_schedule_id
WHERE i.status='finalized' AND fs.id IS NULL;
```
All four queries must return `0` before advancing.

### Phase 5 — Disable sync triggers (reversible)
- `ALTER TABLE ... DISABLE TRIGGER` (not DROP) for `sync_flight_schedule_to_dispatch`, `sync_security_dispatch_to_flight_schedule`. Keep `cleanup_*` and `guard_*` enabled.
- Re-run Phase 4 validation 24h later.

### Phase 6 — Mark columns deprecated
- `COMMENT ON COLUMN dispatch_assignments.<col> IS 'DEPRECATED <date>: read via flight_schedules join';` for every mirror column. No DROP.
- Add a runtime ESLint rule / codeowner check that fails PRs touching deprecated columns directly.

### Phase 7 — Drop (gated, only after explicit user approval)
Preconditions, all must be true:
- 0 TS errors, 0 runtime errors, 0 invoice regressions, 0 report regressions.
- All 23 files in §6 marked `[V] Verified`.
- All historical flights accessible; all finalized invoices render byte-equal in print.
- Validation SQL (§ Phase 4) returns 0 rows in production for 7 consecutive days.
- Snapshot tables exist and verified row-count equal.

Drop migration is generated but **not executed** as part of this plan.

---

## 4. Rollback Strategy
Every migration file ships with a paired `*_rollback.sql`:
- Phase 1: `DROP VIEW`, `DROP FUNCTION`, `DROP TABLE migration_audit_log` (only if explicitly desired).
- Phase 2: restore from snapshot tables — `UPDATE target t SET col = s.col FROM snapshot s WHERE t.id = s.id`.
- Phase 3: feature flag `useFlightMaster=false` flips reads back to mirror columns instantly (no SQL needed).
- Phase 5: `ALTER TRIGGER ... ENABLE` re-enables sync.
- Phase 7 drop has its own paired `add-back` migration generated from the inventory.

---

## 5. Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Invoice render regression | Med | High | Phase 3 feature flag + golden-file print tests on 10 historical finalized invoices |
| Orphan dispatch/SR rows after backfill | Med | High | Phase 2 backfill function + Phase 4 orphan query gating |
| Trigger disable causes stale mirror reads in unrefactored screens | Low | Med | Phase 5 happens only after every file is `[V] Verified` |
| Station writes bypass authorization | Low | High | All Station master writes go through `update_flight_master_from_station` SECURITY DEFINER with explicit role check + audit log |
| Drift during long rollout | Med | Med | `migration_audit_log` + nightly parity job (re-run Phase 4 SQL) |

---

## 6. File Checklist (23 files)
Tracked in `docs/refactor/checklist.md`. Status: `[ ] Not Started` · `[~] In Progress` · `[V] Verified` · `[P] Production Ready`.

**Phase A — Station Dispatch**
1. `src/pages/StationDispatch.tsx`
2. `src/components/security/SecurityTaskSheetDialog.tsx`
3. `src/components/dispatch/DispatchContent.tsx`

**Phase B — Operations / Pending Approval**
4. `src/pages/SecurityServiceReports.tsx`
5. `src/data/dispatch.ts`
6. `src/data/serviceReports.ts`
7. `src/lib/securityDispatchRows.ts`
8. `src/lib/securityRowDisplay.ts`

**Phase C — Invoices & Print**
9. `src/pages/Invoices.tsx`
10. `src/components/invoices/InvoiceDetailModal.tsx`
11. `src/components/invoices/SecurityInvoicePrintView.tsx`
12. `src/components/InvoicePrintView.tsx`
13. `src/lib/securityInvoiceDetail.ts`
14. `src/lib/securityChargeCalculator.ts`
15. `src/lib/securityDownloadFields.ts`
16. `supabase/functions/finalize-invoice/index.ts`

**Phase D — Helpers, hooks, reports, utilities**
17. `src/data/flights.ts`
18. `src/data/finance.ts`
19. `src/hooks/domain.ts`
20. `src/pages/OperationsReports.tsx`
21. `src/pages/FinancialReports.tsx` + `src/pages/AgingReports.tsx`
22. `src/pages/ServiceReport.tsx` + `src/components/serviceReport/*`
23. `src/lib/flightRefMatch.ts` + `src/cache/queryKeys.ts`

Per file: TS build → lint → runtime smoke → invoice generation → historical flight render → finalized invoice render → print template render → orphan SQL = 0 → mark `[V]`.

---

## 7. Deployment Checklist (per phase)
1. Open PR with migration + rollback SQL + updated checklist.
2. Apply migration in staging; run Phase 4 SQL; review `migration_audit_log` diff.
3. Run full Vitest suite + manual print regression on 10 sampled invoices.
4. Promote to production during low-traffic window (02:00–04:00 local).
5. Watch `migration_audit_log` and error logs for 24h.
6. Update checklist status; only then start the next phase.

---

## 8. Deliverables Produced by This Plan
- `supabase/migrations/<ts>_phase1_views_audit_log_station_rpc.sql` (+ rollback)
- `supabase/migrations/<ts>_phase2_backfill.sql` (+ rollback)
- `src/lib/flightMaster.ts` adapter
- `docs/refactor/schema-inventory.md`
- `docs/refactor/checklist.md`
- `docs/refactor/validation/*.sql`
- Refactored Phase A files (#1–#3)
- Updated TS types via regenerated `src/integrations/supabase/types.ts`

Phases B, C, D ship in follow-up turns, each gated on the previous phase being `[V] Verified`. Phase 7 drop migration is authored but withheld until explicit approval.

---

## 9. Scope of This PR (first iteration)
- Phase 1 migration (views + `migration_audit_log` + Station RPC).
- Phase 2 backfill migration (dry-run mode default; explicit param to execute).
- `flightMaster.ts` adapter + checklist + inventory docs.
- Phase A refactor (files #1–#3).
- Phase 4 validation SQL added to repo; results recorded in checklist.

No triggers disabled. No columns dropped. Mirror columns still synchronized.
