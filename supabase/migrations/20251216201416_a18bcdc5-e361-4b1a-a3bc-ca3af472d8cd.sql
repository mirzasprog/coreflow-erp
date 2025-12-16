-- Fiscalization configuration per location/terminal
CREATE TABLE public.pos_fiscalization_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES public.locations(id),
  terminal_id UUID REFERENCES public.pos_terminals(id),
  fiscal_mode VARCHAR NOT NULL CHECK (fiscal_mode IN ('fbih', 'rs', 'disabled')),
  -- FBiH specific settings
  fbih_device_type VARCHAR,
  fbih_connection_type VARCHAR CHECK (fbih_connection_type IN ('usb', 'lan', 'serial')),
  fbih_device_ip VARCHAR,
  fbih_device_port INTEGER,
  fbih_operator_code VARCHAR,
  -- RS specific settings
  rs_api_url VARCHAR,
  rs_api_key_encrypted VARCHAR,
  rs_certificate_thumbprint VARCHAR,
  rs_pib VARCHAR,
  rs_business_unit_code VARCHAR,
  -- General settings
  auto_fiscalize BOOLEAN DEFAULT true,
  retry_on_failure BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fiscalization logs for audit trail
CREATE TABLE public.pos_fiscalization_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID REFERENCES public.pos_receipts(id),
  shift_id UUID REFERENCES public.pos_shifts(id),
  config_id UUID REFERENCES public.pos_fiscalization_config(id),
  fiscal_mode VARCHAR NOT NULL,
  operation_type VARCHAR NOT NULL CHECK (operation_type IN ('receipt', 'x_report', 'z_report', 'void')),
  request_data JSONB,
  response_data JSONB,
  fiscal_number VARCHAR,
  fiscal_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'retry')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add fiscal columns to pos_receipts
ALTER TABLE public.pos_receipts 
ADD COLUMN IF NOT EXISTS fiscal_number VARCHAR,
ADD COLUMN IF NOT EXISTS fiscal_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fiscalized BOOLEAN DEFAULT false;

-- Add X-report columns to pos_shifts
ALTER TABLE public.pos_shifts
ADD COLUMN IF NOT EXISTS x_report_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_x_report_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS z_report_number VARCHAR,
ADD COLUMN IF NOT EXISTS z_report_fiscal_number VARCHAR;

-- Enable RLS
ALTER TABLE public.pos_fiscalization_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_fiscalization_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all for authenticated" ON public.pos_fiscalization_config
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON public.pos_fiscalization_logs
FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_fiscal_logs_receipt ON public.pos_fiscalization_logs(receipt_id);
CREATE INDEX idx_fiscal_logs_shift ON public.pos_fiscalization_logs(shift_id);
CREATE INDEX idx_fiscal_logs_status ON public.pos_fiscalization_logs(status);
CREATE INDEX idx_fiscal_logs_created ON public.pos_fiscalization_logs(created_at DESC);
CREATE INDEX idx_fiscal_config_location ON public.pos_fiscalization_config(location_id);
CREATE INDEX idx_fiscal_config_terminal ON public.pos_fiscalization_config(terminal_id);