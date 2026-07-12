
CREATE TABLE public.purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_no TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id),
  department TEXT,
  requested_by TEXT,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  needed_by DATE,
  currency TEXT NOT NULL DEFAULT 'EGP',
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  approved_at TIMESTAMPTZ,
  converted_po_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_requisition_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_requisitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_requisition_lines TO authenticated;
GRANT ALL ON public.purchase_requisitions TO service_role;
GRANT ALL ON public.purchase_requisition_lines TO service_role;

ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requisition_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages requisitions" ON public.purchase_requisitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

CREATE POLICY "Finance manages requisition lines" ON public.purchase_requisition_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id),
  vendor_name TEXT NOT NULL,
  vendor_id UUID,
  requisition_id UUID REFERENCES public.purchase_requisitions(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  currency TEXT NOT NULL DEFAULT 'EGP',
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  received_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  invoiced_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  received_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_lines TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
GRANT ALL ON public.purchase_order_lines TO service_role;

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages POs" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

CREATE POLICY "Finance manages PO lines" ON public.purchase_order_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

CREATE TABLE public.purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT NOT NULL UNIQUE,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
  po_line_id UUID NOT NULL REFERENCES public.purchase_order_lines(id),
  received_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_receipt_lines TO authenticated;
GRANT ALL ON public.purchase_receipts TO service_role;
GRANT ALL ON public.purchase_receipt_lines TO service_role;

ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipt_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages receipts" ON public.purchase_receipts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

CREATE POLICY "Finance manages receipt lines" ON public.purchase_receipt_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

CREATE OR REPLACE FUNCTION public.calc_procurement_line_total()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.line_total := ROUND(
    COALESCE(NEW.quantity,0) * COALESCE(NEW.unit_price,0)
    * (1 - COALESCE(NEW.discount_pct,0)/100)
    * (1 + COALESCE(NEW.tax_pct,0)/100), 2);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_req_line_total BEFORE INSERT OR UPDATE ON public.purchase_requisition_lines
  FOR EACH ROW EXECUTE FUNCTION public.calc_procurement_line_total();
CREATE TRIGGER trg_po_line_total BEFORE INSERT OR UPDATE ON public.purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.calc_procurement_line_total();

CREATE OR REPLACE FUNCTION public.refresh_requisition_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _rid UUID := COALESCE(NEW.requisition_id, OLD.requisition_id);
BEGIN
  UPDATE public.purchase_requisitions r
  SET subtotal = COALESCE(s.sub,0),
      tax_total = COALESCE(s.tax,0),
      grand_total = COALESCE(s.tot,0),
      updated_at = now()
  FROM (
    SELECT
      SUM(quantity*unit_price*(1-discount_pct/100)) AS sub,
      SUM(quantity*unit_price*(1-discount_pct/100)*(tax_pct/100)) AS tax,
      SUM(line_total) AS tot
    FROM public.purchase_requisition_lines WHERE requisition_id = _rid
  ) s
  WHERE r.id = _rid;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_req_totals AFTER INSERT OR UPDATE OR DELETE ON public.purchase_requisition_lines
  FOR EACH ROW EXECUTE FUNCTION public.refresh_requisition_totals();

CREATE OR REPLACE FUNCTION public.refresh_po_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _pid UUID := COALESCE(NEW.po_id, OLD.po_id);
BEGIN
  UPDATE public.purchase_orders p
  SET subtotal = COALESCE(s.sub,0),
      discount_total = COALESCE(s.disc,0),
      tax_total = COALESCE(s.tax,0),
      grand_total = COALESCE(s.tot,0),
      received_total = COALESCE(s.recv,0),
      updated_at = now()
  FROM (
    SELECT
      SUM(quantity*unit_price) AS sub,
      SUM(quantity*unit_price*(discount_pct/100)) AS disc,
      SUM(quantity*unit_price*(1-discount_pct/100)*(tax_pct/100)) AS tax,
      SUM(line_total) AS tot,
      SUM(received_qty*unit_price*(1-discount_pct/100)*(1+tax_pct/100)) AS recv
    FROM public.purchase_order_lines WHERE po_id = _pid
  ) s
  WHERE p.id = _pid;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_po_totals AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.refresh_po_totals();

CREATE OR REPLACE FUNCTION public.convert_requisition_to_po(_req_id UUID, _vendor_name TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _po_id UUID; _no TEXT; _r RECORD;
BEGIN
  SELECT * INTO _r FROM public.purchase_requisitions WHERE id = _req_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Requisition not found'; END IF;
  _no := 'PO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);
  INSERT INTO public.purchase_orders (po_no, company_id, vendor_name, requisition_id, currency, status, notes)
  VALUES (_no, _r.company_id, _vendor_name, _req_id, _r.currency, 'draft', _r.notes)
  RETURNING id INTO _po_id;
  INSERT INTO public.purchase_order_lines (po_id, item_description, quantity, unit_price, discount_pct, tax_pct, notes)
  SELECT _po_id, item_description, quantity, unit_price, discount_pct, tax_pct, notes
  FROM public.purchase_requisition_lines WHERE requisition_id = _req_id;
  UPDATE public.purchase_requisitions SET status = 'converted', converted_po_id = _po_id WHERE id = _req_id;
  RETURN _po_id;
END $$;

GRANT EXECUTE ON FUNCTION public.convert_requisition_to_po(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.receive_purchase_order(_po_id UUID, _lines JSONB, _received_by TEXT DEFAULT NULL, _notes TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rcpt_id UUID; _no TEXT; _line JSONB; _po_line_id UUID; _qty NUMERIC; _fully BOOLEAN;
BEGIN
  _no := 'GRN-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6);
  INSERT INTO public.purchase_receipts (receipt_no, po_id, received_by, notes)
  VALUES (_no, _po_id, _received_by, _notes) RETURNING id INTO _rcpt_id;
  FOR _line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    _po_line_id := (_line->>'po_line_id')::UUID;
    _qty := (_line->>'received_qty')::NUMERIC;
    INSERT INTO public.purchase_receipt_lines (receipt_id, po_line_id, received_qty)
    VALUES (_rcpt_id, _po_line_id, _qty);
    UPDATE public.purchase_order_lines
      SET received_qty = COALESCE(received_qty,0) + _qty
      WHERE id = _po_line_id;
  END LOOP;
  SELECT NOT EXISTS (
    SELECT 1 FROM public.purchase_order_lines WHERE po_id = _po_id AND received_qty < quantity
  ) INTO _fully;
  UPDATE public.purchase_orders
    SET status = CASE WHEN _fully THEN 'received' ELSE 'partially_received' END
    WHERE id = _po_id AND status IN ('draft','approved','sent','partially_received');
  RETURN _rcpt_id;
END $$;

GRANT EXECUTE ON FUNCTION public.receive_purchase_order(UUID, JSONB, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.three_way_match_po(_po_id UUID)
RETURNS TABLE (po_total NUMERIC, received_total NUMERIC, invoiced_total NUMERIC, match_status TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _pt NUMERIC; _rt NUMERIC; _it NUMERIC;
BEGIN
  SELECT grand_total, received_total, invoiced_total INTO _pt, _rt, _it
  FROM public.purchase_orders WHERE id = _po_id;
  RETURN QUERY SELECT _pt, _rt, _it,
    CASE
      WHEN _pt IS NULL THEN 'not_found'
      WHEN ABS(COALESCE(_pt,0)-COALESCE(_rt,0)) < 0.01 AND ABS(COALESCE(_pt,0)-COALESCE(_it,0)) < 0.01 THEN 'matched'
      WHEN COALESCE(_rt,0) < COALESCE(_pt,0) AND COALESCE(_it,0) < COALESCE(_pt,0) THEN 'pending'
      ELSE 'variance'
    END;
END $$;

GRANT EXECUTE ON FUNCTION public.three_way_match_po(UUID) TO authenticated;

CREATE TRIGGER trg_req_updated BEFORE UPDATE ON public.purchase_requisitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
