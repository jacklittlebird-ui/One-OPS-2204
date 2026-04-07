import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Search, Plus, Download, Upload, FileBarChart2, Plane, Building2,
  DollarSign, Users, X, ChevronLeft, ChevronRight, Pencil, Trash2, Link2, Receipt,
  CheckCircle2, XCircle, Clock, MessageSquare, AlertCircle
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { generateAllCharges } from "@/data/airportChargesData";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { toast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import TabbedReportForm from "@/components/serviceReport/TabbedReportForm";
import {
  ReportFormData, DelayEntry, emptyReport,
  CateringLineItem, HotacLineItem, FuelLineItem
} from "@/components/serviceReport/ReportFormTypes";

const PAGE_SIZE = 15;

const handlingTypes = Constants.public.Enums.handling_type;
type HandlingType = typeof handlingTypes[number];

const statusColor: Record<string, string> = {
  "Turn Around": "bg-primary/10 text-primary",
  "Night Stop": "bg-info/10 text-info",
  "Transit": "bg-success/10 text-success",
  "Technical": "bg-warning/10 text-warning",
  "Ferry In": "bg-accent/10 text-accent",
  "Ferry Out": "bg-accent/10 text-accent",
  "VIP Hall": "bg-destructive/10 text-destructive",
  "Overflying": "bg-muted text-muted-foreground",
};

const stationOptions = [
  { name: "Cairo", vendor: "Cairo Airport Company" },
  { name: "Hurghada", vendor: "Egyptian Airports" },
  { name: "Sharm El Sheikh", vendor: "Egyptian Airports" },
  { name: "Luxor", vendor: "Egyptian Airports" },
  { name: "Aswan", vendor: "Egyptian Airports" },
];

const allCharges = generateAllCharges();

function isNightTime(timeStr: string, dateStr: string): boolean {
  if (!timeStr || !dateStr) return false;
  const [h] = timeStr.split(":").map(Number);
  if (isNaN(h)) return false;
  const month = new Date(dateStr).getMonth() + 1;
  return month >= 4 && month <= 10 ? (h >= 17 || h < 3) : (h >= 16 || h < 4);
}

function autoDayNight(td: string, arrivalDate: string): "D" | "N" {
  return (!td || !arrivalDate) ? "D" : isNightTime(td, arrivalDate) ? "N" : "D";
}

// Convert DB row to form data
function dbToForm(row: any, delays: any[]): ReportFormData {
  return {
    id: row.id,
    operator: row.operator,
    handlingType: row.handling_type,
    station: row.station,
    aircraftType: row.aircraft_type,
    registration: row.registration,
    flightNo: row.flight_no,
    mtow: row.mtow,
    route: row.route,
    arrivalDate: row.arrival_date || "",
    departureDate: row.departure_date || "",
    dayNight: row.day_night,
    sta: row.sta || "",
    std: row.std || "",
    td: row.td || "",
    co: row.co || "",
    ob: row.ob || "",
    to: row.to || "",
    ata: row.ata || "",
    atd: row.atd || "",
    groundTime: row.ground_time || "",
    delays: delays
      .filter(d => d.report_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(d => ({ code: d.code, timing: d.timing, explanation: d.explanation })),
    paxInAdultI: row.pax_in_adult_i,
    paxInInfI: row.pax_in_inf_i,
    paxInAdultD: row.pax_in_adult_d,
    paxInInfD: row.pax_in_inf_d,
    paxTransit: row.pax_transit,
    foreignPaxIn: row.foreign_pax_in || 0,
    foreignPaxOut: row.foreign_pax_out || 0,
    egyptianPaxIn: row.egyptian_pax_in || 0,
    egyptianPaxOut: row.egyptian_pax_out || 0,
    infantIn: row.infant_in || 0,
    infantOut: row.infant_out || 0,
    crewCount: row.crew_count || 0,
    totalDepartingPax: row.total_departing_pax || 0,
    estimatedForeignBill: Number(row.estimated_foreign_bill || 0),
    estimatedLocalBill: Number(row.estimated_local_bill || 0),
    fireCartQty: row.fire_cart_qty || 0,
    followMeQty: row.follow_me_qty || 0,
    jetwayQty: row.jetway_qty || 0,
    metFolderQty: row.met_folder_qty || 0,
    fileFltPlanQty: row.file_flt_plan_qty || 0,
    printOpsFltPlanQty: row.print_ops_flt_plan_qty || 0,
    confirmationNo: row.confirmation_no || "",
    flightStatus: row.flight_status || "Scheduled",
    projectTags: row.project_tags || "",
    checkInSystem: row.check_in_system || "",
    performedBy: row.performed_by || "Link Egypt",
    civilAviationFee: Number(row.civil_aviation_fee),
    handlingFee: Number(row.handling_fee),
    airportCharge: Number(row.airport_charge),
    totalCost: Number(row.total_cost),
    currency: row.currency,
    parkingDayHours: Number(row.parking_day_hours || 0),
    parkingNightHours: Number(row.parking_night_hours || 0),
    totalParkingHours: Number(row.total_parking_hours || 0),
    housingDays: Number(row.housing_days || 0),
    landingCharge: Number(row.landing_charge || 0),
    parkingCharge: Number(row.parking_charge || 0),
    housingCharge: Number(row.housing_charge || 0),
    fuelCharge: Number(row.fuel_charge || 0),
    cateringCharge: Number(row.catering_charge || 0),
    hotacCharge: Number(row.hotac_charge || 0),
    cateringItems: [],
    hotacItems: [],
    fuelItems: [],
    reviewStatus: row.review_status || "pending",
    reviewComment: row.review_comment || "",
    reviewedBy: row.reviewed_by || "",
    reviewedAt: row.reviewed_at || null,
  };
}

function formToDb(data: Partial<ReportFormData>) {
  return {
    operator: data.operator || "",
    handling_type: data.handlingType || "Turn Around",
    station: data.station || "Cairo",
    aircraft_type: data.aircraftType || "",
    registration: data.registration || "",
    flight_no: data.flightNo || "",
    mtow: data.mtow || "",
    route: data.route || "",
    arrival_date: data.arrivalDate || null,
    departure_date: data.departureDate || null,
    day_night: autoDayNight(data.td || "", data.arrivalDate || ""),
    sta: data.sta || "",
    std: data.std || "",
    td: data.td || "",
    co: data.co || "",
    ob: data.ob || "",
    to: data.to || "",
    ata: data.ata || "",
    atd: data.atd || "",
    ground_time: data.groundTime || "",
    pax_in_adult_i: data.paxInAdultI || 0,
    pax_in_inf_i: data.paxInInfI || 0,
    pax_in_adult_d: data.paxInAdultD || 0,
    pax_in_inf_d: data.paxInInfD || 0,
    pax_transit: data.paxTransit || 0,
    foreign_pax_in: data.foreignPaxIn || 0,
    foreign_pax_out: data.foreignPaxOut || 0,
    egyptian_pax_in: data.egyptianPaxIn || 0,
    egyptian_pax_out: data.egyptianPaxOut || 0,
    infant_in: data.infantIn || 0,
    infant_out: data.infantOut || 0,
    crew_count: data.crewCount || 0,
    total_departing_pax: data.totalDepartingPax || 0,
    estimated_foreign_bill: data.estimatedForeignBill || 0,
    estimated_local_bill: data.estimatedLocalBill || 0,
    fire_cart_qty: data.fireCartQty || 0,
    follow_me_qty: data.followMeQty || 0,
    jetway_qty: data.jetwayQty || 0,
    met_folder_qty: data.metFolderQty || 0,
    file_flt_plan_qty: data.fileFltPlanQty || 0,
    print_ops_flt_plan_qty: data.printOpsFltPlanQty || 0,
    confirmation_no: data.confirmationNo || "",
    flight_status: data.flightStatus || "Scheduled",
    project_tags: data.projectTags || "",
    check_in_system: data.checkInSystem || "",
    performed_by: data.performedBy || "Link Egypt",
    civil_aviation_fee: data.civilAviationFee || 0,
    handling_fee: data.handlingFee || 0,
    airport_charge: data.airportCharge || 0,
    total_cost: data.totalCost || 0,
    currency: data.currency || "USD",
    parking_day_hours: data.parkingDayHours || 0,
    parking_night_hours: data.parkingNightHours || 0,
    total_parking_hours: data.totalParkingHours || 0,
    housing_days: data.housingDays || 0,
    landing_charge: data.landingCharge || 0,
    parking_charge: data.parkingCharge || 0,
    housing_charge: data.housingCharge || 0,
    fuel_charge: data.fuelCharge || 0,
    catering_charge: data.cateringCharge || 0,
    hotac_charge: data.hotacCharge || 0,
  };
}

// A merged row can be either a completed service report or a source schedule awaiting completion
interface MergedRow extends ReportFormData {
  isLinked: boolean;
  flightScheduleId?: string;
  sourceType?: "flight_schedules" | "clearances";
}

interface ScheduleSourceRow {
  id: string;
  sourceType: "flight_schedules" | "clearances";
  flightNo: string;
  operator: string;
  aircraftType: string;
  route: string;
  sta: string;
  std: string;
  station: string;
  arrivalDate: string;
  departureDate: string;
}

function resolveStationFromRoute(route: string) {
  const parts = route.split("/").map(part => part.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[1];
  if (parts.length >= 2) return parts[parts.length - 1];
  return "";
}

export default function ServiceReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [handlingFilter, setHandlingFilter] = useState("All Types");
  const [stationFilter, setStationFilter] = useState("All Stations");
  const [reviewFilter, setReviewFilter] = useState("All Review");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [newReport, setNewReport] = useState<Partial<ReportFormData>>(emptyReport());
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ReportFormData>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: dbReports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ["service_reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: dbDelays = [], isLoading: isLoadingDelays } = useQuery({
    queryKey: ["service_report_delays"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_report_delays").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: dbFlights = [], isLoading: isLoadingFlights } = useQuery({
    queryKey: ["flight_schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_schedules")
        .select("id, flight_no, aircraft_type, route, sta, std, airline_id, handling_agent, arrival_date, departure_date")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: dbAirlines = [], isLoading: isLoadingAirlines } = useQuery({
    queryKey: ["airlines", "service-report-source"],
    queryFn: async () => {
      const { data, error } = await supabase.from("airlines").select("id, name, code");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = isLoadingReports || isLoadingDelays || isLoadingFlights || isLoadingAirlines;

  const airlineById = useMemo(
    () => new Map(dbAirlines.map((airline: { id: string; name: string; code: string }) => [airline.id, airline])),
    [dbAirlines]
  );

  const reports: ReportFormData[] = useMemo(
    () => dbReports.map(r => dbToForm(r, dbDelays)),
    [dbReports, dbDelays]
  );

  const scheduleSources: ScheduleSourceRow[] = useMemo(() => {
    return (dbFlights as any[])
      .filter((c: any) => c.flight_no)
      .map((c: any) => {
        const airline = c.airline_id ? airlineById.get(c.airline_id) : undefined;
        return {
          id: c.id,
          sourceType: "flight_schedules" as const,
          flightNo: c.flight_no,
          operator: airline?.name || airline?.code || c.handling_agent || "",
          aircraftType: c.aircraft_type || "",
          route: c.route || "",
          sta: c.sta || "",
          std: c.std || "",
          station: resolveStationFromRoute(c.route || ""),
          arrivalDate: c.arrival_date || "",
          departureDate: c.departure_date || "",
        };
      });
  }, [dbFlights, airlineById]);

  const mergedRows: MergedRow[] = useMemo(() => {
    const reportsByFlight = new Map<string, ReportFormData[]>();
    reports.forEach(r => {
      const key = r.flightNo.trim().toLowerCase();
      if (!reportsByFlight.has(key)) reportsByFlight.set(key, []);
      reportsByFlight.get(key)!.push(r);
    });

    const rows: MergedRow[] = [];
    const usedReportIds = new Set<string>();

    scheduleSources.forEach(source => {
      const key = source.flightNo.trim().toLowerCase();
      const matchedReports = reportsByFlight.get(key) || [];

      if (matchedReports.length > 0) {
        matchedReports.forEach(r => {
          usedReportIds.add(r.id!);
          rows.push({
            ...r,
            isLinked: true,
            flightScheduleId: source.id,
            sourceType: source.sourceType,
          });
        });
        return;
      }

      rows.push({
        ...emptyReport() as ReportFormData,
        id: undefined,
        flightNo: source.flightNo,
        operator: source.operator,
        aircraftType: source.aircraftType,
        route: source.route,
        sta: source.sta,
        std: source.std,
        station: source.station || "Cairo",
        arrivalDate: source.arrivalDate,
        departureDate: source.departureDate,
        reviewStatus: "pending",
        reviewComment: "",
        reviewedBy: "",
        reviewedAt: null,
        delays: [],
        isLinked: false,
        flightScheduleId: source.id,
        sourceType: source.sourceType,
      });
    });

    reports.forEach(r => {
      if (!usedReportIds.has(r.id!)) {
        rows.push({ ...r, isLinked: true });
      }
    });

    return rows;
  }, [reports, scheduleSources]);

  // Save line items helper
  const saveLineItems = async (reportId: string, data: Partial<ReportFormData>) => {
    const cateringItems = data.cateringItems || [];
    const hotacItems = data.hotacItems || [];
    const fuelItems = data.fuelItems || [];

    // Delete existing line items
    await Promise.all([
      supabase.from("service_report_catering").delete().eq("report_id", reportId),
      supabase.from("service_report_hotac").delete().eq("report_id", reportId),
      supabase.from("service_report_fuel").delete().eq("report_id", reportId),
    ]);

    // Insert new line items
    if (cateringItems.length > 0) {
      const rows = cateringItems.map((item, i) => ({ report_id: reportId, catering_item: item.catering_item, supplier: item.supplier, quantity: item.quantity, price_per_unit: item.price_per_unit, total: item.total, sort_order: i }));
      await supabase.from("service_report_catering").insert(rows);
    }
    if (hotacItems.length > 0) {
      const rows = hotacItems.map((item, i) => ({ report_id: reportId, hotel_name: item.hotel_name, room_classification: item.room_classification, type_of_service: item.type_of_service, quantity: item.quantity, price_per_night: item.price_per_night, total: item.total, sort_order: i }));
      await supabase.from("service_report_hotac").insert(rows);
    }
    if (fuelItems.length > 0) {
      const rows = fuelItems.map((item, i) => ({ report_id: reportId, fuel_type: item.fuel_type, supplier: item.supplier, quantity: item.quantity, price_per_unit: item.price_per_unit, total: item.total, sort_order: i }));
      await supabase.from("service_report_fuel").insert(rows);
    }
  };

  // Save new report
  const addMutation = useMutation({
    mutationFn: async (data: Partial<ReportFormData>) => {
      const delays = data.delays || [];
      const dbData = formToDb(data);
      const { data: inserted, error } = await supabase.from("service_reports").insert(dbData as any).select().single();
      if (error) throw error;
      if (delays.length > 0) {
        const delayRows = delays.map((d, i) => ({
          report_id: inserted.id,
          code: d.code,
          timing: d.timing,
          explanation: d.explanation,
          sort_order: i,
        }));
        const { error: dErr } = await supabase.from("service_report_delays").insert(delayRows);
        if (dErr) throw dErr;
      }
      await saveLineItems(inserted.id, data);
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_reports"] });
      queryClient.invalidateQueries({ queryKey: ["service_report_delays"] });
      toast({ title: "Saved", description: "Service report added." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Update report
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ReportFormData> & { id: string }) => {
      const { id } = data;
      const delays = data.delays || [];
      const dbData = formToDb(data);
      const { error } = await supabase.from("service_reports").update(dbData as any).eq("id", id);
      if (error) throw error;
      await supabase.from("service_report_delays").delete().eq("report_id", id);
      if (delays.length > 0) {
        const delayRows = delays.map((d, i) => ({
          report_id: id,
          code: d.code,
          timing: d.timing,
          explanation: d.explanation,
          sort_order: i,
        }));
        const { error: dErr } = await supabase.from("service_report_delays").insert(delayRows);
        if (dErr) throw dErr;
      }
      await saveLineItems(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_reports"] });
      queryClient.invalidateQueries({ queryKey: ["service_report_delays"] });
      toast({ title: "Updated", description: "Service report updated." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Delete report
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("service_report_delays").delete().eq("report_id", id);
      const { error } = await supabase.from("service_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_reports"] });
      queryClient.invalidateQueries({ queryKey: ["service_report_delays"] });
      toast({ title: "Deleted", description: "Report removed." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Auto-fill from FlightSchedule query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const flightNo = params.get("flightNo");
    if (flightNo) {
      setNewReport(prev => ({
        ...prev,
        flightNo: flightNo || "",
        operator: params.get("operator") || "",
        aircraftType: params.get("aircraftType") || "",
        route: params.get("route") || "",
        sta: params.get("sta") || "",
        std: params.get("std") || "",
      }));
      setShowAdd(true);
    }
  }, [location.search]);

  const allStations = useMemo(() => [...new Set(mergedRows.filter(r => r.station).map(r => r.station))], [mergedRows]);
  const allHandlingTypes = useMemo(() => [...new Set(mergedRows.filter(r => r.handlingType).map(r => r.handlingType))], [mergedRows]);

  const filtered = useMemo(() => {
    let r = mergedRows;
    if (statusFilter === "Completed") r = r.filter(x => x.isLinked);
    if (statusFilter === "Pending Completion") r = r.filter(x => !x.isLinked);
    if (handlingFilter !== "All Types") r = r.filter(x => x.handlingType === handlingFilter);
    if (stationFilter !== "All Stations") r = r.filter(x => x.station === stationFilter);
    if (reviewFilter !== "All Review") r = r.filter(x => x.reviewStatus === reviewFilter);
    if (dateFrom) r = r.filter(x => x.arrivalDate >= dateFrom);
    if (dateTo) r = r.filter(x => x.arrivalDate <= dateTo);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(x =>
        x.operator.toLowerCase().includes(s) ||
        x.flightNo.toLowerCase().includes(s) ||
        x.route.toLowerCase().includes(s)
      );
    }
    return r;
  }, [mergedRows, statusFilter, handlingFilter, stationFilter, reviewFilter, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalFlights = filtered.length;
  const totalPax = filtered.reduce((s, r) => s + r.paxInAdultI + r.paxInInfI + r.paxInAdultD + r.paxInInfD, 0);
  const totalRevenue = filtered.reduce((s, r) => s + r.totalCost, 0);
  const totalHandlingFees = filtered.reduce((s, r) => s + r.handlingFee, 0);

  const saveNew = () => {
    if (!newReport.flightNo || !newReport.operator) return;
    addMutation.mutate(newReport);
    setShowAdd(false);
    setNewReport(emptyReport());
  };

  const startEdit = (r: ReportFormData) => { setEditId(r.id!); setEditData({ ...r }); };
  const saveEdit = () => {
    if (!editId) return;
    updateMutation.mutate({ ...editData, id: editId } as any);
    setEditId(null);
  };
  const deleteReport = (id: string) => deleteMutation.mutate(id);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      "Operator": r.operator,
      "Type of Service": r.handlingType,
      "Station": r.station,
      "Aircraft Type": r.aircraftType,
      "Registration": r.registration,
      "Flight No.": r.flightNo,
      "MTOW": r.mtow,
      "ROUTE": r.route,
      "ARRIVAL Date": r.arrivalDate,
      "DEPARTURE Date": r.departureDate,
      "DAY/NIGHT": autoDayNight(r.td, r.arrivalDate),
      "STA": r.sta, "STD": r.std,
      "T/D": r.td, "C/O": r.co, "O/B": r.ob, "T/O": r.to,
      "GROUND TIME": r.groundTime,
      "DLY1 Code": r.delays?.[0]?.code || "", "DLY1 Timing": r.delays?.[0]?.timing || "",
      "DLY2 Code": r.delays?.[1]?.code || "", "DLY2 Timing": r.delays?.[1]?.timing || "",
      "DLY3 Code": r.delays?.[2]?.code || "", "DLY3 Timing": r.delays?.[2]?.timing || "",
      "DLY4 Code": r.delays?.[3]?.code || "", "DLY4 Timing": r.delays?.[3]?.timing || "",
      "PAX IN Adult /I": r.paxInAdultI, "PAX IN INF /I": r.paxInInfI,
      "PAX IN Adult /D": r.paxInAdultD, "PAX IN INF /D": r.paxInInfD,
      "PAX TRANSIT": r.paxTransit,
      "Project Tags": r.projectTags,
      "CHECK IN SYSTEM": r.checkInSystem,
      "PERFORMED BY": r.performedBy,
      "Civil Aviation Fee": r.civilAviationFee,
      "Handling Fee": r.handlingFee,
      "Airport Charge": r.airportCharge,
      "Total Cost": r.totalCost,
      "Currency": r.currency,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Service Report");
    XLSX.writeFile(wb, "Link_Service_Report_Export.xlsx");
  };

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws);
      for (const row of json) {
        const data: Partial<ReportFormData> = {
          operator: row["Operator"] || "",
          handlingType: row["Type of Service"] || "Turn Around",
          station: row["Station"] || "Cairo",
          aircraftType: row["Aircraft Type"] || "",
          registration: row["Registration"] || "",
          flightNo: row["Flight No."] || "",
          mtow: row["MTOW"] || "",
          route: row["ROUTE"] || "",
          arrivalDate: row["ARRIVAL Date"] || "",
          departureDate: row["DEPARTURE Date"] || "",
          sta: row["STA"] || "", std: row["STD"] || "",
          td: row["T/D"] || "", co: row["C/O"] || "",
          ob: row["O/B"] || "", to: row["T/O"] || "",
          groundTime: row["GROUND TIME"] || "",
          delays: [
            row["DLY1 Code"] ? { code: row["DLY1 Code"], timing: Number(row["DLY1 Timing"] || 0), explanation: "" } : null,
            row["DLY2 Code"] ? { code: row["DLY2 Code"], timing: Number(row["DLY2 Timing"] || 0), explanation: "" } : null,
            row["DLY3 Code"] ? { code: row["DLY3 Code"], timing: Number(row["DLY3 Timing"] || 0), explanation: "" } : null,
            row["DLY4 Code"] ? { code: row["DLY4 Code"], timing: Number(row["DLY4 Timing"] || 0), explanation: "" } : null,
          ].filter(Boolean) as DelayEntry[],
          paxInAdultI: Number(row["PAX IN Adult /I"] || 0),
          paxInInfI: Number(row["PAX IN INF /I"] || 0),
          paxInAdultD: Number(row["PAX IN Adult /D"] || 0),
          paxInInfD: Number(row["PAX IN INF /D"] || 0),
          paxTransit: Number(row["PAX TRANSIT"] || 0),
          projectTags: row["Project Tags"] || "",
          checkInSystem: row["CHECK IN SYSTEM"] || "",
          performedBy: row["PERFORMED BY"] || "Link Egypt",
          civilAviationFee: Number(row["Civil Aviation Fee"] || 0),
          handlingFee: Number(row["Handling Fee"] || 0),
          airportCharge: Number(row["Airport Charge"] || 0),
          totalCost: Number(row["Total Cost"] || 0),
          currency: row["Currency"] || "USD",
        };
        await addMutation.mutateAsync(data);
      }
      toast({ title: "Imported", description: `${json.length} records imported.` });
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }, [addMutation]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart2 size={22} className="text-primary" /> Service Report
            <Link2 size={16} className="text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Linked from <span className="font-semibold">Link_Service_Report.xlsx</span> ·{" "}
            <button onClick={() => navigate("/flight-schedule")} className="text-primary hover:underline">Flight Schedule</button>
            {" · "}
            <button onClick={() => navigate("/airport-charges")} className="text-primary hover:underline">Airport Charges</button>
            {" · "}
            <button onClick={() => navigate("/services")} className="text-primary hover:underline">Chart of Services</button>
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card-icon bg-primary"><Plane size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">{totalFlights}</div><div className="text-xs text-muted-foreground">Total Flights</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-info"><Users size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">{totalPax.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Passengers</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-success"><DollarSign size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Revenue</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-warning"><Building2 size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">${totalHandlingFees.toLocaleString()}</div><div className="text-xs text-muted-foreground">Handling Fees</div></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Flight Service Records</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text" placeholder="Search operator, flight, route…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-56 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select value={handlingFilter} onChange={e => { setHandlingFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Types</option>
            {allHandlingTypes.map(h => <option key={h}>{h}</option>)}
          </select>
          <select value={stationFilter} onChange={e => { setStationFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Stations</option>
            {allStations.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={reviewFilter} onChange={e => { setReviewFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Review</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Status</option>
            <option>Completed</option>
            <option>Pending Completion</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="To" />
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> New Report</button>
          <button onClick={() => fileInputRef.current?.click()} className="toolbar-btn-success"><Upload size={14} /> Upload Excel</button>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["#", "OPERATOR", "FLIGHT", "TYPE", "STATION", "ROUTE", "ARR DATE", "A/C TYPE", "MTOW", "D/N", "PAX IN", "DLY", "TOTAL ($)", "REVIEW", "ACTIONS"].map(h => (
                  <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={15} className="text-center py-16 text-muted-foreground">Loading…</td></tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-16">
                    <FileBarChart2 size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-semibold text-foreground">No Service Reports Found</p>
                    <p className="text-muted-foreground text-sm mt-1">Add a new report or upload an Excel file</p>
                  </td>
                </tr>
              ) : pageData.map((r, i) => (
                <tr key={r.id || `fs-${r.flightScheduleId}-${i}`} className={`data-table-row ${!r.isLinked ? "bg-muted/30" : ""}`}>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{r.operator}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-foreground">{r.flightNo}</td>
                  <td className="px-3 py-2.5">
                    {r.isLinked ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusColor[r.handlingType] || "bg-muted text-muted-foreground"}`}>
                        {r.handlingType}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-foreground">{r.isLinked ? r.station : "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.route}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{r.arrivalDate || "—"}</td>
                  <td className="px-3 py-2.5 text-foreground">{r.aircraftType}</td>
                  <td className="px-3 py-2.5 text-foreground">{r.isLinked ? r.mtow : "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    {r.isLinked ? (() => { const dn = autoDayNight(r.td, r.arrivalDate); return (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${dn === "N" ? "bg-info/15 text-info" : "bg-warning/15 text-warning"}`}>
                        {dn}
                      </span>
                    ); })() : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-foreground">{r.isLinked ? r.paxInAdultI + r.paxInInfI + r.paxInAdultD + r.paxInInfD : "—"}</td>
                  <td className="px-3 py-2.5 text-foreground">
                    {r.isLinked && r.delays && r.delays.length > 0 ? r.delays.map(d => d.code).join("/") : "—"}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-success">{r.isLinked ? r.totalCost.toLocaleString() : "—"}</td>
                  <td className="px-3 py-2.5">
                    {!r.isLinked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                        <AlertCircle size={11} />Incomplete
                      </span>
                    ) : (() => {
                      const cfg: Record<string, { icon: React.ReactNode; cls: string }> = {
                        pending: { icon: <Clock size={11} />, cls: "bg-warning/15 text-warning" },
                        approved: { icon: <CheckCircle2 size={11} />, cls: "bg-success/15 text-success" },
                        rejected: { icon: <XCircle size={11} />, cls: "bg-destructive/15 text-destructive" },
                      };
                      const c = cfg[r.reviewStatus] || cfg.pending;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c.cls}`}>
                          {c.icon}{r.reviewStatus === "pending" ? "Pending" : r.reviewStatus === "approved" ? "Approved" : "Rejected"}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5">
                      {!r.isLinked ? (
                        <button
                          onClick={() => {
                            setNewReport({
                              ...emptyReport(),
                              flightNo: r.flightNo,
                              operator: r.operator,
                              aircraftType: r.aircraftType,
                              route: r.route,
                              sta: r.sta,
                              std: r.std,
                              arrivalDate: r.arrivalDate,
                              departureDate: r.departureDate,
                            });
                            setShowAdd(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Complete Service Report"
                        >
                          <Pencil size={12} /> Complete
                        </button>
                      ) : (
                        <>
                          {r.reviewStatus === "pending" && (
                            <>
                              <button onClick={async () => {
                                await supabase.from("service_reports").update({ review_status: "approved", reviewed_by: "Operations", reviewed_at: new Date().toISOString() } as any).eq("id", r.id);
                                queryClient.invalidateQueries({ queryKey: ["service_reports"] });
                                toast({ title: "✅ Approved" });
                              }} className="text-success hover:text-success/80" title="Approve"><CheckCircle2 size={13} /></button>
                              <button onClick={async () => {
                                const comment = prompt("Rejection reason:");
                                if (comment === null) return;
                                await supabase.from("service_reports").update({ review_status: "rejected", review_comment: comment, reviewed_by: "Operations", reviewed_at: new Date().toISOString() } as any).eq("id", r.id);
                                queryClient.invalidateQueries({ queryKey: ["service_reports"] });
                                toast({ title: "❌ Rejected", description: comment });
                              }} className="text-destructive hover:text-destructive/80" title="Reject"><XCircle size={13} /></button>
                            </>
                          )}
                          {r.reviewStatus === "approved" && (
                            <button onClick={() => {
                              const params = new URLSearchParams({
                                operator: r.operator, flightRef: r.flightNo,
                                description: `${r.handlingType} – ${r.route}`,
                                civilAviation: String(r.civilAviationFee), handling: String(r.handlingFee),
                                airportCharges: String(r.airportCharge),
                              });
                              navigate(`/invoices?${params.toString()}`);
                            }} className="text-success hover:text-success/80" title="Generate Invoice"><Receipt size={13} /></button>
                          )}
                          <button onClick={() => startEdit(r)} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                          <button onClick={() => deleteReport(r.id!)} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="p-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronLeft size={14} /></button>
              <span className="text-foreground font-medium">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <TabbedReportForm
          title="New Service Report"
          data={newReport}
          onChange={setNewReport}
          onSave={saveNew}
          onCancel={() => setShowAdd(false)}
        />
      )}
      {editId && (
        <TabbedReportForm
          title="Edit Service Report"
          data={editData}
          onChange={setEditData}
          onSave={saveEdit}
          onCancel={() => setEditId(null)}
        />
      )}
    </div>
  );
}
