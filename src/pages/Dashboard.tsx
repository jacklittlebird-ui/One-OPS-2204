import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plane, DollarSign, Activity, Calendar, MapPin, Clock, ShieldCheck, Building2, FileText, Eye, Receipt, CreditCard, Shield } from "lucide-react";
import OperationsDashboard from "./OperationsDashboard";
import AccountantDashboard from "./AccountantDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useChannel, CHANNEL_LABELS, type Channel } from "@/contexts/ChannelContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
  clearance: <ShieldCheck size={20} />,
  station: <Building2 size={20} />,
  contracts: <FileText size={20} />,
  operations: <Eye size={20} />,
  receivables: <Receipt size={20} />,
  payables: <CreditCard size={20} />,
  admin: <Shield size={20} />,
};

function ChannelDashboardContent({ channel }: { channel: Channel }) {
  switch (channel) {
    case "clearance":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Pending Clearances</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Approved Today</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Flights This Week</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Expiring Permits</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>• Add new flight schedules manually or upload Excel files</p>
              <p>• Review and approve clearance requests</p>
              <p>• Monitor overfly schedule</p>
            </CardContent>
          </Card>
        </div>
      );

    case "station":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Today's Flights</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Pending Reports</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Completed Services</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Open Items</p></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Schedule Panel</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>View assigned flights and scheduled arrival/departure times for your station.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Reporting Panel</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Submit service reports for completed flights. Include handling type, PAX data, and costs.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );

    case "contracts":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Active Contracts</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Expiring Soon</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Total Annual Value</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Service Prices Set</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>• Manage service prices per airline/airport</p>
              <p>• Set up contract terms and billing frequencies</p>
              <p>• Configure airline incentive programs</p>
            </CardContent>
          </Card>
        </div>
      );

    case "operations":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Pending Review</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Approved Today</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Rejected / Returned</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Total Flights Monitored</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Review Queue</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>• Review station-submitted service reports</p>
              <p>• Approve or reject with comments</p>
              <p>• Monitor flight operations across all stations</p>
            </CardContent>
          </Card>
        </div>
      );

    case "receivables":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Total Receivables</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Invoices Pending</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Overdue Amount</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Collection Rate</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>• Transform approved service reports into invoices</p>
              <p>• Calculate charges from contract pricing</p>
              <p>• Add additional expenses (landing, housing, parking)</p>
              <p>• Track aging and collection status</p>
            </CardContent>
          </Card>
        </div>
      );

    case "payables":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Total Payables</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Vendor Invoices Due</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Overdue Payments</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">—</div><p className="text-xs text-muted-foreground">Active Vendors</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>• Review vendor/third-party invoices</p>
              <p>• Match vendor charges to service reports</p>
              <p>• Track payment schedules</p>
            </CardContent>
          </Card>
        </div>
      );

    case "admin":
    default:
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
          <TabsContent value="operations" className="mt-4">
            <OperationsDashboard />
          </TabsContent>
          <TabsContent value="accountant" className="mt-4">
            <AccountantDashboard />
          </TabsContent>
        </Tabs>
      );
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
      {/* Header */}
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
