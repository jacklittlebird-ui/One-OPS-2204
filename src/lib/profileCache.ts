// Persistent local-storage cache for per-user profile fields (station, full_name).
// Mirrors roleCache.ts. profiles.station was the #6 slowest query with ~12k calls —
// the value is virtually static per user, so a localStorage layer with a TTL
// removes the round-trip on every route/dashboard mount.
const PROFILE_CACHE_PREFIX = "linkaero:user_profile:v1:";
const PROFILE_TS_SUFFIX = ":ts";
const PROFILE_FRESH_MS = 45 * 60 * 1000; // 45 minutes

const storage: Storage | null =
  typeof window !== "undefined" && window.localStorage ? window.localStorage : null;

export interface CachedProfile {
  station: string | null;
  full_name?: string | null;
}

export function readCachedProfile(userId: string): CachedProfile | null {
  try {
    const raw = storage?.getItem(PROFILE_CACHE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as CachedProfile;
  } catch {
    return null;
  }
}

export function isCachedProfileFresh(userId: string): boolean {
  try {
    const ts = Number(storage?.getItem(PROFILE_CACHE_PREFIX + userId + PROFILE_TS_SUFFIX) || 0);
    return ts > 0 && Date.now() - ts < PROFILE_FRESH_MS;
  } catch {
    return false;
  }
}

export function writeCachedProfile(userId: string, profile: CachedProfile) {
  try {
    storage?.setItem(PROFILE_CACHE_PREFIX + userId, JSON.stringify(profile));
    storage?.setItem(PROFILE_CACHE_PREFIX + userId + PROFILE_TS_SUFFIX, String(Date.now()));
  } catch { /* quota — ignore */ }
}

export function clearCachedProfile(userId?: string) {
  try {
    if (!storage) return;
    if (userId) {
      storage.removeItem(PROFILE_CACHE_PREFIX + userId);
      storage.removeItem(PROFILE_CACHE_PREFIX + userId + PROFILE_TS_SUFFIX);
    } else {
      for (const k of Object.keys(storage)) {
        if (k.startsWith(PROFILE_CACHE_PREFIX)) storage.removeItem(k);
      }
    }
  } catch { /* ignore */ }
}
