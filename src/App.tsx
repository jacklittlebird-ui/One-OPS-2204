import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ChannelProvider } from "@/contexts/ChannelContext";
import { UserStationProvider } from "@/contexts/UserStationContext";
import { useQueryTelemetry } from "@/lib/queryTelemetry";
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
import CostCenterReportsPage from "./pages/accounting/CostCenterReports";
import FxRevaluationPage from "./pages/accounting/FxRevaluation";
import VatReturnPage from "./pages/accounting/VatReturn";
import RecurringJournalsPage from "./pages/accounting/RecurringJournals";
import BudgetsPage from "./pages/accounting/Budgets";
import FixedAssetsPage from "./pages/accounting/FixedAssets";
import CashFlowStatementPage from "./pages/accounting/CashFlowStatement";
import ConsolidatedStatementsPage from "./pages/accounting/ConsolidatedStatements";
import PartnerStatementsPage from "./pages/accounting/PartnerStatements";
import IntercompanyTransactionsPage from "./pages/accounting/IntercompanyTransactions";
import ApprovalWorkflowsPage from "./pages/accounting/ApprovalWorkflows";
import WithholdingTaxPage from "./pages/accounting/WithholdingTax";
import ChequeManagementPage from "./pages/accounting/ChequeManagement";
import PettyCashPage from "./pages/accounting/PettyCash";
import NotesPayableLoansPage from "./pages/accounting/NotesPayableLoans";
import ObjectionVariancePage from "./pages/accounting/ObjectionVariance";
import FinancialStatementsPage from "./pages/accounting/FinancialStatements";
import TreasuryVouchersPage from "./pages/accounting/TreasuryVouchers";
import FinanceAuditLogPage from "./pages/accounting/AuditLog";
import DepreciationSchedulerPage from "./pages/accounting/DepreciationScheduler";
import AccrualsDeferralsPage from "./pages/accounting/AccrualsDeferrals";
import CostAllocationPage from "./pages/accounting/CostAllocation";
import BudgetVariancePage from "./pages/accounting/BudgetVariance";
import CashFlowForecastPage from "./pages/accounting/CashFlowForecast";
import BankReconciliationWorkbenchPage from "./pages/accounting/BankReconciliationWorkbench";
import CollectionsWorkflowPage from "./pages/accounting/CollectionsWorkflow";
import ConsolidationWorkbenchPage from "./pages/accounting/ConsolidationWorkbench";
import FinancialRatiosPage from "./pages/accounting/FinancialRatios";
import TaxComplianceCenterPage from "./pages/accounting/TaxComplianceCenter";
import FixedAssetsEnhancedPage from "./pages/accounting/FixedAssetsEnhanced";
import RecurringInvoicesPage from "./pages/accounting/RecurringInvoices";
import FxGainLossPage from "./pages/accounting/FxGainLoss";
import ContractsRenewalsPage from "./pages/accounting/ContractsRenewals";
import VendorPortalPage from "./pages/accounting/VendorPortal";
import CustomerPortalPage from "./pages/accounting/CustomerPortal";
import PaymentRemindersPage from "./pages/accounting/PaymentReminders";
import FinancialClosePage from "./pages/accounting/FinancialClose";
import DocumentManagementPage from "./pages/accounting/DocumentManagement";
import ApprovalMatrixPage from "./pages/accounting/ApprovalMatrix";
import FinanceNotificationCenter from "./pages/accounting/FinanceNotificationCenter";
import CustomReportBuilder from "./pages/accounting/CustomReportBuilder";
import BudgetManagement from "./pages/accounting/BudgetManagement";
import CashFlowForecast from "./pages/accounting/CashFlowForecast";
import TaxCompliance from "./pages/accounting/TaxCompliance";
import PayrollExpenses from "./pages/accounting/PayrollExpenses";
import BankStatementImport from "./pages/accounting/BankStatementImport";
import CustomerCredit from "./pages/accounting/CustomerCredit";
import SalesOrders from "./pages/accounting/SalesOrders";
import PurchaseOrders from "./pages/accounting/PurchaseOrders";
import InventoryPage from "./pages/accounting/Inventory";
import ProjectCostingPage from "./pages/accounting/ProjectCosting";
import TimesheetsPage from "./pages/accounting/Timesheets";
import ExpenseApprovalsPage from "./pages/accounting/ExpenseApprovals";
import CreditDebitNotesPage from "./pages/accounting/CreditDebitNotes";
import AllocationDriversPage from "./pages/accounting/AllocationDrivers";
import FxRevaluationSchedulesPage from "./pages/accounting/FxRevaluationSchedules";
import AmortizationSchedulesPage from "./pages/accounting/AmortizationSchedules";
import WhtYearEndStatementsPage from "./pages/accounting/WhtYearEndStatements";
import VendorInvoicesPage from "./pages/VendorInvoices";
import AgingReportsPage from "./pages/AgingReports";
import AirlineIncentivesPage from "./pages/AirlineIncentives";
import UsersPage from "./pages/Users";
import NotificationsPage from "./pages/Notifications";
import SettingsPage from "./pages/Settings";
import AuditLogPage from "./pages/AuditLog";
// StationDispatch merged into ServiceReport
import IrregularityReportsPage from "./pages/IrregularityReports";
import AllClearanceFlightsPage from "./pages/AllClearanceFlights";
import TreasuryPage from "./pages/Treasury";
import BankAccountsPage from "./pages/treasury/BankAccounts";
import CashAccountsPage from "./pages/treasury/CashAccounts";
import PaymentsPage from "./pages/treasury/Payments";
import ReceiptsPage from "./pages/treasury/Receipts";
import BankTransfersPage from "./pages/treasury/BankTransfers";
import BankReconciliationPage from "./pages/treasury/BankReconciliation";
import BankReconciliationDetailPage from "./pages/treasury/BankReconciliationDetail";
import ReportsAdminPage from "./pages/ReportsAdmin";
import SecurityStatusPage from "./pages/SecurityStatus";
import OperationsReportsPage from "./pages/OperationsReports";
import CompaniesPage from "./pages/accounting/Companies";
import FinanceStationsPage from "./pages/accounting/FinanceStations";
import ExchangeRatesPage from "./pages/accounting/ExchangeRates";
import CustomerPriceListPage from "./pages/accounting/CustomerPriceList";
import SupplierPriceListPage from "./pages/accounting/SupplierPriceList";
import "./i18n";


// Global React Query defaults aligned with the architecture blueprint:
// - React Query is the smart cache; avoid window/mount refetch storms.
// - 60s default staleTime dedupes burst fetches across components.
// - Per-table hooks override these (see useSupabaseTable).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
    mutations: { retry: 0 },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  useQueryTelemetry(queryClient);
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
      <Route path="/operations-reports" element={<ProtectedRoute><AppLayout><OperationsReportsPage /></AppLayout></ProtectedRoute>} />
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
      <Route path="/accounting/cost-center" element={<ProtectedRoute><AppLayout><CostCenterReportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/fx-revaluation" element={<ProtectedRoute><AppLayout><FxRevaluationPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/vat-return" element={<ProtectedRoute><AppLayout><VatReturnPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/recurring-journals" element={<ProtectedRoute><AppLayout><RecurringJournalsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/budgets" element={<ProtectedRoute><AppLayout><BudgetsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/fixed-assets" element={<ProtectedRoute><AppLayout><FixedAssetsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/cash-flow" element={<ProtectedRoute><AppLayout><CashFlowStatementPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/consolidated" element={<ProtectedRoute><AppLayout><ConsolidatedStatementsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/statements" element={<ProtectedRoute><AppLayout><PartnerStatementsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/intercompany" element={<ProtectedRoute><AppLayout><IntercompanyTransactionsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/approvals" element={<ProtectedRoute><AppLayout><ApprovalWorkflowsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/wht" element={<ProtectedRoute><AppLayout><WithholdingTaxPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/cheques" element={<ProtectedRoute><AppLayout><ChequeManagementPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/petty-cash" element={<ProtectedRoute><AppLayout><PettyCashPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/notes-payable" element={<ProtectedRoute><AppLayout><NotesPayableLoansPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/objections" element={<ProtectedRoute><AppLayout><ObjectionVariancePage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/financial-statements" element={<ProtectedRoute><AppLayout><FinancialStatementsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/treasury-vouchers" element={<ProtectedRoute><AppLayout><TreasuryVouchersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/audit-log" element={<ProtectedRoute><AppLayout><FinanceAuditLogPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/depreciation" element={<ProtectedRoute><AppLayout><DepreciationSchedulerPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/accruals" element={<ProtectedRoute><AppLayout><AccrualsDeferralsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/cost-allocation" element={<ProtectedRoute><AppLayout><CostAllocationPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/budget-variance" element={<ProtectedRoute><AppLayout><BudgetVariancePage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/cash-flow-forecast" element={<ProtectedRoute><AppLayout><CashFlowForecastPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/bank-reconciliation" element={<ProtectedRoute><AppLayout><BankReconciliationWorkbenchPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/collections" element={<ProtectedRoute><AppLayout><CollectionsWorkflowPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/consolidation-workbench" element={<ProtectedRoute><AppLayout><ConsolidationWorkbenchPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/financial-ratios" element={<ProtectedRoute><AppLayout><FinancialRatiosPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/tax-compliance" element={<ProtectedRoute><AppLayout><TaxComplianceCenterPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/fixed-assets-advanced" element={<ProtectedRoute><AppLayout><FixedAssetsEnhancedPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/recurring-invoices" element={<ProtectedRoute><AppLayout><RecurringInvoicesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/fx-gain-loss" element={<ProtectedRoute><AppLayout><FxGainLossPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/contracts-renewals" element={<ProtectedRoute><AppLayout><ContractsRenewalsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/vendor-portal" element={<ProtectedRoute><AppLayout><VendorPortalPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/customer-portal" element={<ProtectedRoute><AppLayout><CustomerPortalPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/payment-reminders" element={<ProtectedRoute><AppLayout><PaymentRemindersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/financial-close" element={<ProtectedRoute><AppLayout><FinancialClosePage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/documents" element={<ProtectedRoute><AppLayout><DocumentManagementPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/approval-matrix" element={<ProtectedRoute><AppLayout><ApprovalMatrixPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/notifications" element={<ProtectedRoute><AppLayout><FinanceNotificationCenter /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/custom-reports" element={<ProtectedRoute><AppLayout><CustomReportBuilder /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/budgets" element={<ProtectedRoute><AppLayout><BudgetManagement /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/cash-forecast" element={<ProtectedRoute><AppLayout><CashFlowForecast /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/tax-compliance" element={<ProtectedRoute><AppLayout><TaxCompliance /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/payroll" element={<ProtectedRoute><AppLayout><PayrollExpenses /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/bank-import" element={<ProtectedRoute><AppLayout><BankStatementImport /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/customer-credit" element={<ProtectedRoute><AppLayout><CustomerCredit /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/sales-orders" element={<ProtectedRoute><AppLayout><SalesOrders /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/purchase-orders" element={<ProtectedRoute><AppLayout><PurchaseOrders /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/inventory" element={<ProtectedRoute><AppLayout><InventoryPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/project-costing" element={<ProtectedRoute><AppLayout><ProjectCostingPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/timesheets" element={<ProtectedRoute><AppLayout><TimesheetsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/expense-approvals" element={<ProtectedRoute><AppLayout><ExpenseApprovalsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/credit-debit-notes" element={<ProtectedRoute><AppLayout><CreditDebitNotesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/allocation-drivers" element={<ProtectedRoute><AppLayout><AllocationDriversPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/fx-revaluation-schedules" element={<ProtectedRoute><AppLayout><FxRevaluationSchedulesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/amortization-schedules" element={<ProtectedRoute><AppLayout><AmortizationSchedulesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/wht-year-end" element={<ProtectedRoute><AppLayout><WhtYearEndStatementsPage /></AppLayout></ProtectedRoute>} />


      <Route path="/vendor-invoices" element={<ProtectedRoute><AppLayout><VendorInvoicesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/aging-reports" element={<ProtectedRoute><AppLayout><AgingReportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/airline-incentives" element={<ProtectedRoute><AppLayout><AirlineIncentivesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><AppLayout><UsersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><AppLayout><NotificationsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute><AppLayout><AuditLogPage /></AppLayout></ProtectedRoute>} />
      <Route path="/station-dispatch" element={<Navigate to="/service-report" replace />} />
      <Route path="/irregularity-reports" element={<ProtectedRoute><AppLayout><IrregularityReportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/security-service-reports" element={<Navigate to="/service-report" replace />} />
      <Route path="/all-clearance-flights" element={<ProtectedRoute><AppLayout><AllClearanceFlightsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/treasury" element={<ProtectedRoute><AppLayout><TreasuryPage /></AppLayout></ProtectedRoute>} />
      <Route path="/treasury/bank-accounts" element={<ProtectedRoute><AppLayout><BankAccountsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/treasury/cash-accounts" element={<ProtectedRoute><AppLayout><CashAccountsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/treasury/payments" element={<ProtectedRoute><AppLayout><PaymentsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/treasury/receipts" element={<ProtectedRoute><AppLayout><ReceiptsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/treasury/bank-transfers" element={<ProtectedRoute><AppLayout><BankTransfersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/treasury/bank-reconciliation" element={<ProtectedRoute><AppLayout><BankReconciliationPage /></AppLayout></ProtectedRoute>} />
      <Route path="/treasury/bank-reconciliation/:id" element={<ProtectedRoute><AppLayout><BankReconciliationDetailPage /></AppLayout></ProtectedRoute>} />

      <Route path="/reports-admin" element={<ProtectedRoute><AppLayout><ReportsAdminPage /></AppLayout></ProtectedRoute>} />
      <Route path="/security-status" element={<ProtectedRoute><AppLayout><SecurityStatusPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/companies" element={<ProtectedRoute><AppLayout><CompaniesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/stations" element={<ProtectedRoute><AppLayout><FinanceStationsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/exchange-rates" element={<ProtectedRoute><AppLayout><ExchangeRatesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/customer-prices" element={<ProtectedRoute><AppLayout><CustomerPriceListPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounting/supplier-prices" element={<ProtectedRoute><AppLayout><SupplierPriceListPage /></AppLayout></ProtectedRoute>} />
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
            <UserStationProvider>
              <AppRoutes />
            </UserStationProvider>
          </ChannelProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
