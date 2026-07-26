/**
 * Save-flow timing instrumentation.
 *
 * Usage:
 *   const t = startSaveTimer("JournalEntry");
 *   t.markClick();                              // when the user clicks Save
 *   // ...client-side prep...
 *   t.markRequestSent();                        // right before firing the API/RPC call
 *   await t.timeDb("insert entry", () => supabase.from(...).insert(...));
 *   await t.timeDb("insert lines", () => supabase.from(...).insert(...));
 *   t.finish("success");                        // logs a full breakdown
 *
 * All timings are in ms. In development the timer prints a `console.table`
 * breakdown; in production a single compact `console.info` line is emitted so
 * the numbers still show up in browser + edge/server log aggregators.
 */

const isDev = typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true;

export interface SaveTimer {
  label: string;
  markClick: () => void;
  markRequestSent: () => void;
  timeDb: <T>(name: string, fn: () => Promise<T> | T) => Promise<T>;
  finish: (status?: "success" | "error" | string, extra?: Record<string, unknown>) => TimingReport;
}

export interface TimingReport {
  label: string;
  status: string;
  clickToSentMs: number | null;
  serverProcessingMs: number | null;
  dbTotalMs: number;
  totalMs: number;
  dbBreakdown: Array<{ step: string; ms: number }>;
}

export function startSaveTimer(label: string): SaveTimer {
  const t0 = performance.now();
  let tClick: number | null = null;
  let tSent: number | null = null;
  const dbSteps: Array<{ step: string; ms: number; startedAt: number; endedAt: number }> = [];
  let finished = false;

  const markClick = () => {
    if (tClick == null) tClick = performance.now();
  };

  const markRequestSent = () => {
    if (tSent == null) tSent = performance.now();
  };

  const timeDb = async <T,>(name: string, fn: () => Promise<T> | T): Promise<T> => {
    const s = performance.now();
    try {
      return await fn();
    } finally {
      const e = performance.now();
      dbSteps.push({ step: name, ms: +(e - s).toFixed(1), startedAt: s, endedAt: e });
    }
  };

  const finish = (status: string = "success", extra?: Record<string, unknown>): TimingReport => {
    if (finished) return buildReport(status);
    finished = true;
    const report = buildReport(status);

    if (isDev) {
      // Rich breakdown in development.
      // eslint-disable-next-line no-console
      console.groupCollapsed(
        `%c[save-timing] ${label} · ${status} · ${report.totalMs}ms`,
        "color:#1e3a5f;font-weight:bold",
      );
      // eslint-disable-next-line no-console
      console.table({
        "Click → Request sent (ms)": report.clickToSentMs ?? "n/a",
        "Server processing (ms)": report.serverProcessingMs ?? "n/a",
        "DB total (ms)": report.dbTotalMs,
        "Total (ms)": report.totalMs,
      });
      if (report.dbBreakdown.length > 0) {
        // eslint-disable-next-line no-console
        console.table(report.dbBreakdown);
      }
      if (extra) {
        // eslint-disable-next-line no-console
        console.log("extra", extra);
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
    } else {
      // Compact single-line log in production so it aggregates cleanly.
      // eslint-disable-next-line no-console
      console.info(
        `[save-timing] ${label} status=${status} total=${report.totalMs}ms ` +
          `clickToSent=${report.clickToSentMs ?? "n/a"}ms ` +
          `serverProc=${report.serverProcessingMs ?? "n/a"}ms ` +
          `dbTotal=${report.dbTotalMs}ms ` +
          `steps=${report.dbBreakdown.map(s => `${s.step}:${s.ms}ms`).join("|")}`,
      );
    }
    return report;
  };

  const buildReport = (status: string): TimingReport => {
    const tEnd = performance.now();
    const dbTotal = +dbSteps.reduce((a, s) => a + s.ms, 0).toFixed(1);
    // Server processing = time between request sent and last DB step ending,
    // minus DB time itself (i.e. non-DB server work).
    let serverProcessingMs: number | null = null;
    if (tSent != null && dbSteps.length > 0) {
      const lastDbEnd = dbSteps[dbSteps.length - 1].endedAt;
      serverProcessingMs = +(lastDbEnd - tSent - dbTotal).toFixed(1);
      if (serverProcessingMs < 0) serverProcessingMs = 0;
    }
    return {
      label,
      status,
      clickToSentMs: tClick != null && tSent != null ? +(tSent - tClick).toFixed(1) : null,
      serverProcessingMs,
      dbTotalMs: dbTotal,
      totalMs: +(tEnd - (tClick ?? t0)).toFixed(1),
      dbBreakdown: dbSteps.map(({ step, ms }) => ({ step, ms })),
    };
  };

  return { label, markClick, markRequestSent, timeDb, finish };
}
