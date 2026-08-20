create or replace function public.stamp_dispatch_invoiced()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  js text;
begin
  if new.notes is null or position('__DETAIL__:' in new.notes) = 0 then
    return new;
  end if;
  if coalesce(new.status::text,'') = 'Cancelled' then
    return new;
  end if;
  js := substring(new.notes from position('__DETAIL__:' in new.notes) + 11);
  if js !~ '^\[' then
    return new;
  end if;

  with rws as (
    select jsonb_array_elements(js::jsonb) as r
  ), det as (
    select distinct
      upper(regexp_replace(coalesce(r->>'flight',''), '[^A-Za-z0-9]', '', 'g')) as fkey,
      public.safe_parse_flight_date(coalesce(nullif(r->>'date',''), nullif(r->>'arrDate',''), nullif(r->>'depDate',''))) as dt
    from rws
  ), matched as (
    select distinct v.id as dispatch_id
    from det d
    join public.v_dispatch_with_flight v
      on upper(regexp_replace(coalesce(v.flight_no,''), '[^A-Za-z0-9]', '', 'g')) = d.fkey
     and v.flight_date = d.dt
    where d.fkey <> '' and d.dt is not null
  )
  update public.dispatch_assignments da
  set invoice_id = coalesce(da.invoice_id, new.id),
      invoiced_at = coalesce(da.invoiced_at, now()),
      charges_saved_at = coalesce(da.charges_saved_at, now()),
      charges_saved_by = coalesce(da.charges_saved_by, 'Receivables'),
      reviewed_by = case when da.reviewed_by is null or da.reviewed_by = '' then 'Receivables' else da.reviewed_by end,
      review_status = 'Ready for Billing'
  from matched m
  where da.id = m.dispatch_id;

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_stamp_dispatch_invoiced on public.invoices;
create trigger trg_stamp_dispatch_invoiced
after insert on public.invoices
for each row execute function public.stamp_dispatch_invoiced();

revoke all on function public.stamp_dispatch_invoiced() from public;