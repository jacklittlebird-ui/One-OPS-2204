import { useState, useMemo } from "react";
import { Search, BookOpen, CheckCircle, Clock, Download } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";

const statusCfg: Record<string, string> = { Current: "bg-success/15 text-success", "Under Review": "bg-warning/15 text-warning", Archived: "bg-muted text-muted-foreground" };
const catCfg: Record<string, string> = { Manual: "bg-primary/15 text-primary", Form: "bg-info/15 text-info", Checklist: "bg-warning/15 text-warning", SOP: "bg-success/15 text-success" };

type MFRow = { id: string; doc_id: string; title: string; category: string; version: string; last_updated: string; department: string; status: string };

export default function ManualsAndFormsPage() {
  const { data, isLoading } = useSupabaseTable<MFRow>("manuals_forms", { orderBy: "doc_id", ascending: true });
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  const filtered = useMemo(() => {
    let r = data;
    if (catFilter !== "All") r = r.filter(m => m.category === catFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(m => m.title.toLowerCase().includes(s) || m.doc_id.toLowerCase().includes(s)); }
    return r;
  }, [data, search, catFilter]);

  const handleExport = () => exportToExcel(
    filtered.map(m => ({ ID: m.doc_id, Title: m.title, Category: m.category, Version: m.version, "Last Updated": m.last_updated, Department: m.department, Status: m.status })),
    "Manuals & Forms", "Link_Manuals_Forms.xlsx"
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BookOpen size={22} className="text-primary" /> Manuals & Forms</h1>
          <p className="text-muted-foreground text-sm mt-1">Company manuals, forms, checklists, and standard operating procedures</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold hover:bg-muted transition-colors text-primary border-primary/30"><Download size={14} /> Export Excel</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><BookOpen size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Documents</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.filter(m => m.status === "Current").length}</div><div className="text-xs text-muted-foreground">Current</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.filter(m => m.status === "Under Review").length}</div><div className="text-xs text-muted-foreground">Under Review</div></div></div>
      </div>
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Document Library</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground"><option>All</option><option>Manual</option><option>Form</option><option>Checklist</option><option>SOP</option></select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["ID", "TITLE", "CATEGORY", "VERSION", "LAST UPDATED", "DEPARTMENT", "STATUS"].map(h => <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">Loading…</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="data-table-row">
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-primary">{m.doc_id}</td>
                  <td className="px-3 py-2.5 font-semibold text-foreground">{m.title}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-medium ${catCfg[m.category]}`}>{m.category}</span></td>
                  <td className="px-3 py-2.5 font-mono text-xs text-foreground">{m.version}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{m.last_updated}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{m.department}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg[m.status]}`}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
