import { Receipt, Download } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";

type Row = { id: string; tax: string; unit: string; amount: string; applicability: string };

export default function AirportTaxPage() {
  const { data, isLoading } = useSupabaseTable<Row>("airport_tax", { orderBy: "created_at", ascending: true });
  const handleExport = () => exportToExcel(data.map(r => ({ "Tax/Fee": r.tax, Unit: r.unit, "Amount (USD)": r.amount, Applicability: r.applicability })), "Airport Tax", "Link_Airport_Tax.xlsx");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Receipt size={22} className="text-primary" /> Airport Tax</h1><p className="text-muted-foreground text-sm mt-1">Egyptian airport taxes, levies, and government fees</p></div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold hover:bg-muted transition-colors text-primary border-primary/30"><Download size={14} /> Export Excel</button>
      </div>
      <div className="bg-card rounded-lg border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr>{["TAX / FEE", "UNIT", "AMOUNT (USD)", "APPLICABILITY"].map(h => <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{isLoading ? <tr><td colSpan={4} className="text-center py-16 text-muted-foreground">Loading…</td></tr> : data.map(r => (
          <tr key={r.id} className="data-table-row"><td className="px-4 py-2.5 font-semibold text-foreground">{r.tax}</td><td className="px-4 py-2.5 text-muted-foreground text-xs">{r.unit}</td><td className="px-4 py-2.5 font-semibold text-success">{r.amount}</td><td className="px-4 py-2.5 text-muted-foreground text-xs">{r.applicability}</td></tr>
        ))}</tbody></table></div></div>
    </div>
  );
}
