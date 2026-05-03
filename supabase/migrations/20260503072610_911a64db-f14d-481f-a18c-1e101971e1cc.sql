
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number varchar NOT NULL UNIQUE,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  requester_id uuid,
  partner_id uuid,
  location_id uuid,
  status varchar NOT NULL DEFAULT 'draft',
  priority varchar DEFAULT 'normal',
  needed_by_date date,
  notes text,
  total_estimated_value numeric DEFAULT 0,
  converted_po_id uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_request_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  item_id uuid,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  estimated_unit_price numeric DEFAULT 0,
  estimated_total numeric DEFAULT 0,
  notes text
);

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_request_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated" ON public.purchase_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON public.purchase_request_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_pr_updated BEFORE UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
