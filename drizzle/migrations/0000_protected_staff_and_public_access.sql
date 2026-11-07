CREATE TABLE public.user_roles (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 company_id uuid NOT NULL REFERENCES public.companies(id),
 role text NOT NULL CHECK(role IN ('SystemAdmin','Finance','Warehouse','POSCashier','HR','HSEOfficer','Management')),
 granted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,company_id,role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_staff_roles ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.erp_has_role(p_roles text[], p_company uuid DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND (p_company IS NULL OR r.company_id=p_company) AND (r.role='SystemAdmin' OR r.role=ANY(p_roles)))
$$;
REVOKE ALL ON FUNCTION public.erp_has_role(text[],uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_has_role(text[],uuid) TO authenticated;
DO $$ DECLARE t text; p record; read_roles text[]; write_roles text[]; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'user_roles' LOOP
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t); END LOOP;
  read_roles:=ARRAY['Management']; write_roles:=ARRAY[]::text[];
  IF t IN ('accounts','invoices','invoice_lines','gl_entries','gl_entry_lines','bank_statements','bank_statement_lines','fixed_assets','asset_categories','asset_transfers','depreciation_records') THEN write_roles:=ARRAY['Finance']; END IF;
  IF t IN ('stock','stock_lots','warehouse_documents','warehouse_document_lines','picking_orders','picking_order_lines','purchase_orders','purchase_order_lines','purchase_requests','purchase_request_lines','supplier_ratings','replenishment_runs','production_boms','production_bom_items','production_work_orders','production_work_order_materials') THEN write_roles:=ARRAY['Warehouse']; END IF;
  IF t IN ('pos_receipts','pos_receipt_lines','pos_shifts') THEN write_roles:=ARRAY['POSCashier']; END IF;
  IF t IN ('employees','departments','contracts','absences','payroll_periods','payslips','payslip_deductions','deduction_types') THEN write_roles:=ARRAY['HR']; read_roles:=ARRAY['HR']; END IF;
  IF t IN ('medical_checks','safety_inspections','safety_devices','safety_device_types') THEN write_roles:=ARRAY['HSEOfficer']; read_roles:=ARRAY['HSEOfficer']; END IF;
  IF t IN ('items','vat_rates','units_of_measure','item_categories','locations','companies','partners','pos_terminals','company_documents') THEN read_roles:=ARRAY['Management','Finance','Warehouse','POSCashier','HR','HSEOfficer']; END IF;
  read_roles:=read_roles||write_roles;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY staff_read ON public.%I FOR SELECT TO authenticated USING(public.erp_has_role(%L::text[]))',t,read_roles);
  EXECUTE format('CREATE POLICY staff_insert ON public.%I FOR INSERT TO authenticated WITH CHECK(public.erp_has_role(%L::text[]))',t,write_roles);
  EXECUTE format('CREATE POLICY staff_update ON public.%I FOR UPDATE TO authenticated USING(public.erp_has_role(%L::text[])) WITH CHECK(public.erp_has_role(%L::text[]))',t,write_roles,write_roles);
  EXECUTE format('CREATE POLICY staff_delete ON public.%I FOR DELETE TO authenticated USING(public.erp_has_role(%L::text[]))',t,write_roles);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
 END LOOP;
END $$;
CREATE POLICY customer_own_profile ON public.ecommerce_customers FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY customer_own_orders ON public.ecommerce_orders FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.ecommerce_customers c WHERE c.id=customer_id AND c.user_id=auth.uid()));
CREATE POLICY customer_own_lines ON public.ecommerce_order_items FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.ecommerce_orders o JOIN public.ecommerce_customers c ON c.id=o.customer_id WHERE o.id=order_id AND c.user_id=auth.uid()));
REVOKE ALL ON public.channel_connections FROM authenticated;
GRANT SELECT(id,channel_name,property_id,is_active,sync_enabled,last_sync_at,created_at,updated_at) ON public.channel_connections TO authenticated;
COMMENT ON COLUMN public.channel_connections.api_key IS 'DEPRECATED: browser access revoked; migrate credentials to server-only secret storage before real channel integration';