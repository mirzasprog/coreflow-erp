
ALTER TABLE public.items 
  ADD COLUMN IF NOT EXISTS replenishment_source TEXT NOT NULL DEFAULT 'auto' CHECK (replenishment_source IN ('auto','supplier','central_warehouse')),
  ADD COLUMN IF NOT EXISTS central_warehouse_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS is_central BOOLEAN NOT NULL DEFAULT false;

-- normalize allowed location types
COMMENT ON COLUMN public.locations.type IS 'warehouse | store | mobile';

CREATE TABLE IF NOT EXISTS public.replenishment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  total_suggestions INTEGER NOT NULL DEFAULT 0,
  po_drafts_created INTEGER NOT NULL DEFAULT 0,
  transfer_drafts_created INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.replenishment_runs TO authenticated;
GRANT ALL ON public.replenishment_runs TO service_role;

ALTER TABLE public.replenishment_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated" ON public.replenishment_runs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
