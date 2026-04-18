import { useState, useMemo, useCallback } from "react";
import {
  Search, Plus, Download, Shield, Plane, Building2, Clock, Users,
  ChevronLeft, ChevronRight, Pencil, CheckCircle2, XCircle, AlertTriangle,
  FileBarChart2, DollarSign, MessageSquare, ExternalLink, CalendarDays
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useChannel } from "@/contexts/ChannelContext";
import PipelineStepper, { derivePipelineStage } from "@/components/serviceReport/PipelineStepper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SECURITY_CLEARANCE_TYPES } from "@/components/clearances/ClearanceTypes";
import SecurityTaskSheetDialog from "@/components/security/SecurityTaskSheetDialog";

const PAGE_SIZE = 15;

const REVIEW_STATUSES = ["Draft", "Pending Review", "Approved", "Ready for Billing"] as const;

const reviewStatusConfig: Record<string, { icon: React.ReactNode; cls: string }> = {
  "Draft": { icon: <Pencil size={11} />, cls: "bg-muted text-muted-foreground" },
  "Pending Review": { icon: <Clock size={11} />, cls: "bg-warning/15 text-warning" },
  "Approved": { icon: <CheckCircle2 size={11} />, cls: "bg-success/15 text-success" },
  "Ready for Billing": { icon: <DollarSign size={11} />, cls: "bg-primary/15 text-primary" },
  "Rejected": { icon: <XCircle size={11} />, cls: "bg-destructive/15 text-destructive" },
};

const dispatchStatusConfig: Record<string, string> = {
  "Pending": "bg-muted text-muted-foreground",
  "In Progress": "bg-info/15 text-info",
  "Completed": "bg-success/15 text-success",
};

interface DispatchRow {
  id: string;
  flight_schedule_id: string | null;
  contract_id: string | null;
  station: string;
  airline: string;
  flight_no: string;
  flight_date: string;
  service_type: string;
  staff_names: string;
  staff_count: number;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string;
  actual_end: string;
  contract_duration_hours: number;
  actual_duration_hours: number;
  overtime_hours: number;
  overtime_rate: number;
  base_fee: number;
  service_rate: number;
  overtime_charge: number;
  total_charge: number;
  status: string;
  notes: string;
  dispatched_by: string;
  review_status: string;
  review_comment: string;
  reviewed_by: string;
  reviewed_at: string | null;
  irregularity_id: string | null;
  created_at: string;
  updated_at: string;
  task_sheet_data?: any;
}

function timeDiffMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  if ([h1, m1, h2, m2].some(isNaN)) return 0;
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

function minutesToHMM(mins: number): number {
  if (!mins || mins < 0) return 0;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return Math.round((h + m / 100) * 100) / 100;
}

function timeDiffHours(start: string, end: string): number {
  return minutesToHMM(timeDiffMinutes(start, end));
}

export default function SecurityServiceReportsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { activeChannel } = useChannel();
  const isReceivablesView = activeChannel === "receivables";

  const tryOpenEdit = (r: DispatchRow) => {
    if (isReceivablesView) {
      const stage = derivePipelineStage({
        isLinked: r.status === "Completed",
        reviewStatus: r.review_status,
        clearanceStatus: r.flight_schedule_id ? flightStatusById.get(r.flight_schedule_id) : undefined,
        dispatchStatus: r.status,
        channel: "operations",
      });
      if (stage !== "receivables") {
        toast({
          title: "Locked",
          description: "Steps 1 (Clearance), 2 (Station) and 3 (Operations) must be completed before editing in Receivables.",
          variant: "destructive",
        });
        return;
      }
    }
    setEditRow({ ...r });
  };

  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("All Stations");
  const [reviewFilter, setReviewFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All Types");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [editRow, setEditRow] = useState<DispatchRow | null>(null);
  const [isNewReport, setIsNewReport] = useState(false);
  const [reviewRow, setReviewRow] = useState<DispatchRow | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [activeMainTab, setActiveMainTab] = useState<"reports" | "flights">("reports");
  const [flightsPage, setFlightsPage] = useState(1);

  // Fetch dispatch assignments (completed ones = service reports)
  const { data: dispatches = [], isLoading } = useQuery({
    queryKey: ["dispatch_assignments", "service-reports", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_assignments")
        .select("*")
        .order("flight_date", { ascending: false });
      if (error) throw error;
      return data as DispatchRow[];
    },
    enabled: !!session,
  });

  // Fetch irregularity reports for linking
  const { data: irregularities = [] } = useQuery({
    queryKey: ["irregularity_reports", "for-service-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("irregularity_reports")
        .select("id, report_id, flight_no, station, severity, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Fetch flight schedules with security clearance types
  const { data: securityFlights = [] } = useQuery({
    queryKey: ["flight_schedules", "security-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_schedules")
        .select("*, airlines:airline_id(name, iata_code)")
        .in("clearance_type", SECURITY_CLEARANCE_TYPES)
        .order("arrival_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!session,
  });

  // Update mutation for editing service report details
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<DispatchRow> & { id: string }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase
        .from("dispatch_assignments")
        .update(rest as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
      toast({ title: "Updated", description: "Service report updated." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Create mutation for new service reports
  const createMutation = useMutation({
    mutationFn: async (data: Partial<DispatchRow>) => {
      const { id, created_at, updated_at, ...rest } = data as any;
      const { error } = await supabase.from("dispatch_assignments").insert(rest);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
      toast({ title: "Created", description: "New security service report created." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openNewForm = () => {
    const blankRow: DispatchRow = {
      id: "new",
      flight_schedule_id: null,
      contract_id: null,
      station: "CAI",
      airline: "",
      flight_no: "",
      flight_date: new Date().toISOString().slice(0, 10),
      service_type: "Arrival Security",
      staff_names: "",
      staff_count: 0,
      scheduled_start: "",
      scheduled_end: "",
      actual_start: "",
      actual_end: "",
      contract_duration_hours: 0,
      actual_duration_hours: 0,
      overtime_hours: 0,
      overtime_rate: 0,
      base_fee: 0,
      service_rate: 0,
      overtime_charge: 0,
      total_charge: 0,
      status: "Pending",
      notes: "",
      dispatched_by: session?.user?.email || "",
      review_status: "Draft",
      review_comment: "",
      reviewed_by: "",
      reviewed_at: null,
      irregularity_id: null,
      created_at: "",
      updated_at: "",
    };
    setIsNewReport(true);
    setEditRow(blankRow);
  };


  const flightStatusById = useMemo(() => {
    const map = new Map<string, string>();
    securityFlights.forEach((f: any) => map.set(f.id, f.status || "Pending"));
    return map;
  }, [securityFlights]);

  // Build lookup for flight schedule details (registration, route, sta, std)
  const flightDetailsById = useMemo(() => {
    const map = new Map<string, { registration: string; route: string; sta: string; std: string; ata: string; atd: string; skd_type: string; clearance_type: string }>();
    securityFlights.forEach((f: any) => map.set(f.id, {
      registration: f.registration || "",
      route: f.route || "",
      sta: f.sta || "",
      std: f.std || "",
      ata: "",
      atd: "",
      skd_type: f.skd_type || "",
      clearance_type: f.clearance_type || "",
    }));
    return map;
  }, [securityFlights]);

  // Filters
  const allStations = useMemo(() => [...new Set(dispatches.map(d => d.station))].sort(), [dispatches]);
  const allServiceTypes = useMemo(() => [...new Set(dispatches.map(d => d.service_type))].sort(), [dispatches]);

  const filtered = useMemo(() => {
    let rows = dispatches;
    if (stationFilter !== "All Stations") rows = rows.filter(r => r.station === stationFilter);
    if (reviewFilter !== "All") rows = rows.filter(r => r.review_status === reviewFilter);
    if (serviceFilter !== "All Types") rows = rows.filter(r => r.service_type === serviceFilter);
    if (dateFrom) rows = rows.filter(r => r.flight_date >= dateFrom);
    if (dateTo) rows = rows.filter(r => r.flight_date <= dateTo);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.airline.toLowerCase().includes(s) ||
        r.flight_no.toLowerCase().includes(s) ||
        r.staff_names.toLowerCase().includes(s) ||
        r.station.toLowerCase().includes(s)
      );
    }
    return rows;
  }, [dispatches, stationFilter, reviewFilter, serviceFilter, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs
  const totalReports = filtered.length;
  const completedReports = filtered.filter(r => r.status === "Completed").length;
  const approvedReports = filtered.filter(r => r.review_status === "Approved" || r.review_status === "Ready for Billing").length;
  const totalRevenue = filtered.reduce((s, r) => s + r.total_charge, 0);
  const totalOvertimeHrs = filtered.reduce((s, r) => s + r.overtime_hours, 0);
  const totalStaffDeployed = filtered.reduce((s, r) => s + r.staff_count, 0);
  const pendingReview = filtered.filter(r => r.review_status === "Pending Review").length;
  const readyForBilling = filtered.filter(r => r.review_status === "Ready for Billing").length;

  const linkedIrregularities = useMemo(() => {
    const map = new Map<string, typeof irregularities[0]>();
    irregularities.forEach(ir => map.set(ir.id, ir));
    return map;
  }, [irregularities]);

  // Filter security flights
  const filteredFlights = useMemo(() => {
    let rows = securityFlights;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((r: any) =>
        r.flight_no?.toLowerCase().includes(s) ||
        r.route?.toLowerCase().includes(s) ||
        (r.airlines?.name || "").toLowerCase().includes(s)
      );
    }
    if (dateFrom) rows = rows.filter((r: any) => (r.arrival_date || r.departure_date || "") >= dateFrom);
    if (dateTo) rows = rows.filter((r: any) => (r.arrival_date || r.departure_date || "") <= dateTo);
    return rows;
  }, [securityFlights, search, dateFrom, dateTo]);

  const flightsTotalPages = Math.max(1, Math.ceil(filteredFlights.length / PAGE_SIZE));
  const flightsPageData = filteredFlights.slice((flightsPage - 1) * PAGE_SIZE, flightsPage * PAGE_SIZE);

  const saveEdit = () => {};

  const saveTaskSheet = (row: DispatchRow, taskSheet: any) => {
    const shiftStart = taskSheet.shift_start || row.actual_start || "";
    const shiftEnd = taskSheet.shift_end || row.actual_end || "";
    const actualMins = timeDiffMinutes(shiftStart, shiftEnd);
    const duration = minutesToHMM(actualMins);
    const contractMins = Math.round((row.contract_duration_hours || 0) * 60);
    const overtimeMins = Math.max(0, actualMins - contractMins);
    const overtimeHours = minutesToHMM(overtimeMins);
    const overtimeCharge = (overtimeMins / 60) * (row.overtime_rate || 0) * (row.staff_count || 1);
    const totalCharge = (row.base_fee || 0) + (row.service_rate || 0) + overtimeCharge;

    const payload: Record<string, any> = {
      task_sheet_data: taskSheet,
      notes: taskSheet.remarks || row.notes,
      actual_start: shiftStart,
      actual_end: shiftEnd,
      actual_duration_hours: duration,
      overtime_hours: overtimeHours,
      overtime_charge: Math.round(overtimeCharge * 100) / 100,
      total_charge: Math.round(totalCharge * 100) / 100,
      // New reports stay "Pending" until clearance approves the linked flight schedule.
      // Existing reports keep their normal "Completed" flow on save.
      status: isNewReport ? "Pending" : "Completed",
      station: row.station,
      airline: row.airline,
      flight_no: row.flight_no,
      flight_date: row.flight_date,
      service_type: row.service_type,
      staff_names: row.staff_names,
      staff_count: row.staff_count,
      scheduled_start: taskSheet.sta || row.scheduled_start,
      scheduled_end: taskSheet.std || row.scheduled_end,
      dispatched_by: row.dispatched_by,
      // Security contract linkage + auto-calculated charges (from dialog)
      contract_id: (row as any).contract_id || null,
      extra_manpower_count: (row as any).extra_manpower_count ?? 0,
      ramp_vehicle_trips: (row as any).ramp_vehicle_trips ?? 0,
      short_notice: (row as any).short_notice ?? false,
      return_to_ramp_with_load: (row as any).return_to_ramp_with_load ?? false,
      charges_breakdown: (row as any).charges_breakdown ?? [],
      total_security_charges: (row as any).total_security_charges ?? 0,
      charges_currency: (row as any).charges_currency || "USD",
      // New reports start in Draft until clearance approval triggers Pending Review
      ...(isNewReport ? { review_status: "Draft" } : {}),
    };

    if (isNewReport) {
      // Create the dispatch + clearance flight_schedule together, then link them.
      (async () => {
        try {
          // 1. Look up airline_id by name
          const { data: airlineData } = await supabase
            .from("airlines")
            .select("id")
            .eq("name", row.airline)
            .maybeSingle();

          // 2. Create flight_schedule for clearance approval (Pending)
          const clearancePayload: Record<string, any> = {
            flight_no: row.flight_no,
            aircraft_type: taskSheet.aircraft_type || "",
            registration: taskSheet.registration || "",
            route: taskSheet.route || "",
            sta: taskSheet.sta || "",
            std: taskSheet.std || "",
            skd_type: taskSheet.flight_type || "",
            clearance_type: row.service_type || "Arrival Security",
            status: "Pending" as const,
            authority: row.station || "CAI",
            handling_agent: "",
            arrival_date: row.flight_date || null,
            departure_date: row.flight_date || null,
            remarks: "Added from Security Service – pending clearance approval",
            notes: "",
            purpose: "Security Service",
          };
          if (airlineData?.id) clearancePayload.airline_id = airlineData.id;

          const { data: createdFlight, error: flightErr } = await supabase
            .from("flight_schedules")
            .insert(clearancePayload as any)
            .select("id")
            .single();
          if (flightErr) throw flightErr;

          // 3. Insert dispatch with link to the flight_schedule
          const dispatchInsert = { ...payload, flight_schedule_id: createdFlight?.id || null };
          const { error: dispatchErr } = await supabase
            .from("dispatch_assignments")
            .insert(dispatchInsert as any);
          if (dispatchErr) throw dispatchErr;

          queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
          queryClient.invalidateQueries({ queryKey: ["flight_schedules"] });
          toast({ title: "Submitted for Clearance", description: "Report sent to Clearance for approval." });
        } catch (e: any) {
          toast({ title: "Error", description: e.message, variant: "destructive" });
        }
      })();
    } else {
      updateMutation.mutate({ id: row.id, ...payload } as any);
    }
    setEditRow(null);
    setIsNewReport(false);
  };

  // Submit for review
  const submitForReview = (row: DispatchRow) => {
    updateMutation.mutate({ id: row.id, review_status: "Pending Review" });
  };

  // Review actions
  const handleReviewAction = (action: "Approved" | "Rejected") => {
    if (!reviewRow) return;
    updateMutation.mutate({
      id: reviewRow.id,
      review_status: action,
      review_comment: reviewComment,
      reviewed_by: session?.user?.email || "Reviewer",
      reviewed_at: new Date().toISOString(),
    });
    setReviewRow(null);
    setReviewComment("");
  };

  const markReadyForBilling = (row: DispatchRow) => {
    updateMutation.mutate({ id: row.id, review_status: "Ready for Billing" });
  };

  // Export
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      "Station": r.station,
      "Airline": r.airline,
      "Flight No": r.flight_no,
      "Date": r.flight_date,
      "Service Type": r.service_type,
      "Staff Count": r.staff_count,
      "Staff Names": r.staff_names,
      "Scheduled Start": r.scheduled_start,
      "Scheduled End": r.scheduled_end,
      "Actual Start": r.actual_start,
      "Actual End": r.actual_end,
      "Contract Duration (h)": r.contract_duration_hours,
      "Actual Duration (h)": r.actual_duration_hours,
      "Overtime (h)": r.overtime_hours,
      "Base Fee": r.base_fee,
      "Service Rate": r.service_rate,
      "Overtime Charge": r.overtime_charge,
      "Total Charge": r.total_charge,
      "Status": r.status,
      "Review Status": r.review_status,
      "Notes": r.notes,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Security Service Reports");
    XLSX.writeFile(wb, "Security_Service_Reports.xlsx");
  };

  const inputCls = "text-sm border rounded px-2.5 py-2 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield size={22} className="text-primary" /> Security Service Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Security service documentation · Pipeline:{" "}
            <button onClick={() => navigate("/clearances")} className="text-primary hover:underline">Schedule</button>
            {" → "}
            <span className="font-semibold text-foreground">Security Service</span>
            {" → "}
            <button onClick={() => navigate("/invoices")} className="text-primary hover:underline">Finance</button>
          </p>
        </div>
        <button onClick={openNewForm} className="toolbar-btn-primary shrink-0"><Plus size={14} /> New Service Report</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card-icon bg-primary"><FileBarChart2 size={20} /></div>
          <div><div className="text-xl font-bold text-foreground">{totalReports}</div><div className="text-xs text-muted-foreground">Total Reports</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-success"><CheckCircle2 size={20} /></div>
          <div><div className="text-xl font-bold text-foreground">{approvedReports}</div><div className="text-xs text-muted-foreground">Approved</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-warning"><Clock size={20} /></div>
          <div><div className="text-xl font-bold text-foreground">{pendingReview}</div><div className="text-xs text-muted-foreground">Pending Review</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-info"><DollarSign size={20} /></div>
          <div><div className="text-xl font-bold text-foreground">${totalRevenue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Charges</div></div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-3 flex items-center gap-3">
          <Users size={16} className="text-muted-foreground" />
          <div><div className="text-sm font-bold text-foreground">{totalStaffDeployed}</div><div className="text-xs text-muted-foreground">Staff Deployed</div></div>
        </div>
        <div className="bg-card border rounded-lg p-3 flex items-center gap-3">
          <Clock size={16} className="text-muted-foreground" />
          <div><div className="text-sm font-bold text-foreground">{totalOvertimeHrs.toFixed(1)}h</div><div className="text-xs text-muted-foreground">Total Overtime</div></div>
        </div>
        <div className="bg-card border rounded-lg p-3 flex items-center gap-3">
          <Plane size={16} className="text-muted-foreground" />
          <div><div className="text-sm font-bold text-foreground">{completedReports}</div><div className="text-xs text-muted-foreground">Completed</div></div>
        </div>
        <div className="bg-card border rounded-lg p-3 flex items-center gap-3">
          <DollarSign size={16} className="text-muted-foreground" />
          <div><div className="text-sm font-bold text-foreground">{readyForBilling}</div><div className="text-xs text-muted-foreground">Ready for Billing</div></div>
        </div>
      </div>

      {/* Main Tabs: Reports vs Scheduled Flights */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <button
              onClick={() => { setActiveMainTab("reports"); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${activeMainTab === "reports" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              <FileBarChart2 size={14} className="inline mr-1" /> Service Reports ({filtered.length})
            </button>
            <button
              onClick={() => { setActiveMainTab("flights"); setFlightsPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${activeMainTab === "flights" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              <CalendarDays size={14} className="inline mr-1" /> Scheduled Flights ({filteredFlights.length})
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text" placeholder="Search airline, flight, staff…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); setFlightsPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-56 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {activeMainTab === "reports" && (
            <>
              <select value={stationFilter} onChange={e => { setStationFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
                <option>All Stations</option>
                {allStations.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={serviceFilter} onChange={e => { setServiceFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
                <option>All Types</option>
                {allServiceTypes.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={reviewFilter} onChange={e => { setReviewFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
                <option>All</option>
                {REVIEW_STATUSES.map(s => <option key={s}>{s}</option>)}
                <option>Rejected</option>
              </select>
            </>
          )}
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); setFlightsPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="From" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); setFlightsPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="To" />
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
        </div>

        {activeMainTab === "reports" ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                     {["#", "STATION", "AIRLINE", "FLIGHT", "DATE", "TYPE", "SKD TYPE", "STAFF", "ACTUAL TIME", "DURATION", "OT (h)", "CHARGE ($)", "STATUS", "PIPELINE", "ACTIONS"].map(h => (
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
                        <Shield size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                        <p className="font-semibold text-foreground">No Security Service Reports</p>
                        <p className="text-muted-foreground text-sm mt-1">Security service reports will appear here once created</p>
                      </td>
                    </tr>
                  ) : pageData.map((r, i) => {
                    const rc = reviewStatusConfig[r.review_status] || reviewStatusConfig["Draft"];
                    const sc = dispatchStatusConfig[r.status] || dispatchStatusConfig["Pending"];
                    const hasIrregularity = r.irregularity_id && linkedIrregularities.has(r.irregularity_id);
                    return (
                      <tr key={r.id} className="data-table-row">
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-foreground">{r.station}</td>
                        <td className="px-3 py-2.5 text-foreground">{r.airline}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-foreground">{r.flight_no}</td>
                        <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{r.flight_date}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{r.service_type}</span>
                        </td>
                        <td className="px-3 py-2.5 text-foreground text-xs">
                          {r.flight_schedule_id ? (flightDetailsById.get(r.flight_schedule_id)?.skd_type || "—") : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-foreground">{r.staff_count}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                          {r.actual_start && r.actual_end ? `${r.actual_start}–${r.actual_end}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-foreground">{r.actual_start && r.actual_end ? `${timeDiffHours(r.actual_start, r.actual_end)}h` : (r.actual_duration_hours ? `${r.actual_duration_hours}h` : "—")}</td>
                        <td className="px-3 py-2.5">
                          {(() => {
                            const overtimeDisplay = r.actual_start && r.actual_end
                              ? minutesToHMM(Math.max(0, timeDiffMinutes(r.actual_start, r.actual_end) - Math.round((r.contract_duration_hours || 0) * 60)))
                              : r.overtime_hours;
                            return overtimeDisplay > 0 ? <span className="text-warning font-semibold">{overtimeDisplay}h</span> : "—";
                          })()}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-success">{r.total_charge > 0 ? `$${r.total_charge.toLocaleString()}` : "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc}`}>{r.status}</span>
                          {hasIrregularity && (
                            <span title="Has irregularity"><AlertTriangle size={12} className="inline ml-1 text-destructive" /></span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <PipelineStepper
                            currentStage={derivePipelineStage({
                              isLinked: r.status === "Completed",
                              reviewStatus: r.review_status,
                              clearanceStatus: r.flight_schedule_id ? flightStatusById.get(r.flight_schedule_id) : undefined,
                              dispatchStatus: r.status,
                            })}
                            compact
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => tryOpenEdit(r)} className="p-1 rounded hover:bg-muted" title="Edit Report">
                              <Pencil size={14} className="text-muted-foreground" />
                            </button>
                            {r.review_status === "Draft" && r.status === "Completed" && (
                              <button onClick={() => submitForReview(r)} className="p-1 rounded hover:bg-muted" title="Submit for Review">
                                <ExternalLink size={14} className="text-primary" />
                              </button>
                            )}
                            {r.review_status === "Pending Review" && (
                              <button onClick={() => { setReviewRow(r); setReviewComment(r.review_comment); }} className="p-1 rounded hover:bg-muted" title="Review">
                                <MessageSquare size={14} className="text-warning" />
                              </button>
                            )}
                            {r.review_status === "Approved" && (
                              <button onClick={() => markReadyForBilling(r)} className="p-1 rounded hover:bg-muted" title="Mark Ready for Billing">
                                <DollarSign size={14} className="text-success" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    if (p > totalPages) return null;
                    return (
                      <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded text-xs font-semibold ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                     {["#", "AIRLINE", "FLIGHT NO", "ROUTE", "A/C TYPE", "REG", "SERVICE TYPE", "SKD TYPE", "ARR DATE", "STA", "DEP DATE", "STD", "STATUS"].map(h => (
                      <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFlights.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-16">
                        <CalendarDays size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                        <p className="font-semibold text-foreground">No Security Flights</p>
                        <p className="text-muted-foreground text-sm mt-1">
                          Flights with security clearance types (Arrival Security, Departure Security, Maintenance Security, Turnaround Security) will appear here
                        </p>
                      </td>
                    </tr>
                  ) : flightsPageData.map((f: any, i: number) => {
                    const statusCls = f.status === "Approved" ? "bg-success/15 text-success" : f.status === "Rejected" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning";
                    return (
                      <tr key={f.id} className="data-table-row">
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{(flightsPage - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-3 py-2.5 text-foreground font-semibold">
                          {f.airlines?.iata_code ? `${f.airlines.iata_code} — ` : ""}{f.airlines?.name || "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-foreground">{f.flight_no}</td>
                        <td className="px-3 py-2.5 text-foreground">{f.route}</td>
                        <td className="px-3 py-2.5 text-foreground">{f.aircraft_type}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-foreground">{f.registration}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{f.clearance_type}</span>
                        </td>
                        <td className="px-3 py-2.5 text-foreground text-xs">{f.skd_type || "—"}</td>
                        <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{f.arrival_date || "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{f.sta || "—"}</td>
                        <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{f.departure_date || "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{f.std || "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}>{f.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {flightsTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Showing {(flightsPage - 1) * PAGE_SIZE + 1}–{Math.min(flightsPage * PAGE_SIZE, filteredFlights.length)} of {filteredFlights.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setFlightsPage(p => Math.max(1, p - 1))} disabled={flightsPage === 1} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, flightsTotalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(flightsPage - 2, flightsTotalPages - 4)) + i;
                    if (p > flightsTotalPages) return null;
                    return (
                      <button key={p} onClick={() => setFlightsPage(p)} className={`w-7 h-7 rounded text-xs font-semibold ${p === flightsPage ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setFlightsPage(p => Math.min(flightsTotalPages, p + 1))} disabled={flightsPage === flightsTotalPages} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Security Task Sheet Dialog */}
      <SecurityTaskSheetDialog
        row={editRow}
        onClose={() => { setEditRow(null); setIsNewReport(false); }}
        onSave={saveTaskSheet}
        isNew={isNewReport}
        registration={editRow?.flight_schedule_id ? flightDetailsById.get(editRow.flight_schedule_id)?.registration : undefined}
        route={editRow?.flight_schedule_id ? flightDetailsById.get(editRow.flight_schedule_id)?.route : undefined}
        sta={editRow?.flight_schedule_id ? flightDetailsById.get(editRow.flight_schedule_id)?.sta : undefined}
        std={editRow?.flight_schedule_id ? flightDetailsById.get(editRow.flight_schedule_id)?.std : undefined}
        skdType={editRow?.flight_schedule_id ? flightDetailsById.get(editRow.flight_schedule_id)?.skd_type : undefined}
        serviceType={editRow?.flight_schedule_id ? flightDetailsById.get(editRow.flight_schedule_id)?.clearance_type : undefined}
      />
      {/* Review Dialog */}
      <Dialog open={!!reviewRow} onOpenChange={(open) => !open && setReviewRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={18} /> Review Service Report
            </DialogTitle>
          </DialogHeader>
          {reviewRow && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div><span className="text-muted-foreground">Flight:</span> <span className="font-semibold">{reviewRow.flight_no}</span></div>
                <div><span className="text-muted-foreground">Airline:</span> {reviewRow.airline}</div>
                <div><span className="text-muted-foreground">Station:</span> {reviewRow.station}</div>
                <div><span className="text-muted-foreground">Date:</span> {reviewRow.flight_date}</div>
                <div><span className="text-muted-foreground">Staff:</span> {reviewRow.staff_count} ({reviewRow.staff_names || "—"})</div>
                <div><span className="text-muted-foreground">Actual Time:</span> {reviewRow.actual_start} – {reviewRow.actual_end}</div>
                <div><span className="text-muted-foreground">Overtime:</span> {reviewRow.overtime_hours}h</div>
                <div><span className="text-muted-foreground">Total Charge:</span> ${reviewRow.total_charge.toLocaleString()}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Review Comment</label>
                <textarea
                  className="w-full mt-1 text-sm border rounded px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[60px]"
                  placeholder="Add review comment…"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                />
              </div>
              {reviewRow.reviewed_by && (
                <div className="text-xs text-muted-foreground">
                  Last reviewed by <span className="font-semibold">{reviewRow.reviewed_by}</span>
                  {reviewRow.reviewed_at && ` on ${reviewRow.reviewed_at.slice(0, 10)}`}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="destructive" size="sm" onClick={() => handleReviewAction("Rejected")}>
                  <XCircle size={14} className="mr-1" /> Reject
                </Button>
                <Button size="sm" onClick={() => handleReviewAction("Approved")} className="bg-success hover:bg-success/90 text-success-foreground">
                  <CheckCircle2 size={14} className="mr-1" /> Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}
