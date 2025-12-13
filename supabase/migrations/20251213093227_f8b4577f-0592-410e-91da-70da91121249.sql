-- Create supplier ratings table
CREATE TABLE public.supplier_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    quality_rating integer NOT NULL CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating integer NOT NULL CHECK (communication_rating >= 1 AND communication_rating <= 5),
    delivery_rating integer NOT NULL CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    notes text,
    rating_date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);

-- Enable RLS
ALTER TABLE public.supplier_ratings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated" 
ON public.supplier_ratings 
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_supplier_ratings_partner_id ON public.supplier_ratings(partner_id);