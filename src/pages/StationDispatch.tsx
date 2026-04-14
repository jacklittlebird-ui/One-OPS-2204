import { useMemo } from "react";
import { Building2, Plane } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";

type FlightRow = {
  id: string;
  flight_no: string;
  route: string;
  sta: string | null;
  std: string | null;
  status: string;
  clearance_type: string;
  stations: string | null;
  airline_id: string | null;
  handling_agent: string;
  arrival_date: string | null;
  departure_date: string | null;
};

const statusColors: Record<string, string> = {
  Approved: "bg-success/15 text-success border-success/30",
  "In Progress": "bg-primary/15 text-primary border-primary/30",
  Pending: "bg-warning/15 text-warning border-warning/30",
  Completed: "bg-muted text-muted-foreground border-border",
  Serviced: "bg-success/15 text-success border-success/30",
  Scheduled: "bg-secondary text-secondary-foreground border-border",
};

// Mock station data for display — in production this would come from airports table
const STATIONS = [
  { code: "CAI", name: "Cairo International" },
  { code: "HRG", name: "Hurghada International" },
  { code: "SSH", name: "Sharm El Sheikh" },
];

export default function StationDispatchPage() {
  const { data: flights, isLoading } = useSupabaseTable<FlightRow>("flight_schedules");
  const { data: airlines } = useSupabaseTable<{ id: string; name: string; iata_code: string }>("airlines");

  const airlineMap = useMemo(() => {
    const m: Record<string, { name: string; iata: string }> = {};
    airlines.forEach(a => { m[a.id] = { name: a.name, iata: a.iata_code }; });
    return m;
  }, [airlines]);

  // Group flights by station
  const stationFlights = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const grouped: Record<string, typeof flights> = {};
    
    STATIONS.forEach(s => { grouped[s.code] = []; });
    
    flights.forEach(f => {
      // Try to match by route containing station code, or by handling_agent station
      STATIONS.forEach(s => {
        if (
          f.route?.toUpperCase().includes(s.code) ||
          (f as any).stations?.toUpperCase().includes(s.code)
        ) {
          grouped[s.code]?.push(f);
        }
      });
      // Default to CAI if no match
      if (!STATIONS.some(s => 
        f.route?.toUpperCase().includes(s.code) || 
        (f as any).stations?.toUpperCase().includes(s.code)
      )) {
        grouped["CAI"]?.push(f);
      }
    });
    
    return grouped;
  }, [flights]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 size={22} className="text-primary" /> Station Dispatch
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time daily flight traffic by airport</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {STATIONS.map(station => {
          const sFlights = stationFlights[station.code] || [];
          return (
            <div key={station.code} className="bg-card rounded-lg border">
              {/* Station Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Plane size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{station.code}</span>
                    <span className="font-semibold text-foreground">{station.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{sFlights.length} flights today</p>
                </div>
              </div>

              {/* Flights List */}
              <div className="divide-y">
                {sFlights.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No flights scheduled</div>
                ) : sFlights.slice(0, 8).map(f => {
                  const airline = f.airline_id ? airlineMap[f.airline_id] : null;
                  const statusCls = statusColors[f.status] || statusColors["Scheduled"];
                  const time = f.sta || f.std || "";
                  return (
                    <div key={f.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{f.flight_no}</span>
                          {airline && <span className="text-sm text-muted-foreground">{airline.name}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {time && <span>{time}</span>}
                          {f.route && <span> → {f.route}</span>}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusCls}`}>
                        {f.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
