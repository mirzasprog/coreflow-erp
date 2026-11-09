CREATE FUNCTION public.erp_gl_balance_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE eid uuid; d numeric; c numeric; st public.document_status; BEGIN
 eid:=CASE WHEN TG_OP='DELETE' THEN OLD.entry_id ELSE NEW.entry_id END;
 SELECT status INTO st FROM public.gl_entries WHERE id=eid;
 IF st='posted' THEN SELECT sum(debit),sum(credit) INTO d,c FROM public.gl_entry_lines WHERE entry_id=eid; IF d IS NULL OR d<=0 OR d IS DISTINCT FROM c THEN RAISE EXCEPTION 'Posted entry % is not balanced',eid; END IF; END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE CONSTRAINT TRIGGER gl_balance_guard AFTER INSERT OR UPDATE OR DELETE ON public.gl_entry_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.erp_gl_balance_guard();
CREATE FUNCTION public.erp_accounting_audit() RETURNS TABLE(entry_id uuid,document_number text,reference_type text,debit numeric,credit numeric,finding text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH totals AS (SELECT g.id,g.document_number,g.reference_type,g.company_id,i.invoice_type,sum(l.debit) d,sum(l.credit) c,count(l.id) n,bool_or(g.reference_type='goods_receipt' AND a.code='1000') bad_receipt,bool_or(g.reference_type='invoice' AND i.invoice_type='incoming' AND a.code IN ('1000','4000')) bad_invoice FROM public.gl_entries g JOIN public.gl_entry_lines l ON l.entry_id=g.id LEFT JOIN public.accounts a ON a.id=l.account_id LEFT JOIN public.invoices i ON g.reference_type='invoice' AND i.id=g.reference_id WHERE g.status='posted' AND public.erp_has_role(ARRAY['Finance'],g.company_id) GROUP BY g.id,i.invoice_type) SELECT id,document_number,reference_type,d,c,concat_ws('; ',CASE WHEN d IS DISTINCT FROM c THEN 'Neuravnotežena temeljnica' END,CASE WHEN n<2 THEN 'Nedostaju stavke temeljnice' END,CASE WHEN bad_receipt THEN 'Primka koristi konto blagajne' END,CASE WHEN bad_invoice THEN 'Ulazna faktura koristi neodgovarajući konto' END) FROM totals WHERE d IS DISTINCT FROM c OR n<2 OR bad_receipt OR bad_invoice ORDER BY document_number;
$$;
REVOKE ALL ON FUNCTION public.erp_accounting_audit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_accounting_audit() TO authenticated;