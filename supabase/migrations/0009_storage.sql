-- ============================================
-- MANITA — Migración 0009: Storage seguro (I) + protección de datos (H)
-- Ejecutar en Supabase (usa el esquema storage.*). En PGlite se omite (no existe storage).
-- ============================================

-- Buckets:
--   avatars    (PÚBLICO)  : foto de perfil del profesional
--   portfolio  (PÚBLICO)  : fotos de trabajos del pro
--   service    (PRIVADO)  : fotos del servicio / "reserva por foto"
--   verification (PRIVADO): documentos de identidad (INE) — NUNCA públicos

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',      'avatars',      true,  2097152,  ARRAY['image/jpeg','image/png','image/webp']),
  ('portfolio',    'portfolio',    true,  5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('service',      'service',      false, 5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('verification', 'verification', false, 5242880,  ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Convención de nombres: {bucket}/{user_id}/{uuid}.{ext}
-- El primer segmento del path DEBE ser el auth.uid() del dueño → base de las policies.

-- avatars/portfolio: lectura pública; escritura/borrado solo del dueño de la carpeta
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT
  USING (bucket_id IN ('avatars','portfolio'));

DROP POLICY IF EXISTS "own_write_public" ON storage.objects;
CREATE POLICY "own_write_public" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('avatars','portfolio') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "own_update_public" ON storage.objects;
CREATE POLICY "own_update_public" ON storage.objects FOR UPDATE
  USING (bucket_id IN ('avatars','portfolio') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "own_delete_public" ON storage.objects;
CREATE POLICY "own_delete_public" ON storage.objects FOR DELETE
  USING (bucket_id IN ('avatars','portfolio','service','verification') AND (storage.foldername(name))[1] = auth.uid()::text);

-- service/verification: PRIVADOS. Solo el dueño (o admin) lee. Acceso vía URL firmada.
DROP POLICY IF EXISTS "private_read_owner" ON storage.objects;
CREATE POLICY "private_read_owner" ON storage.objects FOR SELECT
  USING (bucket_id IN ('service','verification')
         AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin()));

DROP POLICY IF EXISTS "private_write_owner" ON storage.objects;
CREATE POLICY "private_write_owner" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('service','verification') AND (storage.foldername(name))[1] = auth.uid()::text);

-- NOTA (H): 'verification' (INE) es privado y solo accesible por dueño/admin mediante URL firmada.
--           direcciones/teléfono viven en bookings/profiles protegidos por RLS, nunca en buckets públicos.
