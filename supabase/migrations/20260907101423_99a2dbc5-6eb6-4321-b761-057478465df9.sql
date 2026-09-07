CREATE OR REPLACE FUNCTION public.protect_invoiced_dispatch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if old.invoiced_at is null then
    return new;
  end if;
  if public.is_admin(auth.uid()) then
    return new;
  end if;
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
$function$;