-- Create storage bucket for company documents
INSERT INTO storage.buckets (id, name, public) VALUES ('company-docs', 'company-docs', false);

-- Storage policies for company-docs bucket
CREATE POLICY "Allow authenticated read company-docs" ON storage.objects 
  FOR SELECT USING (bucket_id = 'company-docs' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated upload company-docs" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'company-docs' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete company-docs" ON storage.objects 
  FOR DELETE USING (bucket_id = 'company-docs' AND auth.role() = 'authenticated');

-- Add file_url column to company_documents for original file reference
ALTER TABLE public.company_documents 
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS original_filename TEXT;