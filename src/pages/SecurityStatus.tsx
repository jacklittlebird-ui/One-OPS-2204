import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/auditLogger";
import {
  CheckCircle2, XCircle, RefreshCw, ExternalLink, ShieldAlert, ChevronDown,
} from "lucide-react";

interface Check { id: string; ok: boolean; detail?: string }
interface Report { passed: boolean; checks: Check[]; scanned_at: string }
interface StoredRun { id: string; passed: boolean; checks: Check[]; source: string; created_at: string }

const ACCEPTED_0029 = [
  { fn: "has_role", reason: "Required by RLS policies for authenticated users." },
  { fn: "is_admin", reason: "Required by RLS policies for authenticated users." },
  { fn: "has_ops_access", reason: "Required by RLS policies for authenticated users." },
  { fn: "has_finance_access", reason: "Required by RLS policies for authenticated users." },
];

export default function SecurityStatus() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<StoredRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Admin gate (audit any denied attempt)
  useEffect(() => {
    (async () => {
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const ok = !!data;
      setIsAdmin(ok);
      if (!ok) {
        await logAudit({
          action: "access_denied",
          entity_type: "page",
          entity_id: "/security-status",
          details: { reason: "non-admin user attempted to view security status" },
        });
      }
    })();
  }, [user]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("security_check_runs")
      .select("*").order("created_at", { ascending: false }).limit(2);
    setHistory((data as StoredRun[]) ?? []);
  };

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("security-postdeploy-check");
      if (error) throw error;
      setReport(data as Report);
      await loadHistory();
    } catch (e: any) {
      setError(e?.message ?? "Failed to run security check");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isAdmin) { run(); loadHistory(); } }, [isAdmin]);

  if (isAdmin === false) return <Navigate to="/" replace />;
  if (isAdmin === null) return <div className="p-6 text-sm text-muted-foreground">Checking permissions…</div>;

  const renderChecks = (checks: Check[], scopeId: string) => (
    <div className="space-y-2">
      {checks.map((c) => {
        const key = `${scopeId}:${c.id}`;
        return (
          <Collapsible key={key} open={openId === key} onOpenChange={(o) => setOpenId(o ? key : null)}>
            <div className={`p-3 rounded-md border ${c.ok ? "" : "border-destructive/50"}`}>
              <div className="flex items-start gap-3">
                {c.ok ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      : <XCircle className="h-5 w-5 text-destructive mt-0.5" />}
                <div className="flex-1">
                  <div className="font-medium text-sm">{c.id}</div>
                </div>
                <CollapsibleTrigger asChild>
                  <Button size="sm" variant="ghost"><ChevronDown className="h-4 w-4" /> Details</Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="mt-2 pl-8">
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
{c.detail || "(no details)"}
                </pre>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" /> Security Status
          </h1>
          <p className="text-sm text-muted-foreground">
            Post-deployment security verification, run history & accepted-risk register.
          </p>
        </div>
        <Button onClick={run} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Re-run check
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Run</span>
            {report && (
              <Badge variant={report.passed ? "default" : "destructive"}>
                {report.passed ? "PASSED" : "FAILED"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!report && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
          {report && renderChecks(report.checks, "current")}
          {report && (
            <p className="text-xs text-muted-foreground">
              Scanned at: {new Date(report.scanned_at).toLocaleString("en-GB")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Last 2 Recorded Runs</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {history.length === 0 && <p className="text-sm text-muted-foreground">No history yet.</p>}
          {history.map((h) => (
            <div key={h.id} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{new Date(h.created_at).toLocaleString("en-GB")}</span>
                  <span className="ml-2 text-xs text-muted-foreground">via {h.source}</span>
                </div>
                <Badge variant={h.passed ? "default" : "destructive"}>{h.passed ? "PASSED" : "FAILED"}</Badge>
              </div>
              {renderChecks(h.checks, h.id)}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>0029 — SECURITY DEFINER warnings (Accepted Risk)</span>
            <a
              href="https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable"
              target="_blank" rel="noreferrer"
              className="text-xs flex items-center gap-1 text-primary hover:underline"
            >
              Details <ExternalLink className="h-3 w-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            The following SECURITY DEFINER functions remain executable by authenticated users
            because RLS policies depend on them. Documented in the security memory.
          </p>
          <div className="space-y-2">
            {ACCEPTED_0029.map((r) => (
              <div key={r.fn} className="flex items-center justify-between p-2 rounded border">
                <code className="text-sm">public.{r.fn}()</code>
                <span className="text-xs text-muted-foreground">{r.reason}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
