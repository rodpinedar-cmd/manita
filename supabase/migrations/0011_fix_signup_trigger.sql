-- ============================================
-- MANITA — Migración 0011: Arreglo de "Database error saving user"
-- Causa: el trigger on_auth_user_created (handle_new_user) puede abortar el
-- registro en auth.users si el INSERT en profiles falla por cualquier motivo
-- (columna nueva, RLS, conflicto de id, permisos). Supabase entonces devuelve
-- el error genérico "Database error saving user".
--
-- Fix: hacer el trigger A PRUEBA DE FALLOS.
--   - INSERT con ON CONFLICT DO NOTHING (idempotente si el perfil ya existe).
--   - Bloque EXCEPTION que captura cualquier error y NUNCA aborta el signup.
--   - search_path fijo (buena práctica de seguridad en SECURITY DEFINER).
-- Idempotente: se puede re-ejecutar sin romper nada.
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NULLIF(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- No bloquear el alta del usuario si la creación del perfil falla.
    -- El perfil puede completarse después (ensure_profile) al iniciar sesión.
    RAISE WARNING 'handle_new_user: no se pudo crear el perfil de %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Red de seguridad: función para asegurar el perfil del usuario autenticado.
-- El cliente la llama tras iniciar sesión; crea el perfil si por alguna razón no existe.
CREATE OR REPLACE FUNCTION ensure_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.profiles (id)
  VALUES (auth.uid())
  ON CONFLICT (id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_profile() TO authenticated;

-- ROLLBACK: restaurar la versión previa de handle_new_user (0001) y DROP FUNCTION ensure_profile();
