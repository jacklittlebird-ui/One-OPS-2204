## Enterprise Architecture Upgrade — Phased Plan

You already have ~70% of this in place (policy engine, domain hooks for flights, list projections, profile/role caches, planned counts, station scoping). This plan closes the remaining gaps without destabilizing the FlightSchedule soak period currently in progress.

---

### Phase A — Domain completion (no infra changes, low risk)

Goal: every page goes through a domain hook, never `useSupabaseTable("...")` directly.

1. **Dispatch domain** (`src/data/dispatch.ts`)
   - Migrate `DispatchContent.tsx` and `StationDispatch.tsx` to `useDispatchList` (already defined) + `useDispatchById` + `usePrefetchDispatch` (to add — mirror flights.ts).
   - Detail dialog & task-sheet editor switch to `useDispatchById` so `task_sheet_data` / `charges_breakdown` JSONB only loads on open.

2. **Service Reports domain** (`src/data/serviceReports.ts`)
   - Add `SERVICE_REPORT_LIST_COLUMNS` (~15 of 68 cols), `useServiceReportList`, `useServiceReportById`, `usePrefetchServiceReport`.
   - Migrate `SecurityServiceReports.tsx`, `ServiceReport.tsx` list views.

3. **Finance domain** (`src/data/finance.ts`)
   - Add `INVOICE_LIST_COLUMNS`, `useInvoiceList`, `useInvoiceById`. Keep `useAgingInvoices` as-is (compliance needs full rows).
   - Migrate `Invoices.tsx`, `AgingReports.tsx` list grids.

4. **Deprecate `src/hooks/domain.ts`** — fold remaining callers into `src/data/*`, then delete. Single source of truth.

### Phase B — Reference data cache (one-time win)

5. **`useReferenceData()`** hook — small in-memory cache for `airlines`, `airports`, `contract_service_rates`, `delay_codes`, `aircraft_types_ref` (all <100 rows, near-static). 24h staleTime, single fetch shared across the app. Removes #6 (`contract_service_rates`, 8,241 calls) and several airline lateral joins.

### Phase C — Realtime isolation (Tier 3)

6. Wire `useDispatchRealtime()` and `useFlightStatusRealtime()` to a single shared Supabase channel, mounted **only** on the live ops board route. Subscribe to status columns via `postgres_changes` filter, invalidate by id. No realtime on finance/reports/history routes.

### Phase D — RLS / multi-tenant readiness (schema change — separate migration)

7. **Audit current RLS** — generate report of every public table's policies. Confirm station/role scoping is enforced server-side (we already have `has_role`, `has_ops_access`, `has_finance_access`).
8. **Add `company_id`** (optional, gated on whether multi-tenant is actually a near-term need). If yes: nullable column on tenant-scoped tables + `has_company(_user_id, _company_id)` SECURITY DEFINER + policy updates. **I will not run this without explicit go-ahead** — it touches every table.

### Phase E — Audit & observability

9. `audit_logs` already exists. Add domain-level write helpers (`logFlightStatusChange`, `logInvoiceFinalized`, `logDispatchUpdate`) so all mutations route through a single audited path.
10. Lightweight client perf beacon → `perf_metrics` table (page, p95, payload bytes, cache hit). Batched flush every 30s to avoid becoming a write hot-spot.

---

### Sequencing & guardrails

- **Do not start Phase A.1 until you confirm** FlightSchedule soak shows the expected drop in queries #2/#4/#13. Otherwise we'd be migrating Dispatch on top of an unproven pattern.
- Phases A–C are pure frontend/data-layer — zero schema risk, reversible per-page.
- Phase D requires a migration and your explicit approval; I'll draft it but not run it.
- Phase E lands last so the perf table reflects the new architecture.

### What I will NOT do unprompted

- Touch the FlightSchedule code paths shipped last week.
- Re-add `count: "exact"` anywhere outside finance/compliance screens.
- Enable realtime on any route except the dispatch ops board.
- Run the multi-tenant migration.

### Technical notes

- Cache key collisions avoided: list-projection keys already include the `select` string via `resolvePolicy`. Detail keys use `queryKeys.<domain>.byId(id)`.
- Hover-prefetch pattern (`onMouseEnter` → `usePrefetchX`) keeps detail-open latency at zero.
- Reference-data hook uses a single `useQuery` per table with `staleTime: 24h, gcTime: Infinity` — effectively a module-level cache backed by React Query.

---

**Recommended next action:** approve Phase A and I'll start with Dispatch (the largest remaining hotspot — query #1, ~36% of top-20 total time). Phases B–E queue behind it.