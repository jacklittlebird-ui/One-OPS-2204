import { Wrench, Download } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";

type Row = { id: string; service: string; unit: string; price: string };

export default function BasicRampPage() {
  const { data, isLoading } = useSupabaseTable<Row>("basic_ramp", { orderBy: "created_at", ascending: true });
  const handleExport = () => exportToExcel(data.map(r => ({ Service: r.service, Unit: r.unit, "Price (USD)": r.price })), "Basic Ramp", "Link_Basic_Ramp.xlsx");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Wrench size={22} className="text-primary" /> Basic Ramp Services</h1><p className="text-muted-foreground text-sm mt-1">Standard ramp equipment and services pricing</p></div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold hover:bg-muted transition-colors text-primary border-primary/30"><Download size={14} /> Export Excel</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Wrench size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Services</div></div></div>
      </div>
      <div className="bg-card rounded-lg border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr>{["SERVICE", "UNIT", "PRICE (USD)"].map(h => <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{isLoading ? <tr><td colSpan={3} className="text-center py-16 text-muted-foreground">Loading…</td></tr> : data.map(r => (
          <tr key={r.id} className="data-table-row"><td className="px-4 py-2.5 font-semibold text-foreground">{r.service}</td><td className="px-4 py-2.5 text-muted-foreground text-xs">{r.unit}</td><td className="px-4 py-2.5 font-semibold text-success">{r.price}</td></tr>
        ))}</tbody></table></div></div>
    </div>
  );
}
