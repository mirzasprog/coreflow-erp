-- Create enum for payroll status
CREATE TYPE public.payroll_status AS ENUM ('draft', 'processed', 'paid');

-- Deduction types table
CREATE TABLE public.deduction_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  percentage NUMERIC DEFAULT NULL,
  fixed_amount NUMERIC DEFAULT NULL,
  is_mandatory BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payroll periods table
CREATE TABLE public.payroll_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_month DATE NOT NULL,
  status public.payroll_status DEFAULT 'draft',
  total_gross NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  total_net NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_by UUID DEFAULT NULL,
  UNIQUE(period_month)
);

-- Payslips table
CREATE TABLE public.payslips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  net_salary NUMERIC DEFAULT 0,
  working_days INTEGER DEFAULT 22,
  worked_days INTEGER DEFAULT 22,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payslip deductions table
CREATE TABLE public.payslip_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payslip_id UUID NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  deduction_type_id UUID NOT NULL REFERENCES public.deduction_types(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.deduction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_deductions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all for authenticated" ON public.deduction_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.payroll_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.payslips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.payslip_deductions FOR ALL USING (true) WITH CHECK (true);

-- Insert default deduction types for Bosnia
INSERT INTO public.deduction_types (code, name, percentage, is_mandatory) VALUES
  ('PIO', 'Penzijsko osiguranje', 17, true),
  ('ZDR', 'Zdravstveno osiguranje', 12.5, true),
  ('NEZ', 'Osiguranje od nezaposlenosti', 1.5, true),
  ('POREZ', 'Porez na dohodak', 10, true);