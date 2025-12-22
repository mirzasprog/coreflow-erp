-- Create stock_lots table for real-time bin location and LOT tracking
CREATE TABLE public.stock_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  lot_number TEXT NOT NULL,
  expiry_date DATE,
  production_date DATE,
  bin_location TEXT,
  bin_zone TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, location_id, lot_number, bin_location)
);

-- Enable RLS
ALTER TABLE public.stock_lots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all operations on stock_lots" ON public.stock_lots FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_stock_lots_item_location ON public.stock_lots(item_id, location_id);
CREATE INDEX idx_stock_lots_lot_number ON public.stock_lots(lot_number);
CREATE INDEX idx_stock_lots_expiry ON public.stock_lots(expiry_date);
CREATE INDEX idx_stock_lots_bin ON public.stock_lots(bin_location);

-- Create company_documents table for storing procedures and policies
CREATE TABLE public.company_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow read company_documents" ON public.company_documents FOR SELECT USING (true);
CREATE POLICY "Allow all operations on company_documents" ON public.company_documents FOR ALL USING (true) WITH CHECK (true);

-- Create index for searching
CREATE INDEX idx_company_docs_category ON public.company_documents(category);
CREATE INDEX idx_company_docs_keywords ON public.company_documents USING GIN(keywords);