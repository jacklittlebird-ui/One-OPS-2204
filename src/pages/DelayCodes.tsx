import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, X, Clock, AlertCircle, Database } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";

const impactColor: Record<string, string> = { Low: "bg-success/15 text-success", Medium: "bg-warning/15 text-warning", High: "bg-destructive/15 text-destructive" };
const responsibleColor: Record<string, string> = { Airline: "bg-primary/10 text-primary", Airport: "bg-info/10 text-info", ATC: "bg-accent/10 text-accent-foreground", Weather: "bg-warning/10 text-warning", Handling: "bg-muted text-muted-foreground", Security: "bg-destructive/10 text-destructive", Other: "bg-muted text-muted-foreground" };
const inp = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

type DCRow = { id: string; code: string; category: string; description: string; responsible: string; impact_level: string; avg_minutes: number; active: boolean };

export default function DelayCodesPage() {
  const { data: codes, isLoading, add, update, remove } = useSupabaseTable<DCRow>("delay_codes", { orderBy: "code", ascending: true });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [impactFilter, setImpactFilter] = useState("All Impact");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<DCRow>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<DCRow>>({ code: "", category: "", description: "", responsible: "Airline", impact_level: "Low", avg_minutes: 0, active: true });

  const filtered = useMemo(() => {
    let r = codes;
    if (filter !== "All") r = r.filter(c => c.responsible === filter);
    if (impactFilter !== "All Impact") r = r.filter(c => c.impact_level === impactFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(c => c.code.includes(s) || c.description.toLowerCase().includes(s) || c.category.toLowerCase().includes(s)); }
    return r;
  }, [codes, search, filter, impactFilter]);

  const set = (k: keyof DCRow, v: any) => setEditRow(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Clock size={22} className="text-primary" /> IATA Delay Codes</h1>
        <p className="text-muted-foreground text-sm mt-1">Full IATA standard delay code library ({codes.length} codes)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.length}</div><div className="text-xs text-muted-foreground">Total Codes</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-destructive"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.filter(c => c.impact_level === "High").length}</div><div className="text-xs text-muted-foreground">High Impact</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.filter(c => c.impact_level === "Medium").length}</div><div className="text-xs text-muted-foreground">Medium Impact</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.filter(c => c.impact_level === "Low").length}</div><div className="text-xs text-muted-foreground">Low Impact</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.filter(c => c.avg_minutes > 0).length > 0 ? Math.round(codes.filter(c => c.avg_minutes > 0).reduce((s, c) => s + c.avg_minutes, 0) / codes.filter(c => c.avg_minutes > 0).length) : 0} min</div><div className="text-xs text-muted-foreground">Avg Delay</div></div></div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Delay Code Library</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search code, description…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option><option>Airline</option><option>Airport</option><option>ATC</option><option>Weather</option><option>Handling</option><option>Security</option>
          </select>
          <select value={impactFilter} onChange={e => setImpactFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Impact</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> Add Code</button>
        </div>

        {showAdd && (
          <div className="p-4 border-b bg-muted">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
              <input placeholder="Code (e.g. 93)" value={newRow.code || ""} onChange={e => setNewRow(p => ({ ...p, code: e.target.value }))} className={inp} />
              <input placeholder="Category" value={newRow.category || ""} onChange={e => setNewRow(p => ({ ...p, category: e.target.value }))} className={inp} />
              <input placeholder="Description" value={newRow.description || ""} onChange={e => setNewRow(p => ({ ...p, description: e.target.value }))} className={inp + " col-span-2"} />
              <select value={newRow.responsible} onChange={e => setNewRow(p => ({ ...p, responsible: e.target.value }))} className={inp}>
                <option>Airline</option><option>Airport</option><option>ATC</option><option>Weather</option><option>Handling</option><option>Security</option><option>Other</option>
              </select>
              <div className="flex gap-1">
                <button onClick={async () => { if (!newRow.code) return; await add(newRow); setShowAdd(false); setNewRow({ code: "", category: "", description: "", responsible: "Airline", impact_level: "Low", avg_minutes: 0, active: true }); }} className="toolbar-btn-success text-xs py-1">Save</button>
                <button onClick={() => setShowAdd(false)} className="toolbar-btn-outline text-xs py-1"><X size={12} /></button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["CODE","CATEGORY","DESCRIPTION","RESPONSIBLE","IMPACT","AVG DELAY","ACTIONS"].map(h => <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16"><Database size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Delay Codes Found</p></td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="data-table-row">
                  {editingId === c.id ? (
                    <>
                      <td className="px-4 py-2"><input value={editRow.code || ""} onChange={e => set("code", e.target.value)} className={inp + " w-16"} /></td>
                      <td className="px-4 py-2"><input value={editRow.category || ""} onChange={e => set("category", e.target.value)} className={inp + " w-24"} /></td>
                      <td className="px-4 py-2"><input value={editRow.description || ""} onChange={e => set("description", e.target.value)} className={inp + " w-full"} /></td>
                      <td className="px-4 py-2"><select value={editRow.responsible} onChange={e => set("responsible", e.target.value)} className={inp}><option>Airline</option><option>Airport</option><option>ATC</option><option>Weather</option><option>Handling</option><option>Security</option><option>Other</option></select></td>
                      <td className="px-4 py-2"><select value={editRow.impact_level} onChange={e => set("impact_level", e.target.value)} className={inp}><option>Low</option><option>Medium</option><option>High</option></select></td>
                      <td className="px-4 py-2"><input type="number" value={editRow.avg_minutes || 0} onChange={e => set("avg_minutes", +e.target.value)} className={inp + " w-16"} /></td>
                      <td className="px-4 py-2 flex gap-1">
                        <button onClick={async () => { await update({ id: c.id, ...editRow } as any); setEditingId(null); }} className="toolbar-btn-success text-xs py-1">Save</button>
                        <button onClick={() => setEditingId(null)} className="toolbar-btn-outline text-xs py-1"><X size={12} /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-mono font-bold text-foreground">{c.code}</td>
                      <td className="px-4 py-2.5 text-foreground">{c.category}</td>
                      <td className="px-4 py-2.5 text-foreground max-w-xs truncate">{c.description}</td>
                      <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${responsibleColor[c.responsible] || "bg-muted text-muted-foreground"}`}>{c.responsible}</span></td>
                      <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${impactColor[c.impact_level]}`}>{c.impact_level}</span></td>
                      <td className="px-4 py-2.5 text-foreground">{c.avg_minutes} min</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5">
                          <button onClick={() => { setEditingId(c.id); setEditRow({ ...c }); }} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                          <button onClick={() => remove(c.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
