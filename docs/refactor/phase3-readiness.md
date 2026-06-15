# Phase 3 — Cleanup Readiness Gate

Phase 3 = disabling sync triggers + dropping deprecated mirror columns.
Per the original migration directive, Phase 3 is **blocked** until every
checkbox below is signed off.

## Pre-flight artifacts (DONE)

- [x] Phase A — `getMasterFields` adapter live; Station dialog reads master.
- [x] Phase B — UI resolvers (`securityRowDisplay`) read master-first.
- [x] Phase C — Download/export resolver (`securityDownloadFields`) reads master-first.
- [x] Phase 2 backfill — 1 orphan SR linked, 8/9 drift rows resynced.
- [x] Snapshots captured: `snapshot_*_pre_phase3` (counts verified).
- [x] Rollback script: `docs/refactor/phase3-rollback.sql`.
- [x] Audit log: every action recorded in `migration_audit_log`.

## Verification gate (USER SIGN-OFF REQUIRED)

- [ ] **Station Dispatch → open + edit** a security dispatch: master
      fields (registration, route, STA, STD, skd_type) show the latest
      Clearance value. Save still works.
- [ ] **Operations → Pending Approval → View** on an amended row: dialog
      reflects the Clearance amendment.
- [ ] **PDF download** of a security task sheet for an amended flight:
      printed registration/route/STA/STD match Clearance.
- [ ] **Excel export** of the Security Service Reports list for an
      amended flight: same as above.
- [ ] **Finalized invoices** render correctly (spot-check 2–3).
- [ ] **Historical flights** (>180 days) still openable via Clearances
      list.

## Residuals (accepted as documented)

| Residual                          | Count | Decision                                                                   |
| --------------------------------- | ----- | -------------------------------------------------------------------------- |
| `dispatch_assignments` orphans    | 3     | No matching FS exists. Rendered via fallback chain. Do not fabricate FS.   |
| `dispatch_assignments` drift      | 1     | `fs.route` empty, mirror has `BER/HRG/HAJ`. Mirror data preserved.         |
| `service_reports` drift           | 1     | DFG125 newly linked, `aircraft_type=a320` while `fs.aircraft_type` blank.  |

These residuals are **expected** under the "fs wins only when non-empty"
backfill rule and do not block Phase 3.

## Phase 3 execution order (when approved)

1. Re-take snapshots immediately before cutover (refresh existing tables).
2. `DROP TRIGGER sync_flight_schedule_to_dispatch ON public.flight_schedules;`
3. `DROP TRIGGER sync_security_dispatch_to_flight_schedule ON public.dispatch_assignments;`
4. Drop deprecated columns from `dispatch_assignments` and `service_reports`
   (final list will be enumerated in the Phase 3 migration).
5. Update `securityRowDisplay`, `securityDownloadFields`, `flightMaster.ts`
   to remove the now-dead fallback branches.
6. Regenerate Supabase TS types.
7. Smoke-test all four flows from the verification gate.
8. Keep snapshots for **30 days** before dropping them.

**Rollback**: `psql -f docs/refactor/phase3-rollback.sql` — single
transaction, fully restores all three tables to pre-Phase-3 state.
