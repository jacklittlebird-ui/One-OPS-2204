import { useState, useMemo, useRef, useCallback } from "react";
import { AlertTriangle, Search, Plus, Filter, X, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

type IrregularityRow = {
  id: string;
  report_id: string;
  flight_no: string;
  airline: string;
  station: string;
  incident_date: string;
  severity: string;
  category: string;
  status: string;
  description: string;
  reported_by: string;
  assigned_to: string;
  resolution: string;
  resolved_at: string | null;
  created_at: string;
};

const SEVERITIES = ["Low", "Medium", "High", "Critical"];
const CATEGORIES = [
  "Unauthorized Access", "Equipment Malfunction", "Documentation Error",
  "Safety Violation", "Baggage Incident", "Passenger Complaint",
  "Security Breach", "Operational Delay", "Ground Damage", "Other"
];
const IR_STATUSES = ["Open", "Under Investigation", "Resolved", "Closed"];

const severityColors: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-warning/15 text-warning",
  High: "bg-destructive/15 text-destructive",
  Critical: "bg-destructive text-destructive-foreground",
};

const statusColors: Record<string, string> = {
  Open: "bg-destructive/15 text-destructive border-destructive/30",
  "Under Investigation": "bg-warning/15 text-warning border-warning/30",
  Resolved: "bg-success/15 text-success border-success/30",
  Closed: "bg-muted text-muted-foreground border-border",
};

const inputCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";
const selectCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full";

const emptyReport = (): Partial<IrregularityRow> => ({
  report_id: `IRR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
  flight_no: "", airline: "", station: "CAI",
  incident_date: new Date().toISOString().slice(0, 10),
  severity: "Low", category: "", status: "Open",
  description: "", reported_by: "", assigned_to: "", resolution: "",
});

const PAGE_SIZE = 15;

export default function IrregularityReportsPage() {
  const { data: reports, isLoading, add, update, remove, isAdding } = useSupabaseTable<IrregularityRow>("irregularity_reports");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newReport, setNewReport] = useState<Partial<IrregularityRow>>(emptyReport());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let r = reports;
    if (statusFilter !== "All") r = r.filter(i => i.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(i =>
        i.report_id.toLowerCase().includes(s) ||
        i.flight_no.toLowerCase().includes(s) ||
        i.airline.toLowerCase().includes(s) ||
        i.category.toLowerCase().includes(s)
      );
    }
    return r;
  }, [reports, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const saveNew = async () => {
    if (!newReport.flight_no) return;
    await add(newReport as any);
    setShowAdd(false);
    setNewReport(emptyReport());
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      ID: r.report_id, Flight: r.flight_no, Airline: r.airline,
      Station: r.station, Date: r.incident_date, Severity: r.severity,
      Category: r.category, Status: r.status, Description: r.description,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Irregularities");
    XLSX.writeFile(wb, "Irregularity_Reports.xlsx");
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle size={22} className="text-destructive" /> Irregularity Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Security incident tracking and management</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(f => !f)} className="toolbar-btn-outline">
            <Filter size={14} /> Filter
          </button>
          <button onClick={() => { setNewReport(emptyReport()); setShowAdd(true); }} className="toolbar-btn-primary bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            <AlertTriangle size={14} /> Report Incident
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search incidents..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-2 text-sm border rounded-lg bg-card text-foreground placeholder:text-muted-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        {showFilters && (
          <div className="flex gap-2">
            {["All", ...IR_STATUSES].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["ID", "Flight", "Airline", "Station", "Date", "Severity", "Category", "Status"].map(h => (
                  <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16">
                  <AlertTriangle size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="font-semibold text-foreground">No incidents found</p>
                </td></tr>
              ) : pageData.map(r => (
                <tr key={r.id} className="data-table-row">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{r.report_id}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{r.flight_no}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.airline}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-bold bg-muted px-1.5 py-0.5 rounded">{r.station}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.incident_date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[r.severity] || ""}`}>{r.severity}</span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{r.category}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[r.status] || ""}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="p-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40">←</button>
              <span className="text-foreground font-medium">Page {page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Incident Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-xl border shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
                <AlertTriangle size={18} className="text-destructive" /> Report Incident
              </h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold text-muted-foreground uppercase">Report ID</label>
                  <input className={inputCls} value={newReport.report_id || ""} onChange={e => setNewReport(d => ({ ...d, report_id: e.target.value }))} /></div>
                <div><label className="text-xs font-semibold text-muted-foreground uppercase">Flight No</label>
                  <input className={inputCls} value={newReport.flight_no || ""} onChange={e => setNewReport(d => ({ ...d, flight_no: e.target.value }))} placeholder="MS-801" /></div>
                <div><label className="text-xs font-semibold text-muted-foreground uppercase">Airline</label>
                  <input className={inputCls} value={newReport.airline || ""} onChange={e => setNewReport(d => ({ ...d, airline: e.target.value }))} /></div>
                <div><label className="text-xs font-semibold text-muted-foreground uppercase">Station</label>
                  <input className={inputCls} value={newReport.station || ""} onChange={e => setNewReport(d => ({ ...d, station: e.target.value }))} /></div>
                <div><label className="text-xs font-semibold text-muted-foreground uppercase">Date</label>
                  <input type="date" className={inputCls} value={newReport.incident_date || ""} onChange={e => setNewReport(d => ({ ...d, incident_date: e.target.value }))} /></div>
                <div><label className="text-xs font-semibold text-muted-foreground uppercase">Severity</label>
                  <select className={selectCls} value={newReport.severity || "Low"} onChange={e => setNewReport(d => ({ ...d, severity: e.target.value }))}>
                    {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                  </select></div>
                <div><label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
                  <select className={selectCls} value={newReport.category || ""} onChange={e => setNewReport(d => ({ ...d, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select></div>
                <div><label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                  <select className={selectCls} value={newReport.status || "Open"} onChange={e => setNewReport(d => ({ ...d, status: e.target.value }))}>
                    {IR_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select></div>
              </div>
              <div><label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
                <textarea className={inputCls + " resize-none"} rows={3} value={newReport.description || ""} onChange={e => setNewReport(d => ({ ...d, description: e.target.value }))} placeholder="Describe the incident..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold text-muted-foreground uppercase">Reported By</label>
                  <input className={inputCls} value={newReport.reported_by || ""} onChange={e => setNewReport(d => ({ ...d, reported_by: e.target.value }))} /></div>
                <div><label className="text-xs font-semibold text-muted-foreground uppercase">Assigned To</label>
                  <input className={inputCls} value={newReport.assigned_to || ""} onChange={e => setNewReport(d => ({ ...d, assigned_to: e.target.value }))} /></div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-3 justify-end rounded-b-xl">
              <button onClick={() => setShowAdd(false)} className="toolbar-btn-outline">Cancel</button>
              <button onClick={saveNew} disabled={isAdding} className="toolbar-btn-primary bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {isAdding ? "Saving…" : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
