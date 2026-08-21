-- ============================================
-- MANITA — ACTIVAR VERIFICACIÓN DE IDENTIDAD DEL PROFESIONAL
-- Corre este script UNA VEZ en el SQL Editor de Supabase. Es idempotente.
-- Crea: bucket privado 'verification' + tabla 'verification_requests' + RLS.
-- El documento (INE/pasaporte) es PRIVADO: solo el dueño y el admin pueden verlo.
-- El pro NO puede marcarse verificado: eso lo hace un admin tras revisar (ya protegido
-- por el trigger trg_protect_profile que ya tienes).
-- ============================================

-- 1) BUCKET privado para documentos de identidad
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('verification','verification', false, 5242880,
        ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) POLICIES del bucket 'verification' (PRIVADO)
--    Convención de ruta: verification/{auth.uid()}/{archivo}
--    Solo el dueño (o admin) puede leer/subir. Nadie más ve estos documentos.
DROP POLICY IF EXISTS "verif_lee_dueno_o_admin" ON storage.objects;
CREATE POLICY "verif_lee_dueno_o_admin" ON storage.objects FOR SELECT
  USING (bucket_id = 'verification'
         AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin()));

DROP POLICY IF EXISTS "verif_sube_dueno" ON storage.objects;
CREATE POLICY "verif_sube_dueno" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "verif_borra_dueno" ON storage.objects;
CREATE POLICY "verif_borra_dueno" ON storage.objects FOR DELETE
  USING (bucket_id = 'verification'
         AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin()));

-- 3) TABLA de solicitudes de verificación (rastrea el estado del trámite)
CREATE TABLE IF NOT EXISTS verification_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_path        TEXT NOT NULL,                 -- ruta en el bucket privado
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
  note            TEXT,                           -- comentario del admin (motivo de rechazo)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_verif_pro ON verification_requests(professional_id);
CREATE INDEX IF NOT EXISTS idx_verif_status ON verification_requests(status);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- 4) RLS de verification_requests
--    El pro ve y crea SUS solicitudes. El admin ve todas. Nadie más.
--    La APROBACIÓN/RECHAZO (que cambia 'verified' del pro) la hace el admin y ya está
--    protegida por trg_protect_profile: el propio pro no puede auto-verificarse.
DROP POLICY IF EXISTS "verif_req_lee_dueno_admin" ON verification_requests;
CREATE POLICY "verif_req_lee_dueno_admin" ON verification_requests FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "verif_req_crea_dueno" ON verification_requests;
CREATE POLICY "verif_req_crea_dueno" ON verification_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "verif_req_admin_actualiza" ON verification_requests;
CREATE POLICY "verif_req_admin_actualiza" ON verification_requests FOR UPDATE
  USING (is_admin());

-- 5) RPC para que el ADMIN apruebe una solicitud (marca verified=true + status active)
--    SECURITY DEFINER: corre con permisos de sistema para poder tocar 'verified'.
CREATE OR REPLACE FUNCTION aprobar_verificacion(p_request_id UUID)
RETURNS verification_requests AS $$
DECLARE v_req verification_requests; 
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
  SELECT * INTO v_req FROM verification_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE='P0001'; END IF;

  -- Permite que el admin toque columnas protegidas del profesional
  PERFORM set_config('manita.system','on', true);
  UPDATE professionals SET verified = TRUE, status = 'active'
    WHERE id = v_req.professional_id;
  PERFORM set_config('manita.system','off', true);

  UPDATE verification_requests
    SET status='approved', reviewed_at=NOW()
    WHERE id = p_request_id RETURNING * INTO v_req;

  PERFORM write_audit('verification_approved','professional', v_req.professional_id,
    NULL, jsonb_build_object('request_id', v_req.id));
  RETURN v_req;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Listo. Tras correr esto:
--  · El profesional podrá subir su INE desde el panel (queda privada).
--  · Tú (admin) verás las solicitudes y podrás aprobarlas con:
--       SELECT aprobar_verificacion('<id_de_la_solicitud>');
--    o rechazarlas con:
--       UPDATE verification_requests SET status='rejected', note='motivo', reviewed_at=now()
--         WHERE id='<id>';
