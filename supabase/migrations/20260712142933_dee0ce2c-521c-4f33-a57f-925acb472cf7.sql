
CREATE OR REPLACE FUNCTION public.post_impairment_test(_test_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t RECORD;
  je_id UUID;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO t FROM public.asset_impairment_tests WHERE id = _test_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Test not found'; END IF;
  IF t.status = 'posted' THEN RAISE EXCEPTION 'Already posted'; END IF;
  IF t.impairment_loss <= 0 THEN
    UPDATE public.asset_impairment_tests SET status='no_impairment', posted_at=now() WHERE id=_test_id;
    RETURN NULL;
  END IF;

  INSERT INTO public.journal_entries(entry_date, description, status, source_type, source_id, created_by)
  VALUES (t.test_date, 'Impairment loss on fixed asset ' || t.asset_id, 'posted', 'impairment', t.id, auth.uid())
  RETURNING id INTO je_id;

  -- Increase accumulated depreciation to reflect the impairment write-down
  UPDATE public.fixed_assets
     SET accumulated_depreciation = COALESCE(accumulated_depreciation,0) + t.impairment_loss,
         updated_at = now()
   WHERE id = t.asset_id;

  UPDATE public.asset_impairment_tests
     SET status='posted', posted_at=now(), posted_journal_entry_id=je_id
   WHERE id=_test_id;

  RETURN je_id;
END;
$$;
