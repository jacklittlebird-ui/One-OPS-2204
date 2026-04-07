
-- Drop old columns and add new structure
ALTER TABLE public.airport_tax 
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'National',
  ADD COLUMN IF NOT EXISTS usd_except_ssh text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS usd_ssh text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS egp_all text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_total boolean NOT NULL DEFAULT false;

-- Clear existing data
DELETE FROM public.airport_tax;

-- Insert National section
INSERT INTO public.airport_tax (section, tax, usd_except_ssh, usd_ssh, egp_all, sort_order, is_total) VALUES
('National', 'Departure Pax taxes (رسوم مغادرة دولية)', '25', '25', '', 1, false),
('National', 'Developing Security system charges (نظم امنية)', '2', '4', '', 2, false),
('National', 'SITA Cute', '1', '1', '', 3, false),
('National', 'State resource development fees (رسوم تنمية موارد الدوله)', '', '', '100', 4, false),
('National', 'Police Service Fees (رسوم خدمات الرعاية لأعضاء الشرطة)', '', '', '15', 5, false),
('National', 'TOTAL', '28', '30', '115', 6, true);

-- Insert Domestic section
INSERT INTO public.airport_tax (section, tax, usd_except_ssh, usd_ssh, egp_all, sort_order, is_total) VALUES
('Domestic', 'Departure Pax taxes (رسوم مغادرة محلى)', '5', '5', '', 1, false),
('Domestic', 'Developing Security system charges (نظم امنية)', '2', '4', '', 2, false),
('Domestic', 'SITA Cute', '1', '1', '', 3, false),
('Domestic', 'State resource development fees (رسوم تنمية موارد الدوله)', '', '', '100', 4, false),
('Domestic', 'Police Service Fees (رسوم خدمات الرعاية لأعضاء الشرطة)', '', '', '15', 5, false),
('Domestic', 'TOTAL', '8 $', '10 $', '115', 6, true);
