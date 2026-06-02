-- ==============================================
-- Storage Policies — Bucket 'uploads'
-- Execute no SQL Editor do Supabase Dashboard
-- ANTES: Crie o bucket 'uploads' como PÚBLICO no Dashboard
-- (Storage > New Bucket > Name: uploads > Public: ON)
-- ==============================================

-- Permitir que usuários autenticados façam upload
CREATE POLICY "Autenticados fazem upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'uploads');

-- Permitir leitura pública de todos os arquivos
CREATE POLICY "Leitura pública dos uploads"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'uploads');

-- Permitir que o dono do arquivo delete
CREATE POLICY "Dono pode deletar upload"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permitir que o dono do arquivo atualize
CREATE POLICY "Dono pode atualizar upload"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
