import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Search, Filter, Clock, User, Activity, Download, AlertTriangle, Eye, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

const ACTION_STYLES: Record<string, { className: string; severity: "info" | "warn" | "danger" | "success" }> = {
  login: { className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200", severity: "success" },
  login_failed: { className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200", severity: "danger" },
  logout: { className: "bg-muted text-muted-foreground", severity: "info" },
  create: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200", severity: "info" },
  update: { className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200", severity: "warn" },
  delete: { className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200", severity: "danger" },
  approve: { className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200", severity: "success" },
  reject: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200", severity: "warn" },
  export: { className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200", severity: "info" },
  view: { className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200", severity: "info" },
  settings_change: { className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200", severity: "warn" },
  role_change: { className: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200", severity: "warn" },
};

function csvEscape(v: any): string {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);
  const entities = useMemo(() => [...new Set(logs.map((l) => l.entity_type))].sort(), [logs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        log.user_email.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entity_type.toLowerCase().includes(q) ||
        log.entity_id.toLowerCase().includes(q) ||
        (log.ip_address || "").toLowerCase().includes(q);
      const matchAction = actionFilter === "all" || log.action === actionFilter;
      const matchEntity = entityFilter === "all" || log.entity_type === entityFilter;
      const ts = log.created_at.slice(0, 10);
      const matchFrom = !dateFrom || ts >= dateFrom;
      const matchTo = !dateTo || ts <= dateTo;
      return matchSearch && matchAction && matchEntity && matchFrom && matchTo;
    });
  }, [logs, search, actionFilter, entityFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter((l) => l.created_at.slice(0, 10) === today);
    const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;
    const failures = logs.filter((l) => l.action === "login_failed" || l.action === "delete").length;
    return { total: logs.length, today: todayLogs.length, uniqueUsers, failures };
  }, [logs]);

  const handleExport = () => {
    const headers = ["Timestamp", "User Email", "User ID", "Action", "Entity Type", "Entity ID", "IP Address", "User Agent", "Details"];
    const rows = filtered.map((l) => [
      l.created_at,
      l.user_email,
      l.user_id,
      l.action,
      l.entity_type,
      l.entity_id,
      l.ip_address,
      l.user_agent,
      l.details,
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Security Audit Log</h1>
            <p className="text-sm text-muted-foreground">Track all system activities and security events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary opacity-70" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary opacity-70" />
            <div>
              <p className="text-2xl font-bold">{stats.today}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <User className="h-8 w-8 text-primary opacity-70" />
            <div>
              <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
              <p className="text-xs text-muted-foreground">Unique Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive opacity-70" />
            <div>
              <p className="text-2xl font-bold">{stats.failures}</p>
              <p className="text-xs text-muted-foreground">Critical Events</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search user, action, entity, IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Audit Events ({filtered.length})
          </CardTitle>
          {logs.length >= 1000 && (
            <Badge variant="outline" className="text-xs">Showing latest 1,000</Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No audit log entries found</p>
              <p className="text-xs mt-1">Events will appear here as users interact with the system</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px]">Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => {
                    const style = ACTION_STYLES[log.action] || { className: "bg-muted text-muted-foreground", severity: "info" as const };
                    return (
                      <TableRow key={log.id} className="cursor-pointer" onClick={() => setSelected(log)}>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell className="text-sm">{log.user_email || "—"}</TableCell>
                        <TableCell>
                          <Badge className={style.className} variant="secondary">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.entity_type || "—"}</TableCell>
                        <TableCell className="text-xs font-mono max-w-[140px] truncate">{log.entity_id || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{log.ip_address || "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelected(log); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Audit Event Details
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Timestamp</p>
                  <p className="font-mono">{format(new Date(selected.created_at), "dd/MM/yyyy HH:mm:ss")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Action</p>
                  <Badge className={(ACTION_STYLES[selected.action] || { className: "bg-muted" }).className} variant="secondary">
                    {selected.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User Email</p>
                  <p>{selected.user_email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs break-all">{selected.user_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entity Type</p>
                  <p>{selected.entity_type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entity ID</p>
                  <p className="font-mono text-xs break-all">{selected.entity_id || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IP Address</p>
                  <p className="font-mono">{selected.ip_address || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User Agent</p>
                  <p className="text-xs break-all">{selected.user_agent || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Details</p>
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(selected.details || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
