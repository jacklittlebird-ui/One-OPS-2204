import { useState, useMemo, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Search, Filter, Clock, User, Activity, Download, AlertTriangle, Eye, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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

const ACTION_STYLES: Record<string, { className: string }> = {
  login: { className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  login_failed: { className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" },
  logout: { className: "bg-muted text-muted-foreground" },
  create: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200" },
  update: { className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  delete: { className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" },
  approve: { className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  reject: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200" },
  export: { className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200" },
  view: { className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  settings_change: { className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200" },
  role_change: { className: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200" },
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

interface Filters {
  search: string;
  actionFilter: string;
  entityFilter: string;
  dateFrom: string;
  dateTo: string;
}

/**
 * Apply the active filters to a Supabase query builder so the same logic is
 * reused for paginated reads, count queries, and CSV exports.
 */
function applyFilters(qb: any, f: Filters) {
  if (f.actionFilter !== "all") qb = qb.eq("action", f.actionFilter);
  if (f.entityFilter !== "all") qb = qb.eq("entity_type", f.entityFilter);
  if (f.dateFrom) qb = qb.gte("created_at", `${f.dateFrom}T00:00:00.000Z`);
  if (f.dateTo) qb = qb.lte("created_at", `${f.dateTo}T23:59:59.999Z`);
  if (f.search.trim()) {
    const s = f.search.trim().replace(/[%,]/g, "");
    qb = qb.or(
      `user_email.ilike.%${s}%,action.ilike.%${s}%,entity_type.ilike.%${s}%,entity_id.ilike.%${s}%,ip_address.ilike.%${s}%`
    );
  }
  return qb;
}

function csvEscape(v: any): string {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce the search box so each keystroke doesn't hit the server.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters: Filters = useMemo(
    () => ({ search: debouncedSearch, actionFilter, entityFilter, dateFrom, dateTo }),
    [debouncedSearch, actionFilter, entityFilter, dateFrom, dateTo]
  );

  // Reset to page 1 whenever filters or page size change.
  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  // Server-side paginated page of rows + exact total count for current filters.
  const { data: pageData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["audit_logs", "page", filters, page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let qb: any = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      qb = applyFilters(qb, filters);
      const { data, error, count } = await qb;
      if (error) throw error;
      return { rows: (data || []) as AuditLogEntry[], total: count || 0 };
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const rows = pageData?.rows || [];
  const total = pageData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fromRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRow = Math.min(page * pageSize, total);

  // Stats query — counts only, run once and cached.
  const { data: stats } = useQuery({
    queryKey: ["audit_logs", "stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [totalRes, todayRes, criticalRes, usersRes] = await Promise.all([
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00.000Z`),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }).in("action", ["login_failed", "delete"]),
        supabase.from("audit_logs").select("user_id").limit(5000),
      ]);
      const uniqueUsers = new Set((usersRes.data || []).map((r: any) => r.user_id)).size;
      return {
        total: totalRes.count || 0,
        today: todayRes.count || 0,
        failures: criticalRes.count || 0,
        uniqueUsers,
      };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Distinct values for the action / entity selects (small sample is enough).
  const { data: facets } = useQuery({
    queryKey: ["audit_logs", "facets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("action,entity_type")
        .order("created_at", { ascending: false })
        .limit(2000);
      const actions = [...new Set((data || []).map((r: any) => r.action))].filter(Boolean).sort();
      const entities = [...new Set((data || []).map((r: any) => r.entity_type))].filter(Boolean).sort();
      return { actions, entities };
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const actions = facets?.actions || [];
  const entities = facets?.entities || [];

  const handleExport = async () => {
    if (total === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const BATCH = 1000;
      const all: AuditLogEntry[] = [];
      const cap = Math.min(total, 50_000); // safety cap
      for (let offset = 0; offset < cap; offset += BATCH) {
        let qb: any = supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .range(offset, Math.min(offset + BATCH - 1, cap - 1));
        qb = applyFilters(qb, filters);
        const { data, error } = await qb;
        if (error) throw error;
        all.push(...((data || []) as AuditLogEntry[]));
        if (!data || data.length < BATCH) break;
      }
      const headers = ["Timestamp", "User Email", "User ID", "Action", "Entity Type", "Entity ID", "IP Address", "User Agent", "Details"];
      const csvRows = all.map((l) => [
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
      const csv = [headers, ...csvRows].map((r) => r.map(csvEscape).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
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
          <Button size="sm" onClick={handleExport} disabled={total === 0 || isExporting}>
            <Download className={`h-4 w-4 mr-1 ${isExporting ? "animate-pulse" : ""}`} />
            {isExporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary opacity-70" />
            <div>
              <p className="text-2xl font-bold">{stats?.total ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary opacity-70" />
            <div>
              <p className="text-2xl font-bold">{stats?.today ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <User className="h-8 w-8 text-primary opacity-70" />
            <div>
              <p className="text-2xl font-bold">{stats?.uniqueUsers ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Unique Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive opacity-70" />
            <div>
              <p className="text-2xl font-bold">{stats?.failures ?? "—"}</p>
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
              <label className="text-xs text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Entity</label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entities.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            Audit Events ({total.toLocaleString()})
          </CardTitle>
          {isFetching && !isLoading && (
            <Badge variant="outline" className="text-xs">Updating…</Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : rows.length === 0 ? (
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
                  {rows.map((log) => {
                    const style = ACTION_STYLES[log.action] || { className: "bg-muted text-muted-foreground" };
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

          {/* Pagination footer */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  Showing <span className="font-medium text-foreground">{fromRow.toLocaleString()}–{toRow.toLocaleString()}</span> of{" "}
                  <span className="font-medium text-foreground">{total.toLocaleString()}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-8 w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page <= 1 || isFetching}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isFetching}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2 min-w-[90px] text-center">
                  Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isFetching}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page >= totalPages || isFetching}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
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
