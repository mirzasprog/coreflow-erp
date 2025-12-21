-- Create picking_orders table for warehouse commissioning/picking
CREATE TABLE public.picking_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  picking_number character varying NOT NULL UNIQUE,
  source_document_id uuid REFERENCES public.warehouse_documents(id),
  source_document_type character varying NOT NULL DEFAULT 'goods_issue',
  location_id uuid REFERENCES public.locations(id),
  partner_id uuid REFERENCES public.partners(id),
  status character varying NOT NULL DEFAULT 'open',
  picker_id uuid REFERENCES public.employees(id),
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  CONSTRAINT picking_orders_status_check CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled'))
);

-- Create picking_order_lines table
CREATE TABLE public.picking_order_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  picking_order_id uuid NOT NULL REFERENCES public.picking_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id),
  required_quantity numeric NOT NULL DEFAULT 0,
  picked_quantity numeric DEFAULT 0,
  lot_number character varying,
  expiry_date date,
  bin_location character varying,
  zone character varying,
  picked boolean DEFAULT false,
  picked_at timestamp with time zone,
  notes text
);

-- Enable RLS
ALTER TABLE public.picking_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picking_order_lines ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all for authenticated" ON public.picking_orders
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON public.picking_order_lines
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_picking_orders_status ON public.picking_orders(status);
CREATE INDEX idx_picking_orders_source ON public.picking_orders(source_document_id);
CREATE INDEX idx_picking_order_lines_order ON public.picking_order_lines(picking_order_id);

-- Add comments
COMMENT ON TABLE public.picking_orders IS 'Warehouse picking/commissioning orders';
COMMENT ON TABLE public.picking_order_lines IS 'Line items for picking orders';