
CREATE TABLE public.ecommerce_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'BA',
  marketing_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecommerce_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register as customer"
  ON public.ecommerce_customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Customers can view own record"
  ON public.ecommerce_customers FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'authenticated');

CREATE POLICY "Customers can update own record"
  ON public.ecommerce_customers FOR UPDATE
  USING (user_id = auth.uid() OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete"
  ON public.ecommerce_customers FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE TRIGGER set_ecommerce_customers_updated_at
  BEFORE UPDATE ON public.ecommerce_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow public to create orders + read items/lots for storefront
CREATE POLICY "Public can create orders"
  ON public.ecommerce_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can create order items"
  ON public.ecommerce_order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read items"
  ON public.items FOR SELECT
  USING (active = true);
