import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plane, DollarSign } from "lucide-react";
import OperationsDashboard from "./OperationsDashboard";
import AccountantDashboard from "./AccountantDashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Operations overview · {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
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
