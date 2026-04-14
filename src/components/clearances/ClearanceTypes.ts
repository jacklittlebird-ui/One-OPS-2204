export type ClearanceRow = {
  id: string;
  flight_schedule_id: string | null;
  airline_id: string | null;
  permit_no: string;
  flight_no: string;
  aircraft_type: string;
  registration: string;
  route: string;
  clearance_type: string;
  requested_date: string;
  valid_from: string | null;
  valid_to: string | null;
  status: string;
  authority: string;
  remarks: string;
  purpose: string;
  passengers: number;
  cargo_kg: number;
  handling_agent: string;
  // New schedule fields
  config: number;
  departure_flight: string;
  arrival_flight: string;
  departure_date: string | null;
  arrival_date: string | null;
  sta: string;
  std: string;
  skd_type: string;
  royalty: boolean;
  handling: string;
  week_days: string;
  period_from: string | null;
  period_to: string | null;
  no_of_flights: number;
  ref_no: string;
  notes: string;
};

export const CLEARANCE_TYPES = ["Arrival", "Departure", "Turnaround", "Maintenance", "ADHOC", "Transportation"];
export const PURPOSES = ["Scheduled", "Charter", "Technical Stop", "Cargo", "VIP", "Diplomatic", "Medical Evacuation", "Ferry"];
export const SKD_TYPES = ["Schedule", "Charter", "Extra", "Cargo", "VIP", "Technical"];
export const HANDLING_OPTIONS = ["Full Handling", "Ramp Only", "Transit", "Technical", "VIP Hall", "Ferry"];

export const STATUS_CONFIG: Record<string, { cls: string }> = {
  Pending:   { cls: "bg-warning/15 text-warning" },
  Approved:  { cls: "bg-success/15 text-success" },
  Rejected:  { cls: "bg-destructive/15 text-destructive" },
  Expired:   { cls: "bg-muted text-muted-foreground" },
  Cancelled: { cls: "bg-muted text-muted-foreground" },
};

export const emptyForm = {
  airline_id: "", permit_no: "", flight_no: "", aircraft_type: "", registration: "",
  route: "", clearance_type: "Landing", requested_date: new Date().toISOString().slice(0, 10),
  valid_from: "", valid_to: "", status: "Pending", authority: "", remarks: "",
  purpose: "Scheduled", passengers: 0, cargo_kg: 0, handling_agent: "",
  config: 0, departure_flight: "", arrival_flight: "",
  departure_date: "", arrival_date: "", sta: "", std: "",
  skd_type: "", royalty: false, handling: "",
  week_days: "", period_from: "", period_to: "", no_of_flights: 0,
  ref_no: "", notes: "",
};
