import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, RefreshCw, ExternalLink, ShieldAlert } from "lucide-react";

interface Check { id: string; ok: boolean; detail?: string }
interface Report { passed: boolean; checks: Check[]; scanned_at: string }

const ACCEPTED_0029 = [
  { fn: "has_role", reason: "Required by RLS policies for authenticated users." },
  { fn: "is_admin", reason: "Required by RLS policies for authenticated users." },
  { fn: "has_ops_access", reason: "Required by RLS policies for authenticated users." },
  { fn: "has_finance_access", reason: "Required by RLS policies for authenticated users." },
];

export default function SecurityStatus() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("security-postdeploy-check");
      if (error) throw error;
      setReport(data as Report);
    } catch (e: any) {
      setError(e?.message ?? "Failed to run security check");
    } finally { setLoading(false); }
  };

  useEffect(() => { run(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" /> Security Status
          </h1>
          <p className="text-sm text-muted-foreground">Post-deployment security verification & accepted-risk register.</p>
        </div>
        <Button onClick={run} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Re-run check
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Post-Deploy Check</span>
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
          {report?.checks.map((c) => (
            <div key={c.id} className="flex items-start gap-3 p-3 rounded-md border">
              {c.ok
                ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                : <XCircle className="h-5 w-5 text-destructive mt-0.5" />}
              <div className="flex-1">
                <div className="font-medium text-sm">{c.id}</div>
                {c.detail && <div className="text-xs text-muted-foreground mt-1 break-all">{c.detail}</div>}
              </div>
            </div>
          ))}
          {report && (
            <p className="text-xs text-muted-foreground">
              Scanned at: {new Date(report.scanned_at).toLocaleString("en-GB")}
            </p>
          )}
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
