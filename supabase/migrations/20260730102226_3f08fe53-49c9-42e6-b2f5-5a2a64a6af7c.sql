DROP TRIGGER IF EXISTS trg_period_lock_journals ON public.journal_entries;
CREATE TRIGGER trg_period_lock_journals
BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock('entry_date');