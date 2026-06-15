// Lightweight query telemetry (Batch 2).
//
// Subscribes to the React Query cache and counts fetches per route.
// Logs a compact summary to the console on each navigation so the team
// can verify Batch 2's "≥40% fewer queries per page load" target without
// pulling in an analytics SDK. No-op in production builds.

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { QueryClient } from "@tanstack/react-query";

interface Bucket {
  route: string;
  fetchCount: number;
  totalMs: number;
  start: number;
  byKey: Map<string, { count: number; totalMs: number }>;
}

const buckets: Bucket[] = [];

function currentBucket(): Bucket | null {
  return buckets[buckets.length - 1] ?? null;
}

function flush() {
  const b = currentBucket();
  if (!b || b.fetchCount === 0) return;
  const elapsed = Math.round(performance.now() - b.start);
  const avg = b.fetchCount ? Math.round(b.totalMs / b.fetchCount) : 0;
  const top = [...b.byKey.entries()]
    .sort((a, z) => z[1].totalMs - a[1].totalMs)
    .slice(0, 5)
    .map(([k, v]) => `${k} ×${v.count} (${Math.round(v.totalMs)}ms)`);
  // eslint-disable-next-line no-console
  console.info(
    `[query-telemetry] ${b.route} — ${b.fetchCount} fetches in ${elapsed}ms (avg ${avg}ms)\n  top: ${top.join(" | ")}`,
  );
}

export function useQueryTelemetry(qc: QueryClient) {
  const location = useLocation();
  const subscribed = useRef(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (subscribed.current) return;
    subscribed.current = true;
    const cache = qc.getQueryCache();
    const unsub = cache.subscribe((evt: any) => {
      const b = currentBucket();
      if (!b) return;
      // React Query v5: 'observerResultsUpdated' includes fetch state.
      const q = evt?.query;
      if (!q) return;
      const state = q.state;
      // Detect a completed fetch: dataUpdatedAt or errorUpdatedAt within bucket window.
      if (evt.type === "updated" && state.fetchStatus === "idle") {
        const finishedAt = Math.max(state.dataUpdatedAt || 0, state.errorUpdatedAt || 0);
        if (finishedAt && finishedAt >= b.start - 5_000) {
          // Best-effort duration: now − last fetch start, fall back to 0.
          const duration = (state as any).fetchMeta?.duration || 0;
          const key = JSON.stringify(q.queryKey).slice(0, 80);
          b.fetchCount += 1;
          b.totalMs += duration;
          const prev = b.byKey.get(key) || { count: 0, totalMs: 0 };
          prev.count += 1;
          prev.totalMs += duration;
          b.byKey.set(key, prev);
        }
      }
    });
    return () => unsub();
  }, [qc]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    flush();
    buckets.push({
      route: location.pathname,
      fetchCount: 0,
      totalMs: 0,
      start: performance.now(),
      byKey: new Map(),
    });
    // Flush again after 5s to capture late-arriving fetches on the new route.
    const t = window.setTimeout(flush, 5_000);
    return () => window.clearTimeout(t);
  }, [location.pathname]);
}
