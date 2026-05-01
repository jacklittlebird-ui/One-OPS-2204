import TreasuryTablePage, { StatusBadge } from "@/components/treasury/TreasuryTablePage";

const CURRENCIES = ["USD","EUR","EGP","SAR","AED","GBP"].map(c => ({ value: c, label: c }));
const METHODS = ["Bank Transfer","Cheque","Cash","Credit Card","Online"].map(m => ({ value: m, label: m }));
const STATUS = [{value:"Posted",label:"Posted"},{value:"Draft",label:"Draft"},{value:"Void",label:"Void"}];

export default function ReceiptsPage() {
  return <TreasuryTablePage
    title="Receipts"
    description="Customer collections & receipts"
    table="receipts"
    orderBy="receipt_date"
    searchKeys={["receipt_no","customer_name","reference"]}
    fields={[
      { key: "receipt_no", label: "Receipt No.", type: "text", required: true },
      { key: "receipt_date", label: "Date", type: "date" },
      { key: "customer_name", label: "Customer / Payer", type: "text", required: true },
      { key: "amount", label: "Amount", type: "number", default: 0 },
      { key: "currency", label: "Currency", type: "select", options: CURRENCIES, default: "USD" },
      { key: "method", label: "Method", type: "select", options: METHODS, default: "Bank Transfer" },
      { key: "reference", label: "Reference", type: "text" },
      { key: "status", label: "Status", type: "select", options: STATUS, default: "Posted" },
      { key: "notes", label: "Notes", type: "textarea" },
    ]}
    columns={[
      { key: "receipt_no", label: "No." },
      { key: "receipt_date", label: "Date" },
      { key: "customer_name", label: "Customer" },
      { key: "method", label: "Method" },
      { key: "amount", label: "Amount", render: (r) => `${r.currency || ""} ${Number(r.amount || 0).toLocaleString()}` },
      { key: "reference", label: "Reference" },
      { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    ]}
  />;
}
