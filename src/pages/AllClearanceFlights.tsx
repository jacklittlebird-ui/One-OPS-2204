import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plane, Search, Eye, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SECURITY_CLEARANCE_TYPES } from "@/components/clearances/ClearanceTypes";

interface AllClearanceFlightsPageProps {
  /** When true, only Security clearance types are shown (Operations security view). */
  securityOnly?: boolean;
}

type FlightRow = {
  id: string;
  flight_no: string;
  aircraft_type: string;
  registration: string;
  route: string;
  clearance_type: string;
  status: string;
  authority: string;
  permit_no: string;
  purpose: string;
  passengers: number;
  cargo_kg: number;
  handling_agent: string;
  arrival_date: string | null;
  departure_date: string | null;
  sta: string | null;
  std: string | null;
  arrival_flight: string | null;
  departure_flight: string | null;
  remarks: string;
  notes: string | null;
  airline_id: string | null;
  created_at: string;
};

const STATUS_CLS: Record<string, string> = {
  Pending: "bg-warning/15 text-warning",
  Approved: "bg-success/15 text-success",
  Rejected: "bg-destructive/15 text-destructive",
  Expired: "bg-muted text-muted-foreground",
  Cancelled: "bg-muted text-muted-foreground",
};

export default function AllClearanceFlightsPage({ securityOnly = false }: AllClearanceFlightsPageProps = {}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: flights = [], isLoading } = useQuery({
    queryKey: ["all_clearance_flights_readonly"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_schedules")
        .select("*")
        .order("arrival_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as unknown as FlightRow[];
    },
  });

  const { data: airlines = [] } = useQuery({
    queryKey: ["airlines_lookup_readonly"],
    queryFn: async () => {
      const { data } = await supabase.from("airlines").select("id,name,iata_code");
      return data || [];
    },
  });
  const airlineMap = useMemo(() => {
    const m = new Map<string, { name: string; iata: string }>();
    airlines.forEach((a: any) => m.set(a.id, { name: a.name, iata: a.iata_code }));
    return m;
  }, [airlines]);

  const allTypes = useMemo(
    () => Array.from(new Set(flights.map(f => f.clearance_type).filter(Boolean))).sort(),
    [flights]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flights.filter(f => {
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (typeFilter !== "all" && f.clearance_type !== typeFilter) return false;
      if (!q) return true;
      const airline = f.airline_id ? airlineMap.get(f.airline_id)?.name || "" : "";
      return [
        f.flight_no, f.permit_no, f.registration, f.route, f.aircraft_type,
        f.handling_agent, f.authority, f.purpose, airline,
        f.arrival_flight, f.departure_flight,
      ].some(v => (v || "").toLowerCase().includes(q));
    });
  }, [flights, search, statusFilter, typeFilter, airlineMap]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plane size={22} className="text-primary" />
            All Clearance Flights
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Lock size={12} />
            Read-only view of every flight entered by the Clearance team.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1">
            <Eye size={11} /> Read-only
          </Badge>
          <Badge variant="secondary">{filtered.length} flight{filtered.length === 1 ? "" : "s"}</Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="md:col-span-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flight, permit, registration, route, airline…"
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Clearance Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {allTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {[
                  "Permit #", "Flight", "Airline", "A/C Type", "Reg.", "Route",
                  "Clearance Type", "Arr. Date", "STA", "Dep. Date", "STD",
                  "PAX", "Cargo (kg)", "Handling Agent", "Authority", "Status"
                ].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={16} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={16} className="text-center py-16 text-muted-foreground">
                    <Plane size={32} className="mx-auto mb-2 text-muted-foreground/30" />
                    <p className="font-semibold text-foreground text-sm">No flights found</p>
                    <p className="text-xs">Try adjusting your filters.</p>
                  </td>
                </tr>
              ) : filtered.map(f => {
                const airline = f.airline_id ? airlineMap.get(f.airline_id) : null;
                return (
                  <tr key={f.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-mono text-[11px] text-foreground whitespace-nowrap">{f.permit_no || "—"}</td>
                    <td className="px-3 py-2 font-semibold text-foreground text-xs whitespace-nowrap">{f.flight_no || "—"}</td>
                    <td className="px-3 py-2 text-foreground text-xs whitespace-nowrap">
                      {airline ? `${airline.iata ? airline.iata + " · " : ""}${airline.name}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-foreground text-xs whitespace-nowrap">{f.aircraft_type || "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{f.registration || "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{f.route || "—"}</td>
                    <td className="px-3 py-2 text-foreground text-xs whitespace-nowrap">{f.clearance_type || "—"}</td>
                    <td className="px-3 py-2 text-foreground text-xs whitespace-nowrap">{f.arrival_date || "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-foreground whitespace-nowrap">{f.sta || "—"}</td>
                    <td className="px-3 py-2 text-foreground text-xs whitespace-nowrap">{f.departure_date || "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-foreground whitespace-nowrap">{f.std || "—"}</td>
                    <td className="px-3 py-2 text-foreground text-xs text-right">{f.passengers || 0}</td>
                    <td className="px-3 py-2 text-foreground text-xs text-right">{f.cargo_kg || 0}</td>
                    <td className="px-3 py-2 text-foreground text-xs whitespace-nowrap">{f.handling_agent || "—"}</td>
                    <td className="px-3 py-2 text-foreground text-xs whitespace-nowrap">{f.authority || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_CLS[f.status] || "bg-muted text-muted-foreground"}`}>
                        {f.status || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
