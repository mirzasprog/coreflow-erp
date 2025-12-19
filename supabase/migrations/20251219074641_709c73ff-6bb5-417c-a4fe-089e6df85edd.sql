-- Create safety_device_types table
CREATE TABLE public.safety_device_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  description TEXT,
  inspection_interval_months INTEGER DEFAULT 12,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.safety_device_types ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated" ON public.safety_device_types
  FOR ALL USING (true) WITH CHECK (true);

-- Insert predefined device types
INSERT INTO public.safety_device_types (code, name, description, inspection_interval_months) VALUES
  ('FIRE_EXT', 'Vatrogasni aparat', 'Prijenosni vatrogasni aparati', 12),
  ('FIRE_HOSE', 'Vatrogasno crijevo', 'Hidrantska crijeva i armature', 12),
  ('FIRE_ALARM', 'Vatrodojava', 'Sustavi za dojavu požara', 12),
  ('SMOKE_DET', 'Detektor dima', 'Detektori dima i požara', 12),
  ('SPRINKLER', 'Sprinkler sustav', 'Automatski sustavi gašenja', 6),
  ('EMERGENCY_LIGHT', 'Panik rasvjeta', 'Sigurnosna i panik rasvjeta', 12),
  ('FIRST_AID', 'Ormarić prve pomoći', 'Kutije i ormarići prve pomoći', 12),
  ('SAFETY_SIGN', 'Sigurnosna signalizacija', 'Znakovi sigurnosti i evakuacije', 24),
  ('GAS_DET', 'Detektor plina', 'Detektori curenja plina', 6),
  ('ELEVATOR', 'Dizalo', 'Osobna i teretna dizala', 12),
  ('PRESSURE_VESSEL', 'Posuda pod tlakom', 'Tlačne posude i kotlovi', 12),
  ('CRANE', 'Dizalica', 'Mostne i portalane dizalice', 12),
  ('FORKLIFT', 'Viličar', 'Viličari i transportna sredstva', 12),
  ('PPE', 'Osobna zaštitna oprema', 'OZO - kacige, rukavice, obuća', 12),
  ('OTHER', 'Ostalo', 'Ostali sigurnosni uređaji', 12);

-- Add asset_categories table
CREATE TABLE public.asset_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all for authenticated" ON public.asset_categories
  FOR ALL USING (true) WITH CHECK (true);

-- Insert predefined asset categories
INSERT INTO public.asset_categories (code, name, description) VALUES
  ('IT', 'IT oprema', 'Računala, serveri, mrežna oprema'),
  ('VEHICLES', 'Vozila', 'Automobili, kamioni, motocikli'),
  ('FURNITURE', 'Namještaj', 'Stolovi, stolice, ormari'),
  ('MACHINERY', 'Strojevi', 'Proizvodni strojevi i oprema'),
  ('OFFICE_EQ', 'Uredska oprema', 'Pisači, skeneri, projektori'),
  ('BUILDINGS', 'Građevine', 'Zgrade, skladišta, garaže'),
  ('LAND', 'Zemljište', 'Parcele i zemljišta'),
  ('FIRE_SAFETY', 'Vatrogasna oprema', 'Vatrogasni aparati i oprema'),
  ('SAFETY_EQ', 'Sigurnosna oprema', 'HSE oprema i uređaji'),
  ('TOOLS', 'Alati', 'Ručni i električni alati'),
  ('HVAC', 'Klimatizacija', 'Klima uređaji, grijanje, ventilacija'),
  ('OTHER', 'Ostalo', 'Ostala osnovna sredstva');