import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, X, Clock, AlertCircle, Database } from "lucide-react";

interface DelayCode {
  id: string;
  code: string;
  category: string;
  description: string;
  responsible: "Airline" | "Airport" | "ATC" | "Weather" | "Handling" | "Security" | "Other";
  impactLevel: "Low" | "Medium" | "High";
  avgMinutes: number;
  active: boolean;
}

const sampleDelayCodes: DelayCode[] = [
  { id: "DC01", code: "93", category: "Airline", description: "Late Inbound Aircraft – Aircraft arrived late from previous station", responsible: "Airline", impactLevel: "High", avgMinutes: 45, active: true },
  { id: "DC02", code: "89", category: "ATC", description: "ATC Start-Up Sequence – Delayed start-up due to ATC slot/sequencing", responsible: "ATC", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC03", code: "75", category: "Weather", description: "De-icing / Anti-icing – Aircraft requires de-icing or anti-icing treatment", responsible: "Weather", impactLevel: "High", avgMinutes: 35, active: true },
  { id: "DC04", code: "41", category: "Handling", description: "Loading / Offloading – Delay in loading or offloading baggage/cargo", responsible: "Handling", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC05", code: "14", category: "Airport", description: "Check-In – Long check-in queues or system delays", responsible: "Airport", impactLevel: "Low", avgMinutes: 15, active: true },
  { id: "DC06", code: "96", category: "ATC", description: "Terminal or Runway Restrictions", responsible: "ATC", impactLevel: "High", avgMinutes: 60, active: true },
  { id: "DC07", code: "11", category: "Airline", description: "Aircraft Documentation – Missing or incomplete documents", responsible: "Airline", impactLevel: "Low", avgMinutes: 10, active: true },
  { id: "DC08", code: "51", category: "Handling", description: "Cabin Cleaning – Insufficient cleaning time", responsible: "Handling", impactLevel: "Low", avgMinutes: 12, active: true },
  { id: "DC09", code: "21", category: "Security", description: "Security – Passenger screening or baggage reconciliation", responsible: "Security", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC10", code: "00", category: "None", description: "No Delay – Flight departed on time", responsible: "Other", impactLevel: "Low", avgMinutes: 0, active: true },
];

const impactColor: Record<string, string> = {
  Low:    "bg-success/15 text-success",
  Medium: "bg-warning/15 text-warning",
  High:   "bg-destructive/15 text-destructive",
};

const responsibleColor: Record<string, string> = {
  Airline:  "bg-primary/10 text-primary",
  Airport:  "bg-info/10 text-info",
  ATC:      "bg-accent/10 text-accent-foreground",
  Weather:  "bg-warning/10 text-warning",
  Handling: "bg-muted text-muted-foreground",
  Security: "bg-destructive/10 text-destructive",
  Other:    "bg-muted text-muted-foreground",
};

const inp = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

export default function DelayCodesPage() {
  const [codes, setCodes] = useState<DelayCode[]>(sampleDelayCodes);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<DelayCode>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<DelayCode>>({ code: "", category: "", description: "", responsible: "Airline", impactLevel: "Low", avgMinutes: 0, active: true });

  const filtered = useMemo(() => {
    let r = codes;
    if (filter !== "All") r = r.filter(c => c.responsible === filter);
    if (search) { const s = search.toLowerCase(); r = r.filter(c => c.code.includes(s) || c.description.toLowerCase().includes(s) || c.category.toLowerCase().includes(s)); }
    return r;
  }, [codes, search, filter]);

  const set = (k: keyof DelayCode, v: any) => setEditRow(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Clock size={22} className="text-primary" /> Delay Codes</h1>
        <p className="text-muted-foreground text-sm mt-1">IATA standard delay codes library and tracking</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.length}</div><div className="text-xs text-muted-foreground">Total Codes</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-destructive"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.filter(c => c.impactLevel === "High").length}</div><div className="text-xs text-muted-foreground">High Impact</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.filter(c => c.impactLevel === "Medium").length}</div><div className="text-xs text-muted-foreground">Medium Impact</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{Math.round(codes.reduce((s, c) => s + c.avgMinutes, 0) / codes.length)} min</div><div className="text-xs text-muted-foreground">Avg Delay</div></div></div>
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
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> Add Code</button>
        </div>

        {showAdd && (
          <div className="p-4 border-b bg-muted">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
              <input placeholder="Code (e.g. 93)" value={newRow.code || ""} onChange={e => setNewRow(p => ({ ...p, code: e.target.value }))} className={inp} />
              <input placeholder="Category" value={newRow.category || ""} onChange={e => setNewRow(p => ({ ...p, category: e.target.value }))} className={inp} />
              <input placeholder="Description" value={newRow.description || ""} onChange={e => setNewRow(p => ({ ...p, description: e.target.value }))} className={inp + " col-span-2"} />
              <select value={newRow.responsible} onChange={e => setNewRow(p => ({ ...p, responsible: e.target.value as any }))} className={inp}>
                <option>Airline</option><option>Airport</option><option>ATC</option><option>Weather</option><option>Handling</option><option>Security</option><option>Other</option>
              </select>
              <div className="flex gap-1">
                <button onClick={() => { if (!newRow.code) return; setCodes(p => [...p, { ...newRow, id: `DC${Date.now()}`, active: true } as DelayCode]); setShowAdd(false); setNewRow({ code: "", category: "", description: "", responsible: "Airline", impactLevel: "Low", avgMinutes: 0, active: true }); }} className="toolbar-btn-success text-xs py-1">Save</button>
                <button onClick={() => setShowAdd(false)} className="toolbar-btn-outline text-xs py-1"><X size={12} /></button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["CODE","CATEGORY","DESCRIPTION","RESPONSIBLE","IMPACT","AVG DELAY","ACTIONS"].map(h => <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16"><Database size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Delay Codes Found</p></td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="data-table-row">
                  {editingId === row.id ? (
                    <>
                      <td className="px-2 py-2"><input value={editRow.code || ""} onChange={e => set("code", e.target.value)} className={inp + " w-16"} /></td>
                      <td className="px-2 py-2"><input value={editRow.category || ""} onChange={e => set("category", e.target.value)} className={inp + " w-24"} /></td>
                      <td className="px-2 py-2"><input value={editRow.description || ""} onChange={e => set("description", e.target.value)} className={inp + " w-full min-w-[200px]"} /></td>
                      <td className="px-2 py-2"><select value={editRow.responsible} onChange={e => set("responsible", e.target.value)} className={inp}><option>Airline</option><option>Airport</option><option>ATC</option><option>Weather</option><option>Handling</option><option>Security</option><option>Other</option></select></td>
                      <td className="px-2 py-2"><select value={editRow.impactLevel} onChange={e => set("impactLevel", e.target.value)} className={inp}><option>Low</option><option>Medium</option><option>High</option></select></td>
                      <td className="px-2 py-2"><input type="number" value={editRow.avgMinutes || 0} onChange={e => set("avgMinutes", +e.target.value)} className={inp + " w-20"} /></td>
                      <td className="px-2 py-2 flex gap-1">
                        <button onClick={() => { setCodes(p => p.map(r => r.id === editingId ? { ...r, ...editRow } as DelayCode : r)); setEditingId(null); }} className="text-xs text-success hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-destructive hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5"><span className="font-mono font-bold text-lg text-primary">{row.code}</span></td>
                      <td className="px-4 py-2.5 text-foreground">{row.category}</td>
                      <td className="px-4 py-2.5 text-foreground max-w-[300px]">{row.description}</td>
                      <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${responsibleColor[row.responsible]}`}>{row.responsible}</span></td>
                      <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${impactColor[row.impactLevel]}`}>{row.impactLevel}</span></td>
                      <td className="px-4 py-2.5 text-foreground">{row.avgMinutes > 0 ? `~${row.avgMinutes} min` : "—"}</td>
                      <td className="px-4 py-2.5 flex gap-2">
                        <button onClick={() => { setEditingId(row.id); setEditRow({ ...row }); }} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                        <button onClick={() => setCodes(p => p.filter(r => r.id !== row.id))} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
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
