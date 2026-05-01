import TreasuryTablePage, { StatusBadge } from "@/components/treasury/TreasuryTablePage";
import { supabase } from "@/integrations/supabase/client";

const CURRENCIES = ["USD","EUR","EGP","SAR","AED","GBP"].map(c => ({ value: c, label: c }));
const STATUS = [{value:"Posted",label:"Posted"},{value:"Draft",label:"Draft"},{value:"Void",label:"Void"}];

const loadBanks = async () => {
  const { data } = await supabase.from("bank_accounts").select("id,account_name,bank_name,currency").order("account_name");
  return (data || []).map((b: any) => ({ value: b.id, label: `🏦 ${b.account_name} — ${b.bank_name || ""} (${b.currency || ""})` }));
};
const loadCash = async () => {
  const { data } = await supabase.from("cash_accounts").select("id,account_name,currency").order("account_name");
  return (data || []).map((c: any) => ({ value: c.id, label: `💵 ${c.account_name} (${c.currency || ""})` }));
};

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
      { key: "from_bank_id", label: "From Bank Account", type: "select", loadOptions: loadBanks, allowEmpty: true },
      { key: "from_cash_id", label: "From Cash Account", type: "select", loadOptions: loadCash, allowEmpty: true },
      { key: "to_bank_id", label: "To Bank Account", type: "select", loadOptions: loadBanks, allowEmpty: true },
      { key: "to_cash_id", label: "To Cash Account", type: "select", loadOptions: loadCash, allowEmpty: true },
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
