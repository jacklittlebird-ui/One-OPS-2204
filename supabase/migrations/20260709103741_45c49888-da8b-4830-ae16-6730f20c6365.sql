
-- =========================================================================
-- Phase 1a: Accounting Foundation
-- =========================================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.finance_currency AS ENUM ('EGP','AED','MAD','JOD','USD','EUR','SAR','GBP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.voucher_type AS ENUM ('receipt','payment','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.voucher_status AS ENUM ('draft','pending_approval','approved','posted','settled','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cheque_status AS ENUM ('issued','sent','cleared','bounced','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.collection_cheque_status AS ENUM ('received','deposited','cleared','bounced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.objection_status AS ENUM ('sent','under_negotiation','resolved','escalated','frozen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.loan_status AS ENUM ('requested','approved','rejected','active','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_direction AS ENUM ('AR','AP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- COMPANIES ----------
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  base_currency public.finance_currency NOT NULL,
  country TEXT,
  is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY companies_authenticated_all ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.companies (code, name, name_ar, base_currency, country, is_headquarters) VALUES
  ('LINK_EG','Link Egypt','لينك مصر','EGP','Egypt', TRUE),
  ('LINK_AE','Link UAE','لينك الإمارات','AED','United Arab Emirates', FALSE),
  ('LINK_MA','Link Morocco','لينك المغرب','MAD','Morocco', FALSE),
  ('LINK_JO','Link Jordan','لينك الأردن','JOD','Jordan', FALSE),
  ('LINK_GL','Link Global','لينك جلوبال','USD','Global', FALSE)
ON CONFLICT (code) DO NOTHING;

-- ---------- FINANCE STATIONS (linked to companies) ----------
CREATE TABLE IF NOT EXISTS public.finance_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_stations TO authenticated;
GRANT ALL ON public.finance_stations TO service_role;
ALTER TABLE public.finance_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_stations_authenticated_all ON public.finance_stations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_finance_stations_updated_at BEFORE UPDATE ON public.finance_stations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 9 Egyptian stations
INSERT INTO public.finance_stations (company_id, code, name)
SELECT c.id, s.code, s.name FROM public.companies c
CROSS JOIN (VALUES
  ('CAI','Cairo'),('HRG','Hurghada'),('SSH','Sharm El-Sheikh'),
  ('RMF','Marsa Alam'),('HBE','Alexandria'),('LXR','Luxor'),
  ('ASW','Aswan'),('ATZ','Assiut'),('HMB','Sohag')
) AS s(code,name)
WHERE c.code = 'LINK_EG'
ON CONFLICT (company_id, code) DO NOTHING;

-- ---------- EXCHANGE RATES (structure only) ----------
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date DATE NOT NULL,
  base_currency public.finance_currency NOT NULL,
  quote_currency public.finance_currency NOT NULL,
  buy_rate NUMERIC(15,6),
  sell_rate NUMERIC(15,6),
  mid_rate NUMERIC(15,6) NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rate_date, base_currency, quote_currency, source)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exchange_rates TO authenticated;
GRANT ALL ON public.exchange_rates TO service_role;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY exchange_rates_authenticated_all ON public.exchange_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- CUSTOMER (AIRLINE) PRICE LIST ----------
CREATE TABLE IF NOT EXISTS public.customer_price_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id UUID REFERENCES public.airlines(id) ON DELETE CASCADE,
  airline_iata TEXT,
  service_type TEXT NOT NULL,
  station_code TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_price NUMERIC(15,2) NOT NULL,
  currency public.finance_currency NOT NULL,
  unit TEXT NOT NULL DEFAULT 'flight',
  start_date DATE,
  end_date DATE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_price_list TO authenticated;
GRANT ALL ON public.customer_price_list TO service_role;
ALTER TABLE public.customer_price_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_price_list_authenticated_all ON public.customer_price_list FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_customer_price_list_updated_at BEFORE UPDATE ON public.customer_price_list
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_customer_price_list_lookup ON public.customer_price_list(airline_id, service_type, station_code);

-- ---------- SUPPLIER PRICE LIST ----------
CREATE TABLE IF NOT EXISTS public.supplier_price_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  station_code TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_cost NUMERIC(15,2) NOT NULL,
  currency public.finance_currency NOT NULL,
  unit TEXT NOT NULL DEFAULT 'flight',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_price_list TO authenticated;
GRANT ALL ON public.supplier_price_list TO service_role;
ALTER TABLE public.supplier_price_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_price_list_authenticated_all ON public.supplier_price_list FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_supplier_price_list_updated_at BEFORE UPDATE ON public.supplier_price_list
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_supplier_price_list_lookup ON public.supplier_price_list(supplier_id, service_type, station_code);

-- ---------- SUPPLIER BANK PROFILES ----------
CREATE TABLE IF NOT EXISTS public.supplier_bank_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  currency public.finance_currency NOT NULL,
  bank_name TEXT NOT NULL,
  branch TEXT,
  account_name TEXT,
  account_number TEXT,
  iban TEXT,
  swift TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_bank_profiles TO authenticated;
GRANT ALL ON public.supplier_bank_profiles TO service_role;
ALTER TABLE public.supplier_bank_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_bank_profiles_authenticated_all ON public.supplier_bank_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_supplier_bank_profiles_updated_at BEFORE UPDATE ON public.supplier_bank_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- EXTEND cash_accounts (custodies) ----------
ALTER TABLE public.cash_accounts
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES public.finance_stations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custody_type TEXT NOT NULL DEFAULT 'petty_cash',
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC(15,2) NOT NULL DEFAULT 0;

-- ---------- EXTEND bank_accounts ----------
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch TEXT;

-- ---------- TREASURY VOUCHERS ----------
CREATE TABLE IF NOT EXISTS public.treasury_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no TEXT NOT NULL UNIQUE,
  voucher_type public.voucher_type NOT NULL,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.finance_stations(id) ON DELETE SET NULL,
  cash_account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  party_name TEXT,
  party_type TEXT,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(15,2) NOT NULL,
  currency public.finance_currency NOT NULL,
  exchange_rate NUMERIC(15,6) NOT NULL DEFAULT 1,
  base_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  base_currency public.finance_currency,
  status public.voucher_status NOT NULL DEFAULT 'draft',
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  settled_by UUID,
  parent_pending_id UUID REFERENCES public.treasury_vouchers(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  flight_schedule_id UUID,
  service_type TEXT,
  airline_id UUID REFERENCES public.airlines(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasury_vouchers TO authenticated;
GRANT ALL ON public.treasury_vouchers TO service_role;
ALTER TABLE public.treasury_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY treasury_vouchers_authenticated_all ON public.treasury_vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_treasury_vouchers_updated_at BEFORE UPDATE ON public.treasury_vouchers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_treasury_vouchers_date ON public.treasury_vouchers(voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_vouchers_status ON public.treasury_vouchers(status);

-- ---------- COST REPORTS ----------
CREATE TABLE IF NOT EXISTS public.cost_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_no TEXT NOT NULL UNIQUE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.finance_stations(id) ON DELETE SET NULL,
  flight_schedule_id UUID,
  service_report_id UUID,
  airline_id UUID REFERENCES public.airlines(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  currency public.finance_currency NOT NULL,
  total_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_selling NUMERIC(15,2) NOT NULL DEFAULT 0,
  margin NUMERIC(15,2) GENERATED ALWAYS AS (total_selling - total_cost) STORED,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'draft',
  billed_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_reports TO authenticated;
GRANT ALL ON public.cost_reports TO service_role;
ALTER TABLE public.cost_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY cost_reports_authenticated_all ON public.cost_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cost_reports_updated_at BEFORE UPDATE ON public.cost_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.cost_report_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_report_id UUID NOT NULL REFERENCES public.cost_reports(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(15,3) NOT NULL DEFAULT 1,
  unit TEXT,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_selling NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_selling NUMERIC(15,2) NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_report_lines TO authenticated;
GRANT ALL ON public.cost_report_lines TO service_role;
ALTER TABLE public.cost_report_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY cost_report_lines_authenticated_all ON public.cost_report_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- NOTES PAYABLE (supplier cheques) ----------
CREATE TABLE IF NOT EXISTS public.notes_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cheque_no TEXT NOT NULL,
  cheque_date DATE NOT NULL,
  clearance_date DATE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  supplier_category TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency public.finance_currency NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  matched_invoices JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.cheque_status NOT NULL DEFAULT 'issued',
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  reconciliation_memo TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bank_account_id, cheque_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes_payable TO authenticated;
GRANT ALL ON public.notes_payable TO service_role;
ALTER TABLE public.notes_payable ENABLE ROW LEVEL SECURITY;
CREATE POLICY notes_payable_authenticated_all ON public.notes_payable FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_notes_payable_updated_at BEFORE UPDATE ON public.notes_payable
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- CHEQUES UNDER COLLECTION ----------
CREATE TABLE IF NOT EXISTS public.cheques_under_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cheque_no TEXT NOT NULL,
  cheque_date DATE NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deposit_date DATE,
  cleared_date DATE,
  drawn_on_bank TEXT,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.airlines(id) ON DELETE SET NULL,
  customer_name TEXT,
  amount NUMERIC(15,2) NOT NULL,
  currency public.finance_currency NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  status public.collection_cheque_status NOT NULL DEFAULT 'received',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cheques_under_collection TO authenticated;
GRANT ALL ON public.cheques_under_collection TO service_role;
ALTER TABLE public.cheques_under_collection ENABLE ROW LEVEL SECURITY;
CREATE POLICY cheques_under_collection_authenticated_all ON public.cheques_under_collection FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cheques_under_collection_updated_at BEFORE UPDATE ON public.cheques_under_collection
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- EXTEND bank_transfers (pending queue) ----------
ALTER TABLE public.bank_transfers
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_bank_profile_id UUID REFERENCES public.supplier_bank_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS supplier_category TEXT,
  ADD COLUMN IF NOT EXISTS payment_type TEXT,
  ADD COLUMN IF NOT EXISTS matched_invoices JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- ---------- INVOICE VARIANCE + OBJECTION ----------
CREATE TABLE IF NOT EXISTS public.invoice_variance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  vendor_invoice_id UUID REFERENCES public.vendor_invoices(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  flight_schedule_id UUID,
  variance_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  variance_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'minor',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolution TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_variance_reports TO authenticated;
GRANT ALL ON public.invoice_variance_reports TO service_role;
ALTER TABLE public.invoice_variance_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY variance_reports_authenticated_all ON public.invoice_variance_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_variance_reports_updated_at BEFORE UPDATE ON public.invoice_variance_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.objection_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_no TEXT NOT NULL UNIQUE,
  variance_report_id UUID REFERENCES public.invoice_variance_reports(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  flight_ref TEXT,
  flight_date DATE,
  disputed_service TEXT NOT NULL DEFAULT '',
  contracted_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  invoiced_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  difference NUMERIC(15,2) GENERATED ALWAYS AS (invoiced_price - contracted_price) STORED,
  currency public.finance_currency NOT NULL,
  status public.objection_status NOT NULL DEFAULT 'sent',
  payment_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  settled_amount NUMERIC(15,2),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  opened_by UUID,
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objection_letters TO authenticated;
GRANT ALL ON public.objection_letters TO service_role;
ALTER TABLE public.objection_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY objection_letters_authenticated_all ON public.objection_letters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_objection_letters_updated_at BEFORE UPDATE ON public.objection_letters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- SHORT-TERM LOANS ----------
CREATE TABLE IF NOT EXISTS public.short_term_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_no TEXT NOT NULL UNIQUE,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  employee_id UUID,
  employee_name TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.finance_stations(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,
  source_cash_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  source_bank_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency public.finance_currency NOT NULL,
  deduction_plan TEXT NOT NULL,
  installments INT NOT NULL DEFAULT 1,
  installments_paid INT NOT NULL DEFAULT 0,
  status public.loan_status NOT NULL DEFAULT 'requested',
  requested_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  voucher_id UUID REFERENCES public.treasury_vouchers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_term_loans TO authenticated;
GRANT ALL ON public.short_term_loans TO service_role;
ALTER TABLE public.short_term_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY short_term_loans_authenticated_all ON public.short_term_loans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_short_term_loans_updated_at BEFORE UPDATE ON public.short_term_loans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- FINANCE AUDIT LOG ----------
CREATE TABLE IF NOT EXISTS public.finance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  reason TEXT,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.finance_audit_log TO authenticated;
GRANT ALL ON public.finance_audit_log TO service_role;
ALTER TABLE public.finance_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_audit_log_read ON public.finance_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY finance_audit_log_insert ON public.finance_audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_finance_audit_entity ON public.finance_audit_log(entity_type, entity_id);

-- ---------- EXTEND chart_of_accounts ----------
ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requires_flight_link BOOLEAN NOT NULL DEFAULT FALSE;

-- Auto-mark accounts whose code begins with 8 as requiring a flight link.
UPDATE public.chart_of_accounts
SET requires_flight_link = TRUE
WHERE code LIKE '8%' AND requires_flight_link = FALSE;

CREATE OR REPLACE FUNCTION public.set_coa_flight_link_flag()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.code IS NOT NULL AND LEFT(NEW.code, 1) = '8' THEN
    NEW.requires_flight_link := TRUE;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_coa_flight_link_flag ON public.chart_of_accounts;
CREATE TRIGGER trg_coa_flight_link_flag BEFORE INSERT OR UPDATE OF code ON public.chart_of_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_coa_flight_link_flag();

-- ---------- EXTEND journal_entries ----------
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_currency public.finance_currency;

-- ---------- EXTEND journal_entry_lines (4 cost centres + multi-currency) ----------
ALTER TABLE public.journal_entry_lines
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES public.finance_stations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS airline_id UUID REFERENCES public.airlines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS flight_schedule_id UUID,
  ADD COLUMN IF NOT EXISTS transaction_currency public.finance_currency,
  ADD COLUMN IF NOT EXISTS transaction_amount NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15,6) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
  ADD COLUMN IF NOT EXISTS base_currency public.finance_currency,
  ADD COLUMN IF NOT EXISTS base_amount NUMERIC(15,2);

CREATE INDEX IF NOT EXISTS idx_jel_company ON public.journal_entry_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_jel_station ON public.journal_entry_lines(station_id);
CREATE INDEX IF NOT EXISTS idx_jel_airline ON public.journal_entry_lines(airline_id);
CREATE INDEX IF NOT EXISTS idx_jel_supplier ON public.journal_entry_lines(supplier_id);
CREATE INDEX IF NOT EXISTS idx_jel_flight ON public.journal_entry_lines(flight_schedule_id);

-- ---------- EXTEND invoices ----------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES public.finance_stations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_direction public.invoice_direction NOT NULL DEFAULT 'AR',
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS flight_schedule_id UUID,
  ADD COLUMN IF NOT EXISTS service_report_id UUID,
  ADD COLUMN IF NOT EXISTS draft_status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS transaction_currency public.finance_currency,
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15,6),
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
  ADD COLUMN IF NOT EXISTS base_currency public.finance_currency,
  ADD COLUMN IF NOT EXISTS base_total NUMERIC(15,2);

-- ---------- EXTEND contracts ----------
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- =========================================================================
-- End of Phase 1a
-- =========================================================================
