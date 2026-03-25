import { useState, useMemo } from "react";
import { Search, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";

const statusCfg: Record<string, string> = { Active: "bg-success/15 text-success", Expired: "bg-muted text-muted-foreground", Draft: "bg-info/15 text-info", Superseded: "bg-warning/15 text-warning" };
const priorityCfg: Record<string, string> = { High: "bg-destructive/15 text-destructive", Medium: "bg-warning/15 text-warning", Low: "bg-muted text-muted-foreground" };

type BulRow = { id: string; bulletin_id: string; title: string; type: string; issued_date: string; effective_date: string; expiry_date: string; issued_by: string; status: string; priority: string; description: string };

export default function BulletinsPage() {
  const { data, isLoading } = useSupabaseTable<BulRow>("bulletins", { orderBy: "issued_date", ascending: false });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() => {
    let r = data;
    if (typeFilter !== "All") r = r.filter(b => b.type === typeFilter);
    if (statusFilter !== "All") r = r.filter(b => b.status === statusFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(b => b.title.toLowerCase().includes(s) || b.bulletin_id.toLowerCase().includes(s)); }
    return r;
  }, [data, search, typeFilter, statusFilter]);

  const handleExport = () => exportToExcel(
    filtered.map(b => ({ ID: b.bulletin_id, Title: b.title, Type: b.type, Issued: b.issued_date, Effective: b.effective_date, Expiry: b.expiry_date, "Issued By": b.issued_by, Priority: b.priority, Status: b.status })),
    "Bulletins", "Link_Bulletins.xlsx"
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText size={22} className="text-primary" /> Bulletins</h1>
          <p className="text-muted-foreground text-sm mt-1">Safety, security, and operational bulletins</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold hover:bg-muted transition-colors text-primary border-primary/30"><Download size={14} /> Export Excel</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><FileText size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Bulletins</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.filter(b => b.status === "Active").length}</div><div className="text-xs text-muted-foreground">Active</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-destructive"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.filter(b => b.priority === "High").length}</div><div className="text-xs text-muted-foreground">High Priority</div></div></div>
      </div>
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Bulletin Records</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search bulletins…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground"><option>All</option><option>Safety</option><option>Security</option><option>Operations</option><option>Quality</option><option>Regulatory</option></select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground"><option>All</option><option>Active</option><option>Expired</option><option>Draft</option><option>Superseded</option></select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["ID", "TITLE", "TYPE", "ISSUED", "EFFECTIVE", "EXPIRY", "ISSUED BY", "PRIORITY", "STATUS"].map(h => <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-16 text-muted-foreground">Loading…</td></tr>
              ) : filtered.map(b => (
                <tr key={b.id} className="data-table-row">
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-primary">{b.bulletin_id}</td>
                  <td className="px-3 py-2.5 font-semibold text-foreground max-w-[250px] truncate">{b.title}</td>
                  <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{b.type}</span></td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{b.issued_date}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{b.effective_date}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{b.expiry_date}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{b.issued_by}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityCfg[b.priority]}`}>{b.priority}</span></td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg[b.status]}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
