import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plane, DollarSign, Activity, Calendar, MapPin, Clock, ShieldCheck, Building2, FileText, Eye, Receipt, CreditCard, Shield, Users, AlertTriangle, CheckCircle2, XCircle, TrendingUp, BarChart3, FileBarChart2 } from "lucide-react";
import OperationsDashboard from "./OperationsDashboard";
import AccountantDashboard from "./AccountantDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useChannel, CHANNEL_LABELS, type Channel } from "@/contexts/ChannelContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
  clearance: <ShieldCheck size={20} />,
  station: <Building2 size={20} />,
  contracts: <FileText size={20} />,
  operations: <Eye size={20} />,
  receivables: <Receipt size={20} />,
  payables: <CreditCard size={20} />,
  admin: <Shield size={20} />,
};

function ClearanceDashboard() {
  const navigate = useNavigate();
  const { data: clearances = [] } = useQuery({
    queryKey: ["dash_clearances"],
    queryFn: async () => { const { data } = await supabase.from("clearances").select("id,status,valid_to,passengers,requested_date"); return data || []; },
  });
  const { data: flights = [] } = useQuery({
    queryKey: ["dash_flights"],
    queryFn: async () => { const { data } = await supabase.from("flight_schedules").select("id,status"); return data || []; },
  });

  const pending = clearances.filter(c => c.status === "Pending").length;
  const approved = clearances.filter(c => c.status === "Approved").length;
  const today = new Date().toISOString().slice(0, 10);
  const todayFlights = clearances.filter(c => c.requested_date === today).length;
  const expiring = clearances.filter(c => c.status === "Approved" && c.valid_to && (new Date(c.valid_to).getTime() - Date.now()) / 86400000 <= 7 && (new Date(c.valid_to).getTime() - Date.now()) > 0).length;
  const totalPax = clearances.filter(c => c.status === "Approved").reduce((s, c) => s + (c.passengers || 0), 0);
  const scheduledFlights = flights.filter(f => f.status === "Scheduled").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Pending Clearances", value: pending, icon: <Clock size={18} />, color: "text-warning" },
          { label: "Approved", value: approved, icon: <CheckCircle2 size={18} />, color: "text-success" },
          { label: "Today's Flights", value: todayFlights, icon: <Plane size={18} />, color: "text-primary" },
          { label: "Expiring <7d", value: expiring, icon: <AlertTriangle size={18} />, color: "text-destructive" },
          { label: "Approved PAX", value: totalPax.toLocaleString(), icon: <Users size={18} />, color: "text-info" },
          { label: "Scheduled Flights", value: scheduledFlights, icon: <Calendar size={18} />, color: "text-accent-foreground" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 flex items-center gap-3">
            <div className={s.color}>{s.icon}</div>
            <div><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/clearances")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck size={16} className="text-primary" /> Manage Clearances</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Add, edit, and approve flight clearance permits. Upload Excel schedules.</CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/flight-schedule")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Plane size={16} className="text-info" /> Flight Schedule</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">View and manage planned flight arrivals and departures.</CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/overfly-schedule")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={16} className="text-success" /> Overfly Schedule</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Manage overfly permits and route charges.</CardContent>
        </Card>
      </div>
    </div>
  );
}

function StationDashboard() {
  const navigate = useNavigate();
  const { data: reports = [] } = useQuery({
    queryKey: ["dash_reports"],
    queryFn: async () => { const { data } = await supabase.from("service_reports").select("id,review_status,total_cost,pax_in_adult_i,pax_in_inf_i,pax_in_adult_d,pax_in_inf_d,arrival_date"); return data || []; },
  });
  const { data: schedules = [] } = useQuery({
    queryKey: ["dash_schedule_today"],
    queryFn: async () => { const { data } = await supabase.from("flight_schedules").select("id,status").eq("status", "Scheduled"); return data || []; },
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayReports = reports.filter(r => r.arrival_date === today).length;
  const pendingReview = reports.filter(r => r.review_status === "pending").length;
  const approved = reports.filter(r => r.review_status === "approved").length;
  const rejected = reports.filter(r => r.review_status === "rejected").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Scheduled Flights", value: schedules.length, icon: <Plane size={18} />, color: "text-primary" },
          { label: "Today's Reports", value: todayReports, icon: <FileBarChart2 size={18} />, color: "text-info" },
          { label: "Pending Review", value: pendingReview, icon: <Clock size={18} />, color: "text-warning" },
          { label: "Approved", value: approved, icon: <CheckCircle2 size={18} />, color: "text-success" },
          { label: "Rejected", value: rejected, icon: <XCircle size={18} />, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 flex items-center gap-3">
            <div className={s.color}>{s.icon}</div>
            <div><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/flight-schedule")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Plane size={16} className="text-primary" /> Schedule Panel</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">View assigned flights and scheduled arrival/departure times for your station.</CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/service-report")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileBarChart2 size={16} className="text-success" /> Reporting Panel</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Submit service reports for completed flights. Include handling type, PAX data, and costs.</CardContent>
        </Card>
      </div>
    </div>
  );
}

function ContractsDashboard() {
  const navigate = useNavigate();
  const { data: contracts = [] } = useQuery({
    queryKey: ["dash_contracts"],
    queryFn: async () => { const { data } = await supabase.from("contracts").select("id,status,end_date,annual_value,currency"); return data || []; },
  });
  const { data: services = [] } = useQuery({
    queryKey: ["dash_aas"],
    queryFn: async () => { const { data } = await supabase.from("airline_airport_services").select("id"); return data || []; },
  });

  const active = contracts.filter(c => c.status === "Active").length;
  const expiring90 = contracts.filter(c => c.status === "Active" && c.end_date && (new Date(c.end_date).getTime() - Date.now()) / 86400000 <= 90).length;
  const totalValue = contracts.filter(c => c.status === "Active").reduce((s, c) => s + (c.annual_value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active Contracts", value: active, icon: <FileText size={18} />, color: "text-primary" },
          { label: "Expiring <90d", value: expiring90, icon: <AlertTriangle size={18} />, color: "text-warning" },
          { label: "Annual Value", value: `$${totalValue.toLocaleString()}`, icon: <DollarSign size={18} />, color: "text-success" },
          { label: "Service Prices Set", value: services.length, icon: <BarChart3 size={18} />, color: "text-info" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 flex items-center gap-3">
            <div className={s.color}>{s.icon}</div>
            <div><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/contracts")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Manage Contracts</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Set up contract terms, billing frequencies, and SGHA references.</CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/services")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Chart of Services</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Manage service prices per airline/airport for invoicing.</CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/airline-incentives")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Airline Incentives</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Configure volume, revenue, and growth incentive programs.</CardContent>
        </Card>
      </div>
    </div>
  );
}

function OperationsChannelDashboard() {
  const navigate = useNavigate();
  const { data: reports = [] } = useQuery({
    queryKey: ["dash_ops_reports"],
    queryFn: async () => { const { data } = await supabase.from("service_reports").select("id,review_status,arrival_date,total_cost"); return data || []; },
  });

  const today = new Date().toISOString().slice(0, 10);
  const pendingReview = reports.filter(r => r.review_status === "pending").length;
  const approvedToday = reports.filter(r => r.review_status === "approved" && r.arrival_date === today).length;
  const rejected = reports.filter(r => r.review_status === "rejected").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Pending Review", value: pendingReview, icon: <Clock size={18} />, color: "text-warning" },
          { label: "Approved Today", value: approvedToday, icon: <CheckCircle2 size={18} />, color: "text-success" },
          { label: "Rejected / Returned", value: rejected, icon: <XCircle size={18} />, color: "text-destructive" },
          { label: "Total Reports", value: reports.length, icon: <FileBarChart2 size={18} />, color: "text-primary" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 flex items-center gap-3">
            <div className={s.color}>{s.icon}</div>
            <div><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/service-report")}>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye size={16} className="text-primary" /> Review Queue</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <p>Review station-submitted service reports. Approve or reject with comments.</p>
          {pendingReview > 0 && <p className="mt-2 text-warning font-semibold">{pendingReview} report(s) awaiting your review →</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function ReceivablesDashboard() {
  const navigate = useNavigate();
  const { data: invoices = [] } = useQuery({
    queryKey: ["dash_invoices"],
    queryFn: async () => { const { data } = await supabase.from("invoices").select("id,status,total,currency"); return data || []; },
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["dash_approved_reports"],
    queryFn: async () => { const { data } = await supabase.from("service_reports").select("id,review_status"); return data || []; },
  });

  const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const paid = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.total, 0);
  const overdue = invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.total, 0);
  const pending = invoices.filter(i => i.status === "Draft" || i.status === "Sent").length;
  const rate = totalRevenue > 0 ? Math.round((paid / totalRevenue) * 100) : 0;
  const approvedReports = reports.filter(r => r.review_status === "approved").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: <DollarSign size={18} />, color: "text-primary" },
          { label: "Collected", value: `$${paid.toLocaleString()}`, icon: <CheckCircle2 size={18} />, color: "text-success" },
          { label: "Overdue", value: `$${overdue.toLocaleString()}`, icon: <AlertTriangle size={18} />, color: "text-destructive" },
          { label: "Pending Invoices", value: pending, icon: <Clock size={18} />, color: "text-warning" },
          { label: "Collection Rate", value: `${rate}%`, icon: <TrendingUp size={18} />, color: "text-info" },
          { label: "Ready to Invoice", value: approvedReports, icon: <FileBarChart2 size={18} />, color: "text-accent-foreground" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 flex items-center gap-3">
            <div className={s.color}>{s.icon}</div>
            <div><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/invoices")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Client Invoices</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Create and manage invoices with automated charge calculations.</CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/service-report")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Approved Reports</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Review approved service reports ready for invoicing.</CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/aging-reports")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Aging Reports</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Track overdue receivables and collection status.</CardContent>
        </Card>
      </div>
    </div>
  );
}

function PayablesDashboard() {
  const navigate = useNavigate();
  const { data: vendorInvoices = [] } = useQuery({
    queryKey: ["dash_vendor_invoices"],
    queryFn: async () => { const { data } = await supabase.from("vendor_invoices").select("id,status,total,due_date"); return data || []; },
  });
  const { data: providers = [] } = useQuery({
    queryKey: ["dash_providers"],
    queryFn: async () => { const { data } = await supabase.from("service_providers").select("id,status"); return data || []; },
  });

  const totalPayable = vendorInvoices.reduce((s, v) => s + (v.total || 0), 0);
  const paid = vendorInvoices.filter(v => v.status === "Paid").reduce((s, v) => s + v.total, 0);
  const unpaid = totalPayable - paid;
  const overdue = vendorInvoices.filter(v => v.status !== "Paid" && new Date(v.due_date) < new Date()).length;
  const activeVendors = providers.filter(p => p.status === "Active").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Payables", value: `$${totalPayable.toLocaleString()}`, icon: <CreditCard size={18} />, color: "text-primary" },
          { label: "Paid", value: `$${paid.toLocaleString()}`, icon: <CheckCircle2 size={18} />, color: "text-success" },
          { label: "Unpaid", value: `$${unpaid.toLocaleString()}`, icon: <Clock size={18} />, color: "text-warning" },
          { label: "Overdue", value: overdue, icon: <AlertTriangle size={18} />, color: "text-destructive" },
          { label: "Active Vendors", value: activeVendors, icon: <Building2 size={18} />, color: "text-info" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 flex items-center gap-3">
            <div className={s.color}>{s.icon}</div>
            <div><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/vendor-invoices")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Vendor Invoices</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Review and manage third-party vendor invoices and payments.</CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/service-providers")}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Service Providers</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Manage vendor profiles, contracts, and service categories.</CardContent>
        </Card>
      </div>
    </div>
  );
}

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
