import { describe, it, expect } from "vitest";
import { fetchSecurityFlights, SECURITY_FLIGHT_PAGE_SIZE } from "@/lib/securityFlightsQuery";
import { SECURITY_CLEARANCE_TYPES } from "@/components/clearances/ClearanceTypes";

// Tiny in-memory supabase-shaped mock that supports the filter chain the
// helper builds. Each chained call returns `this`; awaiting the builder
// yields { data, error } based on the recorded filters and the seeded rows.
function makeMockSupabase(rows: any[]) {
  return {
    from(_table: string) {
      const state: any = {
        filters: [] as Array<(r: any) => boolean>,
        order: [] as Array<{ col: string; asc: boolean }>,
        range: [0, SECURITY_FLIGHT_PAGE_SIZE - 1] as [number, number],
      };
      const api: any = {
        select() { return api; },
        order(col: string, opts: any) { state.order.push({ col, asc: !!opts?.ascending }); return api; },
        range(from: number, to: number) { state.range = [from, to]; return api; },
        eq(col: string, val: any) { state.filters.push((r: any) => r[col] === val); return api; },
        in(col: string, vals: any[]) { state.filters.push((r: any) => vals.includes(r[col])); return api; },
        not(col: string, op: string, raw: string) {
          if (op === "in") {
            const set = raw.replace(/[()]/g, "").split(",").map(s => s.trim());
            state.filters.push((r: any) => !set.includes(r[col]));
          }
          return api;
        },
        gte(col: string, v: string) { state.filters.push((r: any) => r[col] != null && r[col] >= v); return api; },
        lte(col: string, v: string) { state.filters.push((r: any) => r[col] != null && r[col] <= v); return api; },
        then(resolve: any, reject: any) {
          try {
            let result = rows.filter(r => state.filters.every(f => f(r)));
            for (let i = state.order.length - 1; i >= 0; i--) {
              const { col, asc } = state.order[i];
              result = [...result].sort((a, b) => {
                const av = a[col], bv = b[col];
                if (av == null && bv == null) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                if (av < bv) return asc ? -1 : 1;
                if (av > bv) return asc ? 1 : -1;
                return 0;
              });
            }
            const sliced = result.slice(state.range[0], state.range[1] + 1);
            resolve({ data: sliced, error: null });
          } catch (e) { reject(e); }
        },
      };
      return api;
    },
  };
}

const seed = () => {
  const out: any[] = [];
  const types = [...SECURITY_CLEARANCE_TYPES, "Full Handling", "Ramp Only"];
  for (let i = 0; i < 2500; i++) {
    out.push({
      id: `id-${String(i).padStart(5, "0")}`,
      authority: i % 2 === 0 ? "CAI" : "RUH",
      clearance_type: types[i % types.length],
      status: i % 17 === 0 ? "Cancelled" : i % 23 === 0 ? "Rejected" : "Pending",
      arrival_date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
    });
  }
  return out;
};

describe("fetchSecurityFlights", () => {
  it("returns identical counts for the Clearance and Operations security tabs", async () => {
    const rows = seed();
    const supa = makeMockSupabase(rows);
    const clearance = await fetchSecurityFlights(supa, {});
    const operations = await fetchSecurityFlights(supa, {});
    expect(clearance.length).toBe(operations.length);
    expect(clearance.length).toBeGreaterThan(0);
  });

  it("paginates past the 1000-row PostgREST cap", async () => {
    const supa = makeMockSupabase(seed());
    const all = await fetchSecurityFlights(supa, {});
    // Seed has 2500 rows; cancelled+rejected stripped, security types only.
    expect(all.length).toBeGreaterThan(SECURITY_FLIGHT_PAGE_SIZE);
  });

  it("excludes Cancelled and Rejected flights", async () => {
    const supa = makeMockSupabase(seed());
    const all = await fetchSecurityFlights(supa, {});
    expect(all.every(r => r.status !== "Cancelled" && r.status !== "Rejected")).toBe(true);
  });

  it("filters to SECURITY_CLEARANCE_TYPES unless includeAllForStation", async () => {
    const supa = makeMockSupabase(seed());
    const securityOnly = await fetchSecurityFlights(supa, {});
    expect(securityOnly.every(r => SECURITY_CLEARANCE_TYPES.includes(r.clearance_type))).toBe(true);

    const supa2 = makeMockSupabase(seed());
    const all = await fetchSecurityFlights(supa2, { includeAllForStation: true });
    expect(all.length).toBeGreaterThan(securityOnly.length);
  });

  it("produces a deterministic order across runs", async () => {
    const supa1 = makeMockSupabase(seed());
    const supa2 = makeMockSupabase(seed());
    const a = await fetchSecurityFlights(supa1, {});
    const b = await fetchSecurityFlights(supa2, {});
    expect(a.map(r => r.id)).toEqual(b.map(r => r.id));
  });

  it("applies station scope when provided", async () => {
    const supa = makeMockSupabase(seed());
    const cai = await fetchSecurityFlights(supa, { station: "CAI" });
    expect(cai.every(r => r.authority === "CAI")).toBe(true);
  });

  it("invokes the onPage progress callback per page", async () => {
    const supa = makeMockSupabase(seed());
    const pages: number[] = [];
    await fetchSecurityFlights(supa, { onPage: ({ loaded }) => pages.push(loaded) });
    expect(pages.length).toBeGreaterThanOrEqual(2);
    // Loaded count is monotonically non-decreasing.
    for (let i = 1; i < pages.length; i++) expect(pages[i]).toBeGreaterThanOrEqual(pages[i - 1]);
  });
});
