-- ============================================
-- MANITA — ACTIVAR FOTOS Y PORTAFOLIO (Fase 2)
-- Corre este script UNA VEZ en el SQL Editor de Supabase.
-- Es idempotente: puedes correrlo varias veces sin romper nada.
-- Habilita: foto de perfil (avatars) y galería de trabajos (portfolio).
-- ============================================

-- 1) BUCKETS de almacenamiento
--    avatars   (público, máx 2MB) : foto de perfil
--    portfolio (público, máx 5MB) : fotos de trabajos anteriores
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',   'avatars',   true, 2097152, ARRAY['image/jpeg','image/png','image/webp']),
  ('portfolio', 'portfolio', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) POLICIES de acceso (convención: {bucket}/{auth.uid()}/{archivo})
--    Lectura pública; solo el dueño de la carpeta puede subir/editar/borrar.
DROP POLICY IF EXISTS "fotos_lectura_publica" ON storage.objects;
CREATE POLICY "fotos_lectura_publica" ON storage.objects FOR SELECT
  USING (bucket_id IN ('avatars','portfolio'));

DROP POLICY IF EXISTS "fotos_subir_dueno" ON storage.objects;
CREATE POLICY "fotos_subir_dueno" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('avatars','portfolio') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "fotos_editar_dueno" ON storage.objects;
CREATE POLICY "fotos_editar_dueno" ON storage.objects FOR UPDATE
  USING (bucket_id IN ('avatars','portfolio') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "fotos_borrar_dueno" ON storage.objects;
CREATE POLICY "fotos_borrar_dueno" ON storage.objects FOR DELETE
  USING (bucket_id IN ('avatars','portfolio') AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3) COLUMNAS en professionals para guardar las URLs
--    avatar_url : texto con la URL pública de la foto de perfil
--    portfolio  : arreglo de URLs (texto[]) de trabajos anteriores
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS portfolio  text[] DEFAULT '{}';

-- 4) COLUMNA avatar_url en profiles (foto de perfil del cliente)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Listo. Tras correr esto, en la app el profesional podrá subir su foto
-- y sus trabajos desde el panel, el cliente su foto de perfil, y todo
-- se mostrará en su perfil público / cuenta.
