import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Shield, Plane, FileBarChart2 } from "lucide-react";
import { getTypeBadgeClass } from "@/lib/typeColors";

type StatRow = { key: string; count: number; extra?: Record<string, number | string> };

function groupBy<T>(rows: T[], pick: (r: T) => string): Record<string, T[]> {
  const m: Record<string, T[]> = {};
  rows.forEach(r => {
    const k = (pick(r) || "Unspecified").trim() || "Unspecified";
    (m[k] ||= []).push(r);
  });
  return m;
}

function StatsTable({ title, rows, valueCols }: {
  title: string;
  rows: StatRow[];
  valueCols: { key: string; label: string; format?: (v: any) => string }[];
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <span className="text-sm text-muted-foreground">Total: <b className="text-foreground">{total}</b></span>
      </div>
      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No data available</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Item</th>
                <th className="text-right px-3 py-2 font-medium">Count</th>
                <th className="text-right px-3 py-2 font-medium">Share</th>
                {valueCols.map(c => (
                  <th key={c.key} className="text-right px-3 py-2 font-medium">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.sort((a, b) => b.count - a.count).map(r => (
                <tr key={r.key} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeClass(r.key)}`}>
                      {r.key}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-foreground">{r.count}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {total ? `${((r.count / total) * 100).toFixed(1)}%` : "—"}
                  </td>
                  {valueCols.map(c => (
                    <td key={c.key} className="px-3 py-2 text-right text-foreground">
                      {c.format ? c.format(r.extra?.[c.key]) : (r.extra?.[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function OperationsReportsPage() {
  const { data: serviceReports = [] } = useSupabaseTable<any>("service_reports", { stationFilter: true });
  const { data: dispatches = [] } = useSupabaseTable<any>("dispatch_assignments", { stationFilter: true });

  // Handling stats: by handling_type, day/night, station
  const handlingByType = useMemo<StatRow[]>(() => {
    const g = groupBy(serviceReports, (r: any) => r.handling_type);
    return Object.entries(g).map(([key, rows]) => {
      const revenue = rows.reduce((s, r: any) => s + Number(r.total_cost || 0), 0);
      const pax = rows.reduce((s, r: any) =>
        s + Number(r.pax_in_adult_i || 0) + Number(r.pax_in_adult_d || 0) +
        Number(r.pax_in_inf_i || 0) + Number(r.pax_in_inf_d || 0) +
        Number(r.pax_transit || 0), 0);
      return { key, count: rows.length, extra: { revenue, pax } };
    });
  }, [serviceReports]);

  const handlingByStation = useMemo<StatRow[]>(() => {
    const g = groupBy(serviceReports, (r: any) => r.station);
    return Object.entries(g).map(([key, rows]) => ({
      key, count: rows.length,
      extra: { revenue: rows.reduce((s, r: any) => s + Number(r.total_cost || 0), 0) },
    }));
  }, [serviceReports]);

  const handlingByDayNight = useMemo<StatRow[]>(() => {
    const g = groupBy(serviceReports, (r: any) => r.day_night === "N" ? "Night" : "Day");
    return Object.entries(g).map(([key, rows]) => ({ key, count: rows.length }));
  }, [serviceReports]);

  // Security stats: by clearance_type, status, station
  const secByType = useMemo<StatRow[]>(() => {
    const g = groupBy(dispatches, (r: any) => r.clearance_type);
    return Object.entries(g).map(([key, rows]) => ({
      key, count: rows.length,
      extra: { completed: rows.filter((r: any) => (r.status || "").toLowerCase() === "completed").length },
    }));
  }, [dispatches]);

  const secByStatus = useMemo<StatRow[]>(() => {
    const g = groupBy(dispatches, (r: any) => r.status || "Pending");
    return Object.entries(g).map(([key, rows]) => ({ key, count: rows.length }));
  }, [dispatches]);

  const secByStation = useMemo<StatRow[]>(() => {
    const g = groupBy(dispatches, (r: any) => r.station);
    return Object.entries(g).map(([key, rows]) => ({ key, count: rows.length }));
  }, [dispatches]);

  const fmtMoney = (v: any) => v ? `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";
  const fmtNum = (v: any) => v ? Number(v).toLocaleString() : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileBarChart2 className="text-primary" size={22} />
        <div>
          <h1 className="text-xl font-bold text-foreground">Operations Reports</h1>
          <p className="text-sm text-muted-foreground">Statistics for Security and Handling activity, broken down by item.</p>
        </div>
      </div>

      <Tabs defaultValue="security" className="w-full">
        <TabsList>
          <TabsTrigger value="security" className="gap-1.5"><Shield size={14} /> Security</TabsTrigger>
          <TabsTrigger value="handling" className="gap-1.5"><Plane size={14} /> Handling</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-4 mt-4">
          <StatsTable
            title="Security — By Service Type"
            rows={secByType}
            valueCols={[{ key: "completed", label: "Completed", format: fmtNum }]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <StatsTable title="Security — By Status" rows={secByStatus} valueCols={[]} />
            <StatsTable title="Security — By Station" rows={secByStation} valueCols={[]} />
          </div>
        </TabsContent>

        <TabsContent value="handling" className="space-y-4 mt-4">
          <StatsTable
            title="Handling — By Handling Type"
            rows={handlingByType}
            valueCols={[
              { key: "revenue", label: "Revenue", format: fmtMoney },
              { key: "pax", label: "PAX", format: fmtNum },
            ]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <StatsTable
              title="Handling — By Station"
              rows={handlingByStation}
              valueCols={[{ key: "revenue", label: "Revenue", format: fmtMoney }]}
            />
            <StatsTable title="Handling — Day vs Night" rows={handlingByDayNight} valueCols={[]} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
