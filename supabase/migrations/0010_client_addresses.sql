-- ============================================
-- MANITA — Migración 0010: Direcciones guardadas del cliente (M059, M060)
-- Reduce fricción de reserva: el cliente guarda direcciones reutilizables.
-- ============================================

CREATE TABLE IF NOT EXISTS client_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                 -- 'Casa', 'Oficina', etc.
  address TEXT NOT NULL,
  colonia TEXT,
  notes TEXT,                          -- referencias, número interior, etc.
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT client_addresses_address_chk CHECK (length(trim(address)) >= 5)
);

CREATE INDEX IF NOT EXISTS idx_client_addresses_user ON client_addresses(user_id);

-- Solo un default por usuario: al marcar uno como default, se limpia el resto
CREATE OR REPLACE FUNCTION enforce_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE client_addresses SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id <> NEW.id AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_single_default_address ON client_addresses;
CREATE TRIGGER trg_single_default_address
  AFTER INSERT OR UPDATE OF is_default ON client_addresses
  FOR EACH ROW WHEN (NEW.is_default) EXECUTE FUNCTION enforce_single_default_address();

-- RLS: cada quien gestiona SOLO sus direcciones
ALTER TABLE client_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver mis direcciones" ON client_addresses;
CREATE POLICY "Ver mis direcciones" ON client_addresses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Crear mi direccion" ON client_addresses;
CREATE POLICY "Crear mi direccion" ON client_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Editar mi direccion" ON client_addresses;
CREATE POLICY "Editar mi direccion" ON client_addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Borrar mi direccion" ON client_addresses;
CREATE POLICY "Borrar mi direccion" ON client_addresses FOR DELETE USING (auth.uid() = user_id);

-- ROLLBACK:
--   DROP TRIGGER trg_single_default_address ON client_addresses;
--   DROP FUNCTION enforce_single_default_address();
--   DROP TABLE client_addresses;
