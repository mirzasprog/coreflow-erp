-- Create price_rules table for automated pricing rules
CREATE TABLE public.price_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  description TEXT,
  rule_type VARCHAR NOT NULL DEFAULT 'expiry_proximity',
  conditions JSONB NOT NULL DEFAULT '[]',
  action JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE,
  valid_to DATE,
  item_ids UUID[],
  category_ids UUID[],
  location_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_rules ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all authenticated" ON public.price_rules
  FOR ALL USING (true) WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_price_rules_updated_at
  BEFORE UPDATE ON public.price_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();