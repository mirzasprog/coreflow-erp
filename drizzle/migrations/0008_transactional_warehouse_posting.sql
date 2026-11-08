CREATE FUNCTION public.erp_post_warehouse(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d public.warehouse_documents%ROWTYPE; l public.warehouse_document_lines%ROWTYPE; co uuid; target_co uuid; delta numeric; value numeric:=0; qty numeric; price numeric; g uuid; num text; inv public.invoices%ROWTYPE; a uuid; b uuid; po public.purchase_order_lines%ROWTYPE; rate numeric; v numeric; net numeric:=0; tax numeric:=0; BEGIN
 SELECT * INTO STRICT d FROM public.warehouse_documents WHERE id=p_id FOR UPDATE;
 SELECT company_id INTO co FROM public.locations WHERE id=d.location_id AND active IS TRUE;
 IF co IS NULL OR NOT public.erp_has_role(ARRAY['Warehouse'],co) THEN RAISE EXCEPTION 'Authorized warehouse location required'; END IF;
 IF d.status='posted' THEN RETURN jsonb_build_object('id',d.id,'documentType',d.document_type); END IF;
 IF d.status<>'draft' THEN RAISE EXCEPTION 'Only drafts can be posted'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.warehouse_document_lines WHERE document_id=d.id) THEN RAISE EXCEPTION 'Document has no lines'; END IF;
 IF d.document_type='transfer' THEN SELECT company_id INTO target_co FROM public.locations WHERE id=d.target_location_id AND active IS TRUE; IF target_co IS DISTINCT FROM co OR d.target_location_id=d.location_id THEN RAISE EXCEPTION 'Transfer must use different locations in the same company'; END IF; END IF;
 IF d.production_work_order_id IS NOT NULL THEN RAISE EXCEPTION 'Production posting requires configured WIP costing and material allocation; no stock changes made'; END IF;
 IF d.document_type='goods_receipt' AND d.purchase_order_id IS NULL THEN RAISE EXCEPTION 'External goods receipt requires a purchase order'; END IF;
 PERFORM pg_advisory_xact_lock(732419,3);
 FOR l IN SELECT * FROM public.warehouse_document_lines WHERE document_id=d.id ORDER BY item_id,id FOR UPDATE LOOP
  IF l.quantity IS NULL OR l.quantity<=0 OR l.unit_price<0 THEN RAISE EXCEPTION 'Invalid quantity or price'; END IF;
  IF EXISTS(SELECT 1 FROM public.items WHERE id=l.item_id AND lot_tracking IS TRUE) THEN RAISE EXCEPTION 'LOT allocation must be configured before posting; no stock changes made'; END IF;
  INSERT INTO public.stock(item_id,location_id,quantity) VALUES(l.item_id,d.location_id,0) ON CONFLICT(item_id,location_id) DO NOTHING;
  SELECT quantity INTO qty FROM public.stock WHERE item_id=l.item_id AND location_id=d.location_id FOR UPDATE;
  delta:=CASE d.document_type WHEN 'goods_receipt' THEN l.quantity WHEN 'goods_issue' THEN -l.quantity WHEN 'transfer' THEN -l.quantity WHEN 'inventory' THEN l.counted_quantity-l.quantity END;
  IF delta IS NULL THEN RAISE EXCEPTION 'Missing inventory count'; END IF;
  IF d.document_type='inventory' AND qty<>l.quantity THEN RAISE EXCEPTION 'Stock changed after inventory count'; END IF;
  IF qty+delta<0 THEN RAISE EXCEPTION 'Insufficient stock for item %',l.item_id; END IF;
  IF d.document_type='goods_receipt' THEN
   SELECT * INTO STRICT po FROM public.purchase_order_lines WHERE id=l.purchase_order_line_id AND order_id=d.purchase_order_id AND item_id=l.item_id FOR UPDATE;
   IF coalesce(po.received_quantity,0)+l.quantity>po.quantity THEN RAISE EXCEPTION 'Receipt exceeds remaining ordered quantity'; END IF;
   UPDATE public.purchase_order_lines SET received_quantity=coalesce(received_quantity,0)+l.quantity WHERE id=po.id;
   price:=l.unit_price;
  ELSE SELECT purchase_price INTO price FROM public.items WHERE id=l.item_id; END IF;
  IF price IS NULL OR price<0 THEN RAISE EXCEPTION 'Missing inventory valuation'; END IF;
  value:=value+round(delta*price,2);
  UPDATE public.stock SET quantity=quantity+delta,updated_at=now() WHERE item_id=l.item_id AND location_id=d.location_id;
  IF d.document_type='transfer' THEN INSERT INTO public.stock(item_id,location_id,quantity) VALUES(l.item_id,d.target_location_id,l.quantity) ON CONFLICT(item_id,location_id) DO UPDATE SET quantity=stock.quantity+excluded.quantity,updated_at=now(); END IF;
 END LOOP;
 IF d.document_type<>'transfer' AND value<>0 THEN
  a:=public.erp_account('1100'); b:=public.erp_account(CASE d.document_type WHEN 'goods_receipt' THEN '2210' WHEN 'goods_issue' THEN '6000' ELSE '7900' END); num:=public.erp_next_gl_number();
  INSERT INTO public.gl_entries(entry_date,description,reference_type,reference_id,status,document_number,company_id,created_by) VALUES(d.document_date,'Warehouse '||d.document_number,'warehouse_document',d.id,'posted',num,co,auth.uid()) RETURNING id INTO g;
  INSERT INTO public.gl_entry_lines(entry_id,account_id,debit,credit,partner_id) VALUES(g,a,greatest(value,0),greatest(-value,0),d.partner_id),(g,b,greatest(-value,0),greatest(value,0),d.partner_id);
 END IF;
 IF d.document_type='goods_receipt' THEN
  FOR l IN SELECT * FROM public.warehouse_document_lines WHERE document_id=d.id LOOP SELECT vr.rate INTO STRICT rate FROM public.items i JOIN public.vat_rates vr ON vr.id=i.vat_rate_id WHERE i.id=l.item_id AND vr.active IS TRUE; net:=net+round(l.quantity*l.unit_price,2); tax:=tax+round(l.quantity*l.unit_price*rate/100,2); END LOOP;
  INSERT INTO public.invoices(invoice_type,invoice_number,invoice_date,partner_id,status,subtotal,vat_amount,total,warehouse_document_id,source_receipt_id,company_id) VALUES('incoming','UF-'||to_char(current_date,'YYYY')||'-'||nextval('public.erp_document_sequence'),d.document_date,d.partner_id,'draft',net,tax,net+tax,d.id,d.id,co) RETURNING * INTO inv;
  INSERT INTO public.invoice_lines(invoice_id,item_id,description,quantity,unit_price,vat_rate_id,vat_amount,total) SELECT inv.id,l.item_id,i.name,l.quantity,l.unit_price,i.vat_rate_id,round(l.quantity*l.unit_price*vr.rate/100,2),round(l.quantity*l.unit_price,2)+round(l.quantity*l.unit_price*vr.rate/100,2) FROM public.warehouse_document_lines l JOIN public.items i ON i.id=l.item_id JOIN public.vat_rates vr ON vr.id=i.vat_rate_id WHERE l.document_id=d.id;
  UPDATE public.purchase_orders SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM public.purchase_order_lines WHERE order_id=d.purchase_order_id AND coalesce(received_quantity,0)<quantity) THEN 'received' ELSE status END WHERE id=d.purchase_order_id;
 END IF;
 UPDATE public.warehouse_documents SET status='posted',posted_at=now(),total_value=abs(value) WHERE id=d.id;
 IF d.source_order_id IS NOT NULL THEN UPDATE public.ecommerce_orders SET status='shipped' WHERE id=d.source_order_id; END IF;
 RETURN jsonb_build_object('id',d.id,'documentType',d.document_type,'glEntryNumber',num,'glValue',abs(value),'invoiceProposalNumber',inv.invoice_number);
END $$;
REVOKE ALL ON FUNCTION public.erp_post_warehouse(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_post_warehouse(uuid) TO authenticated;