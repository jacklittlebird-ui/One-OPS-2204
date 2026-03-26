import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Trash2, Upload, Download, Building2, Globe, Users,
  Pencil, X, Database, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Plane, FileText
} from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import * as XLSX from "xlsx";

const PAGE_SIZE = 25;

const statusIcon = (s: string) => {
  if (s === "Active") return <CheckCircle size={14} className="text-success inline mr-1" />;
  if (s === "Inactive") return <XCircle size={14} className="text-muted-foreground inline mr-1" />;
  return <AlertCircle size={14} className="text-warning inline mr-1" />;
};

type AirlineRow = { id: string; code: string; name: string; country: string; contact_person: string; email: string; phone: string; status: string; credit_terms: string; billing_currency: string; iata_code: string; icao_code: string; alliance: string };

export default function AirlinesPage() {
  const navigate = useNavigate();
  const { data, isLoading, add, update, remove } = useSupabaseTable<AirlineRow>("airlines", { orderBy: "name", ascending: true });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<AirlineRow>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<AirlineRow>>({ code: "", name: "", country: "", contact_person: "", email: "", phone: "", status: "Active", credit_terms: "Net 30", billing_currency: "USD", iata_code: "", icao_code: "", alliance: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let result = data;
    if (statusFilter !== "All Status") result = result.filter(r => r.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s) || r.country.toLowerCase().includes(s));
    }
    return result;
  }, [data, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = data.filter(d => d.status === "Active").length;
  const countriesCount = new Set(data.map(d => d.country)).size;

  const startEdit = (row: AirlineRow) => { setEditingId(row.id); setEditRow({ ...row }); };
  const saveEdit = async () => { if (!editingId) return; await update({ id: editingId, ...editRow } as any); setEditingId(null); };
  const deleteRow = (id: string) => remove(id);
  const addRow = async () => {
    if (!newRow.code || !newRow.name) return;
    await add(newRow);
    setShowAdd(false);
    setNewRow({ code: "", name: "", country: "", contact_person: "", email: "", phone: "", status: "Active", credit_terms: "Net 30", billing_currency: "USD", iata_code: "", icao_code: "", alliance: "" });
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      for (const row of json) {
        await add({
          code: row["Code"] || "", name: row["Name"] || "", country: row["Country"] || "",
          contact_person: row["Contact Person"] || "", email: row["Email"] || "",
          phone: row["Phone"] || "", status: row["Status"] || "Active",
        });
      }
    };
    reader.readAsBinaryString(file); e.target.value = "";
  }, [add]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({ Code: r.code, Name: r.name, "IATA": r.iata_code, "ICAO": r.icao_code, Country: r.country, Alliance: r.alliance, "Credit Terms": r.credit_terms, "Billing Currency": r.billing_currency, "Contact Person": r.contact_person, Email: r.email, Phone: r.phone, Status: r.status })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Airlines"); XLSX.writeFile(wb, "airlines.xlsx");
  };

  const columns = ["CODE", "AIRLINE NAME", "IATA", "COUNTRY", "ALLIANCE", "CREDIT TERMS", "CONTACT", "STATUS", "ACTIONS"];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground">Airlines</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate("/flight-schedule")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-semibold text-primary border-primary/40 hover:bg-primary/10 transition-colors"><Plane size={14} /> Flights</button>
          <button onClick={() => navigate("/contracts")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-semibold text-info border-info/40 hover:bg-info/10 transition-colors"><FileText size={14} /> Contracts</button>
        </div>
      </div>
      <p className="text-muted-foreground text-sm mt-1 mb-6">Airline partners, commercial terms & contact directory</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Building2 size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Airlines</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{activeCount}</div><div className="text-xs text-muted-foreground">Active Airlines</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><Globe size={20} /></div><div><div className="text-2xl font-bold text-foreground">{countriesCount}</div><div className="text-xs text-muted-foreground">Countries</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-accent"><Users size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Contacts</div></div></div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Airlines Directory</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search airlines…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-56 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Status</option><option>Active</option><option>Inactive</option><option>Suspended</option>
          </select>
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> Add Airline</button>
          <button onClick={() => fileInputRef.current?.click()} className="toolbar-btn-success"><Upload size={14} /> Upload</button>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>

        {showAdd && (
          <div className="p-4 border-b bg-muted">
            <div className="grid grid-cols-8 gap-2 items-end">
              <input placeholder="Code" value={newRow.code} onChange={e => setNewRow(p => ({ ...p, code: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Airline Name" value={newRow.name} onChange={e => setNewRow(p => ({ ...p, name: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Country" value={newRow.country} onChange={e => setNewRow(p => ({ ...p, country: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Contact Person" value={newRow.contact_person} onChange={e => setNewRow(p => ({ ...p, contact_person: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Email" value={newRow.email} onChange={e => setNewRow(p => ({ ...p, email: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="Phone" value={newRow.phone} onChange={e => setNewRow(p => ({ ...p, phone: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <select value={newRow.status} onChange={e => setNewRow(p => ({ ...p, status: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
                <option>Active</option><option>Inactive</option><option>Suspended</option>
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
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-16 text-muted-foreground">Loading…</td></tr>
              ) : pageData.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16">
                  <Database size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-foreground">No Airlines Found</p>
                </td></tr>
              ) : pageData.map(row => (
                <tr key={row.id} className="data-table-row">
                  {editingId === row.id ? (
                    <>
                      <td className="px-4 py-2"><input value={editRow.code || ""} onChange={e => setEditRow(p => ({ ...p, code: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-16 bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.name || ""} onChange={e => setEditRow(p => ({ ...p, name: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-full bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.country || ""} onChange={e => setEditRow(p => ({ ...p, country: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-full bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.contact_person || ""} onChange={e => setEditRow(p => ({ ...p, contact_person: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-full bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.email || ""} onChange={e => setEditRow(p => ({ ...p, email: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-full bg-card text-foreground" /></td>
                      <td className="px-4 py-2"><input value={editRow.phone || ""} onChange={e => setEditRow(p => ({ ...p, phone: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-full bg-card text-foreground" /></td>
                      <td className="px-4 py-2">
                        <select value={editRow.status} onChange={e => setEditRow(p => ({ ...p, status: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 bg-card text-foreground">
                          <option>Active</option><option>Inactive</option><option>Suspended</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 flex gap-1">
                        <button onClick={saveEdit} className="text-xs text-success hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-destructive hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 text-foreground font-mono font-semibold">{row.code}</td>
                      <td className="px-4 py-2.5 text-foreground font-semibold">{row.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{row.iata_code || "—"}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.country}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.alliance || "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.credit_terms || "Net 30"}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-foreground text-xs">{row.contact_person}</div>
                        <div className="text-muted-foreground text-xs">{row.email}</div>
                      </td>
                      <td className="px-4 py-2.5">{statusIcon(row.status)}<span className="text-foreground">{row.status}</span></td>
                      <td className="px-4 py-2.5 flex gap-2">
                        <button onClick={() => startEdit(row)} className="text-info hover:text-info/80"><Pencil size={14} /></button>
                        <button onClick={() => deleteRow(row.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                        <button onClick={() => navigate(`/flight-schedule`)} className="text-success hover:text-success/80" title="View Flights"><Plane size={14} /></button>
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
