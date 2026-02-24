import { trafficRightsData } from "@/data/servicesData";
import { Shield, CheckCircle, XCircle, Clock, AlertCircle, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

const statusCfg: Record<string, string> = {
  Automatic: "bg-success/15 text-success",
  Bilateral: "bg-info/15 text-info",
  Restricted: "bg-warning/15 text-warning",
  "De facto": "bg-muted text-muted-foreground",
  Rare: "bg-accent/15 text-accent-foreground",
  Prohibited: "bg-destructive/15 text-destructive",
};

export default function TrafficRightsPage() {
  const handleExport = () => exportToExcel(
    trafficRightsData.map(r => ({ Freedom: r.right, Description: r.description, Status: r.status, Notes: r.notes })),
    "Traffic Rights", "Link_Traffic_Rights.xlsx"
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Shield size={22} className="text-primary" /> T2 — Traffic Rights</h1>
          <p className="text-muted-foreground text-sm mt-1">Freedoms of the air and bilateral air service agreements</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold hover:bg-muted transition-colors text-primary border-primary/30">
          <Download size={14} /> Export Excel
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Shield size={20} /></div><div><div className="text-2xl font-bold text-foreground">9</div><div className="text-xs text-muted-foreground">Freedoms of Air</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{trafficRightsData.filter(r => r.status === "Automatic" || r.status === "Bilateral").length}</div><div className="text-xs text-muted-foreground">Available</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-destructive"><XCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{trafficRightsData.filter(r => r.status === "Prohibited").length}</div><div className="text-xs text-muted-foreground">Prohibited</div></div></div>
      </div>
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["FREEDOM", "DESCRIPTION", "STATUS", "NOTES"].map(h => <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {trafficRightsData.map((r, i) => (
                <tr key={i} className="data-table-row">
                  <td className="px-4 py-2.5 font-bold text-primary whitespace-nowrap">{r.right}</td>
                  <td className="px-4 py-2.5 text-foreground max-w-[400px]">{r.description}</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg[r.status] || ""}`}>{r.status}</span></td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
