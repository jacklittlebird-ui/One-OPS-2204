import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ChannelProvider } from "@/contexts/ChannelContext";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
import AirlinesPage from "./pages/Airlines";
import AircraftsPage from "./pages/Aircrafts";

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
import TubePage from "./pages/Tube";
import AirportTaxPage from "./pages/AirportTax";
import BasicRampPage from "./pages/BasicRamp";
import VendorEquipmentPage from "./pages/VendorEquipment";
import HallVVIPPage from "./pages/HallVVIP";
import CateringPage from "./pages/Catering";
import TrafficRightsPage from "./pages/TrafficRights";
import BulletinsPage from "./pages/Bulletins";
import ManualsAndFormsPage from "./pages/ManualsAndForms";
import AbbreviationsPage from "./pages/Abbreviations";
import AircraftTypesPage from "./pages/AircraftTypes";
import LoginPage from "./pages/Login";
import CountriesPage from "./pages/Countries";
import AirportsPage from "./pages/Airports";
import ServiceProvidersPage from "./pages/ServiceProviders";
import ClearancesPage from "./pages/Clearances";
import ServicesCatalogPage from "./pages/ServicesCatalog";
import ChartOfAccountsPage from "./pages/ChartOfAccounts";
import JournalEntriesPage from "./pages/JournalEntries";
import FinancialReportsPage from "./pages/FinancialReports";
import VendorInvoicesPage from "./pages/VendorInvoices";
import AgingReportsPage from "./pages/AgingReports";
import AirlineIncentivesPage from "./pages/AirlineIncentives";
import UsersPage from "./pages/Users";
import NotificationsPage from "./pages/Notifications";
import SettingsPage from "./pages/Settings";
import AuditLogPage from "./pages/AuditLog";
import StationDispatchPage from "./pages/StationDispatch";
import IrregularityReportsPage from "./pages/IrregularityReports";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/airport-charges" element={<ProtectedRoute><AppLayout><AirportChargesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/airlines" element={<ProtectedRoute><AppLayout><AirlinesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/aircrafts" element={<ProtectedRoute><AppLayout><AircraftsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/flight-schedule" element={<Navigate to="/clearances" replace />} />
      <Route path="/services" element={<ProtectedRoute><AppLayout><ServicesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/service-report" element={<ProtectedRoute><AppLayout><ServiceReportPage /></AppLayout></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><AppLayout><InvoicesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/overfly-schedule" element={<ProtectedRoute><AppLayout><OverflySchedulePage /></AppLayout></ProtectedRoute>} />
      <Route path="/delay-codes" element={<ProtectedRoute><AppLayout><DelayCodesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/lost-found" element={<ProtectedRoute><AppLayout><LostFoundPage /></AppLayout></ProtectedRoute>} />
      <Route path="/staff-roster" element={<ProtectedRoute><AppLayout><StaffRosterPage /></AppLayout></ProtectedRoute>} />
      <Route path="/contracts" element={<ProtectedRoute><AppLayout><ContractsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/tube" element={<ProtectedRoute><AppLayout><TubePage /></AppLayout></ProtectedRoute>} />
      <Route path="/airport-tax" element={<ProtectedRoute><AppLayout><AirportTaxPage /></AppLayout></ProtectedRoute>} />
      <Route path="/basic-ramp" element={<ProtectedRoute><AppLayout><BasicRampPage /></AppLayout></ProtectedRoute>} />
      <Route path="/vendor-equipment" element={<ProtectedRoute><AppLayout><VendorEquipmentPage /></AppLayout></ProtectedRoute>} />
      <Route path="/hall-vvip" element={<ProtectedRoute><AppLayout><HallVVIPPage /></AppLayout></ProtectedRoute>} />
      <Route path="/catering" element={<ProtectedRoute><AppLayout><CateringPage /></AppLayout></ProtectedRoute>} />
      <Route path="/traffic-rights" element={<ProtectedRoute><AppLayout><TrafficRightsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/bulletins" element={<ProtectedRoute><AppLayout><BulletinsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/manuals-forms" element={<ProtectedRoute><AppLayout><ManualsAndFormsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/abbreviations" element={<ProtectedRoute><AppLayout><AbbreviationsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/aircraft-types" element={<ProtectedRoute><AppLayout><AircraftTypesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/countries" element={<ProtectedRoute><AppLayout><CountriesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/airports" element={<ProtectedRoute><AppLayout><AirportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/service-providers" element={<ProtectedRoute><AppLayout><ServiceProvidersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/clearances" element={<ProtectedRoute><AppLayout><ClearancesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/services-catalog" element={<ProtectedRoute><AppLayout><ServicesCatalogPage /></AppLayout></ProtectedRoute>} />
      <Route path="/chart-of-accounts" element={<ProtectedRoute><AppLayout><ChartOfAccountsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/journal-entries" element={<ProtectedRoute><AppLayout><JournalEntriesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/financial-reports" element={<ProtectedRoute><AppLayout><FinancialReportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/vendor-invoices" element={<ProtectedRoute><AppLayout><VendorInvoicesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/aging-reports" element={<ProtectedRoute><AppLayout><AgingReportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/airline-incentives" element={<ProtectedRoute><AppLayout><AirlineIncentivesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><AppLayout><UsersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><AppLayout><NotificationsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute><AppLayout><AuditLogPage /></AppLayout></ProtectedRoute>} />
      <Route path="/station-dispatch" element={<ProtectedRoute><AppLayout><StationDispatchPage /></AppLayout></ProtectedRoute>} />
      <Route path="/irregularity-reports" element={<ProtectedRoute><AppLayout><IrregularityReportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ChannelProvider>
            <AppRoutes />
          </ChannelProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
