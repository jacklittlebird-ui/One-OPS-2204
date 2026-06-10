// Standalone session-storage cache for user roles.
// Kept in its own module so AuthContext and ChannelContext can both use
// it without creating a circular import.
const ROLES_CACHE_PREFIX = "linkaero:user_roles:v1:";

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

export function writeCachedRoles(userId: string, roles: string[]) {
  try {
    sessionStorage.setItem(ROLES_CACHE_PREFIX + userId, JSON.stringify(roles));
  } catch { /* ignore quota errors */ }
}

export function clearCachedRoles(userId?: string) {
  try {
    if (userId) {
      sessionStorage.removeItem(ROLES_CACHE_PREFIX + userId);
    } else {
      for (const k of Object.keys(sessionStorage)) {
        if (k.startsWith(ROLES_CACHE_PREFIX)) sessionStorage.removeItem(k);
      }
    }
  } catch { /* ignore */ }
}
