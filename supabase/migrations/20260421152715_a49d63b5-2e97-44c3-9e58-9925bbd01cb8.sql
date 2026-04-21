UPDATE public.chart_of_accounts c
SET parent_id = parent.id
FROM public._coa_parent_pairs p
JOIN public.chart_of_accounts parent ON parent.code = p.parent_code
WHERE c.code = p.child_code;

DROP TABLE public._coa_parent_pairs;