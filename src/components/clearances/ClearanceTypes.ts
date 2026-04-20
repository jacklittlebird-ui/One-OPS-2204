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

export const CLEARANCE_TYPES = ["Arrival Handling", "Arrival Security", "Catering Only", "Departure Handling", "Departure Security", "Fuel Only", "Full Handling", "Hotel Accommodation", "Maintenance", "Maintenance Security", "Payment", "Supervision Only", "Technical Stop", "Touch & Go", "Transportation", "Turnaround Security"];

export const SECURITY_CLEARANCE_TYPES = ["Arrival Security", "Departure Security", "Maintenance Security", "Turnaround Security"];
export const HANDLING_CLEARANCE_TYPES = CLEARANCE_TYPES.filter(t => !SECURITY_CLEARANCE_TYPES.includes(t));

export type ServiceCategory = "handling" | "security";

export function getServiceCategory(clearanceType: string): ServiceCategory {
  return SECURITY_CLEARANCE_TYPES.includes(clearanceType) ? "security" : "handling";
}

export function getClearanceTypesByCategory(category: ServiceCategory): string[] {
  return category === "security" ? SECURITY_CLEARANCE_TYPES : HANDLING_CLEARANCE_TYPES;
}

export const PURPOSES = ["Cargo", "Charter", "Diplomatic", "Ferry", "Medical Evacuation", "Scheduled", "Technical Stop", "VIP"];
export const SKD_TYPES = ["ADHOC", "Cargo", "Charter", "General Aviation", "Meet and Assist", "Military", "Schedule", "State", "Transportation", "VIP Lounge"];
export const HANDLING_OPTIONS = ["Ferry", "Full Handling", "Ramp Only", "Technical", "Transit", "VIP Hall"];

export const STATUS_CONFIG: Record<string, { cls: string }> = {
  Pending:   { cls: "bg-warning/15 text-warning" },
  Approved:  { cls: "bg-success/15 text-success" },
  Rejected:  { cls: "bg-destructive/15 text-destructive" },
  Expired:   { cls: "bg-muted text-muted-foreground" },
  Cancelled: { cls: "bg-muted text-muted-foreground" },
};

export const emptyForm = {
  airline_id: "", permit_no: "", flight_no: "", aircraft_type: "", registration: "",
  route: "", clearance_type: "Arrival Security", requested_date: new Date().toISOString().slice(0, 10),
  valid_from: "", valid_to: "", status: "Approved", authority: "", remarks: "",
  purpose: "Scheduled", passengers: 0, cargo_kg: 0, handling_agent: "",
  config: 0, departure_flight: "", arrival_flight: "",
  departure_date: "", arrival_date: "", sta: "", std: "",
  skd_type: "Schedule", royalty: false, handling: "",
  week_days: "", period_from: "", period_to: "", no_of_flights: 0,
  ref_no: "", notes: "",
};
