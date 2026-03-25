import { useMemo } from "react";
import { UtensilsCrossed, Download } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";

type Row = { id: string; item: string; unit: string; price: string; category: string };

export default function CateringPage() {
  const { data, isLoading } = useSupabaseTable<Row>("catering_items", { orderBy: "category", ascending: true });

  const grouped = useMemo(() => data.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as Record<string, Row[]>), [data]);

  const handleExport = () => exportToExcel(data.map(r => ({ Item: r.item, Unit: r.unit, "Price (USD)": r.price, Category: r.category })), "Catering", "Link_Catering.xlsx");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><UtensilsCrossed size={22} className="text-primary" /> Catering Services</h1><p className="text-muted-foreground text-sm mt-1">In-flight catering, supplies, and food service pricing</p></div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold hover:bg-muted transition-colors text-primary border-primary/30"><Download size={14} /> Export Excel</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-warning"><UtensilsCrossed size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Menu Items</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-primary"><UtensilsCrossed size={20} /></div><div><div className="text-2xl font-bold text-foreground">{Object.keys(grouped).length}</div><div className="text-xs text-muted-foreground">Categories</div></div></div>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="font-bold text-foreground mb-2">{cat}</h3>
          <div className="bg-card rounded-lg border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr>{["ITEM", "UNIT", "PRICE (USD)"].map(h => <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{items.map(r => (
              <tr key={r.id} className="data-table-row"><td className="px-4 py-2.5 font-semibold text-foreground">{r.item}</td><td className="px-4 py-2.5 text-muted-foreground text-xs">{r.unit}</td><td className="px-4 py-2.5 font-semibold text-success">{r.price}</td></tr>
            ))}</tbody></table></div></div>
        </div>
      ))}
    </div>
  );
}
