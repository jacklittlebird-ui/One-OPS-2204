import TreasuryTablePage, { StatusBadge } from "@/components/treasury/TreasuryTablePage";

const CURRENCIES = ["USD","EUR","EGP","SAR","AED","GBP"].map(c => ({ value: c, label: c }));
const STATUS = [{value:"Active",label:"Active"},{value:"Inactive",label:"Inactive"},{value:"Closed",label:"Closed"}];

export default function BankAccountsPage() {
  return <TreasuryTablePage
    title="Bank Accounts"
    description="Manage your company bank accounts"
    table="bank_accounts"
    orderBy="account_name"
    searchKeys={["account_name","bank_name","account_number","iban"]}
    fields={[
      { key: "account_name", label: "Account Name", type: "text", required: true },
      { key: "bank_name", label: "Bank Name", type: "text", required: true },
      { key: "account_number", label: "Account Number", type: "text" },
      { key: "iban", label: "IBAN", type: "text" },
      { key: "swift", label: "SWIFT/BIC", type: "text" },
      { key: "currency", label: "Currency", type: "select", options: CURRENCIES, default: "USD" },
      { key: "opening_balance", label: "Opening Balance", type: "number", default: 0 },
      { key: "current_balance", label: "Current Balance", type: "number", default: 0 },
      { key: "status", label: "Status", type: "select", options: STATUS, default: "Active" },
      { key: "notes", label: "Notes", type: "textarea" },
    ]}
    columns={[
      { key: "account_name", label: "Account" },
      { key: "bank_name", label: "Bank" },
      { key: "iban", label: "IBAN" },
      { key: "currency", label: "Currency" },
      { key: "current_balance", label: "Balance", render: (r) => Number(r.current_balance || 0).toLocaleString() },
      { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    ]}
  />;
}
