-- ============================================
-- MANITA — Migración 0005: Protección de columnas + helpers de rol/audit
-- Fase 1.5: F (roles/privilegios), G (auditoría)
-- ============================================

-- Helper: ¿el usuario actual es admin? (SECURITY DEFINER para leer profiles sin RLS)
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM profiles WHERE id = auth.uid()), FALSE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper de auditoría (G)
CREATE OR REPLACE FUNCTION write_audit(
  p_action TEXT, p_entity_type TEXT, p_entity_id UUID, p_old JSONB, p_new JSONB
) RETURNS VOID AS $$
  INSERT INTO audit_log(actor, action, entity_type, entity_id, old_value, new_value)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_old, p_new);
$$ LANGUAGE sql SECURITY DEFINER;

-- Protección de columnas sensibles del profesional (M003 / F).
-- verified/rating/reviews_count/status solo modificables por admin o por funciones del sistema.
CREATE OR REPLACE FUNCTION protect_professional_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Bypass para funciones del sistema (recompute_pro_rating, etc.) que fijan manita.system='on'
  IF current_setting('manita.system', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NOT is_admin() THEN
    NEW.verified      := OLD.verified;
    NEW.rating        := OLD.rating;
    NEW.reviews_count := OLD.reviews_count;
    NEW.status        := OLD.status;
    NEW.user_id       := OLD.user_id;   -- no reasignar dueño
  ELSE
    -- admin cambiando verified/status => auditar
    IF NEW.verified IS DISTINCT FROM OLD.verified OR NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM write_audit('pro_verified','professional', OLD.id,
        jsonb_build_object('verified',OLD.verified,'status',OLD.status),
        jsonb_build_object('verified',NEW.verified,'status',NEW.status));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_professional ON professionals;
CREATE TRIGGER trg_protect_professional
  BEFORE UPDATE ON professionals
  FOR EACH ROW EXECUTE FUNCTION protect_professional_columns();

-- Protección de profiles: nadie (salvo admin) puede auto-asignarse role='admin' ni quitarse suspended (F)
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_admin() THEN
    NEW.role      := OLD.role;
    NEW.suspended := OLD.suspended;
  ELSE
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.suspended IS DISTINCT FROM OLD.suspended THEN
      PERFORM write_audit('admin_change','profile', OLD.id,
        jsonb_build_object('role',OLD.role,'suspended',OLD.suspended),
        jsonb_build_object('role',NEW.role,'suspended',NEW.suspended));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile ON profiles;
CREATE TRIGGER trg_protect_profile
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_columns();

-- ROLLBACK:
--   DROP TRIGGER trg_protect_profile ON profiles; DROP FUNCTION protect_profile_columns();
--   DROP TRIGGER trg_protect_professional ON professionals; DROP FUNCTION protect_professional_columns();
--   DROP FUNCTION write_audit(TEXT,TEXT,UUID,JSONB,JSONB); DROP FUNCTION is_admin();
