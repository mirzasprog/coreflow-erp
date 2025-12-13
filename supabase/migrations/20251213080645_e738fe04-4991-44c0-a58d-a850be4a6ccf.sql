-- Add document_number and reversed_entry_id columns to gl_entries table
ALTER TABLE public.gl_entries 
ADD COLUMN IF NOT EXISTS document_number character varying(20),
ADD COLUMN IF NOT EXISTS reversed_entry_id uuid REFERENCES public.gl_entries(id);

-- Create index on document_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_gl_entries_document_number ON public.gl_entries(document_number);

-- Create index on reversed_entry_id for tracking reversals
CREATE INDEX IF NOT EXISTS idx_gl_entries_reversed_entry_id ON public.gl_entries(reversed_entry_id);