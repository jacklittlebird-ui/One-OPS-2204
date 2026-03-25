
-- =====================================================
-- PHASE 2-4: Accounting, Advanced Invoicing, Incentives
-- =====================================================

-- 1. Account Types Enum
CREATE TYPE public.account_type AS ENUM ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense');
CREATE TYPE public.journal_status AS ENUM ('Draft', 'Posted', 'Void');
CREATE TYPE public.invoice_type AS ENUM ('Preliminary', 'Final');
CREATE TYPE public.incentive_type AS ENUM ('Volume', 'Revenue', 'Growth', 'Loyalty', 'Performance');
CREATE TYPE public.incentive_period AS ENUM ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual');

-- 2. Chart of Accounts
CREATE TABLE public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_ar text NOT NULL DEFAULT '',
  account_type account_type NOT NULL,
  parent_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  level integer NOT NULL DEFAULT 1,
  is_group boolean NOT NULL DEFAULT false,
  opening_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read chart_of_accounts" ON public.chart_of_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert chart_of_accounts" ON public.chart_of_accounts FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can update chart_of_accounts" ON public.chart_of_accounts FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete chart_of_accounts" ON public.chart_of_accounts FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- 3. Journal Entries
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  reference_type text NOT NULL DEFAULT '',
  reference_id uuid,
  status journal_status NOT NULL DEFAULT 'Draft',
  posted_at timestamptz,
  total_debit numeric NOT NULL DEFAULT 0,
  total_credit numeric NOT NULL DEFAULT 0,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read journal_entries" ON public.journal_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert journal_entries" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update journal_entries" ON public.journal_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin can delete journal_entries" ON public.journal_entries FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- 4. Journal Entry Lines
CREATE TABLE public.journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES public.journal_entries(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT NOT NULL,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read journal_entry_lines" ON public.journal_entry_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert journal_entry_lines" ON public.journal_entry_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update journal_entry_lines" ON public.journal_entry_lines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin can delete journal_entry_lines" ON public.journal_entry_lines FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- 5. Vendor Invoices (supplier invoices)
CREATE TABLE public.vendor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL,
  vendor_name text NOT NULL DEFAULT '',
  vendor_id uuid REFERENCES public.service_providers(id) ON DELETE SET NULL,
  service_report_id uuid REFERENCES public.service_reports(id) ON DELETE SET NULL,
  client_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT (CURRENT_DATE + interval '30 days'),
  amount numeric NOT NULL DEFAULT 0,
  vat numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'Draft',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read vendor_invoices" ON public.vendor_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert vendor_invoices" ON public.vendor_invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update vendor_invoices" ON public.vendor_invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin can delete vendor_invoices" ON public.vendor_invoices FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- 6. Add invoice_type to existing invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'Preliminary';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS finalized_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS finalized_by text DEFAULT '';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sent_to text DEFAULT '';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL;

-- 7. Airline Incentives
CREATE TABLE public.airline_incentives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id uuid REFERENCES public.airlines(id) ON DELETE CASCADE NOT NULL,
  incentive_type incentive_type NOT NULL DEFAULT 'Volume',
  period incentive_period NOT NULL DEFAULT 'Quarterly',
  threshold numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  max_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.airline_incentives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read airline_incentives" ON public.airline_incentives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert airline_incentives" ON public.airline_incentives FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can update airline_incentives" ON public.airline_incentives FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete airline_incentives" ON public.airline_incentives FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- 8. Trigger to auto-calculate vendor invoice total
CREATE OR REPLACE FUNCTION public.calc_vendor_invoice_total()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.total := COALESCE(NEW.amount, 0) + COALESCE(NEW.vat, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vendor_invoice_total
  BEFORE INSERT OR UPDATE ON public.vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION public.calc_vendor_invoice_total();

-- 9. Trigger to update journal entry totals
CREATE OR REPLACE FUNCTION public.update_journal_totals()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.journal_entries SET
    total_debit = (SELECT COALESCE(SUM(debit), 0) FROM public.journal_entry_lines WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)),
    total_credit = (SELECT COALESCE(SUM(credit), 0) FROM public.journal_entry_lines WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id))
  WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_journal_totals();

-- 10. Seed Chart of Accounts
INSERT INTO public.chart_of_accounts (code, name, name_ar, account_type, level, is_group) VALUES
  -- Assets
  ('1000', 'Assets', 'الأصول', 'Asset', 1, true),
  ('1100', 'Current Assets', 'الأصول المتداولة', 'Asset', 2, true),
  ('1110', 'Cash & Bank', 'النقدية والبنوك', 'Asset', 3, true),
  ('1111', 'Cash in Hand', 'الصندوق', 'Asset', 4, false),
  ('1112', 'Bank - USD', 'البنك - دولار', 'Asset', 4, false),
  ('1113', 'Bank - EUR', 'البنك - يورو', 'Asset', 4, false),
  ('1114', 'Bank - EGP', 'البنك - جنيه مصري', 'Asset', 4, false),
  ('1200', 'Accounts Receivable', 'المدينون', 'Asset', 2, true),
  ('1210', 'Airline Receivables', 'مدينون شركات الطيران', 'Asset', 3, false),
  ('1220', 'Other Receivables', 'مدينون آخرون', 'Asset', 3, false),
  ('1300', 'Prepaid Expenses', 'مصروفات مقدمة', 'Asset', 2, false),
  ('1400', 'Fixed Assets', 'الأصول الثابتة', 'Asset', 2, true),
  ('1410', 'Equipment', 'المعدات', 'Asset', 3, false),
  ('1420', 'Vehicles', 'السيارات', 'Asset', 3, false),
  ('1430', 'Accumulated Depreciation', 'مجمع الإهلاك', 'Asset', 3, false),
  -- Liabilities
  ('2000', 'Liabilities', 'الالتزامات', 'Liability', 1, true),
  ('2100', 'Current Liabilities', 'الالتزامات المتداولة', 'Liability', 2, true),
  ('2110', 'Accounts Payable', 'الدائنون', 'Liability', 3, false),
  ('2120', 'Vendor Payables', 'مستحقات الموردين', 'Liability', 3, false),
  ('2130', 'VAT Payable', 'ضريبة القيمة المضافة', 'Liability', 3, false),
  ('2140', 'Accrued Expenses', 'مصروفات مستحقة', 'Liability', 3, false),
  ('2200', 'Long-term Liabilities', 'الالتزامات طويلة الأجل', 'Liability', 2, true),
  ('2210', 'Loans', 'القروض', 'Liability', 3, false),
  -- Equity
  ('3000', 'Equity', 'حقوق الملكية', 'Equity', 1, true),
  ('3100', 'Capital', 'رأس المال', 'Equity', 2, false),
  ('3200', 'Retained Earnings', 'أرباح مرحلة', 'Equity', 2, false),
  ('3300', 'Current Year Earnings', 'أرباح العام الحالي', 'Equity', 2, false),
  -- Revenue
  ('4000', 'Revenue', 'الإيرادات', 'Revenue', 1, true),
  ('4100', 'Handling Revenue', 'إيرادات الخدمات الأرضية', 'Revenue', 2, false),
  ('4200', 'Civil Aviation Revenue', 'إيرادات الطيران المدني', 'Revenue', 2, false),
  ('4300', 'Airport Charges Revenue', 'إيرادات رسوم المطار', 'Revenue', 2, false),
  ('4400', 'Catering Revenue', 'إيرادات التموين', 'Revenue', 2, false),
  ('4500', 'VIP Services Revenue', 'إيرادات خدمات كبار الشخصيات', 'Revenue', 2, false),
  ('4600', 'Overfly Revenue', 'إيرادات العبور الجوي', 'Revenue', 2, false),
  ('4700', 'Other Revenue', 'إيرادات أخرى', 'Revenue', 2, false),
  ('4800', 'Incentive Revenue', 'إيرادات الحوافز', 'Revenue', 2, false),
  -- Expenses
  ('5000', 'Expenses', 'المصروفات', 'Expense', 1, true),
  ('5100', 'Cost of Services', 'تكلفة الخدمات', 'Expense', 2, true),
  ('5110', 'Ground Handling Costs', 'تكاليف الخدمات الأرضية', 'Expense', 3, false),
  ('5120', 'Civil Aviation Costs', 'تكاليف الطيران المدني', 'Expense', 3, false),
  ('5130', 'Airport Charges Costs', 'تكاليف رسوم المطار', 'Expense', 3, false),
  ('5140', 'Catering Costs', 'تكاليف التموين', 'Expense', 3, false),
  ('5150', 'Transport Costs', 'تكاليف النقل', 'Expense', 3, false),
  ('5160', 'Hotac Costs', 'تكاليف الفنادق', 'Expense', 3, false),
  ('5200', 'Operating Expenses', 'مصروفات تشغيلية', 'Expense', 2, true),
  ('5210', 'Salaries & Wages', 'الرواتب والأجور', 'Expense', 3, false),
  ('5220', 'Rent', 'الإيجارات', 'Expense', 3, false),
  ('5230', 'Utilities', 'المرافق', 'Expense', 3, false),
  ('5240', 'Insurance', 'التأمين', 'Expense', 3, false),
  ('5250', 'Depreciation', 'الإهلاك', 'Expense', 3, false),
  ('5260', 'Office Supplies', 'مستلزمات مكتبية', 'Expense', 3, false),
  ('5270', 'Communication', 'الاتصالات', 'Expense', 3, false),
  ('5280', 'Travel & Entertainment', 'السفر والضيافة', 'Expense', 3, false),
  ('5300', 'Financial Expenses', 'مصروفات مالية', 'Expense', 2, true),
  ('5310', 'Bank Charges', 'عمولات بنكية', 'Expense', 3, false),
  ('5320', 'Interest Expense', 'مصروفات الفوائد', 'Expense', 3, false),
  ('5330', 'Exchange Loss', 'خسائر فروق عملة', 'Expense', 3, false),
  ('5400', 'Incentive Expenses', 'مصروفات الحوافز', 'Expense', 2, false);

-- Set parent_id relationships
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '1000') WHERE code IN ('1100', '1200', '1300', '1400');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '1100') WHERE code = '1110';
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '1110') WHERE code IN ('1111', '1112', '1113', '1114');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '1200') WHERE code IN ('1210', '1220');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '1400') WHERE code IN ('1410', '1420', '1430');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '2000') WHERE code IN ('2100', '2200');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '2100') WHERE code IN ('2110', '2120', '2130', '2140');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '2200') WHERE code = '2210';
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '3000') WHERE code IN ('3100', '3200', '3300');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '4000') WHERE code IN ('4100', '4200', '4300', '4400', '4500', '4600', '4700', '4800');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '5000') WHERE code IN ('5100', '5200', '5300', '5400');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '5100') WHERE code IN ('5110', '5120', '5130', '5140', '5150', '5160');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '5200') WHERE code IN ('5210', '5220', '5230', '5240', '5250', '5260', '5270', '5280');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '5300') WHERE code IN ('5310', '5320', '5330');
