
-- ITEM MASTER
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  uom text NOT NULL DEFAULT 'EA',
  standard_cost numeric(18,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  reorder_level numeric(18,4) NOT NULL DEFAULT 0,
  reorder_qty numeric(18,4) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages items" ON public.inventory_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

-- WAREHOUSES
CREATE TABLE public.inventory_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  company_id uuid,
  station_code text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_warehouses TO authenticated;
GRANT ALL ON public.inventory_warehouses TO service_role;
ALTER TABLE public.inventory_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages warehouses" ON public.inventory_warehouses FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

-- STOCK (item x warehouse)
CREATE TABLE public.inventory_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE CASCADE,
  qty_on_hand numeric(18,4) NOT NULL DEFAULT 0,
  avg_cost numeric(18,4) NOT NULL DEFAULT 0,
  last_movement_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, warehouse_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_stock TO authenticated;
GRANT ALL ON public.inventory_stock TO service_role;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance views stock" ON public.inventory_stock FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

-- MOVEMENTS
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_no text,
  movement_type text NOT NULL CHECK (movement_type IN ('receipt','issue','transfer_in','transfer_out','adjustment')),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id),
  warehouse_id uuid NOT NULL REFERENCES public.inventory_warehouses(id),
  counterparty_warehouse_id uuid REFERENCES public.inventory_warehouses(id),
  qty numeric(18,4) NOT NULL,
  unit_cost numeric(18,4) NOT NULL DEFAULT 0,
  total_cost numeric(18,4) NOT NULL DEFAULT 0,
  reference_type text,
  reference_id uuid,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages movements" ON public.inventory_movements FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

CREATE INDEX idx_inv_mov_item ON public.inventory_movements(item_id, movement_date DESC);
CREATE INDEX idx_inv_mov_wh ON public.inventory_movements(warehouse_id, movement_date DESC);

-- updated_at triggers
CREATE TRIGGER trg_inv_items_upd BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inv_wh_upd BEFORE UPDATE ON public.inventory_warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inv_stock_upd BEFORE UPDATE ON public.inventory_stock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Movement -> stock apply (moving average)
CREATE OR REPLACE FUNCTION public.apply_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock public.inventory_stock%ROWTYPE;
  v_new_qty numeric(18,4);
  v_new_avg numeric(18,4);
  v_delta numeric(18,4);
BEGIN
  NEW.total_cost := ROUND(COALESCE(NEW.qty,0) * COALESCE(NEW.unit_cost,0), 4);

  -- direction: positive for receipt/transfer_in, negative for issue/transfer_out
  v_delta := CASE
    WHEN NEW.movement_type IN ('receipt','transfer_in') THEN NEW.qty
    WHEN NEW.movement_type IN ('issue','transfer_out') THEN -NEW.qty
    WHEN NEW.movement_type = 'adjustment' THEN NEW.qty  -- signed
    ELSE 0
  END;

  SELECT * INTO v_stock FROM public.inventory_stock
    WHERE item_id = NEW.item_id AND warehouse_id = NEW.warehouse_id
    FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.inventory_stock(item_id, warehouse_id, qty_on_hand, avg_cost, last_movement_at)
    VALUES (NEW.item_id, NEW.warehouse_id, v_delta,
            CASE WHEN v_delta > 0 THEN NEW.unit_cost ELSE 0 END,
            now());
  ELSE
    v_new_qty := v_stock.qty_on_hand + v_delta;
    IF v_delta > 0 AND NEW.unit_cost > 0 THEN
      -- moving average recalculation for incoming stock
      IF (v_stock.qty_on_hand + v_delta) > 0 THEN
        v_new_avg := ROUND(((v_stock.qty_on_hand * v_stock.avg_cost) + (v_delta * NEW.unit_cost)) / (v_stock.qty_on_hand + v_delta), 4);
      ELSE
        v_new_avg := NEW.unit_cost;
      END IF;
    ELSE
      v_new_avg := v_stock.avg_cost;
    END IF;

    UPDATE public.inventory_stock
      SET qty_on_hand = v_new_qty,
          avg_cost = v_new_avg,
          last_movement_at = now()
    WHERE id = v_stock.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_inv_movement
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_movement();

-- Convenience RPC: transfer between warehouses (two movements)
CREATE OR REPLACE FUNCTION public.record_inventory_movement(
  _movement_type text,
  _item_id uuid,
  _warehouse_id uuid,
  _qty numeric,
  _unit_cost numeric DEFAULT 0,
  _counterparty_warehouse_id uuid DEFAULT NULL,
  _reference_type text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_cost numeric(18,4);
BEGIN
  -- default unit cost to current avg cost for outbound
  IF _unit_cost IS NULL OR _unit_cost = 0 THEN
    SELECT avg_cost INTO v_cost FROM public.inventory_stock
      WHERE item_id = _item_id AND warehouse_id = _warehouse_id;
    v_cost := COALESCE(v_cost, 0);
  ELSE
    v_cost := _unit_cost;
  END IF;

  INSERT INTO public.inventory_movements(movement_type, item_id, warehouse_id, counterparty_warehouse_id, qty, unit_cost, reference_type, reference_id, notes, created_by)
  VALUES (_movement_type, _item_id, _warehouse_id, _counterparty_warehouse_id, _qty, v_cost, _reference_type, _reference_id, _notes, auth.uid())
  RETURNING id INTO v_id;

  -- If transfer_out, auto-create the matching transfer_in
  IF _movement_type = 'transfer_out' AND _counterparty_warehouse_id IS NOT NULL THEN
    INSERT INTO public.inventory_movements(movement_type, item_id, warehouse_id, counterparty_warehouse_id, qty, unit_cost, reference_type, reference_id, notes, created_by)
    VALUES ('transfer_in', _item_id, _counterparty_warehouse_id, _warehouse_id, _qty, v_cost, _reference_type, _reference_id, _notes, auth.uid());
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stock_valuation(_warehouse_id uuid DEFAULT NULL)
RETURNS TABLE (
  warehouse_id uuid,
  warehouse_code text,
  item_id uuid,
  sku text,
  item_name text,
  qty_on_hand numeric,
  avg_cost numeric,
  stock_value numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.code, i.id, i.sku, i.name,
         s.qty_on_hand, s.avg_cost,
         ROUND(s.qty_on_hand * s.avg_cost, 2) AS stock_value
  FROM public.inventory_stock s
  JOIN public.inventory_items i ON i.id = s.item_id
  JOIN public.inventory_warehouses w ON w.id = s.warehouse_id
  WHERE (_warehouse_id IS NULL OR s.warehouse_id = _warehouse_id)
  ORDER BY w.code, i.sku;
$$;
