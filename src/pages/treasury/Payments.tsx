import TreasuryTablePage, { StatusBadge } from "@/components/treasury/TreasuryTablePage";

const CURRENCIES = ["USD","EUR","EGP","SAR","AED","GBP"].map(c => ({ value: c, label: c }));
const METHODS = ["Bank Transfer","Cheque","Cash","Credit Card","Online"].map(m => ({ value: m, label: m }));
const STATUS = [{value:"Posted",label:"Posted"},{value:"Draft",label:"Draft"},{value:"Void",label:"Void"}];

export default function PaymentsPage() {
  return <TreasuryTablePage
    title="Payments"
    description="Vendor & supplier payments"
    table="payments"
    orderBy="payment_date"
    searchKeys={["payment_no","vendor_name","reference"]}
    fields={[
      { key: "payment_no", label: "Payment No.", type: "text", required: true },
      { key: "payment_date", label: "Date", type: "date" },
      { key: "vendor_name", label: "Vendor / Payee", type: "text", required: true },
      { key: "amount", label: "Amount", type: "number", default: 0 },
      { key: "currency", label: "Currency", type: "select", options: CURRENCIES, default: "USD" },
      { key: "method", label: "Method", type: "select", options: METHODS, default: "Bank Transfer" },
      { key: "reference", label: "Reference / Cheque #", type: "text" },
      { key: "status", label: "Status", type: "select", options: STATUS, default: "Posted" },
      { key: "notes", label: "Notes", type: "textarea" },
    ]}
    columns={[
      { key: "payment_no", label: "No." },
      { key: "payment_date", label: "Date" },
      { key: "vendor_name", label: "Vendor" },
      { key: "method", label: "Method" },
      { key: "amount", label: "Amount", render: (r) => `${r.currency || ""} ${Number(r.amount || 0).toLocaleString()}` },
      { key: "reference", label: "Reference" },
      { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    ]}
  />;
}
