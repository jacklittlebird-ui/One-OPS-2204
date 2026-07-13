import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import {
  BookOpen, Calculator, FileText, TrendingUp, Wallet, Landmark, Building2, Users, Percent,
  Receipt, PiggyBank, ShieldCheck, LineChart, Coins, Scale, Layers, Globe, CalendarClock,
  CalendarRange, Boxes, HandCoins, ClipboardList, Briefcase, Banknote, RefreshCw, Search,
  ArrowLeftRight, GitBranch, FileBarChart, HeartHandshake, PackageX, Puzzle, Waypoints,
} from "lucide-react";

type Module = {
  title: string;
  path: string;
  standard: string;
  description: string;
  icon: any;
  group: string;
};

const MODULES: Module[] = [
  // Core ledger
  { title: "Chart of Accounts", path: "/accounting/chart-of-accounts", standard: "Core", description: "5-company chart with account classifications", icon: BookOpen, group: "Core Ledger" },
  { title: "Journal Entries", path: "/accounting/journal-entries", standard: "Core", description: "Double-entry manual and automated postings", icon: FileText, group: "Core Ledger" },
  { title: "General Ledger", path: "/accounting/general-ledger", standard: "Core", description: "Account balances and movement history", icon: Calculator, group: "Core Ledger" },
  { title: "Trial Balance", path: "/accounting/trial-balance", standard: "Core", description: "Period-end trial balance across companies", icon: Scale, group: "Core Ledger" },

  // Revenue & AR
  { title: "Invoicing", path: "/accounting/invoicing", standard: "IFRS 15", description: "Multi-currency invoicing with tax", icon: Receipt, group: "Revenue & Receivables" },
  { title: "Revenue Recognition", path: "/accounting/revenue-recognition", standard: "IFRS 15", description: "5-step model with performance obligations", icon: TrendingUp, group: "Revenue & Receivables" },
  { title: "Expected Credit Loss", path: "/accounting/expected-credit-loss", standard: "IFRS 9", description: "3-stage ECL with lifetime provisioning", icon: ShieldCheck, group: "Revenue & Receivables" },
  { title: "Aging Reports", path: "/aging-reports", standard: "Core", description: "AR/AP aging buckets", icon: ClipboardList, group: "Revenue & Receivables" },

  // Payroll & HR
  { title: "Payroll", path: "/accounting/payroll", standard: "IAS 19", description: "Salaries, allowances, statutory deductions", icon: Users, group: "Payroll & HR" },
  { title: "End of Service Benefits", path: "/accounting/end-of-service-benefits", standard: "IAS 19", description: "Actuarial EOSB with projected unit credit", icon: HandCoins, group: "Payroll & HR" },
  { title: "Share-Based Payments", path: "/accounting/share-based-payments", standard: "IFRS 2", description: "Equity/cash-settled grants with graded vesting", icon: PiggyBank, group: "Payroll & HR" },

  // Assets
  { title: "Fixed Assets", path: "/accounting/fixed-assets", standard: "IAS 16", description: "Register, depreciation, disposals", icon: Building2, group: "Assets" },
  { title: "Intangible Assets", path: "/accounting/intangibles", standard: "IAS 38", description: "Recognition, amortisation, impairment", icon: Puzzle, group: "Assets" },
  { title: "Impairment (CGUs)", path: "/accounting/impairment", standard: "IAS 36", description: "VIU and FVLCTS with CGU allocation", icon: Waypoints, group: "Assets" },
  { title: "Leases", path: "/accounting/leases", standard: "IFRS 16", description: "ROU asset and lease liability schedules", icon: Landmark, group: "Assets" },
  { title: "Held-for-Sale", path: "/accounting/held-for-sale", standard: "IFRS 5", description: "Discontinued operations disclosure", icon: PackageX, group: "Assets" },
  { title: "Government Grants", path: "/accounting/government-grants", standard: "IAS 20", description: "Asset/income-related grant recognition", icon: HeartHandshake, group: "Assets" },

  // Financial instruments
  { title: "Financial Instruments", path: "/accounting/financial-instruments", standard: "IFRS 9", description: "Classification & measurement (AC/FVOCI/FVTPL)", icon: Coins, group: "Financial Instruments" },
  { title: "Fair Value Hierarchy", path: "/accounting/fair-value-hierarchy", standard: "IFRS 13", description: "Level 1/2/3 with Level 3 reconciliation", icon: LineChart, group: "Financial Instruments" },
  { title: "Foreign Exchange", path: "/accounting/foreign-exchange", standard: "IAS 21", description: "Functional/presentation currency translation", icon: Globe, group: "Financial Instruments" },

  // Provisions & tax
  { title: "Provisions & Contingencies", path: "/accounting/provisions", standard: "IAS 37", description: "Present obligation with probability weighting", icon: Briefcase, group: "Provisions & Tax" },
  { title: "Income Taxes", path: "/accounting/income-taxes", standard: "IAS 12", description: "Current and deferred tax with temp diffs", icon: Percent, group: "Provisions & Tax" },
  { title: "Tax Compliance", path: "/accounting/tax-compliance", standard: "Tax", description: "VAT, WHT and stamp tax filings", icon: FileBarChart, group: "Provisions & Tax" },

  // Group / intercompany
  { title: "Intercompany", path: "/accounting/intercompany", standard: "IAS 24", description: "Related party transactions & eliminations", icon: ArrowLeftRight, group: "Group Reporting" },
  { title: "Consolidation", path: "/accounting/consolidation", standard: "IFRS 10", description: "Multi-entity consolidation package", icon: GitBranch, group: "Group Reporting" },
  { title: "Operating Segments", path: "/accounting/operating-segments", standard: "IFRS 8", description: "Segment thresholds & reconciliation", icon: Layers, group: "Group Reporting" },

  // Reporting & disclosures
  { title: "Financial Statements", path: "/accounting/financial-statements", standard: "IAS 1", description: "SoFP, SoPL/OCI, SoCE, cash flow", icon: FileBarChart, group: "Reporting & Disclosures" },
  { title: "Cash Flow", path: "/accounting/cash-flow", standard: "IAS 7", description: "Direct/indirect method with forecasting", icon: Wallet, group: "Reporting & Disclosures" },
  { title: "Earnings Per Share", path: "/accounting/earnings-per-share", standard: "IAS 33", description: "Basic & diluted EPS", icon: Banknote, group: "Reporting & Disclosures" },
  { title: "Interim Reporting", path: "/accounting/interim-reporting", standard: "IAS 34", description: "Condensed FS & disclosure checklist", icon: CalendarRange, group: "Reporting & Disclosures" },
  { title: "Policies, Changes & Errors", path: "/accounting/policies-changes", standard: "IAS 8", description: "Retrospective vs prospective treatment", icon: RefreshCw, group: "Reporting & Disclosures" },
  { title: "Events After Reporting", path: "/accounting/events-after-reporting", standard: "IAS 10", description: "Adjusting/non-adjusting events register", icon: CalendarClock, group: "Reporting & Disclosures" },

  // Inventory
  { title: "Inventory", path: "/accounting/inventory", standard: "IAS 2", description: "Cost formulas and NRV", icon: Boxes, group: "Inventory" },
];

const GROUPS = [
  "Core Ledger", "Revenue & Receivables", "Payroll & HR", "Assets",
  "Financial Instruments", "Provisions & Tax", "Group Reporting",
  "Reporting & Disclosures", "Inventory",
];

export default function AccountingHubPage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return MODULES;
    return MODULES.filter((m) =>
      m.title.toLowerCase().includes(needle) ||
      m.standard.toLowerCase().includes(needle) ||
      m.description.toLowerCase().includes(needle) ||
      m.group.toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="w-7 h-7 text-primary" />
            Accounting Hub
          </h1>
          <p className="text-muted-foreground">IFRS-aligned accounting suite across Link Aero group entities</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{MODULES.length} modules</Badge>
          <Badge className="bg-primary">IFRS · IAS</Badge>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search modules, standards, keywords..." className="pl-9" />
      </div>

      {GROUPS.map((group) => {
        const groupModules = filtered.filter((m) => m.group === group);
        if (groupModules.length === 0) return null;
        return (
          <div key={group} className="space-y-3">
            <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">{group}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {groupModules.map((m) => {
                const Icon = m.icon;
                return (
                  <Link key={m.path} to={m.path} className="block group">
                    <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Icon className="w-5 h-5" />
                          </div>
                          <Badge variant="outline" className="text-xs">{m.standard}</Badge>
                        </div>
                        <CardTitle className="text-base pt-2">{m.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center text-muted-foreground py-10">No modules match "{q}"</div>
      )}
    </div>
  );
}
