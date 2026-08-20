alter table public.dispatch_assignments
  add column if not exists invoiced_at timestamptz,
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

-- Backfill: every dispatch that appears in an issued (non-cancelled) invoice's
-- embedded Annex A detail is locked as invoiced + Receivables-reviewed.
with inv as (
  select id, created_at, substring(notes from position('__DETAIL__:' in notes) + 11) as js
  from public.invoices
  where notes like '%__DETAIL__:%' and status::text <> 'Cancelled'
), rws as (
  select i.id as invoice_id, i.created_at, jsonb_array_elements(i.js::jsonb) as r
  from inv i where i.js ~ '^\['
), det as (
  select distinct
    invoice_id, created_at,
    upper(regexp_replace(coalesce(r->>'flight',''), '[^A-Za-z0-9]', '', 'g')) as fkey,
    public.safe_parse_flight_date(coalesce(nullif(r->>'date',''), nullif(r->>'arrDate',''), nullif(r->>'depDate',''))) as dt
  from rws
), matched as (
  select v.id as dispatch_id, min(d.invoice_id::text) as invoice_id, min(d.created_at) as inv_created
  from det d
  join public.v_dispatch_with_flight v
    on upper(regexp_replace(coalesce(v.flight_no,''), '[^A-Za-z0-9]', '', 'g')) = d.fkey
   and v.flight_date = d.dt
  where d.fkey <> '' and d.dt is not null
  group by v.id
)
update public.dispatch_assignments da
set invoice_id = coalesce(da.invoice_id, m.invoice_id::uuid),
    invoiced_at = coalesce(da.invoiced_at, m.inv_created),
    charges_saved_at = coalesce(da.charges_saved_at, m.inv_created),
    charges_saved_by = coalesce(da.charges_saved_by, 'Receivables'),
    reviewed_by = case when da.reviewed_by is null or da.reviewed_by = '' then 'Receivables' else da.reviewed_by end,
    review_status = 'Ready for Billing'
from matched m
where da.id = m.dispatch_id;

create or replace function public.protect_invoiced_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.invoiced_at is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  -- Preserve billing lock markers once an invoice has been issued.
  new.invoiced_at := old.invoiced_at;
  new.invoice_id := coalesce(new.invoice_id, old.invoice_id);
  new.charges_saved_at := coalesce(new.charges_saved_at, old.charges_saved_at);
  new.charges_saved_by := coalesce(new.charges_saved_by, old.charges_saved_by);
  if new.reviewed_by is null or new.reviewed_by = '' then
    new.reviewed_by := old.reviewed_by;
  end if;
  if coalesce(new.review_status,'') <> 'Ready for Billing' then
    new.review_status := 'Ready for Billing';
  end if;
  if new.total_security_charges is null then
    new.total_security_charges := old.total_security_charges;
  end if;
  if new.charges_breakdown is null then
    new.charges_breakdown := old.charges_breakdown;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_invoiced_dispatch on public.dispatch_assignments;
create trigger trg_protect_invoiced_dispatch
before update on public.dispatch_assignments
for each row execute function public.protect_invoiced_dispatch();

revoke all on function public.protect_invoiced_dispatch() from public;