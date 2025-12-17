-- Add purchase_order_id to warehouse_documents for linking receipts to POs
ALTER TABLE public.warehouse_documents 
ADD COLUMN IF NOT EXISTS purchase_order_id uuid REFERENCES public.purchase_orders(id);

-- Add received_quantity to purchase_order_lines for tracking partial deliveries
ALTER TABLE public.purchase_order_lines 
ADD COLUMN IF NOT EXISTS received_quantity numeric DEFAULT 0;

-- Add source_receipt_id to invoices for linking invoice proposals to receipts
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS source_receipt_id uuid REFERENCES public.warehouse_documents(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_warehouse_documents_purchase_order_id 
ON public.warehouse_documents(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_invoices_source_receipt_id 
ON public.invoices(source_receipt_id);