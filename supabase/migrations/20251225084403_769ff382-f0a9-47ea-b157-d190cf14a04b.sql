-- Drop all existing policies and create permissive ones for testing
-- This allows all authenticated users full access to all tables

-- Helper function to drop all policies on a table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Create permissive policies for all tables
-- absences
CREATE POLICY "Allow all authenticated" ON public.absences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- accounts
CREATE POLICY "Allow all authenticated" ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- asset_categories
CREATE POLICY "Allow all authenticated" ON public.asset_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- asset_transfers
CREATE POLICY "Allow all authenticated" ON public.asset_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- companies
CREATE POLICY "Allow all authenticated" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- company_documents
CREATE POLICY "Allow all authenticated" ON public.company_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- competitor_prices
CREATE POLICY "Allow all authenticated" ON public.competitor_prices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- contracts
CREATE POLICY "Allow all authenticated" ON public.contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- deduction_types
CREATE POLICY "Allow all authenticated" ON public.deduction_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- departments
CREATE POLICY "Allow all authenticated" ON public.departments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- depreciation_records
CREATE POLICY "Allow all authenticated" ON public.depreciation_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- employees
CREATE POLICY "Allow all authenticated" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- fixed_assets
CREATE POLICY "Allow all authenticated" ON public.fixed_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- gl_entries
CREATE POLICY "Allow all authenticated" ON public.gl_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- gl_entry_lines
CREATE POLICY "Allow all authenticated" ON public.gl_entry_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- invoice_lines
CREATE POLICY "Allow all authenticated" ON public.invoice_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- invoices
CREATE POLICY "Allow all authenticated" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- item_categories
CREATE POLICY "Allow all authenticated" ON public.item_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- items
CREATE POLICY "Allow all authenticated" ON public.items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- locations
CREATE POLICY "Allow all authenticated" ON public.locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- medical_checks
CREATE POLICY "Allow all authenticated" ON public.medical_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- module_settings
CREATE POLICY "Allow all authenticated" ON public.module_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- partners
CREATE POLICY "Allow all authenticated" ON public.partners FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- payroll_periods
CREATE POLICY "Allow all authenticated" ON public.payroll_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- payslip_deductions
CREATE POLICY "Allow all authenticated" ON public.payslip_deductions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- payslips
CREATE POLICY "Allow all authenticated" ON public.payslips FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- picking_order_lines
CREATE POLICY "Allow all authenticated" ON public.picking_order_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- picking_orders
CREATE POLICY "Allow all authenticated" ON public.picking_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pos_fiscalization_config
CREATE POLICY "Allow all authenticated" ON public.pos_fiscalization_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pos_fiscalization_logs
CREATE POLICY "Allow all authenticated" ON public.pos_fiscalization_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pos_receipt_lines
CREATE POLICY "Allow all authenticated" ON public.pos_receipt_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pos_receipts
CREATE POLICY "Allow all authenticated" ON public.pos_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pos_shifts
CREATE POLICY "Allow all authenticated" ON public.pos_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pos_terminals
CREATE POLICY "Allow all authenticated" ON public.pos_terminals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- price_changes_history
CREATE POLICY "Allow all authenticated" ON public.price_changes_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- price_list_items
CREATE POLICY "Allow all authenticated" ON public.price_list_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- price_list_locations
CREATE POLICY "Allow all authenticated" ON public.price_list_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- price_lists
CREATE POLICY "Allow all authenticated" ON public.price_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- promo_activities
CREATE POLICY "Allow all authenticated" ON public.promo_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- promo_activity_locations
CREATE POLICY "Allow all authenticated" ON public.promo_activity_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- promo_items
CREATE POLICY "Allow all authenticated" ON public.promo_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- purchase_order_lines
CREATE POLICY "Allow all authenticated" ON public.purchase_order_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- purchase_orders
CREATE POLICY "Allow all authenticated" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- safety_device_types
CREATE POLICY "Allow all authenticated" ON public.safety_device_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- safety_devices
CREATE POLICY "Allow all authenticated" ON public.safety_devices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- safety_inspections
CREATE POLICY "Allow all authenticated" ON public.safety_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- stock
CREATE POLICY "Allow all authenticated" ON public.stock FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- stock_lots
CREATE POLICY "Allow all authenticated" ON public.stock_lots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- supplier_ratings
CREATE POLICY "Allow all authenticated" ON public.supplier_ratings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- units_of_measure
CREATE POLICY "Allow all authenticated" ON public.units_of_measure FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- vat_rates
CREATE POLICY "Allow all authenticated" ON public.vat_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- warehouse_document_lines
CREATE POLICY "Allow all authenticated" ON public.warehouse_document_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- warehouse_documents
CREATE POLICY "Allow all authenticated" ON public.warehouse_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);