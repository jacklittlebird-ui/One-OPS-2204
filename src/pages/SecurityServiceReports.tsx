import { useState, useMemo, useCallback } from "react";
import {
  Search, Plus, Download, Shield, Plane, Building2, Clock, Users,
  ChevronLeft, ChevronRight, Pencil, CheckCircle2, XCircle, AlertTriangle,
  FileBarChart2, DollarSign, MessageSquare, ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const PAGE_SIZE = 15;

const REVIEW_STATUSES = ["Draft", "Pending Review", "Approved", "Ready for Billing"] as const;

const reviewStatusConfig: Record<string, { icon: React.ReactNode; cls: string }> = {
  "Draft": { icon: <Pencil size={11} />, cls: "bg-muted text-muted-foreground" },
  "Pending Review": { icon: <Clock size={11} />, cls: "bg-warning/15 text-warning" },
  "Approved": { icon: <CheckCircle2 size={11} />, cls: "bg-success/15 text-success" },
  "Ready for Billing": { icon: <DollarSign size={11} />, cls: "bg-primary/15 text-primary" },
  "Rejected": { icon: <XCircle size={11} />, cls: "bg-destructive/15 text-destructive" },
};

const dispatchStatusConfig: Record<string, string> = {
  "Pending": "bg-muted text-muted-foreground",
  "Dispatched": "bg-info/15 text-info",
  "Completed": "bg-success/15 text-success",
};

interface DispatchRow {
  id: string;
  flight_schedule_id: string | null;
  contract_id: string | null;
  station: string;
  airline: string;
  flight_no: string;
  flight_date: string;
  service_type: string;
  staff_names: string;
  staff_count: number;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string;
  actual_end: string;
  contract_duration_hours: number;
  actual_duration_hours: number;
  overtime_hours: number;
  overtime_rate: number;
  base_fee: number;
  service_rate: number;
  overtime_charge: number;
  total_charge: number;
  status: string;
  notes: string;
  dispatched_by: string;
  review_status: string;
  review_comment: string;
  reviewed_by: string;
  reviewed_at: string | null;
  irregularity_id: string | null;
  created_at: string;
  updated_at: string;
}

function timeDiffHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  if ([h1, m1, h2, m2].some(isNaN)) return 0;
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60;
  return +(diff / 60).toFixed(2);
}

export default function SecurityServiceReportsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("All Stations");
  const [reviewFilter, setReviewFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All Types");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [editRow, setEditRow] = useState<DispatchRow | null>(null);
  const [reviewRow, setReviewRow] = useState<DispatchRow | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  // Fetch dispatch assignments (completed ones = service reports)
  const { data: dispatches = [], isLoading } = useQuery({
    queryKey: ["dispatch_assignments", "service-reports", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_assignments")
        .select("*")
        .order("flight_date", { ascending: false });
      if (error) throw error;
      return data as DispatchRow[];
    },
    enabled: !!session,
  });

  // Fetch irregularity reports for linking
  const { data: irregularities = [] } = useQuery({
    queryKey: ["irregularity_reports", "for-service-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("irregularity_reports")
        .select("id, report_id, flight_no, station, severity, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Update mutation for editing service report details
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<DispatchRow> & { id: string }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase
        .from("dispatch_assignments")
        .update(rest as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
      toast({ title: "Updated", description: "Service report updated." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Filters
  const allStations = useMemo(() => [...new Set(dispatches.map(d => d.station))].sort(), [dispatches]);
  const allServiceTypes = useMemo(() => [...new Set(dispatches.map(d => d.service_type))].sort(), [dispatches]);

  const filtered = useMemo(() => {
    let rows = dispatches;
    if (stationFilter !== "All Stations") rows = rows.filter(r => r.station === stationFilter);
    if (reviewFilter !== "All") rows = rows.filter(r => r.review_status === reviewFilter);
    if (serviceFilter !== "All Types") rows = rows.filter(r => r.service_type === serviceFilter);
    if (dateFrom) rows = rows.filter(r => r.flight_date >= dateFrom);
    if (dateTo) rows = rows.filter(r => r.flight_date <= dateTo);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.airline.toLowerCase().includes(s) ||
        r.flight_no.toLowerCase().includes(s) ||
        r.staff_names.toLowerCase().includes(s) ||
        r.station.toLowerCase().includes(s)
      );
    }
    return rows;
  }, [dispatches, stationFilter, reviewFilter, serviceFilter, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs
  const totalReports = filtered.length;
  const completedReports = filtered.filter(r => r.status === "Completed").length;
  const approvedReports = filtered.filter(r => r.review_status === "Approved" || r.review_status === "Ready for Billing").length;
  const totalRevenue = filtered.reduce((s, r) => s + r.total_charge, 0);
  const totalOvertimeHrs = filtered.reduce((s, r) => s + r.overtime_hours, 0);
  const totalStaffDeployed = filtered.reduce((s, r) => s + r.staff_count, 0);
  const pendingReview = filtered.filter(r => r.review_status === "Pending Review").length;
  const readyForBilling = filtered.filter(r => r.review_status === "Ready for Billing").length;

  const linkedIrregularities = useMemo(() => {
    const map = new Map<string, typeof irregularities[0]>();
    irregularities.forEach(ir => map.set(ir.id, ir));
    return map;
  }, [irregularities]);

  // Edit dialog save
  const saveEdit = () => {
    if (!editRow) return;
    const actualHrs = timeDiffHours(editRow.actual_start, editRow.actual_end);
    const overtimeHrs = Math.max(0, actualHrs - editRow.contract_duration_hours);
    const overtimeCharge = overtimeHrs * editRow.overtime_rate * editRow.staff_count;
    const totalCharge = editRow.base_fee + (editRow.service_rate * editRow.staff_count) + overtimeCharge;

    updateMutation.mutate({
      id: editRow.id,
      staff_names: editRow.staff_names,
      staff_count: editRow.staff_count,
      actual_start: editRow.actual_start,
      actual_end: editRow.actual_end,
      actual_duration_hours: actualHrs,
      overtime_hours: overtimeHrs,
      overtime_charge: overtimeCharge,
      total_charge: totalCharge,
      notes: editRow.notes,
      status: "Completed",
      review_status: editRow.review_status === "Draft" ? "Draft" : editRow.review_status,
    });
    setEditRow(null);
  };

  // Submit for review
  const submitForReview = (row: DispatchRow) => {
    updateMutation.mutate({ id: row.id, review_status: "Pending Review" });
  };

  // Review actions
  const handleReviewAction = (action: "Approved" | "Rejected") => {
    if (!reviewRow) return;
    updateMutation.mutate({
      id: reviewRow.id,
      review_status: action,
      review_comment: reviewComment,
      reviewed_by: session?.user?.email || "Reviewer",
      reviewed_at: new Date().toISOString(),
    });
    setReviewRow(null);
    setReviewComment("");
  };

  const markReadyForBilling = (row: DispatchRow) => {
    updateMutation.mutate({ id: row.id, review_status: "Ready for Billing" });
  };

  // Export
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      "Station": r.station,
      "Airline": r.airline,
      "Flight No": r.flight_no,
      "Date": r.flight_date,
      "Service Type": r.service_type,
      "Staff Count": r.staff_count,
      "Staff Names": r.staff_names,
      "Scheduled Start": r.scheduled_start,
      "Scheduled End": r.scheduled_end,
      "Actual Start": r.actual_start,
      "Actual End": r.actual_end,
      "Contract Duration (h)": r.contract_duration_hours,
      "Actual Duration (h)": r.actual_duration_hours,
      "Overtime (h)": r.overtime_hours,
      "Base Fee": r.base_fee,
      "Service Rate": r.service_rate,
      "Overtime Charge": r.overtime_charge,
      "Total Charge": r.total_charge,
      "Dispatch Status": r.status,
      "Review Status": r.review_status,
      "Notes": r.notes,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Security Service Reports");
    XLSX.writeFile(wb, "Security_Service_Reports.xlsx");
  };

  const inputCls = "text-sm border rounded px-2.5 py-2 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield size={22} className="text-primary" /> Security Service Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Post-service documentation from dispatch assignments · Pipeline:{" "}
          <button onClick={() => navigate("/clearances")} className="text-primary hover:underline">Schedule</button>
          {" → "}
          <button onClick={() => navigate("/station-dispatch")} className="text-primary hover:underline">Dispatch</button>
          {" → "}
          <span className="font-semibold text-foreground">Service Reports</span>
          {" → "}
          <button onClick={() => navigate("/invoices")} className="text-primary hover:underline">Finance</button>
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card-icon bg-primary"><FileBarChart2 size={20} /></div>
          <div><div className="text-xl font-bold text-foreground">{totalReports}</div><div className="text-xs text-muted-foreground">Total Reports</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-success"><CheckCircle2 size={20} /></div>
          <div><div className="text-xl font-bold text-foreground">{approvedReports}</div><div className="text-xs text-muted-foreground">Approved</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-warning"><Clock size={20} /></div>
          <div><div className="text-xl font-bold text-foreground">{pendingReview}</div><div className="text-xs text-muted-foreground">Pending Review</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-info"><DollarSign size={20} /></div>
          <div><div className="text-xl font-bold text-foreground">${totalRevenue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Charges</div></div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-3 flex items-center gap-3">
          <Users size={16} className="text-muted-foreground" />
          <div><div className="text-sm font-bold text-foreground">{totalStaffDeployed}</div><div className="text-xs text-muted-foreground">Staff Deployed</div></div>
        </div>
        <div className="bg-card border rounded-lg p-3 flex items-center gap-3">
          <Clock size={16} className="text-muted-foreground" />
          <div><div className="text-sm font-bold text-foreground">{totalOvertimeHrs.toFixed(1)}h</div><div className="text-xs text-muted-foreground">Total Overtime</div></div>
        </div>
        <div className="bg-card border rounded-lg p-3 flex items-center gap-3">
          <Plane size={16} className="text-muted-foreground" />
          <div><div className="text-sm font-bold text-foreground">{completedReports}</div><div className="text-xs text-muted-foreground">Completed</div></div>
        </div>
        <div className="bg-card border rounded-lg p-3 flex items-center gap-3">
          <DollarSign size={16} className="text-muted-foreground" />
          <div><div className="text-sm font-bold text-foreground">{readyForBilling}</div><div className="text-xs text-muted-foreground">Ready for Billing</div></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Service Report Log</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text" placeholder="Search airline, flight, staff…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-56 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select value={stationFilter} onChange={e => { setStationFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Stations</option>
            {allStations.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={serviceFilter} onChange={e => { setServiceFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Types</option>
            {allServiceTypes.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={reviewFilter} onChange={e => { setReviewFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option>
            {REVIEW_STATUSES.map(s => <option key={s}>{s}</option>)}
            <option>Rejected</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="To" />
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["#", "STATION", "AIRLINE", "FLIGHT", "DATE", "TYPE", "STAFF", "ACTUAL TIME", "DURATION", "OT (h)", "CHARGE ($)", "STATUS", "REVIEW", "ACTIONS"].map(h => (
                  <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={14} className="text-center py-16 text-muted-foreground">Loading…</td></tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-16">
                    <Shield size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-semibold text-foreground">No Service Reports</p>
                    <p className="text-muted-foreground text-sm mt-1">Dispatched flights will appear here as service reports</p>
                  </td>
                </tr>
              ) : pageData.map((r, i) => {
                const rc = reviewStatusConfig[r.review_status] || reviewStatusConfig["Draft"];
                const sc = dispatchStatusConfig[r.status] || dispatchStatusConfig["Pending"];
                const hasIrregularity = r.irregularity_id && linkedIrregularities.has(r.irregularity_id);
                return (
                  <tr key={r.id} className="data-table-row">
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{r.station}</td>
                    <td className="px-3 py-2.5 text-foreground">{r.airline}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-foreground">{r.flight_no}</td>
                    <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{r.flight_date}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{r.service_type}</span>
                    </td>
                    <td className="px-3 py-2.5 text-foreground">{r.staff_count}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {r.actual_start && r.actual_end ? `${r.actual_start}–${r.actual_end}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-foreground">{r.actual_duration_hours ? `${r.actual_duration_hours}h` : "—"}</td>
                    <td className="px-3 py-2.5">
                      {r.overtime_hours > 0 ? (
                        <span className="text-warning font-semibold">{r.overtime_hours}h</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-success">{r.total_charge > 0 ? `$${r.total_charge.toLocaleString()}` : "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc}`}>{r.status}</span>
                      {hasIrregularity && (
                        <span title="Has irregularity"><AlertTriangle size={12} className="inline ml-1 text-destructive" /></span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${rc.cls}`}>
                        {rc.icon}{r.review_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditRow({ ...r })} className="p-1 rounded hover:bg-muted" title="Edit Report">
                          <Pencil size={14} className="text-muted-foreground" />
                        </button>
                        {r.review_status === "Draft" && r.status === "Completed" && (
                          <button onClick={() => submitForReview(r)} className="p-1 rounded hover:bg-muted" title="Submit for Review">
                            <ExternalLink size={14} className="text-primary" />
                          </button>
                        )}
                        {r.review_status === "Pending Review" && (
                          <button onClick={() => { setReviewRow(r); setReviewComment(r.review_comment); }} className="p-1 rounded hover:bg-muted" title="Review">
                            <MessageSquare size={14} className="text-warning" />
                          </button>
                        )}
                        {r.review_status === "Approved" && (
                          <button onClick={() => markReadyForBilling(r)} className="p-1 rounded hover:bg-muted" title="Mark Ready for Billing">
                            <DollarSign size={14} className="text-success" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded text-xs font-semibold ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              Service Report — {editRow?.flight_no} ({editRow?.airline})
            </DialogTitle>
          </DialogHeader>
          {editRow && (
            <Tabs defaultValue="details" className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">Flight & Team</TabsTrigger>
                <TabsTrigger value="timing" className="flex-1">Service Times</TabsTrigger>
                <TabsTrigger value="charges" className="flex-1">Charges</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Station</label>
                    <input className={inputCls} value={editRow.station} readOnly />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Airline</label>
                    <input className={inputCls} value={editRow.airline} readOnly />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Flight No</label>
                    <input className={inputCls} value={editRow.flight_no} readOnly />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Flight Date</label>
                    <input className={inputCls} value={editRow.flight_date} readOnly />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Service Type</label>
                    <input className={inputCls} value={editRow.service_type} readOnly />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Staff Count</label>
                    <input
                      type="number" className={inputCls}
                      value={editRow.staff_count}
                      onChange={e => setEditRow({ ...editRow, staff_count: +e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Staff Names</label>
                  <textarea
                    className={inputCls + " min-h-[60px]"}
                    value={editRow.staff_names}
                    onChange={e => setEditRow({ ...editRow, staff_names: e.target.value })}
                    placeholder="Enter staff names (comma separated)"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Notes / Incidents</label>
                  <textarea
                    className={inputCls + " min-h-[60px]"}
                    value={editRow.notes}
                    onChange={e => setEditRow({ ...editRow, notes: e.target.value })}
                    placeholder="Any incidents, deviations, or notes about this service…"
                  />
                </div>
              </TabsContent>

              <TabsContent value="timing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Scheduled Start</label>
                    <input className={inputCls} value={editRow.scheduled_start} readOnly />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Scheduled End</label>
                    <input className={inputCls} value={editRow.scheduled_end} readOnly />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Actual Start</label>
                    <input
                      className={inputCls}
                      value={editRow.actual_start}
                      onChange={e => setEditRow({ ...editRow, actual_start: e.target.value })}
                      placeholder="HH:MM"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Actual End</label>
                    <input
                      className={inputCls}
                      value={editRow.actual_end}
                      onChange={e => setEditRow({ ...editRow, actual_end: e.target.value })}
                      placeholder="HH:MM"
                      maxLength={5}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 bg-muted/50 rounded-lg p-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Contract Duration</label>
                    <div className="text-sm font-bold text-foreground mt-1">{editRow.contract_duration_hours}h</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Actual Duration</label>
                    <div className="text-sm font-bold text-foreground mt-1">
                      {timeDiffHours(editRow.actual_start, editRow.actual_end)}h
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Overtime</label>
                    <div className="text-sm font-bold text-warning mt-1">
                      {Math.max(0, timeDiffHours(editRow.actual_start, editRow.actual_end) - editRow.contract_duration_hours).toFixed(2)}h
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="charges" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Base Fee</label>
                    <div className="text-sm font-bold text-foreground mt-1">${editRow.base_fee.toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Service Rate</label>
                    <div className="text-sm font-bold text-foreground mt-1">${editRow.service_rate.toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Overtime Rate</label>
                    <div className="text-sm font-bold text-foreground mt-1">${editRow.overtime_rate}/staff/hr</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Overtime Charge</label>
                    <div className="text-sm font-bold text-warning mt-1">
                      ${(Math.max(0, timeDiffHours(editRow.actual_start, editRow.actual_end) - editRow.contract_duration_hours) * editRow.overtime_rate * editRow.staff_count).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">TOTAL CHARGE</span>
                    <span className="text-xl font-bold text-success">
                      ${(editRow.base_fee + (editRow.service_rate * editRow.staff_count) + (Math.max(0, timeDiffHours(editRow.actual_start, editRow.actual_end) - editRow.contract_duration_hours) * editRow.overtime_rate * editRow.staff_count)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Report</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewRow} onOpenChange={(open) => !open && setReviewRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={18} /> Review Service Report
            </DialogTitle>
          </DialogHeader>
          {reviewRow && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div><span className="text-muted-foreground">Flight:</span> <span className="font-semibold">{reviewRow.flight_no}</span></div>
                <div><span className="text-muted-foreground">Airline:</span> {reviewRow.airline}</div>
                <div><span className="text-muted-foreground">Station:</span> {reviewRow.station}</div>
                <div><span className="text-muted-foreground">Date:</span> {reviewRow.flight_date}</div>
                <div><span className="text-muted-foreground">Staff:</span> {reviewRow.staff_count} ({reviewRow.staff_names || "—"})</div>
                <div><span className="text-muted-foreground">Actual Time:</span> {reviewRow.actual_start} – {reviewRow.actual_end}</div>
                <div><span className="text-muted-foreground">Overtime:</span> {reviewRow.overtime_hours}h</div>
                <div><span className="text-muted-foreground">Total Charge:</span> ${reviewRow.total_charge.toLocaleString()}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Review Comment</label>
                <textarea
                  className="w-full mt-1 text-sm border rounded px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[60px]"
                  placeholder="Add review comment…"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                />
              </div>
              {reviewRow.reviewed_by && (
                <div className="text-xs text-muted-foreground">
                  Last reviewed by <span className="font-semibold">{reviewRow.reviewed_by}</span>
                  {reviewRow.reviewed_at && ` on ${reviewRow.reviewed_at.slice(0, 10)}`}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="destructive" size="sm" onClick={() => handleReviewAction("Rejected")}>
                  <XCircle size={14} className="mr-1" /> Reject
                </Button>
                <Button size="sm" onClick={() => handleReviewAction("Approved")} className="bg-success hover:bg-success/90 text-success-foreground">
                  <CheckCircle2 size={14} className="mr-1" /> Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
