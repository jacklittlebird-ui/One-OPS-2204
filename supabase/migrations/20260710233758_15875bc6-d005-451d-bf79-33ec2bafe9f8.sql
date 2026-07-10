
CREATE TABLE public.dunning_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  days_overdue INTEGER NOT NULL,
  tone TEXT NOT NULL DEFAULT 'friendly',
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_policies TO authenticated;
GRANT ALL ON public.dunning_policies TO service_role;

ALTER TABLE public.dunning_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages dunning policies" ON public.dunning_policies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "All can read active policies" ON public.dunning_policies FOR SELECT TO authenticated
  USING (is_active = TRUE);

CREATE TRIGGER trg_dunning_policies_updated BEFORE UPDATE ON public.dunning_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.dunning_policies (level, name, days_overdue, tone, email_subject, email_body) VALUES
  (1, 'Friendly Reminder', 1, 'friendly',
   'Payment reminder for invoice {{invoice_no}}',
   'Dear {{customer_name}},'||chr(10)||chr(10)||'This is a friendly reminder that invoice {{invoice_no}} for {{amount}} {{currency}} was due on {{due_date}}. Please arrange payment at your earliest convenience.'||chr(10)||chr(10)||'Thank you,'||chr(10)||'Link Aviation Services'),
  (2, 'First Notice', 15, 'firm',
   'First notice: Invoice {{invoice_no}} is overdue',
   'Dear {{customer_name}},'||chr(10)||chr(10)||'Our records show invoice {{invoice_no}} for {{amount}} {{currency}} (due {{due_date}}) remains unpaid and is now {{days_overdue}} days overdue. Please settle this invoice without further delay.'||chr(10)||chr(10)||'Regards,'||chr(10)||'Link Aviation Services'),
  (3, 'Second Notice', 30, 'firm',
   'Second notice: Immediate action required on invoice {{invoice_no}}',
   'Dear {{customer_name}},'||chr(10)||chr(10)||'Despite our prior reminder, invoice {{invoice_no}} for {{amount}} {{currency}} remains outstanding and is now {{days_overdue}} days overdue. Please arrange immediate payment to avoid escalation.'||chr(10)||chr(10)||'Regards,'||chr(10)||'Link Aviation Services'),
  (4, 'Final Notice', 60, 'urgent',
   'FINAL NOTICE: Invoice {{invoice_no}}',
   'Dear {{customer_name}},'||chr(10)||chr(10)||'This is our FINAL notice regarding invoice {{invoice_no}} for {{amount}} {{currency}}, now {{days_overdue}} days overdue. If payment is not received within 7 days, we will suspend services and refer this matter for collection.'||chr(10)||chr(10)||'Link Aviation Services');

CREATE TABLE public.payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  airline_iata TEXT,
  level INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'sent',
  recipient_email TEXT,
  subject TEXT,
  body TEXT,
  sent_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_reminders_invoice ON public.payment_reminders(invoice_id);
CREATE INDEX idx_payment_reminders_airline ON public.payment_reminders(airline_iata);
CREATE INDEX idx_payment_reminders_sent_at ON public.payment_reminders(sent_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_reminders TO authenticated;
GRANT ALL ON public.payment_reminders TO service_role;

ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages reminders" ON public.payment_reminders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Customers see own reminders" ON public.payment_reminders FOR SELECT TO authenticated
  USING (UPPER(COALESCE(airline_iata,'')) = UPPER(COALESCE(public.current_customer_airline_iata(),'')));

CREATE TRIGGER trg_payment_reminders_updated BEFORE UPDATE ON public.payment_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_pending_reminders()
RETURNS TABLE(
  invoice_id UUID,
  invoice_no TEXT,
  airline_iata TEXT,
  operator TEXT,
  invoice_date DATE,
  due_date DATE,
  days_overdue INTEGER,
  total NUMERIC,
  currency TEXT,
  next_level INTEGER,
  next_level_name TEXT,
  last_reminder_at TIMESTAMPTZ,
  last_reminder_level INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH overdue AS (
    SELECT i.id, i.invoice_no, i.airline_iata, i.operator, i.date AS invoice_date, i.due_date,
           (CURRENT_DATE - i.due_date)::INTEGER AS days_overdue,
           i.total, i.currency::TEXT
    FROM public.invoices i
    WHERE COALESCE(i.invoice_direction::text,'outbound') = 'outbound'
      AND LOWER(COALESCE(i.status::text,'')) IN ('finalized','sent','overdue')
      AND i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE
  ),
  last_r AS (
    SELECT pr.invoice_id, MAX(pr.sent_at) AS last_sent, MAX(pr.level) AS max_level
    FROM public.payment_reminders pr WHERE pr.status = 'sent'
    GROUP BY pr.invoice_id
  ),
  eligible AS (
    SELECT o.*,
           COALESCE(l.max_level, 0) AS last_level,
           l.last_sent,
           (SELECT MAX(dp.level) FROM public.dunning_policies dp
             WHERE dp.is_active AND dp.days_overdue <= o.days_overdue) AS due_level
    FROM overdue o LEFT JOIN last_r l ON l.invoice_id = o.id
  )
  SELECT e.id, e.invoice_no, e.airline_iata, e.operator, e.invoice_date, e.due_date,
         e.days_overdue, e.total, e.currency,
         e.due_level, dp.name, e.last_sent, NULLIF(e.last_level, 0)
  FROM eligible e
  LEFT JOIN public.dunning_policies dp ON dp.level = e.due_level
  WHERE e.due_level IS NOT NULL AND e.due_level > COALESCE(e.last_level, 0)
  ORDER BY e.days_overdue DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_reminders() TO authenticated;
