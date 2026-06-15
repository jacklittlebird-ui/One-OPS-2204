/**
 * Phase 3 readiness — deterministic write-cycle verifier (DEV ONLY).
 *
 * Wraps the Station Dispatch save path so we can prove, at runtime, that:
 *   1. Master fields (route / registration / aircraft_type / sta / std / dates)
 *      are written to `flight_schedules` (the SSoT).
 *   2. The post-save re-fetch of `flight_schedules` returns the user-supplied
 *      values verbatim — i.e. the value persists across the network boundary.
 *   3. The dispatch mirror (`dispatch_assignments.task_sheet_data`) ends up in
 *      sync via the `sync_flight_schedule_to_dispatch` trigger (cross-portal).
 *   4. Any invoice for the linked airline still resolves its `flight_ref` to a
 *      `flight_schedules` row (invoice resolver smoke test).
 *
 * Emits a single grouped console log per save with `WRITE_CYCLE_VALIDATION =
 * PASS|FAIL` and pushes the result into an in-memory store so the dialog can
 * render a live "Last Save Verified" badge. Safe in production builds — all
 * heavy work is wrapped in try/catch and never throws back to the save flow.
 */
import { supabase } from "@/integrations/supabase/client";

export type MasterField =
  | "route"
  | "registration"
  | "aircraft_type"
  | "sta"
  | "std"
  | "arrival_date"
  | "departure_date"
  | "skd_type"
  | "clearance_type"
  | "flight_no";

export interface WriteCycleSnapshot {
  flight_schedule_id: string | null;
  dispatch_id: string | null;
  beforeFs: Record<string, any> | null;
}

export interface FieldDiff {
  field: MasterField;
  oldValue: string;
  newValue: string;
  persistedValue: string;
  matches: boolean;
  writeTarget: "flight_schedules";
}

export interface WriteCycleResult {
  at: string;
  flight_schedule_id: string | null;
  dispatch_id: string | null;
  status: "PASS" | "FAIL" | "SKIPPED";
  diffs: FieldDiff[];
  mirrorConsistent: boolean | null;
  invoiceResolverOk: boolean | null;
  notes: string[];
}

const norm = (v: unknown) => String(v ?? "").trim();

let lastResult: WriteCycleResult | null = null;
const listeners = new Set<(r: WriteCycleResult) => void>();

export function subscribeWriteCycle(fn: (r: WriteCycleResult) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getLastWriteCycleResult(): WriteCycleResult | null {
  return lastResult;
}

function publish(r: WriteCycleResult) {
  lastResult = r;
  for (const fn of listeners) {
    try {
      fn(r);
    } catch {
      /* listener errors must not break the save flow */
    }
  }
}

/** Captured BEFORE the save runs so we have an authoritative "old value" set. */
export async function snapshotBeforeSave(
  flight_schedule_id: string | null,
  dispatch_id: string | null,
): Promise<WriteCycleSnapshot> {
  if (!flight_schedule_id) {
    return { flight_schedule_id, dispatch_id, beforeFs: null };
  }
  try {
    const { data } = await supabase
      .from("flight_schedules")
      .select(
        "id, flight_no, route, registration, aircraft_type, sta, std, arrival_date, departure_date, skd_type, clearance_type, airline_id",
      )
      .eq("id", flight_schedule_id)
      .maybeSingle();
    return { flight_schedule_id, dispatch_id, beforeFs: (data as any) || null };
  } catch {
    return { flight_schedule_id, dispatch_id, beforeFs: null };
  }
}

interface VerifyArgs {
  snapshot: WriteCycleSnapshot;
  /** What the dialog claims to have just written. */
  expected: Partial<Record<MasterField, string | null | undefined>>;
  /** Optional airline id for the invoice resolver smoke test. */
  airline_id?: string | null;
}

/**
 * Runs after the save completes. Re-fetches flight_schedules, diffs each
 * expected field, queries the dispatch mirror, runs the invoice resolver, and
 * logs a single PASS/FAIL line to the console.
 */
export async function verifyAfterSave(args: VerifyArgs): Promise<WriteCycleResult> {
  const { snapshot, expected, airline_id } = args;
  const fields = Object.keys(expected) as MasterField[];
  const notes: string[] = [];

  if (!snapshot.flight_schedule_id) {
    const r: WriteCycleResult = {
      at: new Date().toISOString(),
      flight_schedule_id: null,
      dispatch_id: snapshot.dispatch_id,
      status: "SKIPPED",
      diffs: [],
      mirrorConsistent: null,
      invoiceResolverOk: null,
      notes: ["No flight_schedule_id on the row — write-cycle verifier skipped."],
    };
    console.warn("[WRITE_CYCLE_VALIDATION = SKIPPED]", r);
    publish(r);
    return r;
  }

  let afterFs: Record<string, any> | null = null;
  let mirror: Record<string, any> | null = null;
  let invoiceResolverOk: boolean | null = null;

  try {
    const { data } = await supabase
      .from("flight_schedules")
      .select(
        "id, flight_no, route, registration, aircraft_type, sta, std, arrival_date, departure_date, skd_type, clearance_type, airline_id",
      )
      .eq("id", snapshot.flight_schedule_id)
      .maybeSingle();
    afterFs = (data as any) || null;
  } catch (e: any) {
    notes.push(`Re-fetch failed: ${e?.message || e}`);
  }

  if (snapshot.dispatch_id) {
    try {
      const { data } = await supabase
        .from("dispatch_assignments")
        .select("id, task_sheet_data, flight_schedule_id, flight_no, station, service_type")
        .eq("id", snapshot.dispatch_id)
        .maybeSingle();
      mirror = (data as any) || null;
    } catch (e: any) {
      notes.push(`Mirror re-fetch failed: ${e?.message || e}`);
    }
  }

  // Cross-portal: invoice resolver smoke test. If any invoice for this airline
  // references the flight_no, it must resolve through flight_schedules.
  try {
    const fn = norm(afterFs?.flight_no);
    if (airline_id && fn) {
      const { data: invs } = await supabase
        .from("invoices")
        .select("id, flight_ref, airline_id, status")
        .eq("airline_id", airline_id)
        .ilike("flight_ref", fn)
        .limit(5);
      if (invs && invs.length > 0) {
        const { data: matched } = await supabase
          .from("flight_schedules")
          .select("id")
          .ilike("flight_no", fn)
          .limit(1);
        invoiceResolverOk = !!matched && matched.length > 0;
        if (!invoiceResolverOk) {
          notes.push(`Invoice resolver failed: flight_no '${fn}' not found in flight_schedules.`);
        }
      } else {
        invoiceResolverOk = true; // no invoices touching this flight → vacuously OK
      }
    } else {
      invoiceResolverOk = true;
    }
  } catch (e: any) {
    notes.push(`Invoice resolver error: ${e?.message || e}`);
    invoiceResolverOk = false;
  }

  const diffs: FieldDiff[] = fields.map((field) => {
    const oldValue = norm(snapshot.beforeFs?.[field]);
    const newValue = norm(expected[field]);
    const persistedValue = norm(afterFs?.[field]);
    return {
      field,
      oldValue,
      newValue,
      persistedValue,
      matches: persistedValue === newValue,
      writeTarget: "flight_schedules" as const,
    };
  });

  // Mirror consistency: dispatch_assignments.task_sheet_data fields should
  // converge with flight_schedules after the trigger runs. We only check the
  // subset of fields that live in task_sheet_data.
  let mirrorConsistent: boolean | null = null;
  if (mirror) {
    const tsd = (mirror.task_sheet_data || {}) as Record<string, any>;
    const mirrorFields: MasterField[] = ["route", "registration", "aircraft_type", "sta", "std"];
    mirrorConsistent = mirrorFields.every((f) => {
      const fsVal = norm(afterFs?.[f]);
      const mirVal = norm(tsd[f]);
      // Mirror can legitimately be empty when the user never typed a value;
      // we only flag actual divergence (both non-empty and different).
      if (!fsVal || !mirVal) return true;
      return fsVal === mirVal;
    });
  }

  const allWritesPersisted = diffs.every((d) => d.matches);
  const overallPass = allWritesPersisted && invoiceResolverOk !== false && mirrorConsistent !== false;

  const result: WriteCycleResult = {
    at: new Date().toISOString(),
    flight_schedule_id: snapshot.flight_schedule_id,
    dispatch_id: snapshot.dispatch_id,
    status: overallPass ? "PASS" : "FAIL",
    diffs,
    mirrorConsistent,
    invoiceResolverOk,
    notes,
  };

  /* eslint-disable no-console */
  console.groupCollapsed(
    `[WRITE_CYCLE_VALIDATION = ${result.status}] fs=${snapshot.flight_schedule_id}`,
  );
  console.log("flight_schedule_id:", snapshot.flight_schedule_id);
  console.log("dispatch_id:       ", snapshot.dispatch_id);
  console.log("write target:      ", "flight_schedules (single source of truth)");
  console.table(
    diffs.map((d) => ({
      field: d.field,
      old: d.oldValue,
      new: d.newValue,
      persisted: d.persistedValue,
      target: d.writeTarget,
      match: d.matches ? "✓" : "✗",
    })),
  );
  console.log("Cross-portal snapshot:");
  console.log("  flight_schedules row:        ", afterFs);
  console.log("  dispatch mirror task_sheet:  ", mirror?.task_sheet_data);
  console.log("  mirror consistent:           ", mirrorConsistent);
  console.log("  invoice resolver ok:         ", invoiceResolverOk);
  if (notes.length) console.warn("notes:", notes);
  console.groupEnd();
  /* eslint-enable no-console */

  publish(result);
  return result;
}
