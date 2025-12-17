-- Link safety devices to fixed assets so assets can drive inspection schedules
ALTER TABLE public.safety_devices
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.fixed_assets(id) ON DELETE SET NULL;

-- Ensure one safety device record per asset
CREATE UNIQUE INDEX IF NOT EXISTS safety_devices_asset_id_uidx
  ON public.safety_devices(asset_id)
  WHERE asset_id IS NOT NULL;
