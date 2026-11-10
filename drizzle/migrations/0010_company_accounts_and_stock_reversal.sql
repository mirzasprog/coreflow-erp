ALTER TABLE public.account_posting_mappings ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.account_posting_mappings SET company_id=(SELECT id FROM public.companies WHERE code='MAIN') WHERE company_id IS NULL AND EXISTS(SELECT 1 FROM public.companies WHERE code='MAIN');
CREATE TABLE public.accounting_periods(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES public.companies(id),starts_on date NOT NULL,ends_on date NOT NULL,closed_at timestamptz,UNIQUE(company_id,starts_on,ends_on));
GRANT SELECT ON public.accounting_periods TO authenticated;
GRANT ALL ON public.accounting_periods TO service_role;
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounting_periods_staff_read ON public.accounting_periods FOR SELECT TO authenticated USING(public.erp_has_role(ARRAY['Finance','Management'],company_id));
CREATE FUNCTION public.erp_company_account(p_company uuid,p_code text) RETURNS uuid LANGUAGE plpgsql SET search_path=public AS $$ DECLARE a uuid; BEGIN
 SELECT m.account_id INTO a FROM public.account_posting_mappings m JOIN public.accounts ac ON ac.id=m.account_id AND ac.active IS TRUE WHERE m.role_key=p_code AND (m.company_id=p_company OR m.company_id IS NULL) ORDER BY m.company_id NULLS LAST LIMIT 1;
 IF a IS NULL THEN RAISE EXCEPTION 'Podesite konto % za firmu',p_code; END IF; RETURN a;
END $$;
CREATE FUNCTION public.erp_assert_open_period(p_company uuid,p_date date) RETURNS void LANGUAGE sql STABLE SET search_path=public AS $$ SELECT CASE WHEN EXISTS(SELECT 1 FROM public.accounting_periods WHERE company_id=p_company AND closed_at IS NOT NULL AND p_date BETWEEN starts_on AND ends_on) THEN (1/0) ELSE 0 END $$;
CREATE UNIQUE INDEX gl_warehouse_original_once ON public.gl_entries(reference_id) WHERE reference_type='warehouse_document' AND reversed_entry_id IS NULL;