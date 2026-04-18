
-- 1. Add service_category to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS service_category text NOT NULL DEFAULT 'Handling';

-- 2. Extend contract_service_rates
ALTER TABLE public.contract_service_rates
  ADD COLUMN IF NOT EXISTS airport text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS flight_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS included_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'Per Flight',
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

-- 3. Extend dispatch_assignments to link to a contract & store calculated charges
ALTER TABLE public.dispatch_assignments
  ADD COLUMN IF NOT EXISTS charges_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_security_charges numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS short_notice boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extra_manpower_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ramp_vehicle_trips integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_to_ramp_with_load boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS charges_currency text NOT NULL DEFAULT 'USD';

-- 4. Seed Air Cairo Security contract
DO $$
DECLARE
  v_contract_id uuid;
BEGIN
  -- Avoid duplicate seeding
  SELECT id INTO v_contract_id FROM public.contracts WHERE contract_no = 'LNK-CTR-2026-AC-SEC';

  IF v_contract_id IS NULL THEN
    INSERT INTO public.contracts (
      contract_no, airline, airline_iata, contract_type, service_category, sgha_ref,
      service_scope, services, stations, currency, annual_value, status, auto_renew,
      payment_terms, billing_frequency, contact_person, contact_email,
      start_date, end_date, notes
    ) VALUES (
      'LNK-CTR-2026-AC-SEC', 'Air Cairo', 'SM', 'Bilateral', 'Security',
      'AHM 810 / Security Annex',
      'Aviation Security Services', 'Aviation Security (AVSEC)', 'CAI, HRG',
      'USD', 0, 'Active', true,
      'Net 30', 'Monthly', 'Air Cairo Security Manager', 'security@aircairo.com',
      CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days',
      'Air Cairo Security Services Agreement covering CAI & HRG. Includes turnaround, night stop, ADHOC, additional manpower, ramp vehicle, return-to-ramp clauses.'
    )
    RETURNING id INTO v_contract_id;

    -- Insert rate rows. Rate is base price; included_hours = free ground time; overtime_rate = per extra hour.
    INSERT INTO public.contract_service_rates
      (contract_id, sort_order, service_type, airport, flight_type, rate, included_hours, overtime_rate, currency, unit, staff_count, duration_hours, notes)
    VALUES
      -- CAI
      (v_contract_id, 1, 'Security', 'CAI', 'Turnaround Departure', 50, 3, 10, 'USD', 'Per Flight', 0, 3, 'Up to 3 hrs ground time. Each extra hour (or fraction) USD 10.'),
      (v_contract_id, 2, 'Security', 'CAI', 'Turnaround Arrival',   40, 3, 10, 'USD', 'Per Flight', 0, 3, 'Up to 3 hrs ground time. Each extra hour (or fraction) USD 10.'),
      (v_contract_id, 3, 'Security', 'CAI', 'Night Stop',           20, 3, 10, 'USD', 'Per Flight', 0, 3, 'Ground time > 3 hrs. Includes 2h dep + 1h arr. Each extra hour USD 10.'),
      (v_contract_id, 4, 'Security', 'CAI', 'ADHOC',                60, 3, 10, 'USD', 'Per Flight', 0, 3, 'ADHOC flight base rate.'),
      -- HRG
      (v_contract_id, 5, 'Security', 'HRG', 'Turnaround Departure', 60, 3, 10, 'USD', 'Per Flight', 0, 3, 'Up to 3 hrs ground time. Each extra hour (or fraction) USD 10.'),
      (v_contract_id, 6, 'Security', 'HRG', 'Turnaround Arrival',   40, 3, 10, 'USD', 'Per Flight', 0, 3, 'Up to 3 hrs ground time. Each extra hour (or fraction) USD 10.'),
      (v_contract_id, 7, 'Security', 'HRG', 'Night Stop',           20, 3, 10, 'USD', 'Per Flight', 0, 3, 'Ground time > 3 hrs. Includes 2h dep + 1h arr. Each extra hour USD 10.'),
      (v_contract_id, 8, 'Security', 'HRG', 'ADHOC',                70, 3, 10, 'USD', 'Per Flight', 0, 3, 'ADHOC flight base rate.'),
      -- Cross-airport extras
      (v_contract_id, 9,  'Security', 'ALL', 'Short Notice ADHOC',     15, 0, 0,  'USD', 'Per Flight',  0, 0, 'Applied when ADHOC notified < 6h before ETD/ETA.'),
      (v_contract_id, 10, 'Security', 'ALL', 'Additional Manpower',    10, 0, 0,  'USD', 'Per Person',  0, 0, 'Per additional security staff requested.'),
      (v_contract_id, 11, 'Security', 'ALL', 'Ramp Vehicle',           20, 0, 0,  'USD', 'Per Trip',    0, 0, 'Per ramp vehicle trip when requested by Carrier.'),
      (v_contract_id, 12, 'Security', 'ALL', 'Return to Ramp (Load Change)', 0, 0, 0, 'USD', 'Per Flight', 0, 0, 'Charged at 50% of applicable Turnaround rate.'),
      (v_contract_id, 13, 'Security', 'ALL', 'Overtime',               10, 0, 10, 'USD', 'Per Hour',    0, 0, 'USD 10/hour, fractions count as full hour.');
  END IF;
END $$;
