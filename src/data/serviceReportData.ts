export type HandlingType =
  | "Turn Around" | "Night Stop" | "Transit" | "Ferry In" | "Ferry Out"
  | "Arrival Handling" | "Departure Handling" | "Technical" | "Cargo"
  | "Military" | "VIP Hall" | "Private" | "No Handling" | "Overflying"
  | "Ground Service" | "Permission Only" | "Supervision Only" | "Catering Only"
  | "Fuel Only" | "Meet & Assist" | "Transfer Only" | "Payment" | "Touch & Go"
  | "Arrival Security" | "Departure Security" | "Turn Around Security"
  | "Adhoc Security" | "Maintenance Security";

export interface ServiceReport {
  id: string;
  // Flight Data
  operator: string;
  handlingType: HandlingType;
  station: string;
  stationIATA: string;
  stationICAO: string;
  aircraftType: string;
  registration: string;
  flightNo: string;
  airlineIATA: string;
  airlineICAO: string;
  mtow: string;
  route: string;
  // Operation Data
  arrivalDate: string;
  departureDate: string;
  dayNight: "D" | "N" | "D/N";
  sta: string;
  std: string;
  ata: string;
  atd: string;
  groundTime: string;
  landingTime: string;
  // Delay
  dly: string;
  dlyExplanation: string;
  // Pax
  paxIn: number;
  paxOut: number;
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
    station: "Cairo", stationIATA: "CAI", stationICAO: "HECA",
    aircraftType: "A320/200", registration: "SU-CAI", flightNo: "SM123/124",
    airlineIATA: "SM", airlineICAO: "MSC", mtow: "77 TON", route: "AMS/CAI/AMS",
    arrivalDate: "2024-01-11", departureDate: "2024-01-11", dayNight: "D/N",
    sta: "10:00", std: "11:00", ata: "10:55", atd: "12:10", groundTime: "1:15", landingTime: "2:05",
    dly: "93/89", dlyExplanation: "DL 93 D/T LIAC & DL 89 D/T START UP SEQ",
    paxIn: 100, paxOut: 100, paxTransit: 0,
    projectTags: "AVSEC", checkInSystem: "Amadeus", performedBy: "Link Egypt",
    civilAviationFee: 190.14, handlingFee: 850, airportCharge: 710.33, totalCost: 1750.47, currency: "USD",
  },
  {
    id: "SR002", operator: "EgyptAir", handlingType: "Transit",
    station: "Hurghada", stationIATA: "HRG", stationICAO: "HEHR",
    aircraftType: "B737-800", registration: "SU-GEA", flightNo: "MS456/457",
    airlineIATA: "MS", airlineICAO: "MSR", mtow: "65 TON", route: "LHR/HRG/CAI",
    arrivalDate: "2024-01-11", departureDate: "2024-01-11", dayNight: "D",
    sta: "13:30", std: "14:30", ata: "13:35", atd: "14:40", groundTime: "1:05", landingTime: "1:30",
    dly: "00", dlyExplanation: "",
    paxIn: 0, paxOut: 85, paxTransit: 72,
    projectTags: "Full Handling", checkInSystem: "Sabre", performedBy: "Link Egypt",
    civilAviationFee: 165.09, handlingFee: 620, airportCharge: 580.45, totalCost: 1365.54, currency: "USD",
  },
  {
    id: "SR003", operator: "Nile Air", handlingType: "Night Stop",
    station: "Sharm El Sheikh", stationIATA: "SSH", stationICAO: "HESH",
    aircraftType: "A320neo", registration: "SU-NRA", flightNo: "XY789",
    airlineIATA: "XY", airlineICAO: "NIA", mtow: "79 TON", route: "DXB/SSH",
    arrivalDate: "2024-01-11", departureDate: "2024-01-12", dayNight: "N",
    sta: "22:00", std: "08:00", ata: "22:20", atd: "", groundTime: "10:00", landingTime: "2:15",
    dly: "93", dlyExplanation: "DL 93 LIAC",
    paxIn: 168, paxOut: 0, paxTransit: 0,
    projectTags: "Ramp Handling", checkInSystem: "Amadeus", performedBy: "Link Egypt",
    civilAviationFee: 195.71, handlingFee: 480, airportCharge: 635.12, totalCost: 1310.83, currency: "USD",
  },
  {
    id: "SR004", operator: "Air France", handlingType: "Turn Around",
    station: "Cairo", stationIATA: "CAI", stationICAO: "HECA",
    aircraftType: "B777-300", registration: "F-GSQP", flightNo: "AF200/201",
    airlineIATA: "AF", airlineICAO: "AFR", mtow: "352 TON", route: "CDG/CAI/CDG",
    arrivalDate: "2024-01-12", departureDate: "2024-01-12", dayNight: "D",
    sta: "11:00", std: "13:00", ata: "11:10", atd: "13:25", groundTime: "2:15", landingTime: "3:00",
    dly: "00", dlyExplanation: "",
    paxIn: 285, paxOut: 290, paxTransit: 0,
    projectTags: "Full Handling + VIP", checkInSystem: "Amadeus", performedBy: "Link Egypt",
    civilAviationFee: 1240.50, handlingFee: 1800, airportCharge: 2250.80, totalCost: 5291.30, currency: "USD",
  },
  {
    id: "SR005", operator: "Lufthansa", handlingType: "Technical",
    station: "Luxor", stationIATA: "LXR", stationICAO: "HELX",
    aircraftType: "A321", registration: "D-AISE", flightNo: "LH301",
    airlineIATA: "LH", airlineICAO: "DLH", mtow: "83 TON", route: "FRA/LXR",
    arrivalDate: "2024-01-12", departureDate: "2024-01-12", dayNight: "D",
    sta: "09:00", std: "09:45", ata: "09:05", atd: "09:50", groundTime: "0:45", landingTime: "0:50",
    dly: "00", dlyExplanation: "",
    paxIn: 0, paxOut: 0, paxTransit: 0,
    projectTags: "Tech Stop", checkInSystem: "—", performedBy: "Link Egypt",
    civilAviationFee: 0, handlingFee: 320, airportCharge: 660.20, totalCost: 980.20, currency: "USD",
  },
];
