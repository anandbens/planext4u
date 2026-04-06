DROP POLICY IF EXISTS "Auth upload vendor-assets" ON storage.objects;
CREATE POLICY "Anyone upload vendor-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vendor-assets' AND (storage.foldername(name))[1] = 'store-logos');

CREATE POLICY "Auth upload vendor-assets other" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vendor-assets' AND (storage.foldername(name))[1] != 'store-logos');