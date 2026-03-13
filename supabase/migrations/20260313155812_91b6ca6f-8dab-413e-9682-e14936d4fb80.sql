INSERT INTO storage.buckets (id, name, public) VALUES ('classified-images', 'classified-images', true);

CREATE POLICY "Authenticated users can upload classified images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'classified-images');

CREATE POLICY "Public can read classified images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'classified-images');

CREATE POLICY "Users can delete own classified images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'classified-images' AND (storage.foldername(name))[1] = auth.uid()::text);