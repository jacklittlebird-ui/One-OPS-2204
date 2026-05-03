import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, BookOpen, Receipt, ShieldCheck, TrendingUp } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { exportToPdf } from "@/lib/exportPdf";
import { logAudit } from "@/lib/auditLogger";

const FILTER_STORAGE_KEY = "reports_admin_filters_v1";

interface SavedFilters {
  dateFrom: string;
  dateTo: string;
  statusFilter: string;
  typeFilter: string;
  search: string;
}

function loadFilters(): SavedFilters {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { dateFrom: "", dateTo: "", statusFilter: "all", typeFilter: "all", search: "" };
}

export default function ReportsAdminPage() {
  const initial = loadFilters();
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);
  const [statusFilter, setStatusFilter] = useState(initial.statusFilter);
  const [typeFilter, setTypeFilter] = useState(initial.typeFilter);
  const [search, setSearch] = useState(initial.search);

  // Persist filters
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ dateFrom, dateTo, statusFilter, typeFilter, search }));
    } catch {}
  }, [dateFrom, dateTo, statusFilter, typeFilter, search]);

  const matchesSearch = (txt: string) => !search.trim() || txt.toLowerCase().includes(search.trim().toLowerCase());
  const typeOk = (t: string) => typeFilter === "all" || typeFilter === t;

  const { data: invoices = [] } = useQuery({
    queryKey: ["reports_invoices"],
    queryFn: async () => { const { data } = await supabase.from("invoices").select("id,invoice_no,date,operator,total,currency,status,invoice_type"); return data || []; },
  });
  const { data: vendorInv = [] } = useQuery({
    queryKey: ["reports_vendor_invoices"],
    queryFn: async () => { const { data } = await supabase.from("vendor_invoices" as any).select("id,invoice_no,vendor_name,date,total,currency,status"); return (data || []) as any[]; },
  });
  const { data: journalEntries = [] } = useQuery({
    queryKey: ["reports_journal_entries"],
    queryFn: async () => { const { data } = await supabase.from("journal_entries" as any).select("id,entry_no,entry_date,description,total_debit,total_credit,status"); return (data || []) as any[]; },
  });
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["reports_audit_logs"],
    queryFn: async () => { const { data } = await supabase.from("audit_logs").select("id,action,entity_type,user_email,created_at").order("created_at", { ascending: false }).limit(200); return data || []; },
  });

  const within = (d?: string) => {
    if (!d) return true;
    const t = d.slice(0, 10);
    if (dateFrom && t < dateFrom) return false;
    if (dateTo && t > dateTo) return false;
    return true;
  };

  const fInvoices = useMemo(() => invoices.filter((i: any) => typeOk("invoice") && within(i.date) && (statusFilter === "all" || i.status === statusFilter) && matchesSearch(`${i.invoice_no} ${i.operator}`)), [invoices, dateFrom, dateTo, statusFilter, typeFilter, search]);
  const fVendor = useMemo(() => vendorInv.filter((v: any) => typeOk("vendor") && within(v.date) && (statusFilter === "all" || v.status === statusFilter) && matchesSearch(`${v.invoice_no} ${v.vendor_name}`)), [vendorInv, dateFrom, dateTo, statusFilter, typeFilter, search]);
  const fJournal = useMemo(() => journalEntries.filter((j: any) => typeOk("journal") && within(j.entry_date) && matchesSearch(`${j.entry_no} ${j.description}`)), [journalEntries, dateFrom, dateTo, typeFilter, search]);
  const fAudit = useMemo(() => auditLogs.filter((a: any) => within(a.created_at) && matchesSearch(`${a.user_email} ${a.action} ${a.entity_type}`)), [auditLogs, dateFrom, dateTo, search]);

  const totalRevenue = fInvoices.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
  const totalPayables = fVendor.reduce((s: number, v: any) => s + (Number(v.total) || 0), 0);
  const totalDebits = fJournal.reduce((s: number, j: any) => s + (Number(j.total_debit) || 0), 0);

  const summary = [
    { label: "Customer Invoices", value: fInvoices.length, sub: `Total: ${totalRevenue.toLocaleString()}`, icon: FileText, color: "text-blue-600", to: "/invoices" },
    { label: "Vendor Invoices", value: fVendor.length, sub: `Total: ${totalPayables.toLocaleString()}`, icon: Receipt, color: "text-orange-600", to: "/vendor-invoices" },
    { label: "Journal Entries", value: fJournal.length, sub: `Debits: ${totalDebits.toLocaleString()}`, icon: BookOpen, color: "text-emerald-600", to: "/journal-entries" },
    { label: "Audit Events", value: fAudit.length, sub: "Last 200 actions", icon: ShieldCheck, color: "text-purple-600", to: "/audit-log" },
  ];

  const handleExport = (format: "xlsx" | "pdf") => {
    const rows = [
      ...fInvoices.map((i: any) => ({ Type: "Customer Invoice", Reference: i.invoice_no, Date: i.date, Party: i.operator, Amount: i.total, Currency: i.currency, Status: i.status })),
      ...fVendor.map((v: any) => ({ Type: "Vendor Invoice", Reference: v.invoice_no, Date: v.date, Party: v.vendor_name, Amount: v.total, Currency: v.currency, Status: v.status })),
      ...fJournal.map((j: any) => ({ Type: "Journal Entry", Reference: j.entry_no, Date: j.entry_date, Party: j.description, Amount: j.total_debit, Currency: "", Status: j.status })),
    ];
    if (format === "xlsx") {
      exportToExcel(rows, "Reports Summary", `reports_summary_${new Date().toISOString().slice(0,10)}.xlsx`);
    } else {
      exportToPdf({
        title: "Accounting Reports Summary",
        subtitle: `${dateFrom || "—"} → ${dateTo || "—"} · ${rows.length} records`,
        head: [["Type", "Ref", "Date", "Party", "Amount", "Currency", "Status"]],
        body: rows.map(r => [r.Type, r.Reference, r.Date, String(r.Party || ""), Number(r.Amount || 0).toLocaleString(), r.Currency, r.Status]),
        fileName: `reports_summary_${new Date().toISOString().slice(0,10)}.pdf`, orientation: "landscape",
      });
    }
    logAudit({ action: "export", entity_type: "reports_summary", details: { format, count: rows.length } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports / Admin</h1>
          <p className="text-muted-foreground text-sm">لوحة التقارير الإدارية والمحاسبية الموحّدة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}><Download size={14} className="mr-1" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}><Download size={14} className="mr-1" /> PDF</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Search (Ref / Party / User)</label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="invoice">Customer Invoices</SelectItem>
                <SelectItem value="vendor">Vendor Invoices</SelectItem>
                <SelectItem value="journal">Journal Entries</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status (Invoices)</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-6 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("all"); setTypeFilter("all"); setSearch(""); }}>Clear filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {summary.map(s => {
          const Icon = s.icon;
          return (
            <Link to={s.to} key={s.label}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className={s.color} size={28} />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick links */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp size={16} /> Detailed Reports</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link to="/financial-reports"><Button variant="outline" className="w-full">Trial Balance / P&L / BS</Button></Link>
            <Link to="/aging-reports"><Button variant="outline" className="w-full">AR Aging</Button></Link>
            <Link to="/audit-log"><Button variant="outline" className="w-full">Audit Log</Button></Link>
            <Link to="/users"><Button variant="outline" className="w-full">Users & Roles</Button></Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent audit events */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Recent Audit Events</h3>
            <p className="text-xs text-muted-foreground">Last actions by users</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fAudit.slice(0, 20).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{a.user_email}</TableCell>
                  <TableCell className="text-sm font-medium">{a.action}</TableCell>
                  <TableCell className="text-sm">{a.entity_type}</TableCell>
                </TableRow>
              ))}
              {fAudit.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No events</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
