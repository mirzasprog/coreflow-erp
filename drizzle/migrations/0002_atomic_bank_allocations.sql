ALTER TABLE public.bank_statement_lines ADD COLUMN payment_entry_id uuid REFERENCES public.gl_entries(id);
CREATE FUNCTION public.erp_bank_match(p_line uuid,p_invoice uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE l public.bank_statement_lines%ROWTYPE; r jsonb; i public.invoices%ROWTYPE; BEGIN
 IF NOT public.erp_has_role(ARRAY['Finance']) THEN RAISE EXCEPTION 'Finance permission required'; END IF;
 SELECT * INTO STRICT l FROM public.bank_statement_lines WHERE id=p_line FOR UPDATE;
 IF p_invoice IS NULL THEN
  IF NOT coalesce(l.matched,false) THEN RETURN jsonb_build_object('lineId',l.id); END IF;
  IF l.payment_entry_id IS NULL THEN RAISE EXCEPTION 'Legacy allocation requires reviewed reconciliation'; END IF;
  PERFORM public.erp_reverse_gl(l.payment_entry_id);
  UPDATE public.bank_statement_lines SET matched=false,matched_invoice_id=NULL,matched_at=NULL,payment_entry_id=NULL WHERE id=l.id;
 ELSE
  IF coalesce(l.matched,false) THEN
   IF l.matched_invoice_id=p_invoice THEN RETURN jsonb_build_object('lineId',l.id,'invoiceId',p_invoice); END IF;
   RAISE EXCEPTION 'Unmatch this transaction first';
  END IF;
  SELECT * INTO STRICT i FROM public.invoices WHERE id=p_invoice FOR UPDATE;
  IF (i.invoice_type='outgoing' AND l.amount<=0) OR (i.invoice_type='incoming' AND l.amount>=0) THEN RAISE EXCEPTION 'Bank transaction direction does not match invoice'; END IF;
  r:=public.erp_invoice_action(p_invoice,'payment',abs(l.amount),gen_random_uuid(),true);
  UPDATE public.bank_statement_lines SET matched=true,matched_invoice_id=p_invoice,matched_at=now(),payment_entry_id=(r->>'glEntryId')::uuid WHERE id=l.id;
 END IF;
 RETURN jsonb_build_object('lineId',l.id,'invoiceId',p_invoice);
END $$;
REVOKE ALL ON FUNCTION public.erp_bank_match(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_bank_match(uuid,uuid) TO authenticated;