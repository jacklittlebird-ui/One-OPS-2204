import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plane, DollarSign, Activity, Calendar, MapPin, Clock, ShieldCheck, Building2,
  FileText, Eye, Receipt, CreditCard, Shield, Users, AlertTriangle, CheckCircle2,
  XCircle, TrendingUp, BarChart3, FileBarChart2, Calculator, ArrowRight, Zap,
  PlaneTakeoff, PlaneLanding, Bell, FileCheck2, Wallet, Truck, Briefcase, Globe2,
} from "lucide-react";
import OperationsDashboard from "./OperationsDashboard";
import AccountantDashboard from "./AccountantDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useChannel, CHANNEL_LABELS, type Channel } from "@/contexts/ChannelContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  StatTile, TrendCard, ProgressRow, Section, ActivityItem, last7DaysCounts, relTime,
} from "@/components/dashboard/DashboardPrimitives";

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
  clearance: <ShieldCheck size={20} />,
  station: <Building2 size={20} />,
  contracts: <FileText size={20} />,
  operations: <Eye size={20} />,
  receivables: <Receipt size={20} />,
  payables: <CreditCard size={20} />,
  general_accounts: <Calculator size={20} />,
  admin: <Shield size={20} />,
};

/* ============================================================
   QUICK ACTION BUTTON
   ============================================================ */
function QuickAction({ label, icon: Icon, to, badge, tone = "primary" }: {
  label: string; icon: any; to: string; badge?: number; tone?: "primary" | "success" | "warning" | "info" | "destructive" | "indigo";
}) {
  const navigate = useNavigate();
  const tones: Record<string, string> = {
    primary: "hover:border-primary/50 hover:bg-primary/5 [&_svg]:text-primary",
    success: "hover:border-success/50 hover:bg-success/5 [&_svg]:text-success",
    warning: "hover:border-warning/50 hover:bg-warning/5 [&_svg]:text-warning",
    info: "hover:border-info/50 hover:bg-info/5 [&_svg]:text-info",
    destructive: "hover:border-destructive/50 hover:bg-destructive/5 [&_svg]:text-destructive",
    indigo: "hover:border-indigo/50 hover:bg-indigo/5 [&_svg]:text-indigo",
  };
  return (
    <button
      onClick={() => navigate(to)}
      className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-lg border bg-card text-left transition-all ${tones[tone]}`}
    >
      <Icon size={18} />
      <span className="text-sm font-semibold flex-1 text-foreground">{label}</span>
      {badge != null && badge > 0 && (
        <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{badge}</span>
      )}
      <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

/* ============================================================
   CLEARANCE DASHBOARD
   ============================================================ */
function ClearanceDashboard() {
  const { data: schedules = [] } = useQuery({
    queryKey: ["dash_flight_schedules"],
    queryFn: async () => {
      const { data } = await supabase.from("flight_schedules")
        .select("id,flight_no,operator,route,status,valid_to,passengers,requested_date,created_at,authority")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const pending = schedules.filter((c: any) => c.status === "Pending").length;
  const approved = schedules.filter((c: any) => c.status === "Approved").length;
  const rejected = schedules.filter((c: any) => c.status === "Rejected").length;
  const today = new Date().toISOString().slice(0, 10);
  const todayFlights = schedules.filter((c: any) => c.requested_date === today).length;
  const expiring = schedules.filter((c: any) => c.status === "Approved" && c.valid_to && (new Date(c.valid_to).getTime() - Date.now()) / 86400000 <= 7 && (new Date(c.valid_to).getTime() - Date.now()) > 0).length;
  const totalPax = schedules.filter((c: any) => c.status === "Approved").reduce((s: number, c: any) => s + (c.passengers || 0), 0);
  const trend = last7DaysCounts(schedules as any[], "created_at");
  const total = schedules.length || 1;

  const byAuthority = Object.entries(
    schedules.reduce((acc: Record<string, number>, c: any) => {
      const k = c.authority || "—";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile label="Pending" value={pending} icon={Clock} tone="warning" hint="Awaiting approval" />
        <StatTile label="Approved" value={approved} icon={CheckCircle2} tone="success" />
        <StatTile label="Today's Flights" value={todayFlights} icon={Plane} tone="primary" />
        <StatTile label="Expiring < 7d" value={expiring} icon={AlertTriangle} tone="destructive" hint="Renew soon" />
        <StatTile label="Approved PAX" value={totalPax.toLocaleString()} icon={Users} tone="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendCard title="New schedules · 7d" value={trend.reduce((a, b) => a + b, 0)} data={trend} color="hsl(var(--primary))" footer="Daily clearance volume" />
        <Section title="Status breakdown">
          <div className="space-y-2.5">
            <ProgressRow label="Approved" value={approved} max={total} tone="success" />
            <ProgressRow label="Pending" value={pending} max={total} tone="warning" />
            <ProgressRow label="Rejected" value={rejected} max={total} tone="destructive" />
          </div>
        </Section>
        <Section title="Top issuing authorities">
          {byAuthority.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {byAuthority.map(([k, v]) => <ProgressRow key={k} label={k} value={v as number} max={schedules.length} tone="primary" />)}
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Section title="Recent flight schedules">
            {schedules.slice(0, 6).map((s: any) => (
              <ActivityItem
                key={s.id}
                icon={s.status === "Approved" ? CheckCircle2 : s.status === "Rejected" ? XCircle : Clock}
                tone={s.status === "Approved" ? "success" : s.status === "Rejected" ? "destructive" : "warning"}
                title={<span><span className="font-semibold">{s.flight_no || "—"}</span> · {s.operator || "—"} · {s.route || "—"}</span>}
                meta={<>{s.status} · {s.authority || "—"} · {relTime(s.created_at)}</>}
              />
            ))}
            {schedules.length === 0 && <p className="text-xs text-muted-foreground">No schedules yet.</p>}
          </Section>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Quick actions</p>
          <QuickAction label="Flight Schedules" icon={ShieldCheck} to="/clearances" tone="primary" badge={pending} />
          <QuickAction label="All Clearance Flights" icon={Plane} to="/all-clearance-flights" tone="info" />
          <QuickAction label="Overfly Schedule" icon={TrendingUp} to="/overfly-schedule" tone="success" />
          <QuickAction label="Notifications" icon={Bell} to="/notifications" tone="warning" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STATION DASHBOARD
   ============================================================ */
function StationDashboard() {
  const { data: reports = [] } = useQuery({
    queryKey: ["dash_reports"],
    queryFn: async () => {
      const { data } = await supabase.from("service_reports")
        .select("id,flight_no,operator,station,review_status,total_cost,arrival_date,created_at,handling_type,total_departing_pax")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
  const { data: schedules = [] } = useQuery({
    queryKey: ["dash_schedule_today"],
    queryFn: async () => {
      const { data } = await supabase.from("flight_schedules").select("id,status").eq("status", "Approved");
      return data || [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayReports = reports.filter((r: any) => r.arrival_date === today).length;
  const pendingReview = reports.filter((r: any) => r.review_status === "pending").length;
  const approved = reports.filter((r: any) => r.review_status === "approved").length;
  const rejected = reports.filter((r: any) => r.review_status === "rejected").length;
  const trend = last7DaysCounts(reports as any[], "created_at");
  const totalPax7d = reports
    .filter((r: any) => r.created_at && (Date.now() - new Date(r.created_at).getTime()) / 86400000 < 7)
    .reduce((s: number, r: any) => s + (r.total_departing_pax || 0), 0);
  const total = reports.length || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile label="Scheduled Flights" value={schedules.length} icon={Plane} tone="primary" />
        <StatTile label="Today's Reports" value={todayReports} icon={FileBarChart2} tone="info" />
        <StatTile label="Pending Review" value={pendingReview} icon={Clock} tone="warning" />
        <StatTile label="Approved" value={approved} icon={CheckCircle2} tone="success" />
        <StatTile label="Rejected" value={rejected} icon={XCircle} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendCard title="Reports submitted · 7d" value={trend.reduce((a, b) => a + b, 0)} data={trend} color="hsl(var(--info))" footer={`${totalPax7d.toLocaleString()} PAX handled in last 7 days`} />
        <Section title="Review status">
          <div className="space-y-2.5">
            <ProgressRow label="Approved" value={approved} max={total} tone="success" />
            <ProgressRow label="Pending" value={pendingReview} max={total} tone="warning" />
            <ProgressRow label="Rejected" value={rejected} max={total} tone="destructive" />
          </div>
        </Section>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Quick actions</p>
          <QuickAction label="New Service Report" icon={FileBarChart2} to="/service-report" tone="primary" />
          <QuickAction label="Security Reports" icon={Shield} to="/security-service-reports" tone="info" />
          <QuickAction label="Irregularity" icon={AlertTriangle} to="/irregularity-reports" tone="warning" />
          <QuickAction label="Lost & Found" icon={Briefcase} to="/lost-found" tone="indigo" />
        </div>
      </div>

      <Section title="Recent service reports">
        {reports.slice(0, 6).map((r: any) => (
          <ActivityItem
            key={r.id}
            icon={r.review_status === "approved" ? CheckCircle2 : r.review_status === "rejected" ? XCircle : Clock}
            tone={r.review_status === "approved" ? "success" : r.review_status === "rejected" ? "destructive" : "warning"}
            title={<span><span className="font-semibold">{r.flight_no || "—"}</span> · {r.operator || "—"} · {r.station || "—"}</span>}
            meta={<>{r.handling_type || "—"} · {r.review_status} · {relTime(r.created_at)}</>}
          />
        ))}
        {reports.length === 0 && <p className="text-xs text-muted-foreground">No reports yet.</p>}
      </Section>
    </div>
  );
}

/* ============================================================
   CONTRACTS DASHBOARD
   ============================================================ */
function ContractsDashboard() {
  const { data: contracts = [] } = useQuery({
    queryKey: ["dash_contracts"],
    queryFn: async () => {
      const { data } = await supabase.from("contracts")
        .select("id,airline,contract_no,status,end_date,annual_value,currency,created_at,service_category")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
  const { data: services = [] } = useQuery({
    queryKey: ["dash_aas"],
    queryFn: async () => { const { data } = await supabase.from("airline_airport_services").select("id"); return data || []; },
  });

  const active = contracts.filter((c: any) => c.status === "Active").length;
  const pending = contracts.filter((c: any) => c.status === "Pending").length;
  const expired = contracts.filter((c: any) => c.status === "Expired").length;
  const expiring90 = contracts.filter((c: any) => c.status === "Active" && c.end_date && (new Date(c.end_date).getTime() - Date.now()) / 86400000 <= 90 && (new Date(c.end_date).getTime() - Date.now()) > 0).length;
  const totalValue = contracts.filter((c: any) => c.status === "Active").reduce((s: number, c: any) => s + (c.annual_value || 0), 0);
  const trend = last7DaysCounts(contracts as any[], "created_at");
  const total = contracts.length || 1;

  const byCategory = Object.entries(
    contracts.reduce((acc: Record<string, number>, c: any) => {
      const k = c.service_category || "Handling";
      acc[k] = (acc[k] || 0) + 1; return acc;
    }, {})
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Active Contracts" value={active} icon={FileCheck2} tone="primary" />
        <StatTile label="Expiring < 90d" value={expiring90} icon={AlertTriangle} tone="warning" />
        <StatTile label="Annual Value" value={`$${(totalValue / 1000).toFixed(1)}k`} icon={DollarSign} tone="success" hint="Active contracts only" />
        <StatTile label="Service Prices" value={services.length} icon={BarChart3} tone="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendCard title="Contracts created · 7d" value={trend.reduce((a, b) => a + b, 0)} data={trend} color="hsl(var(--success))" />
        <Section title="Status breakdown">
          <div className="space-y-2.5">
            <ProgressRow label="Active" value={active} max={total} tone="success" />
            <ProgressRow label="Pending" value={pending} max={total} tone="warning" />
            <ProgressRow label="Expired" value={expired} max={total} tone="destructive" />
          </div>
        </Section>
        <Section title="By service category">
          {byCategory.length === 0 ? <p className="text-xs text-muted-foreground">No contracts yet.</p> : (
            <div className="space-y-2.5">
              {byCategory.map(([k, v]) => <ProgressRow key={k} label={k} value={v as number} max={contracts.length} tone={k === "Security" ? "indigo" : "primary"} />)}
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Section title="Recent contracts">
            {contracts.slice(0, 6).map((c: any) => (
              <ActivityItem
                key={c.id}
                icon={FileText}
                tone={c.status === "Active" ? "success" : c.status === "Expired" ? "destructive" : "warning"}
                title={<span><span className="font-semibold">{c.contract_no || "—"}</span> · {c.airline}</span>}
                meta={<>{c.status} · {c.currency} {(c.annual_value || 0).toLocaleString()} · ends {c.end_date || "—"}</>}
              />
            ))}
            {contracts.length === 0 && <p className="text-xs text-muted-foreground">No contracts yet.</p>}
          </Section>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Quick actions</p>
          <QuickAction label="Manage Contracts" icon={FileText} to="/contracts" tone="primary" badge={expiring90} />
          <QuickAction label="Chart of Services" icon={BarChart3} to="/services" tone="info" />
          <QuickAction label="Airline Incentives" icon={TrendingUp} to="/airline-incentives" tone="success" />
          <QuickAction label="Service Providers" icon={Building2} to="/service-providers" tone="indigo" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   OPERATIONS CHANNEL DASHBOARD
   ============================================================ */
function OperationsChannelDashboard() {
  const { data: reports = [] } = useQuery({
    queryKey: ["dash_ops_reports"],
    queryFn: async () => {
      const { data } = await supabase.from("service_reports")
        .select("id,flight_no,operator,station,review_status,arrival_date,total_cost,created_at,reviewed_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
  const { data: irregs = [] } = useQuery({
    queryKey: ["dash_ops_irregs"],
    queryFn: async () => { const { data } = await supabase.from("irregularity_reports").select("id,status,severity,created_at"); return data || []; },
  });

  const today = new Date().toISOString().slice(0, 10);
  const pendingReview = reports.filter((r: any) => r.review_status === "pending").length;
  const approvedToday = reports.filter((r: any) => r.review_status === "approved" && r.arrival_date === today).length;
  const rejected = reports.filter((r: any) => r.review_status === "rejected").length;
  const openIrreg = irregs.filter((i: any) => i.status === "Open").length;
  const trend = last7DaysCounts(reports as any[], "created_at");
  const total = reports.length || 1;

  const byStation = Object.entries(
    reports.reduce((acc: Record<string, number>, r: any) => {
      const k = r.station || "—"; acc[k] = (acc[k] || 0) + 1; return acc;
    }, {})
  ).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile label="Pending Review" value={pendingReview} icon={Clock} tone="warning" hint="Action required" />
        <StatTile label="Approved Today" value={approvedToday} icon={CheckCircle2} tone="success" />
        <StatTile label="Rejected" value={rejected} icon={XCircle} tone="destructive" />
        <StatTile label="Open Irregularities" value={openIrreg} icon={AlertTriangle} tone="destructive" />
        <StatTile label="Total Reports" value={reports.length} icon={FileBarChart2} tone="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendCard title="Reports activity · 7d" value={trend.reduce((a, b) => a + b, 0)} data={trend} color="hsl(var(--primary))" />
        <Section title="Review pipeline">
          <div className="space-y-2.5">
            <ProgressRow label="Approved" value={reports.filter((r: any) => r.review_status === "approved").length} max={total} tone="success" />
            <ProgressRow label="Pending" value={pendingReview} max={total} tone="warning" />
            <ProgressRow label="Rejected" value={rejected} max={total} tone="destructive" />
          </div>
        </Section>
        <Section title="Top stations">
          {byStation.length === 0 ? <p className="text-xs text-muted-foreground">No data yet.</p> : (
            <div className="space-y-2.5">
              {byStation.map(([k, v]) => <ProgressRow key={k} label={k} value={v as number} max={reports.length} tone="info" />)}
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Section title="Awaiting review">
            {reports.filter((r: any) => r.review_status === "pending").slice(0, 6).map((r: any) => (
              <ActivityItem
                key={r.id}
                icon={Eye}
                tone="warning"
                title={<span><span className="font-semibold">{r.flight_no || "—"}</span> · {r.operator || "—"} · {r.station || "—"}</span>}
                meta={<>Submitted {relTime(r.created_at)} · {r.total_cost ? `$${r.total_cost.toLocaleString()}` : ""}</>}
              />
            ))}
            {pendingReview === 0 && <p className="text-xs text-muted-foreground">All caught up. ✨</p>}
          </Section>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Quick actions</p>
          <QuickAction label="Review Queue" icon={Eye} to="/service-report" tone="primary" badge={pendingReview} />
          <QuickAction label="Station Dispatch" icon={Truck} to="/station-dispatch" tone="info" />
          <QuickAction label="Irregularities" icon={AlertTriangle} to="/irregularity-reports" tone="destructive" badge={openIrreg} />
          <QuickAction label="Bulletins" icon={Bell} to="/bulletins" tone="warning" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RECEIVABLES DASHBOARD
   ============================================================ */
function ReceivablesDashboard() {
  const { data: invoices = [] } = useQuery({
    queryKey: ["dash_invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices")
        .select("id,invoice_no,operator,status,total,currency,created_at,due_date,date")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["dash_approved_reports"],
    queryFn: async () => { const { data } = await supabase.from("service_reports").select("id,review_status"); return data || []; },
  });

  const totalRevenue = invoices.reduce((s: number, i: any) => s + (i.total || 0), 0);
  const paid = invoices.filter((i: any) => i.status === "Paid").reduce((s: number, i: any) => s + i.total, 0);
  const overdue = invoices.filter((i: any) => i.status === "Overdue").reduce((s: number, i: any) => s + i.total, 0);
  const draft = invoices.filter((i: any) => i.status === "Draft").length;
  const sent = invoices.filter((i: any) => i.status === "Sent").length;
  const rate = totalRevenue > 0 ? Math.round((paid / totalRevenue) * 100) : 0;
  const approvedReports = reports.filter((r: any) => r.review_status === "approved").length;
  const trend = last7DaysCounts(invoices as any[], "created_at");
  const total = invoices.length || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatTile label="Revenue" value={`$${(totalRevenue / 1000).toFixed(1)}k`} icon={DollarSign} tone="primary" />
        <StatTile label="Collected" value={`$${(paid / 1000).toFixed(1)}k`} icon={CheckCircle2} tone="success" />
        <StatTile label="Overdue" value={`$${(overdue / 1000).toFixed(1)}k`} icon={AlertTriangle} tone="destructive" />
        <StatTile label="Drafts" value={draft} icon={FileText} tone="warning" />
        <StatTile label="Collection" value={`${rate}%`} icon={TrendingUp} tone="info" />
        <StatTile label="Ready to Bill" value={approvedReports} icon={FileBarChart2} tone="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendCard title="Invoices issued · 7d" value={trend.reduce((a, b) => a + b, 0)} data={trend} color="hsl(var(--success))" footer={`${rate}% collection rate`} />
        <Section title="Invoice status">
          <div className="space-y-2.5">
            <ProgressRow label="Paid" value={invoices.filter((i: any) => i.status === "Paid").length} max={total} tone="success" />
            <ProgressRow label="Sent" value={sent} max={total} tone="info" />
            <ProgressRow label="Draft" value={draft} max={total} tone="warning" />
            <ProgressRow label="Overdue" value={invoices.filter((i: any) => i.status === "Overdue").length} max={total} tone="destructive" />
          </div>
        </Section>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Quick actions</p>
          <QuickAction label="Client Invoices" icon={Receipt} to="/invoices" tone="primary" badge={draft} />
          <QuickAction label="Approved Reports" icon={FileCheck2} to="/service-report" tone="success" />
          <QuickAction label="Aging Reports" icon={AlertTriangle} to="/aging-reports" tone="warning" />
        </div>
      </div>

      <Section title="Recent invoices">
        {invoices.slice(0, 6).map((i: any) => (
          <ActivityItem
            key={i.id}
            icon={Receipt}
            tone={i.status === "Paid" ? "success" : i.status === "Overdue" ? "destructive" : i.status === "Sent" ? "info" : "warning"}
            title={<span><span className="font-semibold">{i.invoice_no || "—"}</span> · {i.operator}</span>}
            meta={<>{i.status} · {i.currency} {(i.total || 0).toLocaleString()} · due {i.due_date}</>}
          />
        ))}
        {invoices.length === 0 && <p className="text-xs text-muted-foreground">No invoices yet.</p>}
      </Section>
    </div>
  );
}

/* ============================================================
   PAYABLES DASHBOARD
   ============================================================ */
function PayablesDashboard() {
  const { data: vendorInvoices = [] } = useQuery({
    queryKey: ["dash_vendor_invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_invoices")
        .select("id,invoice_no,vendor_name,status,total,due_date,created_at,currency")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
  const { data: providers = [] } = useQuery({
    queryKey: ["dash_providers"],
    queryFn: async () => { const { data } = await supabase.from("service_providers").select("id,status"); return data || []; },
  });

  const totalPayable = vendorInvoices.reduce((s: number, v: any) => s + (v.total || 0), 0);
  const paid = vendorInvoices.filter((v: any) => v.status === "Paid").reduce((s: number, v: any) => s + v.total, 0);
  const unpaid = totalPayable - paid;
  const overdue = vendorInvoices.filter((v: any) => v.status !== "Paid" && v.due_date && new Date(v.due_date) < new Date()).length;
  const activeVendors = providers.filter((p: any) => p.status === "Active").length;
  const trend = last7DaysCounts(vendorInvoices as any[], "created_at");
  const total = vendorInvoices.length || 1;

  const topVendors = Object.entries(
    vendorInvoices.reduce((acc: Record<string, number>, v: any) => {
      const k = v.vendor_name || "—"; acc[k] = (acc[k] || 0) + (v.total || 0); return acc;
    }, {})
  ).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5);
  const maxVendor = Math.max(...topVendors.map(([, v]) => v as number), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile label="Total Payables" value={`$${(totalPayable / 1000).toFixed(1)}k`} icon={CreditCard} tone="primary" />
        <StatTile label="Paid" value={`$${(paid / 1000).toFixed(1)}k`} icon={CheckCircle2} tone="success" />
        <StatTile label="Unpaid" value={`$${(unpaid / 1000).toFixed(1)}k`} icon={Wallet} tone="warning" />
        <StatTile label="Overdue" value={overdue} icon={AlertTriangle} tone="destructive" />
        <StatTile label="Active Vendors" value={activeVendors} icon={Building2} tone="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendCard title="Vendor invoices · 7d" value={trend.reduce((a, b) => a + b, 0)} data={trend} color="hsl(var(--warning))" />
        <Section title="Payment status">
          <div className="space-y-2.5">
            <ProgressRow label="Paid" value={vendorInvoices.filter((v: any) => v.status === "Paid").length} max={total} tone="success" />
            <ProgressRow label="Pending" value={vendorInvoices.filter((v: any) => v.status === "Pending").length} max={total} tone="warning" />
            <ProgressRow label="Overdue" value={overdue} max={total} tone="destructive" />
          </div>
        </Section>
        <Section title="Top vendors by spend">
          {topVendors.length === 0 ? <p className="text-xs text-muted-foreground">No data yet.</p> : (
            <div className="space-y-2.5">
              {topVendors.map(([k, v]) => <ProgressRow key={k} label={k} value={v as number} max={maxVendor} tone="indigo" suffix="" />)}
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Section title="Recent vendor invoices">
            {vendorInvoices.slice(0, 6).map((v: any) => (
              <ActivityItem
                key={v.id}
                icon={CreditCard}
                tone={v.status === "Paid" ? "success" : v.status === "Overdue" ? "destructive" : "warning"}
                title={<span><span className="font-semibold">{v.invoice_no || "—"}</span> · {v.vendor_name}</span>}
                meta={<>{v.status} · {v.currency || "USD"} {(v.total || 0).toLocaleString()} · due {v.due_date || "—"}</>}
              />
            ))}
            {vendorInvoices.length === 0 && <p className="text-xs text-muted-foreground">No vendor invoices yet.</p>}
          </Section>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Quick actions</p>
          <QuickAction label="Vendor Invoices" icon={CreditCard} to="/vendor-invoices" tone="primary" badge={overdue} />
          <QuickAction label="Service Providers" icon={Building2} to="/service-providers" tone="info" />
          <QuickAction label="Vendor Equipment" icon={Truck} to="/vendor-equipment" tone="indigo" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ADMIN DASHBOARD (preserves Operations + Finance tabs)
   ============================================================ */
function AdminDashboard() {
  return (
    <Tabs defaultValue="operations" className="w-full">
      <TabsList className="bg-muted/50 p-1">
        <TabsTrigger value="operations" className="flex items-center gap-1.5 data-[state=active]:shadow-sm">
          <Plane size={14} /> Operations
        </TabsTrigger>
        <TabsTrigger value="accountant" className="flex items-center gap-1.5 data-[state=active]:shadow-sm">
          <DollarSign size={14} /> Finance
        </TabsTrigger>
      </TabsList>
      <TabsContent value="operations" className="mt-4"><OperationsDashboard /></TabsContent>
      <TabsContent value="accountant" className="mt-4"><AccountantDashboard /></TabsContent>
    </Tabs>
  );
}

function ChannelDashboardContent({ channel }: { channel: Channel }) {
  switch (channel) {
    case "clearance": return <ClearanceDashboard />;
    case "station": return <StationDashboard />;
    case "contracts": return <ContractsDashboard />;
    case "operations": return <OperationsChannelDashboard />;
    case "receivables": return <ReceivablesDashboard />;
    case "payables": return <PayablesDashboard />;
    case "general_accounts": return <AccountantDashboard />;
    case "admin":
    default:
      return <AdminDashboard />;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeChannel } = useChannel();
  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good Morning" : today.getHours() < 17 ? "Good Afternoon" : "Good Evening";

  const { data: profile } = useQuery({
    queryKey: ["dash_profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("full_name, station").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const displayName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/90 to-indigo p-4 md:p-6 text-primary-foreground">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 hidden md:block" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 hidden md:block" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold">{greeting}, {displayName} 👋</h1>
            <span className="ml-auto flex items-center gap-1.5 text-xs bg-white/15 px-3 py-1.5 rounded-full font-semibold">
              {CHANNEL_ICONS[activeChannel]}
              {CHANNEL_LABELS[activeChannel]}
            </span>
          </div>
          <p className="text-primary-foreground/70 text-xs md:text-sm mt-1 flex items-center gap-2">
            <Calendar size={14} />
            {today.toLocaleDateString("en-GB", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </p>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs bg-white/10 px-2.5 py-1 rounded-full">
              <MapPin size={12} /> {profile?.station || "CAI"}
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-white/10 px-2.5 py-1 rounded-full">
              <Clock size={12} /> {today.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-success/30 px-2.5 py-1 rounded-full">
              <Activity size={12} /> Online
            </div>
          </div>
        </div>
      </div>

      <ChannelDashboardContent channel={activeChannel} />
    </div>
  );
}
