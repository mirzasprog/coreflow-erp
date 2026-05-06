
ALTER TABLE public.ecommerce_customers
  ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'active';

ALTER TABLE public.ecommerce_orders
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.ecommerce_customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_customer_id ON public.ecommerce_orders(customer_id);
