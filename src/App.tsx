import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
import AirlinesPage from "./pages/Airlines";
import AircraftsPage from "./pages/Aircrafts";
import FlightSchedulePage from "./pages/FlightSchedule";
import ServicesPage from "./pages/Services";
import AirportChargesPage from "./pages/AirportCharges";
import DashboardPage from "./pages/Dashboard";
import ServiceReportPage from "./pages/ServiceReport";
import InvoicesPage from "./pages/Invoices";
import OverflySchedulePage from "./pages/OverflySchedule";
import DelayCodesPage from "./pages/DelayCodes";
import LostFoundPage from "./pages/LostFound";
import StaffRosterPage from "./pages/StaffRoster";
import ContractsPage from "./pages/Contracts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><DashboardPage /></AppLayout>} />
          <Route path="/airport-charges" element={<AppLayout><AirportChargesPage /></AppLayout>} />
          <Route path="/airlines" element={<AppLayout><AirlinesPage /></AppLayout>} />
          <Route path="/aircrafts" element={<AppLayout><AircraftsPage /></AppLayout>} />
          <Route path="/flight-schedule" element={<AppLayout><FlightSchedulePage /></AppLayout>} />
          <Route path="/services" element={<AppLayout><ServicesPage /></AppLayout>} />
          <Route path="/service-report" element={<AppLayout><ServiceReportPage /></AppLayout>} />
          <Route path="/invoices" element={<AppLayout><InvoicesPage /></AppLayout>} />
          <Route path="/overfly-schedule" element={<AppLayout><OverflySchedulePage /></AppLayout>} />
          <Route path="/delay-codes" element={<AppLayout><DelayCodesPage /></AppLayout>} />
          <Route path="/lost-found" element={<AppLayout><LostFoundPage /></AppLayout>} />
          <Route path="/staff-roster" element={<AppLayout><StaffRosterPage /></AppLayout>} />
          <Route path="/contracts" element={<AppLayout><ContractsPage /></AppLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

