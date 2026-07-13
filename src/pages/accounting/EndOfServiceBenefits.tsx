import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

type Employee = {
  id: string;
  employee_no: string | null;
  full_name: string;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  termination_date: string | null;
  base_salary: number | null;
  currency: string | null;
  status: string | null;
};

type Assumptions = {
  monthsPerYearTier1: number; // e.g. 0.5 (half month per year for first 5 years)
  monthsPerYearTier2: number; // e.g. 1 (one month per year thereafter)
  tier1Years: number; // 5
  discountRate: number; // % annual, for PV
  salaryGrowth: number; // % annual
  averageRemainingService: number; // years
};

const DEFAULTS: Assumptions = {
  monthsPerYearTier1: 0.5,
  monthsPerYearTier2: 1,
  tier1Years: 5,
  discountRate: 8,
  salaryGrowth: 4,
  averageRemainingService: 10,
};

const STORAGE_KEY = "eosb.assumptions.v1";
const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");

const yearsBetween = (from: string, to: Date) => {
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, (to.getTime() - start) / (365.25 * 86_400_000));
};

export default function EndOfServiceBenefitsPage() {
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAssumptions({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assumptions));
  }, [assumptions]);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["eosb-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, employee_no, full_name, department, position, hire_date, termination_date, base_salary, currency, status")
        .order("hire_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
  });

  const rows = useMemo(() => {
    const today = new Date();
    return employees
      .filter((e) => !e.termination_date && (e.status || "").toLowerCase() !== "terminated")
      .map((e) => {
        const service = e.hire_date ? yearsBetween(e.hire_date, today) : 0;
        const salary = Number(e.base_salary || 0);
        const tier1Yrs = Math.min(service, assumptions.tier1Years);
        const tier2Yrs = Math.max(0, service - assumptions.tier1Years);
        // Current accrued benefit at today's salary
        const accruedMonths = tier1Yrs * assumptions.monthsPerYearTier1 + tier2Yrs * assumptions.monthsPerYearTier2;
        const accrued = accruedMonths * salary;

        // Projected Benefit Obligation (PBO) — project salary to retirement, then PV back
        const n = Math.max(0, assumptions.averageRemainingService);
        const projectedSalary = salary * Math.pow(1 + assumptions.salaryGrowth / 100, n);
        const projTier1 = Math.min(service + n, assumptions.tier1Years);
        const projTier2 = Math.max(0, service + n - assumptions.tier1Years);
        const projectedMonths = projTier1 * assumptions.monthsPerYearTier1 + projTier2 * assumptions.monthsPerYearTier2;
        const futureBenefit = projectedMonths * projectedSalary;
        const pv = futureBenefit / Math.pow(1 + assumptions.discountRate / 100, n);
        // Attribution: accrued portion of PV
        const totalProjMonths = projectedMonths || 1;
        const pbo = pv * (accruedMonths / totalProjMonths);

        return {
          id: e.id,
          employee_no: e.employee_no,
          name: e.full_name,
          department: e.department,
          hire_date: e.hire_date,
          service,
          salary,
          accrued,
          pbo,
        };
      });
  }, [employees, assumptions]);

  const totals = useMemo(() => {
    const accrued = rows.reduce((s, r) => s + r.accrued, 0);
    const pbo = rows.reduce((s, r) => s + r.pbo, 0);
    return { accrued, pbo, headcount: rows.length };
  }, [rows]);

  const handleExport = () => {
    exportToExcel(
      rows.map((r) => ({
        "Employee No": r.employee_no,
        "Name": r.name,
        "Department": r.department,
        "Hire Date": r.hire_date,
        "Service (yrs)": Number(r.service.toFixed(2)),
        "Base Salary": r.salary,
        "Accrued EOSB": Number(r.accrued.toFixed(2)),
        "PBO": Number(r.pbo.toFixed(2)),
      })),
      "EOSB",
      `eosb-provision-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  const update = (patch: Partial<Assumptions>) => setAssumptions((a) => ({ ...a, ...patch }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            End of Service Benefits
          </h1>
          <p className="text-muted-foreground">IAS 19 — Post-employment defined benefit obligation</p>
        </div>
        <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-1" />Export</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Actuarial Assumptions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div>
            <Label>Tier 1 (yrs)</Label>
            <Input type="number" value={assumptions.tier1Years} onChange={(e) => update({ tier1Years: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Months/yr Tier 1</Label>
            <Input type="number" step="0.1" value={assumptions.monthsPerYearTier1} onChange={(e) => update({ monthsPerYearTier1: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Months/yr Tier 2</Label>
            <Input type="number" step="0.1" value={assumptions.monthsPerYearTier2} onChange={(e) => update({ monthsPerYearTier2: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Discount Rate %</Label>
            <Input type="number" step="0.1" value={assumptions.discountRate} onChange={(e) => update({ discountRate: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Salary Growth %</Label>
            <Input type="number" step="0.1" value={assumptions.salaryGrowth} onChange={(e) => update({ salaryGrowth: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Avg Remaining Svc (yrs)</Label>
            <Input type="number" value={assumptions.averageRemainingService} onChange={(e) => update({ averageRemainingService: Number(e.target.value) || 0 })} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active Employees</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.headcount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Accrued Benefit (Current Salary)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(totals.accrued)}</div></CardContent>
        </Card>
        <Card className="border-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Projected Benefit Obligation</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{fmt(totals.pbo)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Per-Employee Provision</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading employees…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emp No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead className="text-right">Service (yrs)</TableHead>
                  <TableHead className="text-right">Base Salary</TableHead>
                  <TableHead className="text-right">Accrued</TableHead>
                  <TableHead className="text-right">PBO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.employee_no || "—"}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.department || "—"}</TableCell>
                    <TableCell>{r.hire_date || "—"}</TableCell>
                    <TableCell className="text-right">{r.service.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{fmt(r.salary)}</TableCell>
                    <TableCell className="text-right">{fmt(r.accrued)}</TableCell>
                    <TableCell className="text-right text-primary">{fmt(r.pbo)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No active employees</TableCell></TableRow>
                )}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={6}>Total</TableCell>
                  <TableCell className="text-right">{fmt(totals.accrued)}</TableCell>
                  <TableCell className="text-right text-primary">{fmt(totals.pbo)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
