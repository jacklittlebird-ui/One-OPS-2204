import TreasuryTablePage, { StatusBadge } from "@/components/treasury/TreasuryTablePage";

const CURRENCIES = ["USD","EUR","EGP","SAR","AED","GBP"].map(c => ({ value: c, label: c }));
const STATUS = [{value:"Active",label:"Active"},{value:"Inactive",label:"Inactive"}];

export default function CashAccountsPage() {
  return <TreasuryTablePage
    title="Cash Accounts"
    description="Petty cash and cash on hand"
    table="cash_accounts"
    orderBy="account_name"
    searchKeys={["account_name","location","custodian"]}
    fields={[
      { key: "account_name", label: "Account Name", type: "text", required: true },
      { key: "location", label: "Location", type: "text" },
      { key: "custodian", label: "Custodian", type: "text" },
      { key: "currency", label: "Currency", type: "select", options: CURRENCIES, default: "USD" },
      { key: "opening_balance", label: "Opening Balance", type: "number", default: 0 },
      { key: "current_balance", label: "Current Balance", type: "number", default: 0 },
      { key: "status", label: "Status", type: "select", options: STATUS, default: "Active" },
      { key: "notes", label: "Notes", type: "textarea" },
    ]}
    columns={[
      { key: "account_name", label: "Account" },
      { key: "location", label: "Location" },
      { key: "custodian", label: "Custodian" },
      { key: "currency", label: "Currency" },
      { key: "current_balance", label: "Balance", render: (r) => Number(r.current_balance || 0).toLocaleString() },
      { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    ]}
  />;
}
