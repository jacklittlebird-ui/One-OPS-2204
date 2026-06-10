#!/usr/bin/env node
/**
 * Snapshot pg_stat_statements for the Lovable Cloud / Supabase database
 * and write it to scripts/perf-snapshots/<timestamp>.json.
 *
 * Usage:
 *   PGHOST=... PGPORT=... PGUSER=... PGPASSWORD=... PGDATABASE=... \
 *     node scripts/perf-snapshot.mjs               # take a snapshot
 *   node scripts/perf-snapshot.mjs --baseline      # also overwrite baseline
 *   node scripts/perf-snapshot.mjs --diff <file>   # compare baseline vs a snapshot
 *
 * The output is the top 25 statements by total_exec_time across user
 * schemas, with `query` normalised to a short fingerprint. The companion
 * test `src/test/perf-regression.test.ts` consumes the baseline JSON and
 * fails CI when a snapshot shows a > 50% regression on any tracked query.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIR = join(ROOT, "scripts", "perf-snapshots");
const BASELINE = join(DIR, "baseline.json");
mkdirSync(DIR, { recursive: true });

const args = new Set(process.argv.slice(2));

const SQL = `
SELECT json_agg(row_to_json(t)) FROM (
  SELECT
    substring(regexp_replace(query, '\\s+', ' ', 'g') for 200) AS fingerprint,
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    round(max_exec_time::numeric, 2) AS max_ms
  FROM pg_stat_statements s
  JOIN pg_database d ON d.oid = s.dbid
  WHERE d.datname = current_database()
    AND query NOT ILIKE '%pg_stat_statements%'
  ORDER BY total_exec_time DESC
  LIMIT 25
) t;
`;

function takeSnapshot() {
  const raw = execSync(`psql -At -c ${JSON.stringify(SQL)}`, { encoding: "utf8" });
  const rows = JSON.parse(raw.trim() || "[]");
  return { taken_at: new Date().toISOString(), rows };
}

function diff(baseline, snapshot, threshold = 1.5) {
  const baseMap = new Map(baseline.rows.map((r) => [r.fingerprint, r]));
  const regressions = [];
  for (const cur of snapshot.rows) {
    const prev = baseMap.get(cur.fingerprint);
    if (!prev) continue;
    if (Number(prev.mean_ms) <= 1) continue; // ignore noise
    const ratio = Number(cur.mean_ms) / Number(prev.mean_ms);
    if (ratio >= threshold) {
      regressions.push({
        fingerprint: cur.fingerprint,
        baseline_mean_ms: prev.mean_ms,
        current_mean_ms: cur.mean_ms,
        ratio: Number(ratio.toFixed(2)),
      });
    }
  }
  return regressions;
}

if (args.has("--diff")) {
  const file = process.argv[process.argv.indexOf("--diff") + 1];
  if (!file || !existsSync(file)) { console.error("Snapshot file not found:", file); process.exit(2); }
  if (!existsSync(BASELINE)) { console.error("No baseline at", BASELINE); process.exit(2); }
  const regressions = diff(JSON.parse(readFileSync(BASELINE, "utf8")), JSON.parse(readFileSync(file, "utf8")));
  if (regressions.length) {
    console.error("Performance regressions detected:");
    console.error(JSON.stringify(regressions, null, 2));
    process.exit(1);
  }
  console.log("No regressions vs baseline.");
  process.exit(0);
}

const snap = takeSnapshot();
const path = join(DIR, `${snap.taken_at.replace(/[:.]/g, "-")}.json`);
writeFileSync(path, JSON.stringify(snap, null, 2));
console.log("Wrote", path);

if (args.has("--baseline")) {
  writeFileSync(BASELINE, JSON.stringify(snap, null, 2));
  console.log("Updated baseline", BASELINE);
}
