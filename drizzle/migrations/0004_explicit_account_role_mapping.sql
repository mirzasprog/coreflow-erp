CREATE TABLE public.account_posting_mappings(role_key text PRIMARY KEY, account_id uuid NOT NULL REFERENCES public.accounts(id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.account_posting_mappings TO authenticated;
GRANT ALL ON public.account_posting_mappings TO service_role;
ALTER TABLE public.account_posting_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_mapping_read ON public.account_posting_mappings FOR SELECT TO authenticated USING(public.erp_has_role(ARRAY['Finance','Warehouse','POSCashier','Management']));
CREATE POLICY admin_mapping_write ON public.account_posting_mappings FOR ALL TO authenticated USING(public.erp_has_role(ARRAY[]::text[])) WITH CHECK(public.erp_has_role(ARRAY[]::text[]));
CREATE OR REPLACE FUNCTION public.erp_account(p_code text) RETURNS uuid LANGUAGE plpgsql SET search_path=public AS $$ DECLARE a uuid; BEGIN
 SELECT m.account_id INTO a FROM public.account_posting_mappings m JOIN public.accounts ac ON ac.id=m.account_id WHERE m.role_key=p_code AND ac.active IS TRUE;
 IF a IS NULL THEN SELECT id INTO a FROM public.accounts WHERE code=p_code AND active IS TRUE; END IF;
 IF a IS NULL THEN RAISE EXCEPTION 'Missing configured active account %',p_code; END IF;
 RETURN a;
END $$;