import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, Plus, Download, Shield, Plane, Building2, Clock, Users,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pencil, CheckCircle2, XCircle, AlertTriangle,
  FileBarChart2, DollarSign, MessageSquare, ExternalLink, CalendarDays, X, RefreshCw,
  Eye, Trash2
} from "lucide-react";

import { resolveSecurityRowDisplay } from "@/lib/securityRowDisplay";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { expandFlightRef, normalizeFlightKey } from "@/lib/flightRefMatch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useChannel } from "@/contexts/ChannelContext";
import { useUserStation } from "@/contexts/UserStationContext";
import PipelineStepper, { derivePipelineStage, derivePipelineCompletedStages } from "@/components/serviceReport/PipelineStepper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SECURITY_CLEARANCE_TYPES } from "@/components/clearances/ClearanceTypes";
import SecurityTaskSheetDialog from "@/components/security/SecurityTaskSheetDialog";
import AllClearanceFlightsPage from "@/pages/AllClearanceFlights";
import { calculateSecurityCharges } from "@/lib/securityChargeCalculator";
import { dedupeDispatchRows } from "@/lib/securityDispatchRows";
import { parseDeletionRequests } from "@/lib/statusRouting";


const PAGE_SIZE = 15;

const REVIEW_STATUSES = ["Draft", "Pending Review", "Approved", "Ready for Billing"] as const;

const reviewStatusConfig: Record<string, { icon: React.ReactNode; cls: string }> = {
  "Draft": { icon: <Pencil size={11} />, cls: "bg-muted text-muted-foreground" },
  "Pending Review": { icon: <Clock size={11} />, cls: "bg-warning/15 text-warning" },
  "Modified": { icon: <ExternalLink size={11} />, cls: "bg-info/15 text-info" },
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
  const location = useLocation();
  const [reviewIdsFilter, setReviewIdsFilter] = useState<string[] | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reviewIds = params.get("reviewIds");
    if (reviewIds) {
      const ids = reviewIds.split(",").map(s => s.trim()).filter(Boolean);
      setReviewIdsFilter(ids.length > 0 ? ids : null);
    } else {
      setReviewIdsFilter(null);
    }
  }, [location.search]);
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { activeChannel, isAdmin } = useChannel();
  const { station: userStation, isStationScoped } = useUserStation();
  const isReceivablesView = activeChannel === "receivables";
  const isOperationsView = activeChannel === "operations" || activeChannel === "admin";
  const isStationView = activeChannel === "station";
  const canCreateNew = !isReceivablesView && !isOperationsView;
  const [stationTab, setStationTab] = useState<"all" | "rejected">("all");
  const [opsTab, setOpsTab] = useState<"all" | "modified" | "clearance-flights" | "pending-approval">("all");
  const [editPendingFlight, setEditPendingFlight] = useState<any | null>(null);
  const [editPendingForm, setEditPendingForm] = useState<any>({});

  const tryOpenEdit = (r: DispatchRow) => {
    if (isReceivablesView) {
      const completed = derivePipelineCompletedStages({
        isLinked: r.status === "Completed",
        reviewStatus: r.review_status,
        clearanceStatus: r.flight_schedule_id ? flightStatusById.get(r.flight_schedule_id) : undefined,
        dispatchStatus: r.status,
      });
      // Receivables can edit once Station (task sheet saved) and Operations (review approved)
      // are complete. Clearance status is informational at billing stage.
      const allDone = completed.includes("station") && completed.includes("operations");
      if (!allDone) {
        toast({
          title: "Locked",
          description: "Station task sheet and Operations approval must be completed before editing in Receivables.",
          variant: "destructive",
        });
        return;
      }
    }
    const fd = r.flight_schedule_id ? flightDetailsById.get(r.flight_schedule_id) : undefined;
    const display = resolveSecurityRowDisplay(r as any, fd, (r as any).flightMeta);
    setEditRow({ ...r, flight_no: display.flightNo || r.flight_no });
  };

  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("All Stations");
  const [reviewFilter, setReviewFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All Types");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [recordsView, setRecordsView] = useState<"table" | "calendar">("table");
  const [expandedDeleteIds, setExpandedDeleteIds] = useState<Set<string>>(new Set());

  const [editRow, setEditRow] = useState<DispatchRow | null>(null);
  const [isNewReport, setIsNewReport] = useState(false);
  const [reviewRow, setReviewRow] = useState<DispatchRow | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  /* Pending Approval tab filters */
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingStationFilter, setPendingStationFilter] = useState("All Stations");
  const [pendingDateFrom, setPendingDateFrom] = useState("");
  const [pendingDateTo, setPendingDateTo] = useState("");
  

  // Fetch dispatch assignments (completed ones = service reports)
  const { data: dispatches = [], isLoading } = useQuery({
    queryKey: ["dispatch_assignments", "service-reports", session?.user?.id, isStationScoped ? userStation : null],
    queryFn: async () => {
      let q = supabase
        .from("dispatch_assignments")
        .select("*")
        .order("flight_date", { ascending: false });
      if (isStationScoped && userStation) q = (q as any).eq("station", userStation);
      const { data, error } = await q;
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

  // Pipeline: load invoices to mark Receivables step complete only when paid.
  const { data: dbInvoicesForPipeline = [] } = useQuery({
    queryKey: ["invoices_for_security_pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("flight_ref,status")
        .neq("status", "Cancelled");
      if (error) throw error;
      return data || [];
    },
    enabled: !!session,
  });
  const invoiceStatusByFlight = useMemo(() => {
    const m = new Map<string, "issued" | "paid">();
    for (const inv of (dbInvoicesForPipeline as any[])) {
      const raw = String(inv.flight_ref || "");
      if (!raw) continue;
      const isPaid = String(inv.status || "").toLowerCase() === "paid";
      for (const key of expandFlightRef(raw)) {
        if (isPaid) m.set(key, "paid");
        else if (!m.get(key)) m.set(key, "issued");
      }
    }
    return m;
  }, [dbInvoicesForPipeline]);

  // Fetch flight schedules with security clearance types.
  // For station-scoped users and Operations view, ALL flights are treated as
  // security (Handling tab is empty for stations and ops needs visibility into
  // every station's flights), so skip the clearance_type filter.
  const includeAllFlights = (isStationScoped && !!userStation) || isOperationsView;
  const { data: securityFlights = [] } = useQuery({
    queryKey: ["flight_schedules", "security-types", isStationScoped ? userStation : null, isOperationsView],
    queryFn: async () => {
      let q = supabase
        .from("flight_schedules")
        .select("*, airlines:airline_id(name, iata_code)")
        .order("arrival_date", { ascending: false });
      if (isStationScoped && userStation) {
        q = (q as any).eq("authority", userStation);
      } else if (!includeAllFlights) {
        q = (q as any).in("clearance_type", SECURITY_CLEARANCE_TYPES);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!session,
  });

  // Fetch flight schedules awaiting Operations approval (created by Station/Security service reports).
  const { data: pendingApprovalFlights = [] } = useQuery({
    queryKey: ["flight_schedules", "station-dispatch-pending", isStationScoped ? userStation : null],
    queryFn: async () => {
      let q = supabase
        .from("flight_schedules")
        .select("*, airlines:airline_id(name, iata_code)")
        .eq("status", "Pending")
        .order("arrival_date", { ascending: true });
      if (isStationScoped && userStation) q = (q as any).eq("authority", userStation);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).filter((f: any) => {
        const purpose = f.purpose || "";
        const remarks = f.remarks || "";
        return purpose === "Station Dispatch" || purpose === "Security Service" || remarks.includes("Added from Station Dispatch") || remarks.includes("Added from Security Service") || remarks.includes("Added from Service Report");
      }) as any[];
    },
    enabled: !!session && isOperationsView,
  });

  const approvePendingFlight = async (flightId: string) => {
    const { error } = await supabase
      .from("flight_schedules")
      .update({ status: "Approved" } as any)
      .eq("id", flightId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await supabase
      .from("dispatch_assignments")
      .update({ status: "Completed", review_status: "Approved", reviewed_by: session?.user?.email || "Operations", reviewed_at: new Date().toISOString() } as any)
      .eq("flight_schedule_id", flightId);
    queryClient.invalidateQueries({ queryKey: ["flight_schedules"] });
    queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
    toast({ title: "Approved", description: "Flight approved by Operations." });
  };

  const rejectPendingFlight = async (flightId: string) => {
    // Operations rejection should only surface in the Station "Rejected Service Reports" tab.
    // We intentionally do NOT flip flight_schedules.status to "Rejected" — that would also
    // make it appear in the Clearance "Rejected" tab, which we don't want here.
    const reason = window.prompt("Rejection reason (shown to Station on the Rejected Service Reports tab):", "");
    if (reason === null) return; // user cancelled
    const trimmed = reason.trim();
    const { error } = await supabase
      .from("dispatch_assignments")
      .update({
        review_status: "Rejected",
        review_comment: trimmed,
        reviewed_by: session?.user?.email || "Operations",
        reviewed_at: new Date().toISOString(),
      } as any)
      .eq("flight_schedule_id", flightId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["flight_schedules"] });
    queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
    toast({ title: "Rejected", description: "Sent back to Station — visible in Rejected Service Reports." });
  };


  const openEditPending = (f: any) => {
    setEditPendingFlight(f);
    setEditPendingForm({
      flight_no: f.flight_no || "",
      registration: f.registration || "",
      route: f.route || "",
      sta: f.sta || "",
      std: f.std || "",
      arrival_date: f.arrival_date || "",
      departure_date: f.departure_date || "",
      clearance_type: f.clearance_type || "",
      remarks: f.remarks || "",
    });
  };

  const saveEditPending = async () => {
    if (!editPendingFlight) return;
    const { error } = await supabase
      .from("flight_schedules")
      .update({
        flight_no: editPendingForm.flight_no || null,
        registration: editPendingForm.registration || null,
        route: editPendingForm.route || null,
        sta: editPendingForm.sta || null,
        std: editPendingForm.std || null,
        arrival_date: editPendingForm.arrival_date || null,
        departure_date: editPendingForm.departure_date || null,
        clearance_type: editPendingForm.clearance_type || null,
        remarks: editPendingForm.remarks || null,
      } as any)
      .eq("id", editPendingFlight.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["flight_schedules"] });
    toast({ title: "Updated", description: "Flight details updated." });
    setEditPendingFlight(null);
  };


  // Fetch ALL security contract rates (used for receivables on-the-fly amount computation)
  const { data: allRates = [] } = useQuery({
    queryKey: ["contract_service_rates", "security-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_service_rates")
        .select("*");
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

  // Build lookup for flight schedule details (flight no, registration, route, sta, std, dates, aircraft type)
  const flightDetailsById = useMemo(() => {
    const map = new Map<string, { flight_no: string; registration: string; route: string; sta: string; std: string; ata: string; atd: string; skd_type: string; clearance_type: string; arrival_date: string; departure_date: string; aircraft_type: string }>();
    securityFlights.forEach((f: any) => map.set(f.id, {
      flight_no: f.flight_no || "",
      registration: f.registration || "",
      route: f.route || "",
      sta: f.sta || "",
      std: f.std || "",
      ata: "",
      atd: "",
      skd_type: f.skd_type || "",
      clearance_type: f.clearance_type || "",
      arrival_date: f.arrival_date || "",
      departure_date: f.departure_date || "",
      aircraft_type: f.aircraft_type || "",
    }));
    return map;
  }, [securityFlights]);

  // Filters
  const { data: dbAirports = [] } = useQuery({
    queryKey: ["airports", "iata-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("airports").select("iata_code").eq("status", "Active");
      if (error) throw error;
      return data;
    },
  });
  const allStations = useMemo(() => {
    const set = new Set<string>();
    dispatches.forEach(d => { if (d.station) set.add(d.station); });
    (dbAirports as any[]).forEach(a => { if (a.iata_code) set.add(a.iata_code); });
    return [...set].sort();
  }, [dispatches, dbAirports]);
  const allServiceTypes = useMemo(() => [...new Set(dispatches.map(d => d.service_type))].sort(), [dispatches]);

  // Security tab shows ONLY flights with dispatch_assignments.
  // Clearance-only security flights (no dispatch yet) are NOT shown here.
  // Also deduplicate: when multiple dispatch_assignments exist for the same
  // flight_schedule_id, keep the most-recently-updated one.
  type MergedSecurityRow = DispatchRow & { isPending?: boolean; flightMeta?: any };

  const mergedRows: MergedSecurityRow[] = useMemo(() => {
    const deduped = dedupeDispatchRows(dispatches);
    // For station-scoped users AND Operations view, also surface flights that
    // don't yet have a dispatch_assignment as Pending security rows so ops can
    // see every station's flights (ASW, RMF, HBE, etc.).
    const shouldSurfacePending = (isStationScoped && !!userStation) || isOperationsView;
    if (!shouldSurfacePending) return deduped;
    const dispatchedFlightIds = new Set(
      deduped.map(r => r.flight_schedule_id).filter(Boolean) as string[]
    );
    const pendingFromFlights: MergedSecurityRow[] = (securityFlights as any[])
      .filter(f => !dispatchedFlightIds.has(f.id))
      .map(f => {
        const airline = (f as any).airlines;
        // Prefer the merged flight_no (e.g. "SM 2917/2982" for turnarounds) over
        // arrival_flight/departure_flight which only carry one leg.
        const flightNo = f.flight_no || f.arrival_flight || f.departure_flight || "";
        return {
          id: `pending-${f.id}`,
          flight_schedule_id: f.id,
          contract_id: null,
          station: f.authority || userStation || "CAI",
          airline: airline?.name || airline?.iata_code || "",
          flight_no: flightNo,
          flight_date: f.arrival_date || f.departure_date || "",
          service_type: f.clearance_type || "Security",
          staff_names: "",
          staff_count: 0,
          scheduled_start: f.sta || "",
          scheduled_end: f.std || "",
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
          dispatched_by: "",
          review_status: "Draft",
          review_comment: "",
          reviewed_by: "",
          reviewed_at: null,
          irregularity_id: null,
          created_at: f.created_at || "",
          updated_at: f.updated_at || "",
          isPending: true,
          flightMeta: f,
        } as MergedSecurityRow;
      });
    return [...deduped, ...pendingFromFlights];
  }, [dispatches, securityFlights, isStationScoped, userStation, isOperationsView]);

  const filtered = useMemo(() => {
    let rows: MergedSecurityRow[] = mergedRows;
    // Operations sub-tab: filter to Modified reports (when explicitly selected)
    if (isOperationsView && opsTab === "modified") {
      rows = rows.filter(r => !r.isPending && r.review_status === "Modified");
    }
    // Station "Rejected" tab
    if (isStationView && stationTab === "rejected") rows = rows.filter(r => r.review_status === "Rejected");
    if (reviewIdsFilter && reviewIdsFilter.length > 0) {
      const set = new Set(reviewIdsFilter);
      rows = rows.filter(r => set.has(r.id));
    }
    if (stationFilter !== "All Stations") rows = rows.filter(r => r.station === stationFilter);
    if (reviewFilter !== "All") rows = rows.filter(r => r.review_status === reviewFilter);
    if (serviceFilter !== "All Types") rows = rows.filter(r => r.service_type === serviceFilter);
    if (dateFrom) rows = rows.filter(r => (r.flight_date || "") >= dateFrom);
    if (dateTo) rows = rows.filter(r => (r.flight_date || "") <= dateTo);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        (r.airline || "").toLowerCase().includes(s) ||
        (r.flight_no || "").toLowerCase().includes(s) ||
        (r.staff_names || "").toLowerCase().includes(s) ||
        (r.station || "").toLowerCase().includes(s)
      );
    }
    // Sort by Arrival Date with flight_no/id tiebreaker so an edited row keeps its position
    const ascending = true;
    return [...rows].sort((a, b) => {
      const aMeta = (a as any).flightMeta;
      const bMeta = (b as any).flightMeta;
      const aFd = a.flight_schedule_id ? flightDetailsById.get(a.flight_schedule_id) : undefined;
      const bFd = b.flight_schedule_id ? flightDetailsById.get(b.flight_schedule_id) : undefined;
      const ad = aFd?.arrival_date || aMeta?.arrival_date || a.flight_date || "";
      const bd = bFd?.arrival_date || bMeta?.arrival_date || b.flight_date || "";
      if (ad !== bd) {
        if (!ad) return 1;
        if (!bd) return -1;
        return ascending ? ad.localeCompare(bd) : bd.localeCompare(ad);
      }
      const at = aFd?.sta || aMeta?.sta || aFd?.std || aMeta?.std || "";
      const bt = bFd?.sta || bMeta?.sta || bFd?.std || bMeta?.std || "";
      if (at !== bt) {
        if (!at) return 1;
        if (!bt) return -1;
        return at.localeCompare(bt);
      }
      return (a.flight_no || "").localeCompare(b.flight_no || "") || (a.id || "").localeCompare(b.id || "");
    });
  }, [mergedRows, stationFilter, reviewFilter, serviceFilter, dateFrom, dateTo, search, isOperationsView, isStationView, isReceivablesView, stationTab, opsTab, flightDetailsById, reviewIdsFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs (computed from the merged/filtered list)
  const totalReports = filtered.length;
  const completedReports = filtered.filter(r => r.status === "Completed").length;
  const approvedReports = filtered.filter(r => r.review_status === "Approved" || r.review_status === "Ready for Billing").length;
  const totalRevenue = filtered.reduce((s, r) => s + (r.total_charge || 0), 0);
  const totalOvertimeHrs = filtered.reduce((s, r) => s + (r.overtime_hours || 0), 0);
  const totalStaffDeployed = filtered.reduce((s, r) => s + (r.staff_count || 0), 0);
  const pendingReview = filtered.filter(r => r.review_status === "Pending Review").length;
  const readyForBilling = filtered.filter(r => r.review_status === "Ready for Billing").length;

  // Pending Approval tab: filtered list + stats
  const filteredPendingFlights = useMemo(() => {
    let rows = [...pendingApprovalFlights];
    if (pendingStationFilter !== "All Stations") rows = rows.filter((f: any) => f.authority === pendingStationFilter);
    if (pendingDateFrom) rows = rows.filter((f: any) => (f.arrival_date || f.departure_date || f.flight_date || "") >= pendingDateFrom);
    if (pendingDateTo) rows = rows.filter((f: any) => (f.arrival_date || f.departure_date || f.flight_date || "") <= pendingDateTo);
    if (pendingSearch) {
      const s = pendingSearch.toLowerCase();
      rows = rows.filter((f: any) =>
        (f.flight_no || "").toLowerCase().includes(s) ||
        (f.airlines?.name || f.handling_agent || "").toLowerCase().includes(s) ||
        (f.registration || "").toLowerCase().includes(s) ||
        (f.route || "").toLowerCase().includes(s) ||
        (f.authority || "").toLowerCase().includes(s)
      );
    }
    return rows;
  }, [pendingApprovalFlights, pendingStationFilter, pendingDateFrom, pendingDateTo, pendingSearch]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const pendingTotal = filteredPendingFlights.length;
  const pendingToday = filteredPendingFlights.filter((f: any) => (f.arrival_date || f.departure_date || f.flight_date || "") === todayStr).length;
  const pendingStationsCount = new Set(filteredPendingFlights.map((f: any) => f.authority).filter(Boolean)).size;
  const pendingAirlinesCount = new Set(filteredPendingFlights.map((f: any) => f.airlines?.name || f.handling_agent).filter(Boolean)).size;

  const linkedIrregularities = useMemo(() => {
    const map = new Map<string, typeof irregularities[0]>();
    irregularities.forEach(ir => map.set(ir.id, ir));
    return map;
  }, [irregularities]);

  // Map dispatch service_type → contract flight_type
  const mapServiceTypeToFlightType = (st: string): string => {
    const s = (st || "").toLowerCase();
    if (s.includes("turnaround")) return "Turnaround";
    if (s.includes("maintenance")) return "Maintenance Security";
    if (s.includes("departure")) return "Departure Security";
    if (s.includes("arrival")) return "Arrival Security";
    return st || "Turnaround";
  };

  // Compute live amount/currency for a row from the linked contract's rates.
  // Used in the receivables view to always show an up-to-date charge even
  // when the saved record hasn't been recomputed since the contract changed.
  const computeRowCharges = useCallback((r: DispatchRow) => {
    if (!r.contract_id) return { amount: 0, currency: "USD", lines: [] as any[] };
    const rates = (allRates as any[]).filter(x => x.contract_id === r.contract_id);
    if (!rates.length) return { amount: 0, currency: "USD", lines: [] as any[] };
    const gt = r.actual_duration_hours || 0;
    // Detect ADHOC SKD type from the linked flight schedule (or merged meta).
    const fd = r.flight_schedule_id ? flightDetailsById.get(r.flight_schedule_id) : undefined;
    const meta = (r as any).flightMeta;
    const skd = (fd?.skd_type || meta?.skd_type || "").toString().trim().toUpperCase();
    const isAdhoc = skd === "ADHOC";
    const result = calculateSecurityCharges({
      airport: r.station || "CAI",
      flightType: mapServiceTypeToFlightType(r.service_type),
      groundTimeHours: gt,
      isAdhoc,
      rates: rates as any,
    });
    return { amount: result.total, currency: result.currency, lines: result.lines || [] };
  }, [allRates, flightDetailsById]);

  const saveEdit = () => {};

  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Local override: dispatch IDs that were just saved via "Save All Security Charges".
  // Used to mark Receivables (step 4) of the pipeline complete immediately for
  // those rows — without waiting for an invoice to be paid.
  const [chargesSavedIds, setChargesSavedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  // Receivables bulk action: compute & persist Security Charges for ALL eligible
  // rows (Station + Operations done) in one click — instead of opening Edit
  // dialog per flight to press "Save Security Charges".
  const saveAllSecurityCharges = async () => {
    let eligible = filtered.filter(r => {
      if ((r as any).isPending) return false;
      const reviewDone = (r.review_status || "").toLowerCase() === "approved" || (r.review_status || "").toLowerCase().includes("billing");
      return r.status === "Completed" && reviewDone && r.contract_id;
    });
    // If the user has selected specific rows, restrict the action to those.
    if (selectedIds.size > 0) {
      eligible = eligible.filter(r => selectedIds.has(r.id));
    }
    if (eligible.length === 0) {
      toast({
        title: "No eligible flights",
        description: selectedIds.size > 0
          ? "None of the selected flights are eligible. Only completed & operations-approved flights with a linked contract can be auto-billed."
          : "Only completed & operations-approved flights with a linked contract can be auto-billed.",
        variant: "destructive",
      });
      return;
    }
    setBulkSaving(true);
    let ok = 0, skipped = 0, failed = 0;
    const savedIds: string[] = [];
    for (const r of eligible) {
      const c = computeRowCharges(r);
      if (!c.amount) { skipped++; continue; }
      const { error } = await supabase.from("dispatch_assignments").update({
        charges_breakdown: c.lines,
        total_security_charges: c.amount,
        charges_currency: c.currency,
        review_status: "Ready for Billing",
      } as any).eq("id", r.id);
      if (error) failed++; else { ok++; savedIds.push(r.id); }
    }
    setBulkSaving(false);
    // Mark these rows as receivables-complete locally so the pipeline shows
    // step 4 done immediately (without waiting for the invoice to be paid).
    if (savedIds.length) {
      setChargesSavedIds(prev => {
        const next = new Set(prev);
        savedIds.forEach(id => next.add(id));
        return next;
      });
    }
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
    toast({
      title: failed ? "Completed with errors" : "✅ All charges saved",
      description: `${ok} saved, ${skipped} skipped (no rate), ${failed} failed. Marked Ready for Billing — pipeline step 4 complete.`,
      variant: failed ? "destructive" : undefined,
    });
  };


  const saveTaskSheet = (row: DispatchRow, taskSheet: any) => {
    const shiftStart = taskSheet.shift_start || row.actual_start || "";
    const shiftEnd = taskSheet.shift_end || row.actual_end || "";
    const actualMins = timeDiffMinutes(shiftStart, shiftEnd);
    const duration = minutesToHMM(actualMins);
    const contractMins = Math.round((row.contract_duration_hours || 0) * 60);
    const overtimeMins = Math.max(0, actualMins - contractMins);
    // Any fractional hour of OT is rounded UP to a full hour for billing.
    const billedOtHours = Math.ceil(overtimeMins / 60);
    const overtimeHours = billedOtHours; // displayed as whole hours
    const overtimeCharge = billedOtHours * (row.overtime_rate || 0) * (row.staff_count || 1);
    const totalCharge = (row.base_fee || 0) + (row.service_rate || 0) + overtimeCharge;

    // Detect "completing a clearance flight" case: new dispatch but row already
    // has a flight_schedule_id (came from a pending clearance row).
    const isCompletingClearanceFlight = isNewReport && !!(row as any).flight_schedule_id;
    // If station is editing a previously-rejected report, mark as "Modified" (goes back to ops).
    const isResubmittingRejected = !isNewReport && row.review_status === "Rejected";

    // Detect "service type changed" on an existing linked record. When the
    // station changes the Service Type (clearance_type) for an existing
    // record, the flight needs to go back to Clearance for re-approval.
    const linkedFsId = (row as any).flight_schedule_id;
    const originalClearanceType = linkedFsId
      ? flightDetailsById.get(linkedFsId)?.clearance_type
      : undefined;
    const serviceTypeChanged =
      !isNewReport &&
      !!linkedFsId &&
      !!originalClearanceType &&
      (row.service_type || "").trim().toLowerCase() !==
        (originalClearanceType || "").trim().toLowerCase();

    const payload: Record<string, any> = {
      task_sheet_data: taskSheet,
      notes: taskSheet.remarks || row.notes,
      actual_start: shiftStart,
      actual_end: shiftEnd,
      actual_duration_hours: duration,
      overtime_hours: overtimeHours,
      overtime_charge: Math.round(overtimeCharge * 100) / 100,
      total_charge: Math.round(totalCharge * 100) / 100,
      // Brand-new reports (no clearance link yet) stay "Pending" until clearance
      // approves the linked flight schedule. Completing a clearance flight or
      // editing an existing report → mark "Completed" so step 2 (Station) is done.
      // EXCEPTION: if Service Type changed, send the dispatch back to "Pending"
      // so the pipeline reverts to step 1 (Clearance) for re-approval.
      status: serviceTypeChanged
        ? "Pending"
        : (isNewReport && !isCompletingClearanceFlight)
          ? "Pending"
          : "Completed",
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
      // New reports start in Draft; completing a clearance flight goes straight to Pending Review.
      // Resubmitting a rejected report → "Modified" so it appears under Operations → Modified tab.
      // Service Type change → "Draft" (returns to clearance, removes from ops queue).
      ...(isNewReport
        ? { review_status: isCompletingClearanceFlight ? "Pending Review" : "Draft" }
        : isResubmittingRejected
          ? { review_status: "Modified" }
          : serviceTypeChanged
            ? { review_status: "Draft", reviewed_at: null, reviewed_by: "", review_comment: "" }
            : {}),
    };

    if (isCompletingClearanceFlight) {
      // Reuse the existing clearance flight schedule — just create the dispatch
      // record linked to it. Step 2 (Station) is now complete.
      (async () => {
        try {
          const linkedFlightNo = (row as any).flight_schedule_id
            ? flightDetailsById.get((row as any).flight_schedule_id)?.flight_no
            : undefined;
          const dispatchInsert = { ...payload, flight_no: linkedFlightNo || payload.flight_no, flight_schedule_id: (row as any).flight_schedule_id };
          const { error: dispatchErr } = await supabase
            .from("dispatch_assignments")
            .insert(dispatchInsert as any);
          if (dispatchErr) throw dispatchErr;
          queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
          toast({ title: "Task Sheet Saved", description: "Step 2 (Station) complete — sent for Operations review." });
        } catch (e: any) {
          toast({ title: "Error", description: e.message, variant: "destructive" });
        }
      })();
    } else if (isNewReport) {
      // Create the dispatch + clearance flight_schedule together, then link them.
      (async () => {
        try {
          // 1. Look up airline_id by name
          const { data: airlineData } = await supabase
            .from("airlines")
            .select("id")
            .eq("name", row.airline)
            .maybeSingle();

          // 2. Create flight_schedule for Operations approval (Pending)
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
            remarks: "Added from Security Service – pending Operations approval",
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
          toast({ title: "Submitted for Operations", description: "Report sent to Operations for approval." });
        } catch (e: any) {
          toast({ title: "Error", description: e.message, variant: "destructive" });
        }
      })();
    } else {
      // Editing an existing dispatch. Always sync changed fields back to the
      // linked flight_schedule. If the Service Type changed, reset the schedule
      // to Pending so the flight returns to Operations → Pending Approval.
      (async () => {
        try {
          // 1. Update the dispatch
          const { error: dispatchErr } = await supabase
            .from("dispatch_assignments")
            .update(payload as any)
            .eq("id", row.id);
          if (dispatchErr) throw dispatchErr;

          // 2. Sync changes back to the linked flight_schedule (if any)
          if (linkedFsId) {
            const fsUpdate: Record<string, any> = {
              flight_no: row.flight_no,
              clearance_type: row.service_type,
              registration: taskSheet.registration || "",
              route: taskSheet.route || "",
              sta: taskSheet.sta || "",
              std: taskSheet.std || "",
              skd_type: taskSheet.flight_type || "",
              arrival_date: row.flight_date || null,
              departure_date: (row as any).departure_date || row.flight_date || null,
            };
            // Service Type change → revert clearance to Pending (re-approval needed)
            if (serviceTypeChanged) {
              fsUpdate.status = "Pending";
              fsUpdate.remarks = "Service Type changed by Station — Operations re-approval required";
            }
            const { error: fsErr } = await supabase
              .from("flight_schedules")
              .update(fsUpdate as any)
              .eq("id", linkedFsId);
            if (fsErr) throw fsErr;
          }

          queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
          queryClient.invalidateQueries({ queryKey: ["flight_schedules"] });

          if (serviceTypeChanged) {
            toast({
              title: "Returned to Operations",
              description: "Service Type changed — flight sent back to Operations → Pending Approval.",
            });
          } else {
            toast({ title: "Task Sheet Updated", description: "Changes saved and synced to Operations." });
          }
        } catch (e: any) {
          toast({ title: "Error", description: e.message, variant: "destructive" });
        }
      })();
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
    // Approving a "Modified" report (resubmitted after rejection) goes straight to Ready for Billing.
    const finalStatus =
      action === "Approved" && reviewRow.review_status === "Modified" ? "Ready for Billing" : action;
    updateMutation.mutate({
      id: reviewRow.id,
      review_status: finalStatus,
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
            Security service documentation across stations and operations.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
              queryClient.invalidateQueries({ queryKey: ["flight_schedules"] });
              queryClient.invalidateQueries({ queryKey: ["security_irregularities"] });
              toast({ title: "Refreshing", description: "Reloading security service reports…" });
            }}
            className="toolbar-btn"
            title="Refresh"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {canCreateNew && (
            <button onClick={openNewForm} className="toolbar-btn-primary"><Plus size={14} /> New Service Report</button>
          )}
        </div>
      </div>


      {reviewIdsFilter && reviewIdsFilter.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm">
          <div>
            <span className="font-semibold text-warning-foreground">Filtered to {reviewIdsFilter.length} security assignment{reviewIdsFilter.length === 1 ? "" : "s"}</span>
            <span className="text-muted-foreground ml-2">flagged by Pre-Invoice Validation. Fix issues, then approve.</span>
          </div>
          <button
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => { setReviewIdsFilter(null); navigate("/service-report?tab=security", { replace: true }); }}
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Station-only sub-tabs (All vs Rejected) */}
      {isStationView && (
        <div className="flex items-center gap-2 border-b">
          <button
            onClick={() => { setStationTab("all"); setPage(1); }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              stationTab === "all"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            All Reports
          </button>
          <button
            onClick={() => { setStationTab("rejected"); setPage(1); }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              stationTab === "rejected"
                ? "text-destructive border-destructive"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <AlertTriangle size={14} />
            Rejected Service Reports
            {dispatches.filter(d => d.review_status === "Rejected").length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {dispatches.filter(d => d.review_status === "Rejected").length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Operations-only sub-tabs (All vs Modified) */}
      {isOperationsView && (
        <div className="flex items-center gap-2 border-b">
          <button
            onClick={() => { setOpsTab("all"); setPage(1); }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              opsTab === "all"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            All Reports
          </button>
          <button
            onClick={() => { setOpsTab("modified"); setPage(1); }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              opsTab === "modified"
                ? "text-info border-info"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <ExternalLink size={14} />
            Modified
            {dispatches.filter(d => d.review_status === "Modified").length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-info text-info-foreground text-[10px] font-bold">
                {dispatches.filter(d => d.review_status === "Modified").length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setOpsTab("clearance-flights"); setPage(1); }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              opsTab === "clearance-flights"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Plane size={14} />
            All Clearance Flights
          </button>
          <button
            onClick={() => { setOpsTab("pending-approval"); setPage(1); }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              opsTab === "pending-approval"
                ? "text-destructive border-destructive"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Clock size={14} />
            Pending Approval
            {pendingApprovalFlights.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {pendingApprovalFlights.length}
              </span>
            )}
          </button>
        </div>
      )}

      {isOperationsView && opsTab === "clearance-flights" ? (
        <AllClearanceFlightsPage securityOnly />
      ) : isOperationsView && opsTab === "pending-approval" ? (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-card-icon bg-destructive"><Clock size={20} /></div>
              <div><div className="text-xl font-bold text-foreground">{pendingTotal}</div><div className="text-xs text-muted-foreground">Pending Total</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon bg-warning"><CalendarDays size={20} /></div>
              <div><div className="text-xl font-bold text-foreground">{pendingToday}</div><div className="text-xs text-muted-foreground">Today</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon bg-info"><Building2 size={20} /></div>
              <div><div className="text-xl font-bold text-foreground">{pendingStationsCount}</div><div className="text-xs text-muted-foreground">Stations</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon bg-primary"><Plane size={20} /></div>
              <div><div className="text-xl font-bold text-foreground">{pendingAirlinesCount}</div><div className="text-xs text-muted-foreground">Airlines</div></div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="p-4 border-b flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mr-auto">
                <Clock size={14} className="text-destructive" />
                Pending Operations Approval
                <span className="text-xs font-normal text-muted-foreground">
                  — {pendingTotal} flight{pendingTotal === 1 ? "" : "s"} awaiting review
                </span>
              </h3>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text" placeholder="Search flight, airline, reg…"
                  value={pendingSearch} onChange={e => setPendingSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-56 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <select value={pendingStationFilter} onChange={e => setPendingStationFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
                <option>All Stations</option>
                {allStations.map(s => <option key={s}>{s}</option>)}
              </select>
              <input type="date" value={pendingDateFrom} onChange={e => setPendingDateFrom(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="From" />
              <input type="date" value={pendingDateTo} onChange={e => setPendingDateTo(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="To" />
              {(pendingSearch || pendingStationFilter !== "All Stations" || pendingDateFrom || pendingDateTo) && (
                <button
                  onClick={() => { setPendingSearch(""); setPendingStationFilter("All Stations"); setPendingDateFrom(""); setPendingDateTo(""); }}
                  className="toolbar-btn-outline text-xs"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    {["#", "STATION", "AIRLINE", "FLIGHT", "REG", "SERVICE TYPE", "ARR DATE", "STA", "STD", "ROUTE", "REMARKS", "PIPELINE", "ACTIONS"].map(h => (
                      <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPendingFlights.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-16">
                        <Clock size={36} className="mx-auto text-muted-foreground/30 mb-2" />
                        <p className="font-semibold text-foreground">No flights pending approval</p>
                        <p className="text-muted-foreground text-sm mt-1">New service reports added by stations will appear here for Operations approval.</p>
                      </td>
                    </tr>
                  ) : filteredPendingFlights.map((f: any, i: number) => (
                    <tr key={f.id} className="data-table-row">
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-foreground">{f.authority || "—"}</td>
                      <td className="px-3 py-2.5 text-foreground">{f.airlines?.name || f.handling_agent || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-foreground">{f.flight_no || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{f.registration || "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{f.clearance_type || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-foreground text-xs whitespace-nowrap">{f.arrival_date || f.departure_date || f.flight_date || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{f.sta || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{f.std || "—"}</td>
                      <td className="px-3 py-2.5 text-foreground text-xs">{f.route || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[240px] truncate" title={f.remarks || ""}>{f.remarks || "—"}</td>
                      <td className="px-3 py-2.5">
                        <PipelineStepper
                          currentStage="operations"
                          completedStages={["station"]}
                          compact
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEditPending(f)}
                            className="px-2 py-1 text-xs font-semibold rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors inline-flex items-center gap-1"
                          >
                            <Eye size={11} /> View
                          </button>
                          <button
                            onClick={() => approvePendingFlight(f.id)}
                            className="px-2 py-1 text-xs font-semibold rounded bg-success/15 text-success hover:bg-success/25 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectPendingFlight(f.id)}
                            className="px-2 py-1 text-xs font-semibold rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
      <>
      {/* KPI Cards */}
      <div className={`grid grid-cols-2 ${isOperationsView ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-4`}>
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
        {!isOperationsView && (
          <div className="stat-card">
            <div className="stat-card-icon bg-info"><DollarSign size={20} /></div>
            <div><div className="text-xl font-bold text-foreground">${totalRevenue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Charges</div></div>
          </div>
        )}
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

      {/* Service Reports list (clearance flights merged in) */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mr-auto">
            <FileBarChart2 size={16} className="text-primary" /> Service Reports
            <span className="text-xs font-normal text-muted-foreground">({filtered.length})</span>
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text" placeholder="Search airline, flight, staff…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-56 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
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
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="From" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="To" />
          {isReceivablesView && (
            <button
              onClick={saveAllSecurityCharges}
              disabled={bulkSaving}
              className="toolbar-btn-primary"
              title={selectedIds.size > 0
                ? `Compute & save Security Charges for the ${selectedIds.size} selected flight(s), then mark Receivables (step 4) complete`
                : "Compute & save Security Charges for every eligible flight, then mark Receivables (step 4) complete"}
            >
              <DollarSign size={14} />
              {bulkSaving
                ? "Saving…"
                : selectedIds.size > 0
                  ? `Save Security Charges (${selectedIds.size} selected)`
                  : "Save All Security Charges"}
            </button>
          )}
          <div className="inline-flex rounded border overflow-hidden">
            <button
              onClick={() => setRecordsView("table")}
              className={`px-2.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1 ${recordsView === "table" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}
              title="Table view"
            >
              <FileBarChart2 size={12} /> Table
            </button>
            <button
              onClick={() => setRecordsView("calendar")}
              className={`px-2.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1 border-l ${recordsView === "calendar" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}
              title="Calendar view"
            >
              <CalendarDays size={12} /> Calendar
            </button>
          </div>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
        </div>

        {recordsView === "calendar" ? (
          <div className="p-4 space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <CalendarDays size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="font-semibold text-foreground">No records to display</p>
              </div>
            ) : (() => {
              const groups = new Map<string, typeof filtered>();
              for (const r of filtered) {
                const fd = r.flight_schedule_id ? flightDetailsById.get(r.flight_schedule_id) : undefined;
                const d = resolveSecurityRowDisplay(r as any, fd, (r as any).flightMeta);
                const key = d.arrivalDate || d.departureDate || r.flight_date || "Unscheduled";
                if (!groups.has(key)) groups.set(key, [] as any);
                (groups.get(key) as any).push(r);
              }
              const sortedKeys = [...groups.keys()].sort((a, b) => {
                if (a === "Unscheduled") return 1;
                if (b === "Unscheduled") return -1;
                return a.localeCompare(b);
              });
              return sortedKeys.map(dateKey => {
                const items = groups.get(dateKey)!;
                const sorted = [...items].sort((a, b) => {
                  const ad = resolveSecurityRowDisplay(a as any, a.flight_schedule_id ? flightDetailsById.get(a.flight_schedule_id) : undefined, (a as any).flightMeta);
                  const bd = resolveSecurityRowDisplay(b as any, b.flight_schedule_id ? flightDetailsById.get(b.flight_schedule_id) : undefined, (b as any).flightMeta);
                  // Sort by STA; fall back to STD when a flight has no STA (departure-only).
                  const aKey = ad.sta || ad.std || "";
                  const bKey = bd.sta || bd.std || "";
                  if (!aKey && bKey) return 1;
                  if (aKey && !bKey) return -1;
                  return aKey.localeCompare(bKey);
                });
                return (
                  <div key={dateKey} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
                      <CalendarDays size={14} className="text-primary" />
                      <span className="text-sm font-semibold text-foreground">{dateKey}</span>
                      <span className="text-xs text-muted-foreground">({sorted.length} flight{sorted.length === 1 ? "" : "s"})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 p-2">
                      {sorted.map(r => {
                        const fd = r.flight_schedule_id ? flightDetailsById.get(r.flight_schedule_id) : undefined;
                        const d = resolveSecurityRowDisplay(r as any, fd, (r as any).flightMeta);
                        const sc = dispatchStatusConfig[r.status] || dispatchStatusConfig["Pending"];
                        return (
                          <button
                            key={r.id}
                            onClick={() => setEditRow(r)}
                            className="text-left bg-card border rounded p-2.5 hover:border-primary hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-foreground">{d.flightNo || r.flight_no || "—"}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${sc}`}>{r.status}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mb-1">{r.airline || "—"} · {r.station}</div>
                            <div className="flex items-center gap-3 text-[11px] font-mono text-foreground">
                              <span>STA <span className="text-primary">{d.sta || "—"}</span></span>
                              <span>STD <span className="text-primary">{d.std || "—"}</span></span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-1 truncate">{d.route || "—"}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
        <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {isReceivablesView && (
                      <th className="data-table-header px-2 py-3 w-8">
                        <input
                          type="checkbox"
                          aria-label="Select all on page"
                          checked={pageData.length > 0 && pageData.every(r => selectedIds.has(r.id))}
                          onChange={(e) => {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) pageData.forEach(r => next.add(r.id));
                              else pageData.forEach(r => next.delete(r.id));
                              return next;
                            });
                          }}
                        />
                      </th>
                    )}
                     {["#", "STATION", "AIRLINE", "FLIGHT", "REG", "TYPE", "SKD TYPE", "ARR DATE", "STA", "DEP DATE", "STD", "ROUTE", "A/C TYPE", "ACTUAL TIME", "DURATION", "OT (h)", ...(isReceivablesView ? ["AMOUNT"] : []), "STATUS", "PIPELINE", "ACTIONS"].map(h => (
                      <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={isReceivablesView ? 21 : 19} className="text-center py-16 text-muted-foreground">Loading…</td></tr>
                  ) : pageData.length === 0 ? (
                     <tr>
                      <td colSpan={isReceivablesView ? 21 : 19} className="text-center py-16">
                        <Shield size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                        <p className="font-semibold text-foreground">No Security Service Reports</p>
                        <p className="text-muted-foreground text-sm mt-1">Security service reports will appear here once created</p>
                      </td>
                    </tr>
                  ) : pageData.map((r, i) => {
                    const sc = dispatchStatusConfig[r.status] || dispatchStatusConfig["Pending"];
                    const hasIrregularity = r.irregularity_id && linkedIrregularities.has(r.irregularity_id);
                    const isPending = (r as any).isPending === true;
                    const fd = r.flight_schedule_id ? flightDetailsById.get(r.flight_schedule_id) : undefined;
                    const meta = (r as any).flightMeta;
                    const d = resolveSecurityRowDisplay(r as any, fd, meta);
                    const { flightNo, registration: reg, route, aircraftType: acType, skdType, arrivalDate: arrDate, departureDate: depDate, sta, std } = d;
                    const opsDeleteEntries = parseOpsDeleteRequests(meta?.remarks);
                    const opsDeleteRow = (() => {
                      if (opsDeleteEntries.length === 0) return null;
                      const latest = opsDeleteEntries[opsDeleteEntries.length - 1];
                      const isExpanded = expandedDeleteIds.has(r.id);
                      const reasonNode = latest.reason
                        ? <span className="text-foreground">{latest.reason}</span>
                        : <span className="italic text-muted-foreground">Reason not provided</span>;
                      return (
                        <tr
                          className="bg-warning/5 border-l-2 border-l-warning"
                          data-testid={`ops-delete-row-${r.flight_schedule_id || r.id}`}
                          data-flight-id={r.flight_schedule_id || r.id}
                        >
                          <td colSpan={isReceivablesView ? 18 : 16} className="px-4 py-2">
                            <div className="flex items-start gap-2 text-xs">
                              <Trash2 size={14} className="text-warning shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => setExpandedDeleteIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
                                    return next;
                                  })}
                                  className="inline-flex items-center gap-1 text-left hover:underline"
                                  aria-expanded={isExpanded}
                                  aria-controls={`ops-delete-panel-${r.id}`}
                                  title={isExpanded ? "Hide full reason and notes" : "Show full reason and notes"}
                                >
                                  {isExpanded ? <ChevronUp size={12} className="text-warning" /> : <ChevronDown size={12} className="text-warning" />}
                                  <span className="font-bold uppercase tracking-wider text-warning">Operations Delete Request:</span>
                                </button>{" "}
                                {reasonNode}
                                {latest.header && <span className="ml-2 text-muted-foreground">— {latest.header}</span>}
                                {isExpanded && (
                                  <div
                                    id={`ops-delete-panel-${r.id}`}
                                    className="mt-2 rounded border border-warning/30 bg-background p-3 space-y-2"
                                  >
                                    <div>
                                      <div className="font-semibold text-warning mb-1">All deletion / clearance requests</div>
                                      <ul className="space-y-1">
                                        {opsDeleteEntries.map((e, i) => (
                                          <li key={i} className="flex gap-2">
                                            <span className="text-muted-foreground shrink-0">{e.header || "—"}</span>
                                            <span className="flex-1">
                                              {e.reason || <span className="italic text-muted-foreground">Reason not provided</span>}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    {meta?.remarks && (
                                      <div>
                                        <div className="font-semibold text-warning mb-1">Full notes</div>
                                        <pre className="whitespace-pre-wrap break-words text-foreground font-sans">{meta.remarks}</pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {isStationView && r.flight_schedule_id && (
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Delete flight ${r.flight_no} as requested by Operations?`)) return;
                                    try {
                                      await supabase.from("flight_schedules").delete().eq("id", r.flight_schedule_id!);
                                      queryClient.invalidateQueries({ queryKey: ["flight_schedules"] });
                                      queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
                                      toast({ title: "Deleted", description: "Flight removed per Operations request." });
                                    } catch (e: any) {
                                      toast({ title: "Error", description: e.message, variant: "destructive" });
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                >
                                  <Trash2 size={12} /> Delete Flight
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })();
                    return (
                      <React.Fragment key={r.id}>
                      {opsDeleteRow}
                      <tr
                        data-testid={`flight-row-${r.flight_schedule_id || r.id}`}
                        data-flight-id={r.flight_schedule_id || r.id}
                        className={`data-table-row ${isPending ? "bg-muted/30" : ""} ${r.review_status === "Rejected" ? "border-l-2 border-l-destructive" : ""} ${opsDeleteRow ? "border-l-2 border-l-warning" : ""}`}
                      >


                        {isReceivablesView && (
                          <td className="px-2 py-2.5">
                            <input
                              type="checkbox"
                              aria-label={`Select ${flightNo || r.flight_no}`}
                              checked={selectedIds.has(r.id)}
                              onChange={() => toggleSelect(r.id)}
                              disabled={isPending}
                            />
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-foreground">{r.station}</td>
                        <td className="px-3 py-2.5 text-foreground">{r.airline || "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-foreground">{flightNo || "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{reg || "—"}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{r.service_type}</span>
                            {r.flight_schedule_id && !isPending && (
                              <Badge variant="secondary" className="gap-1 text-[10px] py-0 px-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" title="This flight is billed as Security — excluded from the Handling tab">
                                <Shield className="h-2.5 w-2.5" /> Security
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-foreground text-xs">
                          {skdType || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-foreground text-xs whitespace-nowrap">{arrDate || "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{sta || "—"}</td>
                        <td className="px-3 py-2.5 text-foreground text-xs whitespace-nowrap">{depDate || "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{std || "—"}</td>
                        <td className="px-3 py-2.5 text-foreground text-xs">{route || "—"}</td>
                        <td className="px-3 py-2.5 text-foreground text-xs">{acType || "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                          {r.actual_start && r.actual_end ? `${r.actual_start}–${r.actual_end}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-foreground">{r.actual_start && r.actual_end ? `${timeDiffHours(r.actual_start, r.actual_end)}h` : (r.actual_duration_hours ? `${r.actual_duration_hours}h` : "—")}</td>
                        <td className="px-3 py-2.5">
                          {(() => {
                            // Any fractional OT hour is rounded UP to a full hour.
                            const baselineMins = Math.round(((r.contract_duration_hours && r.contract_duration_hours > 0) ? r.contract_duration_hours : 3) * 60);
                            const overtimeDisplay = r.actual_start && r.actual_end
                              ? Math.ceil(Math.max(0, timeDiffMinutes(r.actual_start, r.actual_end) - baselineMins) / 60)
                              : (r.overtime_hours || 0);
                            return overtimeDisplay > 0 ? <span className="text-warning font-semibold">{overtimeDisplay}h</span> : "—";
                          })()}
                        </td>
                        {isReceivablesView && (() => {
                          const live = computeRowCharges(r);
                          const saved = (r as any).total_security_charges || r.total_charge || 0;
                          const amount = live.amount > 0 ? live.amount : saved;
                          const currency = live.currency || (r as any).charges_currency || "USD";
                          return (
                            <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">
                              {amount > 0 ? `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-muted-foreground font-normal">—</span>}
                            </td>
                          );
                        })()}
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc}`}>{r.status}</span>
                          {hasIrregularity && (
                            <span title="Has irregularity"><AlertTriangle size={12} className="inline ml-1 text-destructive" /></span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {(() => {
                            // Receivables (step 4) is marked complete as soon as
                            // Security Charges have been saved & the report is
                            // Ready for Billing — even before the invoice is paid.
                            const chargesPersisted =
                              ((r as any).total_security_charges || 0) > 0 &&
                              ((r.review_status || "").toLowerCase().includes("billing"));
                            const baseInvStatus = invoiceStatusByFlight.get(normalizeFlightKey(String(flightNo || r.flight_no || ""))) || "none";
                            const invStatus: "none" | "issued" | "paid" =
                              baseInvStatus === "paid" || chargesSavedIds.has(r.id) || chargesPersisted
                                ? "paid"
                                : baseInvStatus;
                            return (
                              <PipelineStepper
                                currentStage={derivePipelineStage({
                                  isLinked: r.status === "Completed",
                                  reviewStatus: r.review_status,
                                  clearanceStatus: r.flight_schedule_id ? flightStatusById.get(r.flight_schedule_id) : undefined,
                                  dispatchStatus: r.status,
                                  channel: activeChannel,
                                  invoiceStatus: invStatus,
                                })}
                                completedStages={derivePipelineCompletedStages({
                                  isLinked: r.status === "Completed",
                                  reviewStatus: r.review_status,
                                  clearanceStatus: r.flight_schedule_id ? flightStatusById.get(r.flight_schedule_id) : undefined,
                                  dispatchStatus: r.status,
                                  invoiceStatus: invStatus,
                                })}
                                compact
                              />
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            {isPending ? (
                              <>
                                {canCreateNew && (
                                  <button
                                    onClick={() => { setIsNewReport(true); setEditRow({ ...r, id: "new" } as DispatchRow); }}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                    title="Complete Service Report"
                                  >
                                    <Pencil size={12} /> Complete
                                  </button>
                                )}
                                {isOperationsView && r.flight_schedule_id && (
                                  <button
                                    onClick={async () => {
                                      const comment = prompt(`Send DELETION request to the Clearance portal for flight ${r.flight_no || ""} — reason:`);
                                      if (!comment || !comment.trim()) return;
                                      const stamp = `[OPS DELETE REQUEST ${new Date().toISOString().slice(0,16).replace("T"," ")}] ${comment.trim()}`;
                                      try {
                                        const { data: cur } = await supabase.from("flight_schedules").select("remarks").eq("id", r.flight_schedule_id!).maybeSingle();
                                        const existing = (cur as any)?.remarks || "";
                                        const newRemarks = existing ? `${existing}\n${stamp}` : stamp;
                                        const { error } = await supabase.from("flight_schedules").update({ remarks: newRemarks, status: "Rejected" } as any).eq("id", r.flight_schedule_id!);
                                        if (error) throw error;
                                        queryClient.invalidateQueries({ queryKey: ["flight_schedules"] });
                                        toast({ title: "🗑️ Deletion request sent to Clearance", description: `Flight ${r.flight_no || ""} now appears in the Clearance portal › Rejected tab with your reason.` });
                                      } catch (e: any) {
                                        toast({ title: "Error", description: e.message, variant: "destructive" });
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                                    title="Notify the Clearance portal to delete this flight (appears in Clearance › Rejected with your reason)"
                                  >
                                    <Trash2 size={12} /> Request Deletion (Clearance)
                                  </button>
                                )}
                              </>

                            ) : (
                              <>
                                <button onClick={() => tryOpenEdit(r)} className="p-1 rounded hover:bg-muted" title="Edit Report">
                                  <Pencil size={14} className="text-muted-foreground" />
                                </button>
                                {r.review_status === "Draft" && r.status === "Completed" && (
                                  <button onClick={() => submitForReview(r)} className="p-1 rounded hover:bg-muted" title="Submit for Review">
                                    <ExternalLink size={14} className="text-primary" />
                                  </button>
                                )}
                                {(r.review_status === "Pending Review" || r.review_status === "Modified") && (
                                  <button onClick={() => { setReviewRow(r); setReviewComment(r.review_comment); }} className="p-1 rounded hover:bg-muted" title={r.review_status === "Modified" ? "Review Modified Report" : "Review"}>
                                    <MessageSquare size={14} className={r.review_status === "Modified" ? "text-info" : "text-warning"} />
                                  </button>
                                )}
                              </>
                            )}
                            {isStationView && r.flight_schedule_id && (
                              <button
                                onClick={async () => {
                                  const comment = prompt(`Return flight ${r.flight_no} to Clearance — reason:`);
                                  if (!comment) return;
                                  const stamp = `[Station Return ${new Date().toISOString().slice(0,16).replace("T"," ")}] ${comment}`;
                                  try {
                                    const { data: cur } = await supabase.from("flight_schedules").select("remarks").eq("id", r.flight_schedule_id!).maybeSingle();
                                    const existing = (cur as any)?.remarks || "";
                                    const newRemarks = existing ? `${existing}\n${stamp}` : stamp;
                                    const { error } = await supabase.from("flight_schedules").update({ status: "Rejected", remarks: newRemarks } as any).eq("id", r.flight_schedule_id!);
                                    if (error) throw error;
                                    queryClient.invalidateQueries({ queryKey: ["flight_schedules"] });
                                    queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
                                    toast({ title: "↩️ Returned to Clearance", description: comment });
                                  } catch (e: any) {
                                    toast({ title: "Error", description: e.message, variant: "destructive" });
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                                title="Return flight to Clearance with a comment"
                              >
                                <RefreshCw size={12} /> Return to Clearance
                              </button>
                            )}
                            {isAdmin && r.flight_schedule_id && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`Delete flight ${r.flight_no}? This removes the security report AND the underlying flight schedule.`)) return;
                                  try {
                                    if (r.id && !isPending) await supabase.from("dispatch_assignments").delete().eq("id", r.id);
                                    await supabase.from("flight_schedules").delete().eq("id", r.flight_schedule_id!);
                                    queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
                                    queryClient.invalidateQueries({ queryKey: ["flight_schedules"] });
                                    toast({ title: "Deleted", description: "Flight and security report removed." });
                                  } catch (e: any) {
                                    toast({ title: "Error", description: e.message, variant: "destructive" });
                                  }
                                }}
                                className="p-1 rounded hover:bg-destructive/10"
                                title="Delete Flight (Admin) — removes flight + report"
                              >
                                <X size={14} className="text-destructive" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isStationView && r.review_status === "Rejected" && (
                        <tr className="bg-destructive/5 border-l-2 border-l-destructive">
                          <td colSpan={isReceivablesView ? 18 : 16} className="px-4 py-2">
                            <div className="flex items-start gap-2 text-xs">
                              <XCircle size={14} className="text-destructive shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="font-bold uppercase tracking-wider text-destructive">Rejection Reason: </span>
                                <span className="text-foreground">
                                  {r.review_comment?.trim() ? r.review_comment : <span className="italic text-muted-foreground">No reason provided</span>}
                                </span>
                                {r.reviewed_by && (
                                  <span className="ml-2 text-muted-foreground">
                                    — by <span className="font-semibold text-foreground">{r.reviewed_by}</span>
                                    {(r as any).reviewed_at && ` • ${new Date((r as any).reviewed_at).toLocaleString()}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
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
        arrivalDate={editRow?.flight_schedule_id ? flightDetailsById.get(editRow.flight_schedule_id)?.arrival_date : undefined}
        departureDate={editRow?.flight_schedule_id ? flightDetailsById.get(editRow.flight_schedule_id)?.departure_date : undefined}
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
                  <CheckCircle2 size={14} className="mr-1" />
                  {reviewRow.review_status === "Modified" ? "Approve & Mark Ready for Billing" : "Approve"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      </>
      )}


      {/* Edit Pending Flight Dialog */}
      <Dialog open={!!editPendingFlight} onOpenChange={(o) => !o && setEditPendingFlight(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye size={16} /> View Pending Flight</DialogTitle>
          </DialogHeader>
          {editPendingFlight && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "flight_no", label: "Flight No" },
                { k: "registration", label: "Registration" },
                { k: "route", label: "Route" },
                { k: "clearance_type", label: "Service Type" },
                { k: "arrival_date", label: "Arrival Date", type: "date" },
                { k: "departure_date", label: "Departure Date", type: "date" },
                { k: "sta", label: "STA (HH:MM)" },
                { k: "std", label: "STD (HH:MM)" },
              ].map(f => (
                <div key={f.k} className={f.k === "remarks" ? "col-span-2" : ""}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">{f.label}</label>
                  <input
                    type={f.type || "text"}
                    value={editPendingForm[f.k] || ""}
                    readOnly
                    className="w-full text-sm border rounded px-2 py-1.5 bg-muted text-foreground focus:outline-none cursor-default"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Remarks</label>
                <textarea
                  value={editPendingForm.remarks || ""}
                  readOnly
                  className="w-full text-sm border rounded px-2 py-1.5 bg-muted text-foreground focus:outline-none resize-none min-h-[60px] cursor-default"
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <Button size="sm" onClick={() => setEditPendingFlight(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
