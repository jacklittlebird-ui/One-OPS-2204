import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Trash2, Upload, Download, PlaneTakeoff, Clock,
  Pencil, X, Database, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Calendar, Link2, FileBarChart2
} from "lucide-react";
import { FlightSchedule, sampleFlights } from "@/data/flightScheduleData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import * as XLSX from "xlsx";

const PAGE_SIZE = 25;

const statusBadge = (s: string) => {
  if (s === "Scheduled") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-info/15 text-info"><Clock size={12} />{s}</span>;
  if (s === "Completed") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success"><CheckCircle size={12} />{s}</span>;
  if (s === "Delayed") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning"><AlertCircle size={12} />{s}</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive"><XCircle size={12} />{s}</span>;
};

export default function FlightSchedulePage() {
  const navigate = useNavigate();
  const [data, setData] = useLocalStorage<FlightSchedule[]>("link_flights", sampleFlights);
  const [search, setSearch] = useState("");
  const [airlineFilter, setAirlineFilter] = useState("All Airlines");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<FlightSchedule>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<FlightSchedule>>({ flightNo: "", airline: "", origin: "", destination: "", departure: "", arrival: "", aircraft: "", days: "", status: "Scheduled", terminal: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const airlines = useMemo(() => [...new Set(data.map(d => d.airline))].sort(), [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (airlineFilter !== "All Airlines") result = result.filter(r => r.airline === airlineFilter);
    if (statusFilter !== "All Status") result = result.filter(r => r.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => r.flightNo.toLowerCase().includes(s) || r.airline.toLowerCase().includes(s) || r.origin.toLowerCase().includes(s) || r.destination.toLowerCase().includes(s));
    }
    return result;
  }, [data, airlineFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const scheduledCount = data.filter(d => d.status === "Scheduled").length;
  const delayedCount = data.filter(d => d.status === "Delayed").length;

  const startEdit = (row: FlightSchedule) => { setEditingId(row.id); setEditRow({ ...row }); };
  const saveEdit = () => { if (!editingId) return; setData(prev => prev.map(r => r.id === editingId ? { ...r, ...editRow } as FlightSchedule : r)); setEditingId(null); };
  const deleteRow = (id: string) => setData(prev => prev.filter(r => r.id !== id));
  const addRow = () => {
    if (!newRow.flightNo || !newRow.airline) return;
    setData(prev => [...prev, { ...newRow, id: String(Date.now()) } as FlightSchedule]);
    setShowAdd(false);
    setNewRow({ flightNo: "", airline: "", origin: "", destination: "", departure: "", arrival: "", aircraft: "", days: "", status: "Scheduled", terminal: "" });
  };

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      setData(json.map((row: any, i: number) => ({
        id: String(Date.now() + i), flightNo: row["Flight No"] || row.flightNo || "",
        airline: row["Airline"] || row.airline || "", origin: row["Origin"] || row.origin || "",
        destination: row["Destination"] || row.destination || "", departure: row["Departure"] || row.departure || "",
        arrival: row["Arrival"] || row.arrival || "", aircraft: row["Aircraft"] || row.aircraft || "",
        days: row["Days"] || row.days || "", status: row["Status"] || row.status || "Scheduled",
        terminal: row["Terminal"] || row.terminal || "",
      })));
      setPage(1);
    };
    reader.readAsBinaryString(file); e.target.value = "";
  }, []);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({ "Flight No": r.flightNo, Airline: r.airline, Origin: r.origin, Destination: r.destination, Departure: r.departure, Arrival: r.arrival, Aircraft: r.aircraft, Days: r.days, Terminal: r.terminal, Status: r.status })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Flight Schedule"); XLSX.writeFile(wb, "flight_schedule.xlsx");
  };

  const columns = ["FLIGHT NO", "AIRLINE", "ORIGIN", "DEST", "DEP", "ARR", "AIRCRAFT", "DAYS", "TERMINAL", "STATUS", "ACTIONS"];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground">Flight Schedule</h1>
        <button
          onClick={() => navigate("/services")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-semibold text-primary border-primary/40 hover:bg-primary/10 transition-colors"
        >
          <Link2 size={14} /> Chart of Services Cost
        </button>
      </div>
      <p className="text-muted-foreground text-sm mt-1 mb-6">Scheduled flights, arrivals, and departures</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-card-icon bg-primary"><PlaneTakeoff size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Flights</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-info"><Calendar size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{scheduledCount}</div><div className="text-xs text-muted-foreground">Scheduled</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-warning"><AlertCircle size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{delayedCount}</div><div className="text-xs text-muted-foreground">Delayed</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-success"><CheckCircle size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{airlines.length}</div><div className="text-xs text-muted-foreground">Airlines Operating</div></div>
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Flight Schedule</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search flights…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-56 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={airlineFilter} onChange={e => { setAirlineFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Airlines</option>{airlines.map(a => <option key={a}>{a}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Status</option><option>Scheduled</option><option>Delayed</option><option>Cancelled</option><option>Completed</option>
          </select>
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> Add Flight</button>
          <button onClick={() => fileInputRef.current?.click()} className="toolbar-btn-success"><Upload size={14} /> Upload</button>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>

        {showAdd && (
          <div className="p-4 border-b bg-muted">
            <div className="grid grid-cols-11 gap-2 items-end">
              <input placeholder="Flight No" value={newRow.flightNo} onChange={e => setNewRow(p => ({ ...p, flightNo: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Airline" value={newRow.airline} onChange={e => setNewRow(p => ({ ...p, airline: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Origin" value={newRow.origin} onChange={e => setNewRow(p => ({ ...p, origin: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Dest" value={newRow.destination} onChange={e => setNewRow(p => ({ ...p, destination: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Dep" value={newRow.departure} onChange={e => setNewRow(p => ({ ...p, departure: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Arr" value={newRow.arrival} onChange={e => setNewRow(p => ({ ...p, arrival: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Aircraft" value={newRow.aircraft} onChange={e => setNewRow(p => ({ ...p, aircraft: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Days" value={newRow.days} onChange={e => setNewRow(p => ({ ...p, days: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Terminal" value={newRow.terminal} onChange={e => setNewRow(p => ({ ...p, terminal: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <select value={newRow.status} onChange={e => setNewRow(p => ({ ...p, status: e.target.value as FlightSchedule["status"] }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
                <option>Scheduled</option><option>Delayed</option><option>Cancelled</option><option>Completed</option>
              </select>
              <div className="flex gap-1">
                <button onClick={addRow} className="toolbar-btn-success text-xs py-1">Save</button>
                <button onClick={() => setShowAdd(false)} className="toolbar-btn-outline text-xs py-1"><X size={12} /></button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{columns.map(col => <th key={col} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{col}</th>)}</tr></thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16">
                  <Database size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-foreground">No Flights Found</p>
                </td></tr>
              ) : pageData.map(row => (
                <tr key={row.id} className="data-table-row">
                  {editingId === row.id ? (
                    <>
                      <td className="px-4 py-2"><input value={editRow.flightNo || ""} onChange={e => setEditRow(p => ({ ...p, flightNo: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-20 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.airline || ""} onChange={e => setEditRow(p => ({ ...p, airline: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-full bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.origin || ""} onChange={e => setEditRow(p => ({ ...p, origin: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-14 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.destination || ""} onChange={e => setEditRow(p => ({ ...p, destination: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-14 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.departure || ""} onChange={e => setEditRow(p => ({ ...p, departure: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-16 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.arrival || ""} onChange={e => setEditRow(p => ({ ...p, arrival: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-16 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.aircraft || ""} onChange={e => setEditRow(p => ({ ...p, aircraft: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-24 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.days || ""} onChange={e => setEditRow(p => ({ ...p, days: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-24 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.terminal || ""} onChange={e => setEditRow(p => ({ ...p, terminal: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-12 bg-card text-foreground" /></td>
                      <td className="px-4 py-2">
                        <select value={editRow.status} onChange={e => setEditRow(p => ({ ...p, status: e.target.value as FlightSchedule["status"] }))} className="text-sm border rounded px-1.5 py-0.5 bg-card text-foreground">
                          <option>Scheduled</option><option>Delayed</option><option>Cancelled</option><option>Completed</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 flex gap-1">
                        <button onClick={saveEdit} className="text-xs text-success hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-destructive hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 text-foreground font-mono font-semibold">{row.flightNo}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.airline}</td>
                      <td className="px-4 py-2.5 text-foreground font-mono">{row.origin}</td>
                      <td className="px-4 py-2.5 text-foreground font-mono">{row.destination}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.departure}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.arrival}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.aircraft}</td>
                      <td className="px-4 py-2.5 text-foreground text-xs">{row.days}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.terminal}</td>
                      <td className="px-4 py-2.5">{statusBadge(row.status)}</td>
                      <td className="px-4 py-2.5 flex gap-2">
                        <button onClick={() => startEdit(row)} className="text-info hover:text-info/80"><Pencil size={14} /></button>
                        <button onClick={() => deleteRow(row.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                        <button
                          title="Create Service Report from this flight"
                          onClick={() => {
                            const params = new URLSearchParams({
                              flightNo: row.flightNo,
                              operator: row.airline,
                              aircraftType: row.aircraft,
                              route: `${row.origin}/${row.destination}`,
                              sta: row.departure,
                              std: row.arrival,
                            });
                            navigate(`/service-report?${params.toString()}`);
                          }}
                          className="text-success hover:text-success/80"
                        >
                          <FileBarChart2 size={14} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="p-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronLeft size={14} /></button>
              <span className="text-foreground font-medium">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
