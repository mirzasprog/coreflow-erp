
-- E-COMMERCE ORDERS
CREATE TABLE public.ecommerce_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR NOT NULL UNIQUE,
  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name VARCHAR NOT NULL,
  customer_email VARCHAR,
  customer_phone VARCHAR,
  partner_id UUID,
  location_id UUID,
  status VARCHAR NOT NULL DEFAULT 'new', -- new, paid, shipped, delivered, cancelled
  payment_status VARCHAR NOT NULL DEFAULT 'pending', -- pending, paid, refunded, failed
  payment_method VARCHAR,
  shipping_method VARCHAR,
  shipping_address TEXT,
  shipping_city VARCHAR,
  shipping_postal_code VARCHAR,
  shipping_country VARCHAR,
  tracking_number VARCHAR,
  discount_code VARCHAR,
  discount_amount NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ecommerce_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ecommerce_orders(id) ON DELETE CASCADE,
  item_id UUID,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  vat_rate_id UUID,
  vat_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0
);

CREATE TABLE public.ecommerce_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ecommerce_orders(id) ON DELETE CASCADE,
  return_number VARCHAR NOT NULL UNIQUE,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  status VARCHAR NOT NULL DEFAULT 'requested', -- requested, approved, received, refunded, rejected
  refund_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ecommerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated" ON public.ecommerce_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON public.ecommerce_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON public.ecommerce_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_ecommerce_orders_updated_at BEFORE UPDATE ON public.ecommerce_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ecommerce_returns_updated_at BEFORE UPDATE ON public.ecommerce_returns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCTION BOM
CREATE TABLE public.production_boms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  product_item_id UUID,
  output_quantity NUMERIC NOT NULL DEFAULT 1,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.production_bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID NOT NULL REFERENCES public.production_boms(id) ON DELETE CASCADE,
  component_item_id UUID NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  notes TEXT
);

-- PRODUCTION WORK ORDERS
CREATE TABLE public.production_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number VARCHAR NOT NULL UNIQUE,
  bom_id UUID REFERENCES public.production_boms(id),
  product_item_id UUID,
  location_id UUID,
  planned_quantity NUMERIC NOT NULL DEFAULT 0,
  produced_quantity NUMERIC DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'draft', -- draft, planned, in_progress, completed, cancelled
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.production_work_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.production_work_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  planned_quantity NUMERIC NOT NULL DEFAULT 0,
  consumed_quantity NUMERIC DEFAULT 0,
  notes TEXT
);

ALTER TABLE public.production_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_work_order_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated" ON public.production_boms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON public.production_bom_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON public.production_work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON public.production_work_order_materials FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_production_boms_updated_at BEFORE UPDATE ON public.production_boms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_production_work_orders_updated_at BEFORE UPDATE ON public.production_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- COMPANY SETTINGS (per location)
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID UNIQUE,
  legal_name VARCHAR NOT NULL,
  tax_id VARCHAR NOT NULL, -- JIB
  vat_number VARCHAR, -- PDV broj
  registration_number VARCHAR,
  address TEXT,
  city VARCHAR,
  postal_code VARCHAR,
  country VARCHAR DEFAULT 'BA',
  phone VARCHAR,
  email VARCHAR,
  website VARCHAR,
  iban VARCHAR,
  swift VARCHAR,
  bank_name VARCHAR,
  default_currency VARCHAR DEFAULT 'BAM',
  einvoice_endpoint_id VARCHAR,
  einvoice_scheme_id VARCHAR DEFAULT '9938',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated" ON public.company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
