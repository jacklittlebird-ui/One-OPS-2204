# Performance snapshots

This folder stores `pg_stat_statements` snapshots used by the perf
regression test (`src/test/perf-regression.test.ts`).

## Capture a snapshot

The script uses `psql` with the standard `PG*` env vars (which Lovable
Cloud / the dev sandbox provide automatically).

```bash
node scripts/perf-snapshot.mjs                # writes <timestamp>.json
node scripts/perf-snapshot.mjs --baseline     # also overwrites baseline.json
node scripts/perf-snapshot.mjs --diff <file>  # compare baseline vs snapshot
```

## How the alert fires

`vitest run src/test/perf-regression.test.ts` reads `baseline.json` plus
the newest timestamped snapshot in this folder and fails if any tracked
query is:

- more than **50% slower** than baseline (`mean_ms` ratio ≥ 1.5), or
- absolute `mean_ms > 250`.

The test is **skipped** when no snapshot is present, so normal CI runs
without DB access pass cleanly. Wire it into a scheduled job that runs
the snapshot script first, then the test, to get an automated alert.

## Updating the baseline

Take a snapshot after each intentional performance change and commit it
with `--baseline` so future regressions are measured against the new
floor instead of the old one.
