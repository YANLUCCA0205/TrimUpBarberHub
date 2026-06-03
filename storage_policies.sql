-- ==============================================
-- Storage Policies — Bucket 'uploads'
-- Execute no SQL Editor do Supabase Dashboard
-- ==============================================

-- 0. Garantir a existência do bucket 'uploads' público
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

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
