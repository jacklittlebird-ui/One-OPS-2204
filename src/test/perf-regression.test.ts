import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Performance regression test.
 *
 * Compares the most recent snapshot in scripts/perf-snapshots/ against
 * baseline.json. A query whose mean execution time has grown by more than
 * REGRESSION_THRESHOLD compared to the baseline is flagged.
 *
 * The test is SKIPPED unless a snapshot newer than the baseline exists,
 * so unit-test CI does not block on missing DB access. To enable in CI:
 *   1. Run `node scripts/perf-snapshot.mjs` against the live DB (psql env vars set).
 *   2. Run `vitest run src/test/perf-regression.test.ts`.
 */
const REGRESSION_THRESHOLD = 1.5; // 50% slower than baseline → fail
const DIR = join(process.cwd(), "scripts", "perf-snapshots");
const BASELINE = join(DIR, "baseline.json");

function latestSnapshot(): string | null {
  if (!existsSync(DIR)) return null;
  const files = readdirSync(DIR)
    .filter((f) => f.endsWith(".json") && f !== "baseline.json")
    .sort();
  return files.length ? join(DIR, files[files.length - 1]) : null;
}

describe("pg_stat_statements regression check", () => {
  const snapPath = latestSnapshot();
  const haveBaseline = existsSync(BASELINE);

  if (!snapPath || !haveBaseline) {
    it.skip("no snapshot or baseline present — run `node scripts/perf-snapshot.mjs` first", () => {});
    return;
  }

  const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
  const snapshot = JSON.parse(readFileSync(snapPath, "utf8"));
  const baseMap = new Map<string, any>(baseline.rows.map((r: any) => [r.fingerprint, r]));

  it("no tracked query is >50% slower than baseline", () => {
    const regressions: any[] = [];
    for (const cur of snapshot.rows) {
      const prev = baseMap.get(cur.fingerprint);
      if (!prev) continue;
      if (Number(prev.mean_ms) <= 1) continue; // ignore sub-ms noise
      const ratio = Number(cur.mean_ms) / Number(prev.mean_ms);
      if (ratio >= REGRESSION_THRESHOLD) {
        regressions.push({
          fingerprint: cur.fingerprint.slice(0, 80),
          baseline_mean_ms: prev.mean_ms,
          current_mean_ms: cur.mean_ms,
          ratio: Number(ratio.toFixed(2)),
        });
      }
    }
    expect(regressions, `Performance regressions:\n${JSON.stringify(regressions, null, 2)}`).toEqual([]);
  });

  it("no tracked query exceeds 250ms mean", () => {
    const slow = snapshot.rows
      .filter((r: any) => Number(r.mean_ms) > 250)
      .map((r: any) => ({ fingerprint: r.fingerprint.slice(0, 80), mean_ms: r.mean_ms, calls: r.calls }));
    expect(slow, `Slow queries:\n${JSON.stringify(slow, null, 2)}`).toEqual([]);
  });
});
