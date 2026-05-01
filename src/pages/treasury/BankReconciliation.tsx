import TreasuryTablePage, { StatusBadge } from "@/components/treasury/TreasuryTablePage";
import { supabase } from "@/integrations/supabase/client";

const STATUS = [{value:"Open",label:"Open"},{value:"Reconciled",label:"Reconciled"},{value:"Closed",label:"Closed"}];

const loadBanks = async () => {
  const { data } = await supabase.from("bank_accounts").select("id,account_name,bank_name,currency").order("account_name");
  return (data || []).map((b: any) => ({ value: b.id, label: `${b.account_name} — ${b.bank_name || ""} (${b.currency || ""})` }));
};

export default function BankReconciliationPage() {
  return <TreasuryTablePage
    title="Bank Reconciliation"
    description="Reconcile bank statements vs system balance"
    table="bank_reconciliations"
    orderBy="statement_date"
    searchKeys={["status","notes"]}
    fields={[
      { key: "bank_account_id", label: "Bank Account", type: "select", loadOptions: loadBanks, required: true },
      { key: "statement_date", label: "Statement Date", type: "date", required: true },
      { key: "statement_balance", label: "Statement Balance", type: "number", default: 0 },
      { key: "system_balance", label: "System Balance", type: "number", default: 0 },
      { key: "difference", label: "Difference", type: "number", default: 0 },
      { key: "status", label: "Status", type: "select", options: STATUS, default: "Open" },
      { key: "notes", label: "Notes", type: "textarea" },
    ]}
    columns={[
      { key: "statement_date", label: "Statement Date" },
      { key: "statement_balance", label: "Statement", render: (r) => Number(r.statement_balance || 0).toLocaleString() },
      { key: "system_balance", label: "System", render: (r) => Number(r.system_balance || 0).toLocaleString() },
      { key: "difference", label: "Difference", render: (r) => Number(r.difference || 0).toLocaleString() },
      { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    ]}
  />;
}
