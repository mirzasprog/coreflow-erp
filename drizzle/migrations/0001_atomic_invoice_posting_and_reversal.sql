ALTER TABLE public.invoices ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.gl_entries ADD COLUMN company_id uuid REFERENCES public.companies(id), ADD COLUMN payment_request_id uuid, ADD COLUMN payment_request_amount numeric(15,2);
UPDATE public.invoices i SET company_id=l.company_id FROM public.warehouse_documents w JOIN public.locations l ON l.id=w.location_id WHERE w.id=coalesce(i.warehouse_document_id,i.source_receipt_id);
CREATE UNIQUE INDEX gl_invoice_original_unique ON public.gl_entries(reference_id) WHERE reference_type='invoice' AND reversed_entry_id IS NULL;
CREATE UNIQUE INDEX gl_reversal_unique ON public.gl_entries(reversed_entry_id) WHERE reversed_entry_id IS NOT NULL;
CREATE UNIQUE INDEX gl_payment_key_unique ON public.gl_entries(reference_id,payment_request_id) WHERE payment_request_id IS NOT NULL;
CREATE FUNCTION public.erp_next_gl_number() RETURNS text LANGUAGE plpgsql SET search_path=public AS $$ DECLARE n bigint; y text:=to_char(current_date,'YYYY'); BEGIN PERFORM pg_advisory_xact_lock(732419,1); SELECT coalesce(max(substring(document_number FROM 6)::bigint),0)+1 INTO n FROM public.gl_entries WHERE document_number ~ ('^'||y||'-[0-9]+$'); RETURN y||'-'||lpad(n::text,6,'0'); END $$;
CREATE FUNCTION public.erp_account(p_code text) RETURNS uuid LANGUAGE plpgsql SET search_path=public AS $$ DECLARE a uuid; BEGIN SELECT id INTO a FROM public.accounts WHERE code=p_code AND active IS TRUE; IF a IS NULL THEN RAISE EXCEPTION 'Missing active account %',p_code; END IF; RETURN a; END $$;
CREATE FUNCTION public.erp_invoice_action(p_id uuid,p_action text,p_amount numeric DEFAULT NULL,p_key uuid DEFAULT NULL,p_bank boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i public.invoices%ROWTYPE; g public.gl_entries%ROWTYPE; e uuid; num text; control uuid; base uuid; vat uuid; cash uuid; outgoing boolean; co uuid; cnt bigint; net numeric; tax numeric; gross numeric;
BEGIN
 SELECT * INTO STRICT i FROM public.invoices WHERE id=p_id FOR UPDATE;
 co:=i.company_id;
 IF co IS NULL THEN SELECT company_id INTO co FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('SystemAdmin','Finance') GROUP BY company_id HAVING count(*)>0; END IF;
 IF co IS NULL OR NOT public.erp_has_role(ARRAY['Finance'],co) THEN RAISE EXCEPTION 'Finance permission required' USING ERRCODE='42501'; END IF;
 IF i.company_id IS NULL THEN UPDATE public.invoices SET company_id=co WHERE id=i.id; END IF;
 outgoing:=i.invoice_type='outgoing';
 IF p_action='cancel' THEN
  IF i.status='cancelled' THEN RETURN jsonb_build_object('id',i.id); END IF;
  IF coalesce(i.paid_amount,0)<>0 THEN RAISE EXCEPTION 'Reverse payments before cancelling this invoice'; END IF;
  IF i.status='posted' THEN
   SELECT * INTO STRICT g FROM public.gl_entries WHERE reference_type='invoice' AND reference_id=i.id AND reversed_entry_id IS NULL FOR UPDATE;
   IF NOT EXISTS(SELECT 1 FROM public.gl_entries WHERE reversed_entry_id=g.id) THEN
    num:=public.erp_next_gl_number(); INSERT INTO public.gl_entries(entry_date,description,reference_type,reference_id,status,document_number,reversed_entry_id,company_id,created_by) VALUES(current_date,'Storno: '||i.invoice_number,'invoice',i.id,'posted',num,g.id,co,auth.uid()) RETURNING id INTO e;
    INSERT INTO public.gl_entry_lines(entry_id,account_id,debit,credit,partner_id,description) SELECT e,account_id,credit,debit,partner_id,description FROM public.gl_entry_lines WHERE entry_id=g.id;
   END IF;
  END IF;
  UPDATE public.invoices SET status='cancelled',updated_at=now() WHERE id=i.id;
  RETURN jsonb_build_object('id',i.id,'glEntryId',e,'documentNumber',num);
 END IF;
 IF p_action NOT IN ('post','payment') THEN RAISE EXCEPTION 'Invalid accounting action'; END IF;
 SELECT * INTO g FROM public.gl_entries WHERE reference_id=i.id AND reversed_entry_id IS NULL AND ((p_action='post' AND reference_type='invoice') OR (p_action='payment' AND reference_type='payment' AND payment_request_id=p_key));
 IF FOUND THEN
  IF p_action='payment' AND g.payment_request_amount IS DISTINCT FROM p_amount THEN RAISE EXCEPTION 'Payment key reused with a different amount'; END IF;
  RETURN jsonb_build_object('id',i.id,'glEntryId',g.id,'documentNumber',g.document_number,'newPaidAmount',i.paid_amount);
 END IF;
 IF p_action='post' THEN
  IF i.status IS DISTINCT FROM 'draft'::public.document_status THEN RAISE EXCEPTION 'Only draft invoices can be posted'; END IF;
  SELECT count(*),sum(round(quantity*unit_price,2)),sum(vat_amount),sum(total) INTO cnt,net,tax,gross FROM public.invoice_lines WHERE invoice_id=i.id;
  IF cnt=0 OR net IS DISTINCT FROM i.subtotal OR tax IS DISTINCT FROM i.vat_amount OR gross IS DISTINCT FROM i.total OR i.total<=0 OR i.total<>i.subtotal+i.vat_amount THEN RAISE EXCEPTION 'Invoice lines and totals are inconsistent'; END IF;
  IF EXISTS(SELECT 1 FROM public.invoice_lines WHERE invoice_id=i.id AND (quantity<=0 OR unit_price<0 OR vat_amount<0 OR total<>round(quantity*unit_price,2)+vat_amount)) THEN RAISE EXCEPTION 'Invalid invoice line'; END IF;
 ELSE
  IF i.status<>'posted' OR p_key IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount,2) OR coalesce(i.paid_amount,0)+p_amount>i.total THEN RAISE EXCEPTION 'Invalid payment or outstanding balance'; END IF;
 END IF;
 control:=public.erp_account(CASE WHEN outgoing THEN '1200' ELSE '2200' END);
 IF p_action='post' THEN
  IF i.subtotal>0 THEN base:=public.erp_account(CASE WHEN outgoing THEN '7000' WHEN i.source_receipt_id IS NOT NULL THEN '2210' ELSE '4000' END); END IF;
  IF i.vat_amount>0 THEN vat:=public.erp_account(CASE WHEN outgoing THEN '2400' ELSE '1400' END); END IF;
 ELSE cash:=public.erp_account(CASE WHEN p_bank THEN '1020' ELSE '1000' END); END IF;
 num:=public.erp_next_gl_number();
 INSERT INTO public.gl_entries(entry_date,description,reference_type,reference_id,status,document_number,company_id,created_by,payment_request_id,payment_request_amount) VALUES(CASE WHEN p_action='post' THEN i.invoice_date ELSE current_date END,p_action||': '||i.invoice_number,CASE WHEN p_action='post' THEN 'invoice' ELSE 'payment' END,i.id,'posted',num,co,auth.uid(),CASE WHEN p_action='payment' THEN p_key END,CASE WHEN p_action='payment' THEN p_amount END) RETURNING id INTO e;
 IF p_action='post' THEN
  INSERT INTO public.gl_entry_lines(entry_id,account_id,debit,credit,partner_id) VALUES(e,control,CASE WHEN outgoing THEN i.total ELSE 0 END,CASE WHEN outgoing THEN 0 ELSE i.total END,i.partner_id);
  IF i.subtotal>0 THEN INSERT INTO public.gl_entry_lines(entry_id,account_id,debit,credit,partner_id) VALUES(e,base,CASE WHEN outgoing THEN 0 ELSE i.subtotal END,CASE WHEN outgoing THEN i.subtotal ELSE 0 END,i.partner_id); END IF;
  IF i.vat_amount>0 THEN INSERT INTO public.gl_entry_lines(entry_id,account_id,debit,credit,partner_id,description) VALUES(e,vat,CASE WHEN outgoing THEN 0 ELSE i.vat_amount END,CASE WHEN outgoing THEN i.vat_amount ELSE 0 END,i.partner_id,'PDV '||i.invoice_number); END IF;
  UPDATE public.invoices SET status='posted',posted_at=now(),updated_at=now() WHERE id=i.id;
 ELSE
  INSERT INTO public.gl_entry_lines(entry_id,account_id,debit,credit,partner_id) VALUES(e,cash,CASE WHEN outgoing THEN p_amount ELSE 0 END,CASE WHEN outgoing THEN 0 ELSE p_amount END,i.partner_id),(e,control,CASE WHEN outgoing THEN 0 ELSE p_amount END,CASE WHEN outgoing THEN p_amount ELSE 0 END,i.partner_id);
  UPDATE public.invoices SET paid_amount=coalesce(paid_amount,0)+p_amount,updated_at=now() WHERE id=i.id;
 END IF;
 RETURN jsonb_build_object('id',i.id,'glEntryId',e,'documentNumber',num,'newPaidAmount',coalesce(i.paid_amount,0)+coalesce(p_amount,0));
END $$;
REVOKE ALL ON FUNCTION public.erp_invoice_action(uuid,text,numeric,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_invoice_action(uuid,text,numeric,uuid,boolean) TO authenticated;
CREATE FUNCTION public.erp_reverse_gl(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE g public.gl_entries%ROWTYPE; r public.gl_entries%ROWTYPE; e uuid; num text; co uuid; total_debit numeric; total_credit numeric; n bigint; BEGIN
 SELECT * INTO STRICT g FROM public.gl_entries WHERE id=p_id FOR UPDATE;
 co:=g.company_id;
 IF co IS NULL THEN SELECT company_id INTO co FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('SystemAdmin','Finance') GROUP BY company_id; END IF;
 IF co IS NULL OR NOT public.erp_has_role(ARRAY['Finance'],co) THEN RAISE EXCEPTION 'Finance permission required'; END IF;
 SELECT * INTO r FROM public.gl_entries WHERE reversed_entry_id=g.id;
 IF FOUND THEN RETURN jsonb_build_object('originalId',g.id,'reversedId',r.id,'documentNumber',r.document_number); END IF;
 IF g.status<>'posted' OR g.reversed_entry_id IS NOT NULL THEN RAISE EXCEPTION 'Only original posted entries can be reversed'; END IF;
 IF g.reference_type='invoice' THEN PERFORM public.erp_invoice_action(g.reference_id,'cancel'); SELECT * INTO r FROM public.gl_entries WHERE reversed_entry_id=g.id; RETURN jsonb_build_object('originalId',g.id,'reversedId',r.id,'documentNumber',r.document_number); END IF;
 IF g.reference_type IS NOT NULL AND g.reference_type<>'payment' THEN RAISE EXCEPTION 'Reverse this entry through its source document'; END IF;
 IF g.reference_type='payment' THEN
  IF g.payment_request_amount IS NULL THEN RAISE EXCEPTION 'Legacy payment requires reviewed reconciliation'; END IF;
  PERFORM id FROM public.invoices WHERE id=g.reference_id FOR UPDATE;
 END IF;
 SELECT count(*),sum(debit),sum(credit) INTO n,total_debit,total_credit FROM public.gl_entry_lines WHERE entry_id=g.id;
 IF n<2 OR total_debit<=0 OR total_debit IS DISTINCT FROM total_credit THEN RAISE EXCEPTION 'Unbalanced original entry'; END IF;
 num:=public.erp_next_gl_number(); INSERT INTO public.gl_entries(entry_date,description,reference_type,reference_id,status,document_number,reversed_entry_id,company_id,created_by) VALUES(current_date,'Storno: '||coalesce(g.description,g.document_number),g.reference_type,g.reference_id,'posted',num,g.id,co,auth.uid()) RETURNING id INTO e;
 INSERT INTO public.gl_entry_lines(entry_id,account_id,debit,credit,partner_id,description) SELECT e,account_id,credit,debit,partner_id,description FROM public.gl_entry_lines WHERE entry_id=g.id;
 IF g.reference_type='payment' THEN UPDATE public.invoices SET paid_amount=paid_amount-g.payment_request_amount WHERE id=g.reference_id AND paid_amount>=g.payment_request_amount; IF NOT FOUND THEN RAISE EXCEPTION 'Payment balance cannot be reversed'; END IF; END IF;
 RETURN jsonb_build_object('originalId',g.id,'reversedId',e,'documentNumber',num);
END $$;
REVOKE ALL ON FUNCTION public.erp_reverse_gl(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_reverse_gl(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.erp_next_gl_number(),public.erp_account(text) FROM PUBLIC,anon,authenticated;