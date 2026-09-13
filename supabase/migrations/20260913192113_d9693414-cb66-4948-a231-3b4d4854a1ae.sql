-- Storage: remover leitura pública
DROP POLICY IF EXISTS "Anyone can view service photos" ON storage.objects;
DROP POLICY IF EXISTS "Documentos Publicos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own objects" ON storage.objects;

CREATE POLICY "Autenticados podem ver fotos de servico"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'service-photos');

CREATE POLICY "Autenticados podem ver documentos de servico"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'service_documents');

CREATE POLICY "Autenticados podem inserir documentos de servico"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service_documents');

-- Remover armazenamento de palavras-passe em texto simples
DROP TABLE IF EXISTS public.user_passwords;