-- Create storage bucket for HSE documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('hse-documents', 'hse-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for HSE documents bucket
CREATE POLICY "Authenticated users can upload HSE documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hse-documents');

CREATE POLICY "Authenticated users can view HSE documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'hse-documents');

CREATE POLICY "Authenticated users can update their HSE documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'hse-documents');

CREATE POLICY "Authenticated users can delete HSE documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'hse-documents');