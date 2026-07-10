
CREATE OR REPLACE FUNCTION public.notify_finance_users(_title text, _message text, _category text, _link text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u RECORD;
BEGIN
  FOR u IN
    SELECT DISTINCT user_id FROM public.user_roles
    WHERE role IN ('admin','general_accounts','receivables','payables','accountant')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, category, is_read, link)
    VALUES (u.user_id, _title, _message, 'info', _category, false, _link);
  END LOOP;
END; $$;

-- invoice finalized
CREATE OR REPLACE FUNCTION public.notify_on_invoice_finalized() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF LOWER(COALESCE(NEW.status::text,'')) IN ('finalized','sent')
     AND LOWER(COALESCE(OLD.status::text,'')) NOT IN ('finalized','sent') THEN
    PERFORM public.notify_finance_users(
      'Invoice finalized: ' || COALESCE(NEW.invoice_no,''),
      'Invoice ' || COALESCE(NEW.invoice_no,'') || ' for ' || COALESCE(NEW.airline_iata, NEW.operator, '') ||
        ' — ' || COALESCE(NEW.currency::text,'') || ' ' || COALESCE(NEW.total::text,'0'),
      'invoice', '/invoices'
    );
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_invoice_finalized AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_invoice_finalized();

-- receipt posted
CREATE OR REPLACE FUNCTION public.notify_on_receipt_posted() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF LOWER(COALESCE(NEW.status,'')) = 'posted'
     AND (TG_OP = 'INSERT' OR LOWER(COALESCE(OLD.status,'')) <> 'posted') THEN
    PERFORM public.notify_finance_users(
      'Payment received: ' || COALESCE(NEW.receipt_no,''),
      COALESCE(NEW.currency,'') || ' ' || COALESCE(NEW.amount::text,'0') || ' received on ' || COALESCE(NEW.receipt_date::text,''),
      'receipt', '/accounting/customer-portal'
    );
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_receipt_posted AFTER INSERT OR UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_receipt_posted();

-- payment posted
CREATE OR REPLACE FUNCTION public.notify_on_payment_posted() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF LOWER(COALESCE(NEW.status,'')) = 'posted'
     AND (TG_OP = 'INSERT' OR LOWER(COALESCE(OLD.status,'')) <> 'posted') THEN
    PERFORM public.notify_finance_users(
      'Payment issued: ' || COALESCE(NEW.payment_no,''),
      COALESCE(NEW.currency,'') || ' ' || COALESCE(NEW.amount::text,'0') || ' paid on ' || COALESCE(NEW.payment_date::text,''),
      'payment', '/vendor-invoices'
    );
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_payment_posted AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_payment_posted();

-- approval submitted
CREATE OR REPLACE FUNCTION public.notify_on_approval_submitted() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF LOWER(COALESCE(NEW.status,'')) IN ('pending','submitted')
     AND (TG_OP = 'INSERT' OR LOWER(COALESCE(OLD.status,'')) NOT IN ('pending','submitted')) THEN
    PERFORM public.notify_finance_users(
      'Approval required: ' || COALESCE(NEW.request_no,''),
      COALESCE(NEW.doc_type,'') || ' ' || COALESCE(NEW.doc_reference,'') ||
        ' — ' || COALESCE(NEW.currency,'') || ' ' || COALESCE(NEW.amount::text,'0'),
      'approval', '/accounting/approvals'
    );
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_approval_submitted AFTER INSERT OR UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_approval_submitted();

-- period close / reopen
CREATE OR REPLACE FUNCTION public.notify_on_period_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'closed' THEN
      PERFORM public.notify_finance_users(
        'Period closed: ' || NEW.year || '-' || LPAD(NEW.month::text,2,'0'),
        'The accounting period has been closed. Back-dated postings are now blocked.',
        'period_close', '/accounting/financial-close'
      );
    ELSIF NEW.status = 'open' AND OLD.status = 'closed' THEN
      PERFORM public.notify_finance_users(
        'Period reopened: ' || NEW.year || '-' || LPAD(NEW.month::text,2,'0'),
        'A previously closed period has been reopened. Back-dated postings are allowed again.',
        'period_close', '/accounting/financial-close'
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_period_change AFTER UPDATE ON public.accounting_periods
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_period_change();
