
ALTER TABLE public.purchase_requests
  ADD CONSTRAINT purchase_requests_partner_fk FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD CONSTRAINT purchase_requests_location_fk FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

ALTER TABLE public.purchase_request_lines
  ADD CONSTRAINT purchase_request_lines_item_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;

ALTER TABLE public.ecommerce_orders
  ADD CONSTRAINT ecommerce_orders_partner_fk FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD CONSTRAINT ecommerce_orders_location_fk FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

ALTER TABLE public.ecommerce_order_items
  ADD CONSTRAINT ecommerce_order_items_item_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;

ALTER TABLE public.production_boms
  ADD CONSTRAINT production_boms_product_fk FOREIGN KEY (product_item_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE public.production_bom_items
  ADD CONSTRAINT production_bom_items_bom_fk FOREIGN KEY (bom_id) REFERENCES public.production_boms(id) ON DELETE CASCADE,
  ADD CONSTRAINT production_bom_items_component_fk FOREIGN KEY (component_item_id) REFERENCES public.items(id) ON DELETE RESTRICT;

ALTER TABLE public.production_work_orders
  ADD CONSTRAINT pwo_product_fk FOREIGN KEY (product_item_id) REFERENCES public.items(id) ON DELETE RESTRICT,
  ADD CONSTRAINT pwo_bom_fk FOREIGN KEY (bom_id) REFERENCES public.production_boms(id) ON DELETE SET NULL,
  ADD CONSTRAINT pwo_location_fk FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

ALTER TABLE public.production_work_order_materials
  ADD CONSTRAINT pwom_wo_fk FOREIGN KEY (work_order_id) REFERENCES public.production_work_orders(id) ON DELETE CASCADE,
  ADD CONSTRAINT pwom_item_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;
