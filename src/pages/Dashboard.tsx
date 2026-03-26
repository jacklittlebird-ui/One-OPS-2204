import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plane, DollarSign, Shield, FileBarChart2 } from "lucide-react";
import OperationsDashboard from "./OperationsDashboard";
import AccountantDashboard from "./AccountantDashboard";

export default function DashboardPage() {
  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good Morning" : today.getHours() < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting} 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {today.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield size={14} className="text-success" />
          <span>System Online</span>
        </div>
      </div>

      <Tabs defaultValue="operations" className="w-full">
        <TabsList>
          <TabsTrigger value="operations" className="flex items-center gap-1.5">
            <Plane size={14} /> Operations
          </TabsTrigger>
          <TabsTrigger value="accountant" className="flex items-center gap-1.5">
            <DollarSign size={14} /> Accountant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations">
          <OperationsDashboard />
        </TabsContent>
        <TabsContent value="accountant">
          <AccountantDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
