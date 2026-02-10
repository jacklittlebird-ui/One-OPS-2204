import { useState, useMemo, useCallback, useRef } from "react";
import {
  Search, Plus, Trash2, Upload, Download, PlaneTakeoff, Wrench,
  Pencil, X, Database, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Layers
} from "lucide-react";
import { Aircraft, sampleAircrafts } from "@/data/aircraftsData";
import * as XLSX from "xlsx";

const PAGE_SIZE = 25;

const statusBadge = (s: string) => {
  if (s === "Operational") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success"><CheckCircle size={12} />{s}</span>;
  if (s === "Maintenance") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning"><Wrench size={12} />{s}</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive"><XCircle size={12} />{s}</span>;
};

export default function AircraftsPage() {
  const [data, setData] = useState<Aircraft[]>(sampleAircrafts);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<Aircraft>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<Aircraft>>({ registration: "", type: "", airline: "", model: "", mtow: 0, seats: 0, yearBuilt: 2024, status: "Operational" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const types = useMemo(() => [...new Set(data.map(d => d.type))], [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (typeFilter !== "All Types") result = result.filter(r => r.type === typeFilter);
    if (statusFilter !== "All Status") result = result.filter(r => r.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => r.registration.toLowerCase().includes(s) || r.model.toLowerCase().includes(s) || r.airline.toLowerCase().includes(s));
    }
    return result;
  }, [data, typeFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const operationalCount = data.filter(d => d.status === "Operational").length;
  const airlinesCount = new Set(data.map(d => d.airline)).size;

  const startEdit = (row: Aircraft) => { setEditingId(row.id); setEditRow({ ...row }); };
  const saveEdit = () => { if (!editingId) return; setData(prev => prev.map(r => r.id === editingId ? { ...r, ...editRow } as Aircraft : r)); setEditingId(null); };
  const deleteRow = (id: string) => setData(prev => prev.filter(r => r.id !== id));
  const addRow = () => {
    if (!newRow.registration || !newRow.model) return;
    setData(prev => [...prev, { ...newRow, id: String(Date.now()) } as Aircraft]);
    setShowAdd(false);
    setNewRow({ registration: "", type: "", airline: "", model: "", mtow: 0, seats: 0, yearBuilt: 2024, status: "Operational" });
  };

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      setData(json.map((row: any, i: number) => ({
        id: String(Date.now() + i), registration: row["Registration"] || row.registration || "",
        type: row["Type"] || row.type || "", airline: row["Airline"] || row.airline || "",
        model: row["Model"] || row.model || "", mtow: Number(row["MTOW"] || row.mtow || 0),
        seats: Number(row["Seats"] || row.seats || 0), yearBuilt: Number(row["Year Built"] || row.yearBuilt || 2020),
        status: row["Status"] || row.status || "Operational",
      })));
      setPage(1);
    };
    reader.readAsBinaryString(file); e.target.value = "";
  }, []);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({ Registration: r.registration, Type: r.type, Airline: r.airline, Model: r.model, MTOW: r.mtow, Seats: r.seats, "Year Built": r.yearBuilt, Status: r.status })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Aircrafts"); XLSX.writeFile(wb, "aircrafts.xlsx");
  };

  const columns = ["REGISTRATION", "TYPE", "AIRLINE", "MODEL", "MTOW (KG)", "SEATS", "YEAR", "STATUS", "ACTIONS"];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Aircrafts</h1>
      <p className="text-muted-foreground text-sm mt-1 mb-6">Aircraft fleet registry and specifications</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-card-icon bg-primary"><PlaneTakeoff size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Aircraft</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-success"><CheckCircle size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{operationalCount}</div><div className="text-xs text-muted-foreground">Operational</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-info"><Layers size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{types.length}</div><div className="text-xs text-muted-foreground">Aircraft Types</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-accent"><PlaneTakeoff size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{airlinesCount}</div><div className="text-xs text-muted-foreground">Airlines</div></div>
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Aircraft Registry</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search aircraft…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-56 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Types</option>{types.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Status</option><option>Operational</option><option>Maintenance</option><option>Grounded</option>
          </select>
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> Add Aircraft</button>
          <button onClick={() => fileInputRef.current?.click()} className="toolbar-btn-success"><Upload size={14} /> Upload</button>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>

        {showAdd && (
          <div className="p-4 border-b bg-muted">
            <div className="grid grid-cols-9 gap-2 items-end">
              <input placeholder="Registration" value={newRow.registration} onChange={e => setNewRow(p => ({ ...p, registration: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Type" value={newRow.type} onChange={e => setNewRow(p => ({ ...p, type: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Airline" value={newRow.airline} onChange={e => setNewRow(p => ({ ...p, airline: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Model" value={newRow.model} onChange={e => setNewRow(p => ({ ...p, model: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="MTOW" type="number" value={newRow.mtow || 0} onChange={e => setNewRow(p => ({ ...p, mtow: +e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Seats" type="number" value={newRow.seats || 0} onChange={e => setNewRow(p => ({ ...p, seats: +e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Year" type="number" value={newRow.yearBuilt || 2024} onChange={e => setNewRow(p => ({ ...p, yearBuilt: +e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <select value={newRow.status} onChange={e => setNewRow(p => ({ ...p, status: e.target.value as Aircraft["status"] }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
                <option>Operational</option><option>Maintenance</option><option>Grounded</option>
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
                <tr><td colSpan={9} className="text-center py-16">
                  <Database size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-foreground">No Aircraft Found</p>
                </td></tr>
              ) : pageData.map(row => (
                <tr key={row.id} className="data-table-row">
                  {editingId === row.id ? (
                    <>
                      <td className="px-4 py-2"><input value={editRow.registration || ""} onChange={e => setEditRow(p => ({ ...p, registration: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-24 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.type || ""} onChange={e => setEditRow(p => ({ ...p, type: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-24 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.airline || ""} onChange={e => setEditRow(p => ({ ...p, airline: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-full bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.model || ""} onChange={e => setEditRow(p => ({ ...p, model: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-full bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input type="number" value={editRow.mtow || 0} onChange={e => setEditRow(p => ({ ...p, mtow: +e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-24 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input type="number" value={editRow.seats || 0} onChange={e => setEditRow(p => ({ ...p, seats: +e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-16 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input type="number" value={editRow.yearBuilt || 2024} onChange={e => setEditRow(p => ({ ...p, yearBuilt: +e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-20 bg-card text-foreground" /></td>
                      <td className="px-4 py-2">
                        <select value={editRow.status} onChange={e => setEditRow(p => ({ ...p, status: e.target.value as Aircraft["status"] }))} className="text-sm border rounded px-1.5 py-0.5 bg-card text-foreground">
                          <option>Operational</option><option>Maintenance</option><option>Grounded</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 flex gap-1">
                        <button onClick={saveEdit} className="text-xs text-success hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-destructive hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 text-foreground font-mono font-semibold">{row.registration}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.type}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.airline}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.model}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.mtow.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.seats}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.yearBuilt}</td>
                      <td className="px-4 py-2.5">{statusBadge(row.status)}</td>
                      <td className="px-4 py-2.5 flex gap-2">
                        <button onClick={() => startEdit(row)} className="text-info hover:text-info/80"><Pencil size={14} /></button>
                        <button onClick={() => deleteRow(row.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
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
