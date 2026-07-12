
-- QUOTATIONS
CREATE TABLE public.sales_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE,
  airline_id uuid REFERENCES public.airlines(id) ON DELETE SET NULL,
  station text,
  company text,
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  discount_total numeric(18,2) NOT NULL DEFAULT 0,
  tax_total numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_quotations TO authenticated;
GRANT ALL ON public.sales_quotations TO service_role;
ALTER TABLE public.sales_quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes readable by authenticated" ON public.sales_quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "quotes managed by admin/finance" ON public.sales_quotations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE TABLE public.sales_quotation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.sales_quotations(id) ON DELETE CASCADE,
  service_code text,
  description text NOT NULL,
  quantity numeric(18,3) NOT NULL DEFAULT 1,
  unit_price numeric(18,4) NOT NULL DEFAULT 0,
  discount_pct numeric(6,2) NOT NULL DEFAULT 0,
  tax_pct numeric(6,2) NOT NULL DEFAULT 0,
  line_total numeric(18,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_quotation_lines TO authenticated;
GRANT ALL ON public.sales_quotation_lines TO service_role;
ALTER TABLE public.sales_quotation_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quote lines readable" ON public.sales_quotation_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "quote lines managed by admin/finance" ON public.sales_quotation_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE INDEX idx_quote_lines_q ON public.sales_quotation_lines(quotation_id);

-- ORDERS
CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  source_quotation_id uuid REFERENCES public.sales_quotations(id) ON DELETE SET NULL,
  airline_id uuid REFERENCES public.airlines(id) ON DELETE SET NULL,
  station text,
  company text,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','in_progress','delivered','invoiced','cancelled')),
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  discount_total numeric(18,2) NOT NULL DEFAULT 0,
  tax_total numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  invoice_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_orders TO authenticated;
GRANT ALL ON public.sales_orders TO service_role;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders readable" ON public.sales_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders managed by admin/finance" ON public.sales_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE TABLE public.sales_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  service_code text,
  description text NOT NULL,
  quantity numeric(18,3) NOT NULL DEFAULT 1,
  unit_price numeric(18,4) NOT NULL DEFAULT 0,
  discount_pct numeric(6,2) NOT NULL DEFAULT 0,
  tax_pct numeric(6,2) NOT NULL DEFAULT 0,
  line_total numeric(18,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_order_lines TO authenticated;
GRANT ALL ON public.sales_order_lines TO service_role;
ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order lines readable" ON public.sales_order_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "order lines managed by admin/finance" ON public.sales_order_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE INDEX idx_order_lines_o ON public.sales_order_lines(order_id);

-- Line total compute
CREATE OR REPLACE FUNCTION public.compute_sales_line_total()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE gross numeric; disc numeric; net numeric; tax numeric;
BEGIN
  gross := COALESCE(NEW.quantity,0) * COALESCE(NEW.unit_price,0);
  disc := gross * (COALESCE(NEW.discount_pct,0)/100.0);
  net := gross - disc;
  tax := net * (COALESCE(NEW.tax_pct,0)/100.0);
  NEW.line_total := ROUND(net + tax, 2);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_quote_line_total BEFORE INSERT OR UPDATE ON public.sales_quotation_lines
  FOR EACH ROW EXECUTE FUNCTION public.compute_sales_line_total();
CREATE TRIGGER trg_order_line_total BEFORE INSERT OR UPDATE ON public.sales_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.compute_sales_line_total();

-- Header totals aggregators
CREATE OR REPLACE FUNCTION public.aggregate_quote_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _q uuid;
BEGIN
  _q := COALESCE(NEW.quotation_id, OLD.quotation_id);
  UPDATE public.sales_quotations q SET
    subtotal = COALESCE((SELECT SUM(quantity*unit_price) FROM public.sales_quotation_lines WHERE quotation_id=_q),0),
    discount_total = COALESCE((SELECT SUM(quantity*unit_price*discount_pct/100) FROM public.sales_quotation_lines WHERE quotation_id=_q),0),
    tax_total = COALESCE((SELECT SUM((quantity*unit_price*(1-discount_pct/100))*tax_pct/100) FROM public.sales_quotation_lines WHERE quotation_id=_q),0),
    total_amount = COALESCE((SELECT SUM(line_total) FROM public.sales_quotation_lines WHERE quotation_id=_q),0),
    updated_at = now()
  WHERE q.id = _q;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_quote_totals AFTER INSERT OR UPDATE OR DELETE ON public.sales_quotation_lines
  FOR EACH ROW EXECUTE FUNCTION public.aggregate_quote_totals();

CREATE OR REPLACE FUNCTION public.aggregate_order_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _o uuid;
BEGIN
  _o := COALESCE(NEW.order_id, OLD.order_id);
  UPDATE public.sales_orders o SET
    subtotal = COALESCE((SELECT SUM(quantity*unit_price) FROM public.sales_order_lines WHERE order_id=_o),0),
    discount_total = COALESCE((SELECT SUM(quantity*unit_price*discount_pct/100) FROM public.sales_order_lines WHERE order_id=_o),0),
    tax_total = COALESCE((SELECT SUM((quantity*unit_price*(1-discount_pct/100))*tax_pct/100) FROM public.sales_order_lines WHERE order_id=_o),0),
    total_amount = COALESCE((SELECT SUM(line_total) FROM public.sales_order_lines WHERE order_id=_o),0),
    updated_at = now()
  WHERE o.id = _o;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_order_totals AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.aggregate_order_totals();

-- updated_at
CREATE TRIGGER trg_sales_quotations_updated BEFORE UPDATE ON public.sales_quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sales_orders_updated BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Convert quote to order
CREATE OR REPLACE FUNCTION public.convert_quotation_to_order(_quote_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q record; new_id uuid; new_number text;
BEGIN
  SELECT * INTO q FROM public.sales_quotations WHERE id = _quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found'; END IF;
  IF q.status NOT IN ('accepted','sent','draft') THEN RAISE EXCEPTION 'Quote status % cannot be converted', q.status; END IF;

  new_number := 'SO-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6);
  INSERT INTO public.sales_orders(order_number, source_quotation_id, airline_id, station, company, order_date, status, currency, notes, created_by)
  VALUES (new_number, q.id, q.airline_id, q.station, q.company, CURRENT_DATE, 'confirmed', q.currency, q.notes, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.sales_order_lines(order_id, service_code, description, quantity, unit_price, discount_pct, tax_pct, sort_order)
  SELECT new_id, service_code, description, quantity, unit_price, discount_pct, tax_pct, sort_order
  FROM public.sales_quotation_lines WHERE quotation_id = _quote_id;

  UPDATE public.sales_quotations SET status = 'converted', updated_at = now() WHERE id = _quote_id;
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.convert_quotation_to_order(uuid) TO authenticated;

-- Convert order to invoice (skeleton — inserts basic invoice header)
CREATE OR REPLACE FUNCTION public.convert_order_to_invoice(_order_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; new_invoice uuid; new_number text;
BEGIN
  SELECT * INTO o FROM public.sales_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status IN ('invoiced','cancelled') THEN RAISE EXCEPTION 'Order already %', o.status; END IF;

  new_number := 'INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6);
  INSERT INTO public.invoices(invoice_number, airline_id, station, invoice_date, due_date, total_amount, status, currency, notes)
  VALUES (new_number, o.airline_id, o.station, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', o.total_amount, 'draft', o.currency, 'From order ' || o.order_number)
  RETURNING id INTO new_invoice;

  UPDATE public.sales_orders SET status = 'invoiced', invoice_id = new_invoice, updated_at = now() WHERE id = _order_id;
  RETURN new_invoice;
END; $$;
GRANT EXECUTE ON FUNCTION public.convert_order_to_invoice(uuid) TO authenticated;
