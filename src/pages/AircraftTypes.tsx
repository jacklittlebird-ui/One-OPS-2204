import { useState, useMemo } from "react";
import { Search, Plane, Download } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";

const catCfg: Record<string, string> = { NB: "bg-info/15 text-info", WB: "bg-primary/15 text-primary", SH: "bg-destructive/15 text-destructive", RJ: "bg-warning/15 text-warning", TP: "bg-success/15 text-success" };
const catLabel: Record<string, string> = { NB: "Narrow Body", WB: "Wide Body", SH: "Super Heavy", RJ: "Regional Jet", TP: "Turboprop" };

type ATRow = { id: string; icao: string; iata: string; name: string; category: string; mtow: number; seats: string };

export default function AircraftTypesPage() {
  const { data, isLoading } = useSupabaseTable<ATRow>("aircraft_types_ref", { orderBy: "icao", ascending: true });
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  const filtered = useMemo(() => {
    let r = data;
    if (catFilter !== "All") r = r.filter(a => a.category === catFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(a => a.name.toLowerCase().includes(s) || a.icao.toLowerCase().includes(s) || a.iata.toLowerCase().includes(s)); }
    return r;
  }, [data, search, catFilter]);

  const handleExport = () => exportToExcel(
    filtered.map(a => ({ ICAO: a.icao, IATA: a.iata, Name: a.name, Category: `${a.category} — ${catLabel[a.category] || a.category}`, "MTOW (ton)": a.mtow, Seats: a.seats })),
    "Aircraft Types", "Link_Aircraft_Types.xlsx"
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Plane size={22} className="text-primary" /> Aircraft Types Reference</h1>
          <p className="text-muted-foreground text-sm mt-1">ICAO/IATA codes, MTOW, and category reference for common aircraft</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold hover:bg-muted transition-colors text-primary border-primary/30"><Download size={14} /> Export Excel</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(catLabel).map(([k, v]) => (
          <div key={k} className="stat-card"><div className={`stat-card-icon ${catCfg[k]?.replace('/15', '').split(' ')[0]}`}><Plane size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.filter(a => a.category === k).length}</div><div className="text-xs text-muted-foreground">{v}</div></div></div>
        ))}
      </div>
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Aircraft Types ({filtered.length})</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search aircraft…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option>{Object.keys(catLabel).map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["ICAO", "IATA", "AIRCRAFT NAME", "CATEGORY", "MTOW (TON)", "SEATS"].map(h => <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-16 text-muted-foreground">Loading…</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="data-table-row">
                  <td className="px-4 py-2.5 font-mono font-bold text-primary">{a.icao}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{a.iata}</td>
                  <td className="px-4 py-2.5 font-semibold text-foreground">{a.name}</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${catCfg[a.category]}`}>{a.category} — {catLabel[a.category] || a.category}</span></td>
                  <td className="px-4 py-2.5 text-foreground">{a.mtow}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{a.seats}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
