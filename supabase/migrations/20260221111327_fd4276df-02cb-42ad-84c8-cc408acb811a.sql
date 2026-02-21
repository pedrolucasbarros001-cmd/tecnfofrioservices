
-- Create storage bucket for service photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload photos
CREATE POLICY "Authenticated users can upload service photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-photos');

-- Policy: Anyone can view service photos (public bucket)
CREATE POLICY "Anyone can view service photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-photos');

-- Policy: Authenticated users can delete their own uploads
CREATE POLICY "Authenticated users can delete service photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-photos');
