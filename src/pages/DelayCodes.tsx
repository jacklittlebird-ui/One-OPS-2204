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

// Full IATA standard delay codes
const sampleDelayCodes: DelayCode[] = [
  // Airline
  { id: "DC01", code: "00", category: "Airline", description: "No delay / On-time departure", responsible: "Other", impactLevel: "Low", avgMinutes: 0, active: true },
  { id: "DC02", code: "01", category: "Airline", description: "Passenger check-in at departure gate", responsible: "Airline", impactLevel: "Low", avgMinutes: 8, active: true },
  { id: "DC03", code: "05", category: "Airline", description: "Flight plan – Late completion or change of flight documentation", responsible: "Airline", impactLevel: "Low", avgMinutes: 10, active: true },
  { id: "DC04", code: "06", category: "Airline", description: "Late completion of weight and balance documentation", responsible: "Airline", impactLevel: "Low", avgMinutes: 12, active: true },
  { id: "DC05", code: "09", category: "Airline", description: "Scheduled departure time re-allocated upon request of airline", responsible: "Airline", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC06", code: "11", category: "Airline", description: "Late check-in – Acceptance after deadline", responsible: "Airline", impactLevel: "Low", avgMinutes: 10, active: true },
  { id: "DC07", code: "12", category: "Airline", description: "Late check-in – Congestion at check-in area", responsible: "Airport", impactLevel: "Medium", avgMinutes: 15, active: true },
  { id: "DC08", code: "13", category: "Airline", description: "Check-in error – Weight/ticket discrepancy", responsible: "Airline", impactLevel: "Low", avgMinutes: 8, active: true },
  { id: "DC09", code: "14", category: "Airline", description: "Oversales – Booking error", responsible: "Airline", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC10", code: "15", category: "Airline", description: "Boarding – Discrepancy, pax count after boarding", responsible: "Airline", impactLevel: "Medium", avgMinutes: 18, active: true },
  { id: "DC11", code: "16", category: "Airline", description: "Commercial publicity/VIP – Passenger delaying departure", responsible: "Airline", impactLevel: "Low", avgMinutes: 12, active: true },
  { id: "DC12", code: "17", category: "Airline", description: "Catering order – Late or incorrect order", responsible: "Airline", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC13", code: "18", category: "Airline", description: "Baggage processing – Sorting/delivery", responsible: "Handling", impactLevel: "Medium", avgMinutes: 15, active: true },
  { id: "DC14", code: "19", category: "Airline", description: "Reduced mobility – Boarding assistance for PRM", responsible: "Airline", impactLevel: "Low", avgMinutes: 10, active: true },
  // Handling
  { id: "DC15", code: "31", category: "Handling", description: "Aircraft documentation late – Weight sheet / loadsheet", responsible: "Handling", impactLevel: "Medium", avgMinutes: 15, active: true },
  { id: "DC16", code: "32", category: "Handling", description: "Loading/unloading – Incorrect loading or sequence", responsible: "Handling", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC17", code: "33", category: "Handling", description: "Loading/unloading – Incomplete or late", responsible: "Handling", impactLevel: "High", avgMinutes: 30, active: true },
  { id: "DC18", code: "34", category: "Handling", description: "Loading/unloading – Baggage irregularity", responsible: "Handling", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC19", code: "35", category: "Handling", description: "Loading/unloading – Cargo irregularity", responsible: "Handling", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC20", code: "36", category: "Handling", description: "Aircraft cleaning – Delayed or incomplete", responsible: "Handling", impactLevel: "Low", avgMinutes: 12, active: true },
  { id: "DC21", code: "37", category: "Handling", description: "Catering – Late delivery or loading", responsible: "Handling", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC22", code: "38", category: "Handling", description: "ULD – Container or pallet unavailability or shortage", responsible: "Handling", impactLevel: "High", avgMinutes: 35, active: true },
  { id: "DC23", code: "39", category: "Handling", description: "Technical equipment – Ground equipment shortage or failure", responsible: "Handling", impactLevel: "High", avgMinutes: 40, active: true },
  // Technical / Maintenance
  { id: "DC24", code: "41", category: "Technical", description: "Aircraft defect – Discovered during transit check", responsible: "Airline", impactLevel: "High", avgMinutes: 60, active: true },
  { id: "DC25", code: "42", category: "Technical", description: "Scheduled maintenance – Overrun from hangar", responsible: "Airline", impactLevel: "High", avgMinutes: 90, active: true },
  { id: "DC26", code: "43", category: "Technical", description: "Non-scheduled maintenance – Special checks required", responsible: "Airline", impactLevel: "High", avgMinutes: 120, active: true },
  { id: "DC27", code: "44", category: "Technical", description: "Spares and maintenance – Awaiting parts", responsible: "Airline", impactLevel: "High", avgMinutes: 180, active: true },
  { id: "DC28", code: "45", category: "Technical", description: "AOG spares – Awaiting spares to be delivered", responsible: "Airline", impactLevel: "High", avgMinutes: 240, active: true },
  { id: "DC29", code: "46", category: "Technical", description: "Aircraft change – For technical reasons", responsible: "Airline", impactLevel: "High", avgMinutes: 60, active: true },
  // Cargo
  { id: "DC30", code: "51", category: "Cargo", description: "Cargo documentation – Late or inaccurate", responsible: "Handling", impactLevel: "Low", avgMinutes: 15, active: true },
  { id: "DC31", code: "52", category: "Cargo", description: "Cargo – Late positioning", responsible: "Handling", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC32", code: "53", category: "Cargo", description: "Cargo – Late acceptance", responsible: "Handling", impactLevel: "Medium", avgMinutes: 18, active: true },
  { id: "DC33", code: "55", category: "Cargo", description: "Cargo – Oversized cargo handling", responsible: "Handling", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC34", code: "57", category: "Cargo", description: "Cargo – Mail late delivery", responsible: "Other", impactLevel: "Low", avgMinutes: 10, active: true },
  // Security
  { id: "DC35", code: "21", category: "Security", description: "Passenger security – Additional screening required", responsible: "Security", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC36", code: "22", category: "Security", description: "Security – Baggage identification or reconciliation", responsible: "Security", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC37", code: "23", category: "Security", description: "Security – Bomb threat or unattended bag", responsible: "Security", impactLevel: "High", avgMinutes: 60, active: true },
  { id: "DC38", code: "24", category: "Security", description: "Security – Unauthorized access to restricted area", responsible: "Security", impactLevel: "High", avgMinutes: 45, active: true },
  // Weather
  { id: "DC39", code: "71", category: "Weather", description: "Departure station – Below landing/take-off minima", responsible: "Weather", impactLevel: "High", avgMinutes: 60, active: true },
  { id: "DC40", code: "72", category: "Weather", description: "Destination station – Below landing minima", responsible: "Weather", impactLevel: "High", avgMinutes: 45, active: true },
  { id: "DC41", code: "73", category: "Weather", description: "En-route weather – Turbulence or thunderstorm", responsible: "Weather", impactLevel: "Medium", avgMinutes: 30, active: true },
  { id: "DC42", code: "75", category: "Weather", description: "De-icing/Anti-icing – Aircraft treatment required", responsible: "Weather", impactLevel: "High", avgMinutes: 35, active: true },
  { id: "DC43", code: "76", category: "Weather", description: "Removal of snow/ice/water/sand from runway", responsible: "Airport", impactLevel: "High", avgMinutes: 40, active: true },
  { id: "DC44", code: "77", category: "Weather", description: "Ground handling impaired by adverse weather", responsible: "Weather", impactLevel: "Medium", avgMinutes: 25, active: true },
  // ATC / Airport
  { id: "DC45", code: "81", category: "ATC", description: "ATC – Mandatory slot or flow control restriction", responsible: "ATC", impactLevel: "High", avgMinutes: 45, active: true },
  { id: "DC46", code: "82", category: "ATC", description: "ATC – Airspace or route restriction", responsible: "ATC", impactLevel: "High", avgMinutes: 50, active: true },
  { id: "DC47", code: "83", category: "ATC", description: "ATC – Airport or runway closure", responsible: "ATC", impactLevel: "High", avgMinutes: 90, active: true },
  { id: "DC48", code: "85", category: "Airport", description: "Mandatory security – Government/immigration authority delay", responsible: "Airport", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC49", code: "86", category: "Airport", description: "Immigration/customs/health authority delay", responsible: "Airport", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC50", code: "87", category: "Airport", description: "Airport facility limitation – Gate, parking, taxi", responsible: "Airport", impactLevel: "Medium", avgMinutes: 30, active: true },
  { id: "DC51", code: "89", category: "ATC", description: "ATC start-up sequence – Delayed start-up or pushback", responsible: "ATC", impactLevel: "Medium", avgMinutes: 20, active: true },
  // Reactionary
  { id: "DC52", code: "91", category: "Reactionary", description: "Connecting flight – Late arrival of passengers/crew", responsible: "Airline", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC53", code: "92", category: "Reactionary", description: "Through check-in error – Missing connecting passengers", responsible: "Airline", impactLevel: "Medium", avgMinutes: 20, active: true },
  { id: "DC54", code: "93", category: "Reactionary", description: "Late inbound aircraft – Aircraft arrived late from previous sector", responsible: "Airline", impactLevel: "High", avgMinutes: 45, active: true },
  { id: "DC55", code: "94", category: "Reactionary", description: "Cabin crew – Awaiting crew from incoming flight", responsible: "Airline", impactLevel: "High", avgMinutes: 40, active: true },
  { id: "DC56", code: "95", category: "Reactionary", description: "Crew – Awaiting crew from other transport", responsible: "Airline", impactLevel: "Medium", avgMinutes: 30, active: true },
  { id: "DC57", code: "96", category: "Reactionary", description: "Operations control – Crew re-assignment or substitution", responsible: "Airline", impactLevel: "Medium", avgMinutes: 25, active: true },
  { id: "DC58", code: "99", category: "Miscellaneous", description: "Miscellaneous – Other delay not classified above", responsible: "Other", impactLevel: "Low", avgMinutes: 15, active: true },
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
  const [impactFilter, setImpactFilter] = useState("All Impact");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<DelayCode>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<DelayCode>>({ code: "", category: "", description: "", responsible: "Airline", impactLevel: "Low", avgMinutes: 0, active: true });

  const filtered = useMemo(() => {
    let r = codes;
    if (filter !== "All") r = r.filter(c => c.responsible === filter);
    if (impactFilter !== "All Impact") r = r.filter(c => c.impactLevel === impactFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(c => c.code.includes(s) || c.description.toLowerCase().includes(s) || c.category.toLowerCase().includes(s)); }
    return r;
  }, [codes, search, filter, impactFilter]);

  const set = (k: keyof DelayCode, v: any) => setEditRow(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Clock size={22} className="text-primary" /> IATA Delay Codes</h1>
        <p className="text-muted-foreground text-sm mt-1">Full IATA standard delay code library ({codes.length} codes)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.length}</div><div className="text-xs text-muted-foreground">Total Codes</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-destructive"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.filter(c => c.impactLevel === "High").length}</div><div className="text-xs text-muted-foreground">High Impact</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.filter(c => c.impactLevel === "Medium").length}</div><div className="text-xs text-muted-foreground">Medium Impact</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{codes.filter(c => c.impactLevel === "Low").length}</div><div className="text-xs text-muted-foreground">Low Impact</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{Math.round(codes.filter(c => c.avgMinutes > 0).reduce((s, c) => s + c.avgMinutes, 0) / codes.filter(c => c.avgMinutes > 0).length)} min</div><div className="text-xs text-muted-foreground">Avg Delay</div></div></div>
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
                      <td className="px-4 py-2.5 text-foreground max-w-[350px]">{row.description}</td>
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
