import { Constants } from "@/integrations/supabase/types";

const handlingTypes = Constants.public.Enums.handling_type;
export type HandlingType = typeof handlingTypes[number];

export interface DelayEntry {
  code: string;
  timing: number;
  explanation: string;
}

export interface CateringLineItem {
  id?: string;
  catering_item: string;
  supplier: string;
  quantity: number;
  price_per_unit: number;
  total: number;
}

export interface HotacLineItem {
  id?: string;
  hotel_name: string;
  room_classification: string;
  type_of_service: string;
  quantity: number;
  price_per_night: number;
  total: number;
}

export interface FuelLineItem {
  id?: string;
  fuel_type: string;
  supplier: string;
  quantity: number;
  price_per_unit: number;
  total: number;
}

export interface ReportFormData {
  id?: string;
  operator: string;
  handlingType: HandlingType;
  station: string;
  aircraftType: string;
  registration: string;
  flightNo: string;
  mtow: string;
  route: string;
  arrivalDate: string;
  departureDate: string;
  dayNight: string;
  sta: string;
  std: string;
  td: string;
  co: string;
  ob: string;
  to: string;
  ata: string;
  atd: string;
  groundTime: string;
  delays: DelayEntry[];
  // Legacy pax fields
  paxInAdultI: number;
  paxInInfI: number;
  paxInAdultD: number;
  paxInInfD: number;
  paxTransit: number;
  // New pax fields
  foreignPaxIn: number;
  foreignPaxOut: number;
  egyptianPaxIn: number;
  egyptianPaxOut: number;
  infantIn: number;
  infantOut: number;
  crewCount: number;
  totalDepartingPax: number;
  totalForeignPaxOut: number;
  // Billing
  estimatedForeignBill: number;
  estimatedLocalBill: number;
  // Tax preview fields
  intDeparturePaxTax: number;
  developingSecSysCharge: number;
  sitaCute: number;
  stateResourceDevFee: number;
  policeServiceFee: number;
  // Optional services
  fireCartQty: number;
  followMeQty: number;
  jetwayQty: number;
  metFolderQty: number;
  fileFltPlanQty: number;
  printOpsFltPlanQty: number;
  // Status
  confirmationNo: string;
  flightStatus: string;
  // Tags
  projectTags: string;
  checkInSystem: string;
  performedBy: string;
  // Financials
  civilAviationFee: number;
  handlingFee: number;
  airportCharge: number;
  totalCost: number;
  currency: "USD" | "EUR" | "EGP";
  // Parking/housing
  parkingDayHours: number;
  parkingNightHours: number;
  totalParkingHours: number;
  housingDays: number;
  landingCharge: number;
  parkingCharge: number;
  housingCharge: number;
  // Charges
  fuelCharge: number;
  cateringCharge: number;
  hotacCharge: number;
  // Line items
  cateringItems: CateringLineItem[];
  hotacItems: HotacLineItem[];
  fuelItems: FuelLineItem[];
  // Review
  reviewStatus: string;
  reviewComment: string;
  reviewedBy: string;
  reviewedAt: string | null;
}

export type ReportTab = "flight" | "passengers" | "timing" | "civil-aviation" | "catering" | "hotac" | "fuel-handling";

export const REPORT_TABS: { key: ReportTab; label: string }[] = [
  { key: "flight", label: "Flight Info" },
  { key: "passengers", label: "Passengers" },
  { key: "timing", label: "Timing" },
  { key: "civil-aviation", label: "Civil Aviation" },
  { key: "catering", label: "Catering" },
  { key: "hotac", label: "HOTAC" },
  { key: "fuel-handling", label: "Fuel & Handling" },
];

export const FLIGHT_STATUSES = ["Scheduled", "Departed", "Arrived", "Check In"];

export const emptyReport = (): Partial<ReportFormData> => ({
  operator: "", handlingType: "Turn Around",
  station: "Cairo",
  aircraftType: "", registration: "", flightNo: "",
  mtow: "", route: "",
  arrivalDate: "", departureDate: "", dayNight: "D",
  sta: "", std: "", td: "", co: "", ob: "", to: "",
  ata: "", atd: "",
  groundTime: "",
  delays: [],
  paxInAdultI: 0, paxInInfI: 0, paxInAdultD: 0, paxInInfD: 0, paxTransit: 0,
  foreignPaxIn: 0, foreignPaxOut: 0, egyptianPaxIn: 0, egyptianPaxOut: 0,
  infantIn: 0, infantOut: 0, crewCount: 0, totalDepartingPax: 0, totalForeignPaxOut: 0,
  estimatedForeignBill: 0, estimatedLocalBill: 0,
  intDeparturePaxTax: 0, developingSecSysCharge: 0, sitaCute: 0, stateResourceDevFee: 0, policeServiceFee: 0,
  fireCartQty: 0, followMeQty: 0, jetwayQty: 0,
  metFolderQty: 0, fileFltPlanQty: 0, printOpsFltPlanQty: 0,
  confirmationNo: "", flightStatus: "Scheduled",
  projectTags: "", checkInSystem: "", performedBy: "Link Egypt",
  civilAviationFee: 0, handlingFee: 0, airportCharge: 0, totalCost: 0, currency: "USD",
  parkingDayHours: 0, parkingNightHours: 0, totalParkingHours: 0, housingDays: 0,
  landingCharge: 0, parkingCharge: 0, housingCharge: 0,
  fuelCharge: 0, cateringCharge: 0, hotacCharge: 0,
  cateringItems: [], hotacItems: [], fuelItems: [],
});
