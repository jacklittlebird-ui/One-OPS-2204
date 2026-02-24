import { tubeCharges } from "@/data/servicesData";
import { Building2, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

export default function TubePage() {
  const handleExport = () => exportToExcel(
    tubeCharges.map(r => ({ Service: r.service, Unit: r.unit, "Price (USD)": r.price, Airport: r.airport })),
    "Tube Charges", "Link_Tube_Charges.xlsx"
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Building2 size={22} className="text-primary" /> Tube Bridge Charges</h1>
          <p className="text-muted-foreground text-sm mt-1">Jetway / tube bridge usage fees by airport</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold hover:bg-muted transition-colors text-primary border-primary/30">
          <Download size={14} /> Export Excel
        </button>
      </div>
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["SERVICE", "UNIT", "PRICE (USD)", "AIRPORT"].map(h => <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {tubeCharges.map((r, i) => (
                <tr key={i} className="data-table-row">
                  <td className="px-4 py-2.5 font-semibold text-foreground">{r.service}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.unit}</td>
                  <td className="px-4 py-2.5 font-semibold text-success">{r.price}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground">{r.airport}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
