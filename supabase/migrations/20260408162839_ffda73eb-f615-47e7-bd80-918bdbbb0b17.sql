-- Allow anon uploads to vendor-assets in vendor-reg/ folder (for registration)
CREATE POLICY "Anyone upload vendor-assets vendor-reg"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'vendor-assets'
  AND (storage.foldername(name))[1] = 'vendor-reg'
);

-- Allow anon uploads to kyc-documents in vendor-reg/ folder (for registration)
CREATE POLICY "Anyone upload kyc-docs vendor-reg"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = 'vendor-reg'
);

-- Allow admins and public to read kyc vendor-reg docs (needed for admin review)
CREATE POLICY "Public read kyc vendor-reg docs"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = 'vendor-reg'
);