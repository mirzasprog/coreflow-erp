CREATE UNIQUE INDEX stock_lot_identity ON public.stock_lots(item_id,location_id,lot_number);
CREATE OR REPLACE FUNCTION public.erp_assert_open_period(p_company uuid,p_date date) RETURNS void LANGUAGE plpgsql STABLE SET search_path=public AS $$ BEGIN IF EXISTS(SELECT 1 FROM public.accounting_periods WHERE company_id=p_company AND closed_at IS NOT NULL AND p_date BETWEEN starts_on AND ends_on) THEN RAISE EXCEPTION 'Knjigovodstveni period je zatvoren'; END IF; END $$;
CREATE OR REPLACE FUNCTION public.erp_post_warehouse(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d public.warehouse_documents%ROWTYPE; l public.warehouse_document_lines%ROWTYPE; co uuid; target_co uuid; delta numeric; value numeric:=0; qty numeric; price numeric; g uuid; num text; inv public.invoices%ROWTYPE; a uuid; b uuid; po public.purchase_order_lines%ROWTYPE; net numeric:=0; tax numeric:=0; lot_meta jsonb; remaining numeric; lot record; tracked boolean; BEGIN
 SELECT * INTO STRICT d FROM public.warehouse_documents WHERE id=p_id FOR UPDATE;
 SELECT company_id INTO co FROM public.locations WHERE id=d.location_id AND active IS TRUE;
 IF co IS NULL OR NOT public.erp_has_role(ARRAY['Warehouse'],co) THEN RAISE EXCEPTION 'Nemate pravo knjiženja na ovoj lokaciji'; END IF;
 IF d.status='posted' THEN RETURN jsonb_build_object('id',d.id,'documentType',d.document_type); END IF;
 IF d.status<>'draft' THEN RAISE EXCEPTION 'Samo nacrt se može proknjižiti'; END IF;
 PERFORM public.erp_assert_open_period(co,d.document_date);
 IF NOT EXISTS(SELECT 1 FROM public.warehouse_document_lines WHERE document_id=d.id) THEN RAISE EXCEPTION 'Dokument nema stavki'; END IF;
 IF d.document_type='transfer' THEN SELECT company_id INTO target_co FROM public.locations WHERE id=d.target_location_id AND active IS TRUE; IF target_co IS DISTINCT FROM co OR d.target_location_id=d.location_id THEN RAISE EXCEPTION 'Transfer mora biti između različitih lokacija iste firme'; END IF; END IF;
 IF d.production_work_order_id IS NOT NULL THEN RAISE EXCEPTION 'Proizvodno knjiženje zahtijeva zasebno podešavanje WIP konta'; END IF;
 IF d.document_type='goods_receipt' AND d.purchase_order_id IS NULL THEN RAISE EXCEPTION 'Vanjska primka mora biti povezana s narudžbenicom'; END IF;
 PERFORM pg_advisory_xact_lock(732419,3);
 FOR l IN SELECT * FROM public.warehouse_document_lines WHERE document_id=d.id ORDER BY item_id,id FOR UPDATE LOOP
  IF l.quantity IS NULL OR l.quantity<=0 OR l.unit_price<0 THEN RAISE EXCEPTION 'Neispravna količina ili cijena'; END IF;
  SELECT coalesce(lot_tracking,false) INTO tracked FROM public.items WHERE id=l.item_id AND active IS TRUE;
  IF tracked AND d.document_type IN ('transfer','inventory') THEN RAISE EXCEPTION 'LOT artikal zahtijeva zasebnu alokaciju za transfer ili inventuru'; END IF;
  INSERT INTO public.stock(item_id,location_id,quantity) VALUES(l.item_id,d.location_id,0) ON CONFLICT(item_id,location_id) DO NOTHING;
  SELECT quantity INTO qty FROM public.stock WHERE item_id=l.item_id AND location_id=d.location_id FOR UPDATE;
  delta:=CASE d.document_type WHEN 'goods_receipt' THEN l.quantity WHEN 'goods_issue' THEN -l.quantity WHEN 'transfer' THEN -l.quantity WHEN 'inventory' THEN l.counted_quantity-l.quantity END;
  IF delta IS NULL THEN RAISE EXCEPTION 'Nedostaje inventurno stanje'; END IF;
  IF d.document_type='inventory' AND qty<>l.quantity THEN RAISE EXCEPTION 'Zaliha se promijenila nakon popisa'; END IF;
  IF qty+delta<0 THEN RAISE EXCEPTION 'Nedovoljna zaliha artikla %',l.item_id; END IF;
  IF d.document_type='goods_receipt' THEN
   SELECT * INTO STRICT po FROM public.purchase_order_lines WHERE id=l.purchase_order_line_id AND order_id=d.purchase_order_id AND item_id=l.item_id FOR UPDATE;
   IF coalesce(po.received_quantity,0)+l.quantity>po.quantity THEN RAISE EXCEPTION 'Primka premašuje preostalu naručenu količinu'; END IF;
   UPDATE public.purchase_order_lines SET received_quantity=coalesce(received_quantity,0)+l.quantity WHERE id=po.id;
   price:=l.unit_price;
   IF tracked THEN lot_meta:=l.notes::jsonb->'wms'; IF coalesce(lot_meta->>'lotNumber','')='' THEN RAISE EXCEPTION 'Unesite LOT broj za praćeni artikal'; END IF;
    INSERT INTO public.stock_lots(item_id,location_id,lot_number,expiry_date,production_date,bin_location,bin_zone,quantity) VALUES(l.item_id,d.location_id,lot_meta->>'lotNumber',NULLIF(lot_meta->>'expiryDate','')::date,NULLIF(lot_meta->>'productionDate','')::date,lot_meta->>'binLocation',lot_meta->>'binZone',l.quantity) ON CONFLICT(item_id,location_id,lot_number) DO UPDATE SET quantity=stock_lots.quantity+excluded.quantity,updated_at=now();
   END IF;
  ELSE SELECT purchase_price INTO price FROM public.items WHERE id=l.item_id; END IF;
  IF tracked AND d.document_type='goods_issue' THEN remaining:=l.quantity;
   FOR lot IN SELECT * FROM public.stock_lots WHERE item_id=l.item_id AND location_id=d.location_id AND quantity-reserved_quantity>0 ORDER BY expiry_date NULLS LAST,created_at,id FOR UPDATE LOOP
    delta:=least(remaining,lot.quantity-lot.reserved_quantity); UPDATE public.stock_lots SET quantity=quantity-delta,updated_at=now() WHERE id=lot.id; remaining:=remaining-delta; EXIT WHEN remaining=0;
   END LOOP;
   IF remaining>0 THEN RAISE EXCEPTION 'Nedovoljna LOT zaliha artikla %',l.item_id; END IF;
   delta:=-l.quantity;
  END IF;
  IF price IS NULL OR price<0 THEN RAISE EXCEPTION 'Nedostaje nabavna vrijednost artikla'; END IF;
  value:=value+round(delta*price,2);
  UPDATE public.stock SET quantity=quantity+delta,updated_at=now() WHERE item_id=l.item_id AND location_id=d.location_id;
  IF d.document_type='transfer' THEN INSERT INTO public.stock(item_id,location_id,quantity) VALUES(l.item_id,d.target_location_id,l.quantity) ON CONFLICT(item_id,location_id) DO UPDATE SET quantity=stock.quantity+excluded.quantity,updated_at=now(); END IF;
 END LOOP;
 IF d.document_type<>'transfer' AND value<>0 THEN
  a:=public.erp_company_account(co,'1100'); b:=public.erp_company_account(co,CASE d.document_type WHEN 'goods_receipt' THEN '2210' WHEN 'goods_issue' THEN '6000' ELSE '7900' END); num:=public.erp_next_gl_number();
  INSERT INTO public.gl_entries(entry_date,description,reference_type,reference_id,status,document_number,company_id,created_by) VALUES(d.document_date,'Skladište '||d.document_number,'warehouse_document',d.id,'posted',num,co,auth.uid()) RETURNING id INTO g;
  INSERT INTO public.gl_entry_lines(entry_id,account_id,debit,credit,partner_id) VALUES(g,a,greatest(value,0),greatest(-value,0),d.partner_id),(g,b,greatest(-value,0),greatest(value,0),d.partner_id);
 END IF;
 IF d.document_type='goods_receipt' THEN
  INSERT INTO public.invoices(invoice_type,invoice_number,invoice_date,partner_id,status,subtotal,vat_amount,total,warehouse_document_id,source_receipt_id,company_id) SELECT 'incoming','UF-'||to_char(current_date,'YYYY')||'-'||nextval('public.erp_document_sequence'),d.document_date,d.partner_id,'draft',sum(round(l.quantity*l.unit_price,2)),sum(round(round(l.quantity*l.unit_price,2)*vr.rate/100,2)),sum(round(l.quantity*l.unit_price,2)+round(round(l.quantity*l.unit_price,2)*vr.rate/100,2)),d.id,d.id,co FROM public.warehouse_document_lines l JOIN public.items i ON i.id=l.item_id JOIN public.vat_rates vr ON vr.id=i.vat_rate_id AND vr.active IS TRUE WHERE l.document_id=d.id GROUP BY d.id RETURNING * INTO inv;
  INSERT INTO public.invoice_lines(invoice_id,item_id,description,quantity,unit_price,vat_rate_id,vat_amount,total) SELECT inv.id,l.item_id,i.name,l.quantity,l.unit_price,i.vat_rate_id,round(round(l.quantity*l.unit_price,2)*vr.rate/100,2),round(l.quantity*l.unit_price,2)+round(round(l.quantity*l.unit_price,2)*vr.rate/100,2) FROM public.warehouse_document_lines l JOIN public.items i ON i.id=l.item_id JOIN public.vat_rates vr ON vr.id=i.vat_rate_id WHERE l.document_id=d.id;
  UPDATE public.purchase_orders SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM public.purchase_order_lines WHERE order_id=d.purchase_order_id AND coalesce(received_quantity,0)<quantity) THEN 'received' ELSE status END WHERE id=d.purchase_order_id;
 END IF;
 UPDATE public.warehouse_documents SET status='posted',posted_at=now(),total_value=abs(value) WHERE id=d.id;
 UPDATE public.picking_orders SET status='completed',completed_at=now() WHERE source_document_id=d.id AND status<>'completed';
 IF d.source_order_id IS NOT NULL THEN UPDATE public.ecommerce_orders SET status='shipped' WHERE id=d.source_order_id; END IF;
 RETURN jsonb_build_object('id',d.id,'documentType',d.document_type,'glEntryNumber',num,'glValue',abs(value),'invoiceProposalNumber',inv.invoice_number);
END $$;