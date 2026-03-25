import { Crown, Download } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";

type Row = { id: string; service: string; unit: string; price: string; terminal: string };

export default function HallVVIPPage() {
  const { data, isLoading } = useSupabaseTable<Row>("hall_vvip", { orderBy: "created_at", ascending: true });
  const handleExport = () => exportToExcel(data.map(r => ({ Service: r.service, Unit: r.unit, "Price (USD)": r.price, Terminal: r.terminal })), "Hall VVIP", "Link_Hall_VVIP.xlsx");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Crown size={22} className="text-primary" /> Hall & VVIP Services</h1><p className="text-muted-foreground text-sm mt-1">Lounge, VVIP pavilion, and premium terminal services</p></div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold hover:bg-muted transition-colors text-primary border-primary/30"><Download size={14} /> Export Excel</button>
      </div>
      <div className="bg-card rounded-lg border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr>{["SERVICE", "UNIT", "PRICE (USD)", "TERMINAL"].map(h => <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{isLoading ? <tr><td colSpan={4} className="text-center py-16 text-muted-foreground">Loading…</td></tr> : data.map(r => (
          <tr key={r.id} className="data-table-row"><td className="px-4 py-2.5 font-semibold text-foreground">{r.service}</td><td className="px-4 py-2.5 text-muted-foreground text-xs">{r.unit}</td><td className="px-4 py-2.5 font-semibold text-success">{r.price}</td><td className="px-4 py-2.5 font-mono text-xs text-foreground">{r.terminal}</td></tr>
        ))}</tbody></table></div></div>
    </div>
  );
}
