-- Add annual leave entitlement to contracts table
ALTER TABLE public.contracts ADD COLUMN annual_leave_days integer DEFAULT 20;

-- Add comment for clarity
COMMENT ON COLUMN public.contracts.annual_leave_days IS 'Number of annual leave days entitled per year';