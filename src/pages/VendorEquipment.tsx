import { Truck, CheckCircle, Download } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";

const statusCfg: Record<string, string> = { Available: "bg-success/15 text-success", Limited: "bg-warning/15 text-warning", "On Request": "bg-info/15 text-info", Seasonal: "bg-muted text-muted-foreground" };
type Row = { id: string; equipment: string; vendor: string; rate: string; status: string };

export default function VendorEquipmentPage() {
  const { data, isLoading } = useSupabaseTable<Row>("vendor_equipment", { orderBy: "created_at", ascending: true });
  const handleExport = () => exportToExcel(data.map(r => ({ Equipment: r.equipment, Vendor: r.vendor, Rate: r.rate, Status: r.status })), "Vendor Equipment", "Link_Vendor_Equipment.xlsx");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Truck size={22} className="text-primary" /> Vendor Equipment</h1><p className="text-muted-foreground text-sm mt-1">Third-party GSE equipment rates and availability</p></div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold hover:bg-muted transition-colors text-primary border-primary/30"><Download size={14} /> Export Excel</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Truck size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Equipment Types</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.filter(v => v.status === "Available").length}</div><div className="text-xs text-muted-foreground">Available</div></div></div>
      </div>
      <div className="bg-card rounded-lg border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr>{["EQUIPMENT", "VENDOR", "RATE", "STATUS"].map(h => <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{isLoading ? <tr><td colSpan={4} className="text-center py-16 text-muted-foreground">Loading…</td></tr> : data.map(r => (
          <tr key={r.id} className="data-table-row"><td className="px-4 py-2.5 font-semibold text-foreground">{r.equipment}</td><td className="px-4 py-2.5 text-foreground">{r.vendor}</td><td className="px-4 py-2.5 font-semibold text-success">{r.rate}</td><td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg[r.status] || ""}`}>{r.status}</span></td></tr>
        ))}</tbody></table></div></div>
    </div>
  );
}
