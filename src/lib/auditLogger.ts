import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "export"
  | "view"
  | "settings_change"
  | "role_change";

export interface AuditPayload {
  action: AuditAction | string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  user_id?: string;
  user_email?: string;
}

let cachedIp: string | null = null;
async function getClientIp(): Promise<string> {
  if (cachedIp !== null) return cachedIp;
  try {
    const res = await fetch("https://api.ipify.org?format=json", { cache: "force-cache" });
    const j = await res.json();
    cachedIp = j.ip || "";
  } catch {
    cachedIp = "";
  }
  return cachedIp;
}

/**
 * Write an entry to the security audit log. Fire-and-forget; never throws.
 */
export async function logAudit(payload: AuditPayload): Promise<void> {
  try {
    let userId = payload.user_id;
    let userEmail = payload.user_email;
    if (!userId || !userEmail) {
      const { data } = await supabase.auth.getUser();
      userId = userId || data.user?.id || "00000000-0000-0000-0000-000000000000";
      userEmail = userEmail || data.user?.email || "anonymous";
    }
    const ip = await getClientIp();
    await supabase.from("audit_logs").insert({
      user_id: userId,
      user_email: userEmail,
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id || "",
      details: payload.details || {},
      ip_address: ip,
      user_agent: navigator.userAgent.slice(0, 500),
    });
  } catch (err) {
    // Silent — audit log must never break user flow
    console.warn("[audit] failed to write log", err);
  }
}
