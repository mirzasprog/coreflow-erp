-- Module settings table
CREATE TABLE public.module_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_name VARCHAR NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Price lists table
CREATE TABLE public.price_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  description TEXT,
  currency VARCHAR DEFAULT 'BAM',
  is_default BOOLEAN DEFAULT false,
  valid_from DATE,
  valid_to DATE,
  active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Price list items (prices per item per price list)
CREATE TABLE public.price_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  min_price NUMERIC,
  max_price NUMERIC,
  margin_percent NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(price_list_id, item_id)
);

-- Price list location assignments
CREATE TABLE public.price_list_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(price_list_id, location_id)
);

-- Price change history
CREATE TABLE public.price_changes_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  price_list_id UUID REFERENCES public.price_lists(id) ON DELETE SET NULL,
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  change_type VARCHAR NOT NULL, -- 'manual', 'promo', 'import', 'ai_suggested'
  change_reason TEXT,
  changed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Promo activities (promotional campaigns)
CREATE TABLE public.promo_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  description TEXT,
  promo_type VARCHAR NOT NULL DEFAULT 'discount', -- 'discount', 'bundle', 'bogo', 'seasonal'
  discount_percent NUMERIC,
  discount_amount NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_weekend_only BOOLEAN DEFAULT false,
  is_holiday_promo BOOLEAN DEFAULT false,
  season VARCHAR, -- 'spring', 'summer', 'autumn', 'winter'
  status VARCHAR NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'completed', 'cancelled'
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Promo items (items in promotions)
CREATE TABLE public.promo_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_activity_id UUID NOT NULL REFERENCES public.promo_activities(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  original_price NUMERIC NOT NULL,
  promo_price NUMERIC NOT NULL,
  ai_suggested_price NUMERIC,
  ai_suggestion_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(promo_activity_id, item_id)
);

-- Promo activity location assignments
CREATE TABLE public.promo_activity_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_activity_id UUID NOT NULL REFERENCES public.promo_activities(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(promo_activity_id, location_id)
);

-- Competitor prices (optional tracking)
CREATE TABLE public.competitor_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  competitor_name VARCHAR NOT NULL,
  price NUMERIC NOT NULL,
  source VARCHAR, -- 'manual', 'web_scraping', 'import'
  observed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location VARCHAR,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_changes_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_activity_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all for authenticated" ON public.module_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.price_lists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.price_list_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.price_list_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.price_changes_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.promo_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.promo_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.promo_activity_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.competitor_prices FOR ALL USING (true) WITH CHECK (true);

-- Insert default module setting
INSERT INTO public.module_settings (module_name, enabled) VALUES ('price_management', false);

-- Create indexes for performance
CREATE INDEX idx_price_list_items_item ON public.price_list_items(item_id);
CREATE INDEX idx_price_list_items_list ON public.price_list_items(price_list_id);
CREATE INDEX idx_price_changes_item ON public.price_changes_history(item_id);
CREATE INDEX idx_price_changes_date ON public.price_changes_history(created_at);
CREATE INDEX idx_promo_items_item ON public.promo_items(item_id);
CREATE INDEX idx_promo_activities_dates ON public.promo_activities(start_date, end_date);
CREATE INDEX idx_competitor_prices_item ON public.competitor_prices(item_id);