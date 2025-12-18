-- Add asset_id column to safety_devices to link with fixed_assets
ALTER TABLE public.safety_devices
ADD COLUMN asset_id uuid REFERENCES public.fixed_assets(id) ON DELETE SET NULL;

-- Create unique index to ensure one safety device per asset
CREATE UNIQUE INDEX idx_safety_devices_asset_id ON public.safety_devices(asset_id) WHERE asset_id IS NOT NULL;

-- Add index for faster lookups
CREATE INDEX idx_safety_devices_location ON public.safety_devices(location_id);
CREATE INDEX idx_safety_devices_next_inspection ON public.safety_devices(next_inspection_date);