import TreasuryTablePage, { StatusBadge } from "@/components/treasury/TreasuryTablePage";

const CURRENCIES = ["USD","EUR","EGP","SAR","AED","GBP"].map(c => ({ value: c, label: c }));
const STATUS = [{value:"Posted",label:"Posted"},{value:"Draft",label:"Draft"},{value:"Void",label:"Void"}];

export default function BankTransfersPage() {
  return <TreasuryTablePage
    title="Bank Transfers"
    description="Transfers between bank/cash accounts"
    table="bank_transfers"
    orderBy="transfer_date"
    searchKeys={["transfer_no","reference"]}
    fields={[
      { key: "transfer_no", label: "Transfer No.", type: "text", required: true },
      { key: "transfer_date", label: "Date", type: "date" },
      { key: "amount", label: "Amount", type: "number", default: 0 },
      { key: "currency", label: "Currency", type: "select", options: CURRENCIES, default: "USD" },
      { key: "fees", label: "Fees", type: "number", default: 0 },
      { key: "reference", label: "Reference", type: "text" },
      { key: "status", label: "Status", type: "select", options: STATUS, default: "Posted" },
      { key: "notes", label: "Notes", type: "textarea" },
    ]}
    columns={[
      { key: "transfer_no", label: "No." },
      { key: "transfer_date", label: "Date" },
      { key: "amount", label: "Amount", render: (r) => `${r.currency || ""} ${Number(r.amount || 0).toLocaleString()}` },
      { key: "fees", label: "Fees", render: (r) => Number(r.fees || 0).toLocaleString() },
      { key: "reference", label: "Reference" },
      { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    ]}
  />;
}
