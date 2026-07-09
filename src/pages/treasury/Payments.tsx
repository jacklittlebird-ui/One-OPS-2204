import TreasuryTablePage, { StatusBadge } from "@/components/treasury/TreasuryTablePage";
import { supabase } from "@/integrations/supabase/client";

const CURRENCIES = ["USD","EUR","EGP","SAR","AED","GBP"].map(c => ({ value: c, label: c }));
const METHODS = ["Bank Transfer","Cheque","Cash","Credit Card","Online"].map(m => ({ value: m, label: m }));
const STATUS = [{value:"Posted",label:"Posted"},{value:"Draft",label:"Draft"},{value:"Void",label:"Void"}];

const loadOpenVendorInvoices = async () => {
  const { data } = await supabase
    .from("vendor_invoices")
    .select("id,invoice_no,vendor_name,total,currency,status")
    .neq("status", "Paid")
    .neq("status", "Cancelled")
    .order("date", { ascending: false })
    .limit(500);
  return (data || []).map((i: any) => ({
    value: i.id,
    label: `${i.invoice_no} • ${i.vendor_name} • ${i.currency} ${Number(i.total || 0).toLocaleString()}`,
  }));
};

export default function PaymentsPage() {
  return <TreasuryTablePage
    title="Payments"
    description="Vendor & supplier payments. Posting against a vendor invoice automatically marks it Paid."
    table="payments"
    orderBy="payment_date"
    searchKeys={["payment_no","vendor_name","reference"]}
    fields={[
      { key: "payment_no", label: "Payment No.", type: "text", required: true },
      { key: "payment_date", label: "Date", type: "date" },
      { key: "vendor_name", label: "Vendor / Payee", type: "text", required: true },
      { key: "vendor_invoice_id", label: "Applied to Vendor Invoice", type: "select", loadOptions: loadOpenVendorInvoices, allowEmpty: true, span: 2 },
      { key: "amount", label: "Amount", type: "number", default: 0 },
      { key: "currency", label: "Currency", type: "select", options: CURRENCIES, default: "USD" },
      { key: "exchange_rate", label: "FX Rate → Base", type: "number", default: 1 },
      { key: "base_currency", label: "Base Currency", type: "select", options: CURRENCIES, default: "USD" },
      { key: "method", label: "Method", type: "select", options: METHODS, default: "Bank Transfer" },
      { key: "reference", label: "Reference / Cheque #", type: "text" },
      { key: "status", label: "Status", type: "select", options: STATUS, default: "Posted" },
      { key: "notes", label: "Notes", type: "textarea", span: 2 },
    ]}
    columns={[
      { key: "payment_no", label: "No." },
      { key: "payment_date", label: "Date" },
      { key: "vendor_name", label: "Vendor" },
      { key: "method", label: "Method" },
      { key: "amount", label: "Amount", render: (r) => `${r.currency || ""} ${Number(r.amount || 0).toLocaleString()}` },
      { key: "base_amount", label: "Base", render: (r) => r.base_amount ? `${r.base_currency || ""} ${Number(r.base_amount).toLocaleString()}` : "—" },
      { key: "reference", label: "Reference" },
      { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    ]}
  />;
}
