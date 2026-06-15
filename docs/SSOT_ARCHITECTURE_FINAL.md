# Single Source of Truth — Final Architecture Snapshot

**Project:** Link Aero — One OPS Ground Handling Platform
**Status:** Production-Locked
**Date Finalized:** 15 June 2026
**Program Status:** CLOSED — Maintenance/Enhancement mode

---

## 1. Program Summary

| Item | Result |
|---|---|
| Phase 3B Step 1 (dispatch mirror-col drop) | ✅ Complete |
| Phase 3B Step 2.3 (service-report mirror-col drop) | ✅ Complete |
| Phase 6.5 (write-path hardening) | ✅ Complete |
| Phase 7 (legacy cleanup) | ✅ Complete (no further DDL required) |
| Performance Batches 1–4 | ✅ Complete |
| SSoT enforcement | ✅ Enforced via FS-only ownership |
| Rollback readiness | ✅ Snapshots retained |
| Production readiness | ✅ Confirmed |

---

## 2. Ownership Matrix

| Domain | Owner Table | Read Path | Write Path |
|---|---|---|---|
| Flight master data (flight_no, registration, aircraft_type, route, sta, std, arrival_date, skd_type, clearance_type, status, authority) | `flight_schedules` | direct or via views | Clearance forms + `update_flight_master_from_station(_id, _patch)` RPC |
| Dispatch operations (shift, ATA/ATD, task sheet, review, charges) | `dispatch_assignments` | `v_dispatch_with_flight` | `resolveFlightMasterForWrite(..., "dispatch_assignments")` |
| Service reports / billing | `service_reports` | `v_service_report_with_flight` | `resolveFlightMasterForWrite(..., "service_reports")` |
| Monthly invoice aggregates | `mv_invoice_monthly_summary` | direct read | `refresh_invoice_monthly_summary()` RPC |

---

## 3. Current Schema Inventory

### Core operational tables (post-cleanup column counts)

| Table | Cols | Rows (live) | Notes |
|---|---|---|---|
| `flight_schedules` | 37 | 1,952 | Sole SSoT for flight identity |
| `dispatch_assignments` | 37 | 1,485 | Operational only, no mirror cols |
| `service_reports` | 64 | 1 | Billing only, no mirror cols |
| `invoices` | 32 | 6 | FK via `flight_ref` |

### Snapshot / rollback tables (retain — do not delete)

- `snapshot_flight_schedules_pre_phase3` (37 cols, RLS off)
- `snapshot_dispatch_assignments_pre_phase3` (41 cols, RLS off)
- `snapshot_dispatch_assignments_pre_phase3b_step1` (41 cols) ← full legacy dispatch cols
- `snapshot_service_reports_pre_phase3` (69 cols, RLS off)
- `snapshot_service_reports_pre_phase3b_step2_3` (69 cols, RLS off) ← full legacy SR cols

---

## 4. Views & Materialized Views

### `v_dispatch_with_flight`
FS-derived dispatch read model. Exposes:
- Operational columns from `dispatch_assignments`
- Derived: `station` ← `fs.authority`, `airline` ← `airlines.name`, `flight_no` ← `fs.flight_no`, `service_type` ← `fs.clearance_type`
- Full `fs_*` passthrough for advanced consumers

### `v_service_report_with_flight`
FS-joined service report read model. Exposes `s.*` (no legacy cols remain) plus `fs_*` columns and airline metadata. Powers all invoice list/preview math.

### `security_pending_approval_view`
Convenience view: `flight_schedules` LEFT JOIN `dispatch_assignments` LEFT JOIN `service_reports`, filtered to `fs.status = 'Pending'`. Read-only.

### `mv_invoice_monthly_summary` (materialized)
Pre-aggregated by `month × operator × station × handling_type`. Refreshed via `refresh_invoice_monthly_summary()` (SECURITY DEFINER, finance/admin gated).

---

## 5. Index Inventory (24 indexes)

### `flight_schedules`
- `idx_flight_schedules_authority_arrival` (authority, arrival_date DESC) — Batch 1 ★
- `idx_flight_schedules_arrival_date`
- `idx_flight_schedules_authority_arrival_date`
- `idx_flight_schedules_airline_id`
- `idx_flight_schedules_status`
- `idx_flight_schedules_created_via`
- `idx_flight_schedules_no_duplicates`

### `dispatch_assignments`
- `idx_dispatch_flight_schedule_id_flight_date` (FS_id, flight_date DESC) — Batch 1 ★
- `idx_dispatch_flight_date` (flight_date DESC) — Batch 1 ★
- `idx_dispatch_assignments_flight_schedule_id`
- `idx_dispatch_assignments_flight_date`
- `idx_dispatch_assignments_status`
- `idx_dispatch_assignments_created_via`

### `service_reports`
- `idx_service_reports_flight_schedule_id`
- `idx_service_reports_arrival`
- `idx_service_reports_operator`

### `invoices`
- `idx_invoices_flight_ref`
- `idx_invoices_operator`
- `idx_invoices_status`
- `invoices_invoice_no_uq` (unique)

★ = Performance Batch 1 additions (≈300× dispatch pagination, ≈400× authority lookups).

---

## 6. Trigger & RPC Inventory

### Triggers (active on operational tables)
| Trigger | Table | Purpose |
|---|---|---|
| `update_flight_schedules_updated_at` | flight_schedules | timestamp |
| `update_dispatch_assignments_updated_at` | dispatch_assignments | timestamp |
| `update_service_reports_updated_at` | service_reports | timestamp |
| `cleanup_dispatches_on_flight_schedule_delete` | flight_schedules | FK cascade |
| `trg_guard_dispatch_status_vs_review` | dispatch_assignments | enforce review→completed |
| `trg_sync_flight_schedule_to_dispatch` | flight_schedules | JSON snapshot to task_sheet_data |
| `sync_security_dispatch_to_flight_schedule_trigger` | dispatch_assignments | push `arrival_date` to FS |

### RPC Functions
- `update_flight_master_from_station(_id, _patch jsonb)` — station-side FS edits with field whitelist + audit
- `refresh_invoice_monthly_summary()` — MV refresh, finance/admin only
- `has_role`, `is_admin`, `has_ops_access`, `has_finance_access` — RBAC helpers
- `handle_new_user`, `calc_invoice_totals`, `calc_vendor_invoice_total`, `update_journal_totals`, `enforce_audit_log_user`

---

## 7. Query Cache Strategy

| Tier | staleTime | Used by |
|---|---|---|
| Hot (list views) | 60 s | dispatch board, SR list, invoices list |
| Standard (default `useSupabaseQuery`) | 30 s | most domain hooks |
| Cold (full history) | 5 min | invoice joins (`dateWindowDays: null`) |

Hooks set `refetchOnMount: false`, `refetchOnWindowFocus: false`, `refetchOnReconnect: true`. Telemetry confirmed **55–66% reduction** in queries per page load (Batch 2).

Invoice list payload reduced **−70.2%** via `useServiceReportsForInvoicing()` 21-column projection (Batch 3).

---

## 8. Performance Benchmarks (post-Batch 4)

| Operation | Pre | Post | Δ |
|---|---|---|---|
| Dispatch pagination (LIMIT 50) | ~9 s | ~30 ms | ~300× |
| Authority-scoped flight lookup | ~13 s | ~30 ms | ~430× |
| Invoice list payload / row | 1,885 B | 561 B | −70.2% |
| Monthly invoice summary | JS grouping over N rows | single MV scan | constant-time |
| Queries per page load (avg) | baseline | −55 to −66% | — |

---

## 9. Migration Timeline

| Phase | Outcome |
|---|---|
| Phase 1–3 | New architecture introduced alongside legacy |
| Phase 3A | Write-path resolver (`resolveFlightMasterForWrite`) introduced |
| Phase 3B Step 1 | Legacy mirror cols dropped from `dispatch_assignments` |
| Phase 3B Step 2.2 | SR write-path decoupled |
| Phase 3B Step 2.3 | Legacy mirror cols dropped from `service_reports` |
| Batch 1 (Indexes) | Targeted B-tree indexes added |
| Batch 2 (Caching) | Per-route dedup + telemetry |
| Batch 3 (Projection) | Narrow invoice projection |
| Batch 4 (MV) | `mv_invoice_monthly_summary` precomputed layer |
| Phase 6.5 | Remaining frontend write-payload cleanup |
| Phase 7 | Verified — already complete (no DDL required) |

---

## 10. Rollback Procedures

1. **Restore dispatch legacy cols**
   ```sql
   ALTER TABLE dispatch_assignments
     ADD COLUMN airline text, ADD COLUMN flight_no text,
     ADD COLUMN station text, ADD COLUMN service_type text;
   UPDATE dispatch_assignments d
     SET airline=s.airline, flight_no=s.flight_no, station=s.station, service_type=s.service_type
     FROM snapshot_dispatch_assignments_pre_phase3b_step1 s
    WHERE d.id = s.id;
   ```
2. **Restore SR legacy cols** — analogous against `snapshot_service_reports_pre_phase3b_step2_3`.
3. **Revert write resolver** — `git revert` the Phase 3B + 6.5 commits.
4. **Rebuild views** without FS derivation (use the snapshot definitions captured in earlier audit logs).

Snapshots are RLS-off, immutable, and must not be deleted.

---

## 11. Known Limitations

- `service_reports` row count is currently 1 (low real-world fill); aggregation perf curves are projected, not measured at scale.
- `mv_invoice_monthly_summary` requires explicit refresh via RPC; no `pg_cron` schedule yet.
- `security_pending_approval_view` not parameterized — read-only convenience.
- TypeScript types regenerate automatically; manual code referencing dropped columns will fail TS build (intentional safety net).

---

## 12. Recommended Next Phases (Optional)

| Phase | Scope | Trigger |
|---|---|---|
| Batch 5 — Edge caching | CDN/edge cache layer for read APIs | If concurrent-user growth >5× |
| MV cron refresh | `pg_cron` 5-min refresh of monthly summary | If finance dashboards demand fresher data |
| `v_security_pending_approval` migration | Move screens onto dedicated view | If pending-approval becomes a bottleneck |
| Snapshot rotation | Archive pre-Phase 3B snapshots to cold storage after 12 months retention | Storage hygiene |

---

## 13. Final Status Block

```
Phase 7 Status:                       COMPLETE
Schema Normalization:                 COMPLETE
SSoT Enforcement:                     COMPLETE
Performance Optimization (Batch 1-4): COMPLETE
Rollback Readiness:                   COMPLETE
Production Readiness:                 CONFIRMED
Program State:                        CLOSED — Maintenance/Enhancement
```
