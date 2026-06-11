// Persistent local-storage cache for user roles.
// Kept in its own module so AuthContext and ChannelContext can both use
// it without creating a circular import.
// localStorage is used (not sessionStorage) so the cache survives new tabs
// and reloads — roles are "almost static" per the architecture blueprint.
const ROLES_CACHE_PREFIX = "linkaero:user_roles:v2:";
const ROLES_TS_SUFFIX = ":ts";
// Within this window we trust the cached roles and skip the DB re-verify entirely.
// Bumped from 10m → 45m: user_roles was the #5 slowest query with 12k+ calls.
const ROLES_FRESH_MS = 45 * 60 * 1000; // 45 minutes

const storage: Storage | null =
  typeof window !== "undefined" && window.localStorage ? window.localStorage : null;

export function readCachedRoles(userId: string): string[] | null {
  try {
    const raw = sessionStorage.getItem(ROLES_CACHE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((r) => typeof r === "string");
  } catch {
    return null;
  }
}

export function isCachedRolesFresh(userId: string): boolean {
  try {
    const ts = Number(sessionStorage.getItem(ROLES_CACHE_PREFIX + userId + ROLES_TS_SUFFIX) || 0);
    return ts > 0 && Date.now() - ts < ROLES_FRESH_MS;
  } catch {
    return false;
  }
}

export function writeCachedRoles(userId: string, roles: string[]) {
  try {
    sessionStorage.setItem(ROLES_CACHE_PREFIX + userId, JSON.stringify(roles));
    sessionStorage.setItem(ROLES_CACHE_PREFIX + userId + ROLES_TS_SUFFIX, String(Date.now()));
  } catch { /* ignore quota errors */ }
}

export function clearCachedRoles(userId?: string) {
  try {
    if (userId) {
      sessionStorage.removeItem(ROLES_CACHE_PREFIX + userId);
      sessionStorage.removeItem(ROLES_CACHE_PREFIX + userId + ROLES_TS_SUFFIX);
    } else {
      for (const k of Object.keys(sessionStorage)) {
        if (k.startsWith(ROLES_CACHE_PREFIX)) sessionStorage.removeItem(k);
      }
    }
  } catch { /* ignore */ }
}
