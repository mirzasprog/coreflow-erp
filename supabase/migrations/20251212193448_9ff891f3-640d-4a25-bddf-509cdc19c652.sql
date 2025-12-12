-- Create asset transfers table for history tracking
CREATE TABLE public.asset_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES public.locations(id),
  to_location_id UUID REFERENCES public.locations(id),
  from_custodian_id UUID REFERENCES public.employees(id),
  to_custodian_id UUID REFERENCES public.employees(id),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all for authenticated" 
ON public.asset_transfers 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);