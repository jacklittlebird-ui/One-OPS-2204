export type HandlingType =
  | "Turn Around" | "Night Stop" | "Transit" | "Ferry In" | "Ferry Out"
  | "Arrival Handling" | "Departure Handling" | "Technical" | "Cargo"
  | "Military" | "VIP Hall" | "Private" | "No Handling" | "Overflying"
  | "Ground Service" | "Permission Only" | "Supervision Only" | "Catering Only"
  | "Fuel Only" | "Meet & Assist" | "Transfer Only" | "Payment" | "Touch & Go"
  | "Arrival Security" | "Departure Security" | "Turn Around Security"
  | "Adhoc Security" | "Maintenance Security";

export interface DelayEntry {
  code: string;       // delay code e.g. "93"
  timing: number;     // minutes
  explanation: string; // auto-filled from delay codes
}

export interface ServiceReport {
  id: string;
  // Flight Data
  operator: string;
  handlingType: HandlingType;
  station: string;
  aircraftType: string;
  registration: string;
  flightNo: string;
  mtow: string;
  route: string;
  // Operation Data
  arrivalDate: string;
  departureDate: string;
  dayNight: "D" | "N" | "D/N";
  sta: string;
  std: string;
  td: string;   // Touchdown
  co: string;   // Chocks On
  ob: string;   // Off Blocks
  to: string;   // Takeoff
  groundTime: string; // auto-calculated: co - ob
  // Delays (up to 4)
  delays: DelayEntry[];
  // Passengers
  paxInAdultI: number;  // PAX IN Adult International
  paxInInfI: number;    // PAX IN Infant International
  paxInAdultD: number;  // PAX IN Adult Domestic
  paxInInfD: number;    // PAX IN Infant Domestic
  paxTransit: number;
  // Services
  projectTags: string;
  checkInSystem: string;
  performedBy: string;
  // Financials
  civilAviationFee: number;
  handlingFee: number;
  airportCharge: number;
  totalCost: number;
  currency: "USD" | "EUR" | "EGP";
}

export const handlingTypes: HandlingType[] = [
  "Turn Around", "Night Stop", "Transit", "Ferry In", "Ferry Out",
  "Arrival Handling", "Departure Handling", "Technical", "Cargo",
  "Military", "VIP Hall", "Private", "No Handling", "Overflying",
  "Ground Service", "Permission Only", "Supervision Only", "Catering Only",
  "Fuel Only", "Meet & Assist", "Transfer Only", "Payment", "Touch & Go",
  "Arrival Security", "Departure Security", "Turn Around Security",
  "Adhoc Security", "Maintenance Security",
];

export const sampleReports: ServiceReport[] = [
  {
    id: "SR001", operator: "Air Cairo", handlingType: "Turn Around",
    station: "Cairo",
    aircraftType: "A320/200", registration: "SU-CAI", flightNo: "SM123/124",
    mtow: "77 TON", route: "AMS/CAI/AMS",
    arrivalDate: "2024-01-11", departureDate: "2024-01-11", dayNight: "D/N",
    sta: "10:00", std: "11:00", td: "10:50", co: "10:55", ob: "12:05", to: "12:10",
    groundTime: "1:10",
    delays: [
      { code: "93", timing: 55, explanation: "Late inbound aircraft – Aircraft arrived late from previous sector" },
      { code: "89", timing: 10, explanation: "ATC start-up sequence – Delayed start-up or pushback" },
    ],
    paxInAdultI: 92, paxInInfI: 8, paxInAdultD: 0, paxInInfD: 0, paxTransit: 0,
    projectTags: "AVSEC", checkInSystem: "Amadeus", performedBy: "Link Egypt",
    civilAviationFee: 190.14, handlingFee: 850, airportCharge: 710.33, totalCost: 1750.47, currency: "USD",
  },
  {
    id: "SR002", operator: "EgyptAir", handlingType: "Transit",
    station: "Hurghada",
    aircraftType: "B737-800", registration: "SU-GEA", flightNo: "MS456/457",
    mtow: "65 TON", route: "LHR/HRG/CAI",
    arrivalDate: "2024-01-11", departureDate: "2024-01-11", dayNight: "D",
    sta: "13:30", std: "14:30", td: "13:30", co: "13:35", ob: "14:35", to: "14:40",
    groundTime: "1:00",
    delays: [],
    paxInAdultI: 80, paxInInfI: 5, paxInAdultD: 0, paxInInfD: 0, paxTransit: 72,
    projectTags: "Full Handling", checkInSystem: "Sabre", performedBy: "Link Egypt",
    civilAviationFee: 165.09, handlingFee: 620, airportCharge: 580.45, totalCost: 1365.54, currency: "USD",
  },
  {
    id: "SR003", operator: "Nile Air", handlingType: "Night Stop",
    station: "Sharm El Sheikh",
    aircraftType: "A320neo", registration: "SU-NRA", flightNo: "XY789",
    mtow: "79 TON", route: "DXB/SSH",
    arrivalDate: "2024-01-11", departureDate: "2024-01-12", dayNight: "N",
    sta: "22:00", std: "08:00", td: "22:15", co: "22:20", ob: "", to: "",
    groundTime: "",
    delays: [
      { code: "93", timing: 20, explanation: "Late inbound aircraft – Aircraft arrived late from previous sector" },
    ],
    paxInAdultI: 155, paxInInfI: 13, paxInAdultD: 0, paxInInfD: 0, paxTransit: 0,
    projectTags: "Ramp Handling", checkInSystem: "Amadeus", performedBy: "Link Egypt",
    civilAviationFee: 195.71, handlingFee: 480, airportCharge: 635.12, totalCost: 1310.83, currency: "USD",
  },
  {
    id: "SR004", operator: "Air France", handlingType: "Turn Around",
    station: "Cairo",
    aircraftType: "B777-300", registration: "F-GSQP", flightNo: "AF200/201",
    mtow: "352 TON", route: "CDG/CAI/CDG",
    arrivalDate: "2024-01-12", departureDate: "2024-01-12", dayNight: "D",
    sta: "11:00", std: "13:00", td: "11:05", co: "11:10", ob: "13:20", to: "13:25",
    groundTime: "2:10",
    delays: [],
    paxInAdultI: 275, paxInInfI: 10, paxInAdultD: 0, paxInInfD: 0, paxTransit: 0,
    projectTags: "Full Handling + VIP", checkInSystem: "Amadeus", performedBy: "Link Egypt",
    civilAviationFee: 1240.50, handlingFee: 1800, airportCharge: 2250.80, totalCost: 5291.30, currency: "USD",
  },
  {
    id: "SR005", operator: "Lufthansa", handlingType: "Technical",
    station: "Luxor",
    aircraftType: "A321", registration: "D-AISE", flightNo: "LH301",
    mtow: "83 TON", route: "FRA/LXR",
    arrivalDate: "2024-01-12", departureDate: "2024-01-12", dayNight: "D",
    sta: "09:00", std: "09:45", td: "09:02", co: "09:05", ob: "09:45", to: "09:50",
    groundTime: "0:40",
    delays: [],
    paxInAdultI: 0, paxInInfI: 0, paxInAdultD: 0, paxInInfD: 0, paxTransit: 0,
    projectTags: "Tech Stop", checkInSystem: "—", performedBy: "Link Egypt",
    civilAviationFee: 0, handlingFee: 320, airportCharge: 660.20, totalCost: 980.20, currency: "USD",
  },
];
