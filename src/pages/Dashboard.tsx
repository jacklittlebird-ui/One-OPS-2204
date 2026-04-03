import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plane, DollarSign, Shield, Activity, Calendar, MapPin, Clock } from "lucide-react";
import OperationsDashboard from "./OperationsDashboard";
import AccountantDashboard from "./AccountantDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function DashboardPage() {
  const { user } = useAuth();
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
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/90 to-indigo p-4 md:p-6 text-primary-foreground">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 hidden md:block" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 hidden md:block" />
        <div className="relative z-10">
          <h1 className="text-xl md:text-2xl font-bold">{greeting}, {displayName} 👋</h1>
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
    </div>
  );
}
