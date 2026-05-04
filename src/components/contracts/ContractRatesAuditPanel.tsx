import { useEffect, useState } from "react";
import { ShieldAlert, CheckCircle2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type RateRow = {
  contract_id: string;
  airport: string;
  flight_type: string;
  service_type: string;
};

type ContractInfo = { id: string; contract_no: string; airline: string; service_category: string };

interface PerContract {
  contract: ContractInfo;
  rateCount: number;
  byAirport: Record<string, Set<string>>;
  gaps: { airport: string; missing: string[] }[];
}

const SECURITY_PAIRS = [
  ["Arrival Security", "Departure Security"],
] as const;

function analyzeContract(contract: ContractInfo, rates: RateRow[]): PerContract {
  const byAirport: Record<string, Set<string>> = {};
  rates.forEach(r => {
    const ap = (r.airport || "").toUpperCase().trim();
    if (!ap) return;
    if (!byAirport[ap]) byAirport[ap] = new Set();
    byAirport[ap].add((r.flight_type || "").trim());
  });

  const gaps: { airport: string; missing: string[] }[] = [];
  Object.entries(byAirport).forEach(([ap, types]) => {
    const missing: string[] = [];
    SECURITY_PAIRS.forEach(([a, b]) => {
      if (types.has(a) && !types.has(b)) missing.push(b);
      if (types.has(b) && !types.has(a)) missing.push(a);
    });
    if (missing.length) gaps.push({ airport: ap, missing });
  });

  return { contract, rateCount: rates.length, byAirport, gaps };
}

export function ContractRatesAuditPanel() {
  const [data, setData] = useState<PerContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: contracts }, { data: rates }] = await Promise.all([
      supabase.from("contracts").select("id, contract_no, airline, service_category"),
      supabase.from("contract_service_rates").select("contract_id, airport, flight_type, service_type"),
    ]);
    const byContract: Record<string, RateRow[]> = {};
    (rates || []).forEach((r: any) => {
      (byContract[r.contract_id] ||= []).push(r);
    });
    const analyzed = (contracts || [])
      .map((c: any) => analyzeContract(c, byContract[c.id] || []))
      // Only show contracts that have at least one Security rate row,
      // since Audit focuses on Arrival/Departure Security pairing.
      .filter(p =>
        Array.from(Object.values(p.byAirport)).some(set =>
          Array.from(set).some(t => /security/i.test(t))
        )
      );
    setData(analyzed);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalGaps = data.reduce((s, p) => s + p.gaps.length, 0);
  const contractsWithGaps = data.filter(p => p.gaps.length > 0);

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 border-b hover:bg-muted/40 transition-colors text-left"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {totalGaps > 0 ? (
          <ShieldAlert size={16} className="text-warning" />
        ) : (
          <CheckCircle2 size={16} className="text-success" />
        )}
        <h2 className="text-sm font-semibold text-foreground">
          Contract Rates Audit
        </h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {loading
            ? "Loading…"
            : totalGaps > 0
              ? `${contractsWithGaps.length} contract(s) with ${totalGaps} gap(s)`
              : `All ${data.length} security contract(s) fully paired`}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); load(); }}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted text-foreground"
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Contract</th>
                <th className="text-left px-3 py-2 font-semibold">Airline</th>
                <th className="text-left px-3 py-2 font-semibold">Category</th>
                <th className="text-right px-3 py-2 font-semibold">Rate Rows</th>
                <th className="text-left px-3 py-2 font-semibold">Per-Airport Coverage</th>
                <th className="text-left px-3 py-2 font-semibold">Missing</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-muted-foreground">
                    No security contracts found.
                  </td>
                </tr>
              ) : data.map(p => (
                <tr key={p.contract.id} className="border-t align-top">
                  <td className="px-3 py-2 font-mono text-foreground">{p.contract.contract_no}</td>
                  <td className="px-3 py-2 text-foreground">{p.contract.airline}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.contract.service_category}</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">{p.rateCount}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(p.byAirport).map(([ap, types]) => {
                        const list = Array.from(types).filter(t => /security/i.test(t));
                        if (list.length === 0) return null;
                        return (
                          <span key={ap} className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground">
                            <span className="font-mono font-semibold">{ap}</span>
                            <span className="text-muted-foreground">{list.join(" + ")}</span>
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {p.gaps.length === 0 ? (
                      <span className="text-success inline-flex items-center gap-1"><CheckCircle2 size={12} /> Complete</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {p.gaps.map(g => (
                          <li key={g.airport} className="text-warning">
                            <span className="font-mono font-semibold">{g.airport}</span>: {g.missing.join(", ")}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
