-- Add lot_tracking column to items table to persist LOT tracking setting
ALTER TABLE public.items 
ADD COLUMN lot_tracking boolean DEFAULT false;

-- Add require_lot_on_receipt column to enforce LOT number during goods receipt
ALTER TABLE public.items 
ADD COLUMN require_lot_on_receipt boolean DEFAULT false;

-- Comment explaining the columns
COMMENT ON COLUMN public.items.lot_tracking IS 'Whether this item requires LOT/batch tracking';
COMMENT ON COLUMN public.items.require_lot_on_receipt IS 'Whether LOT number is mandatory when receiving goods';