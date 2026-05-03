
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_journal_totals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calc_invoice_totals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calc_vendor_invoice_total() FROM PUBLIC, anon, authenticated;
