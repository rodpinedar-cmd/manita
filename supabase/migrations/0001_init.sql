-- ============================================
-- MANITA — Migración 0001: Schema inicial
-- (equivalente al supabase_schema.sql original, versionado)
-- Aplicar en Supabase SQL Editor en orden.
-- ============================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_professional BOOLEAN DEFAULT FALSE,
  city TEXT DEFAULT 'Ciudad de México',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0
);

-- 3. PROFESSIONALS
CREATE TABLE IF NOT EXISTS professionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id),
  service_name TEXT NOT NULL,
  bio TEXT,
  price NUMERIC NOT NULL,
  price_unit TEXT DEFAULT 'servicio',
  zone TEXT,
  rating NUMERIC DEFAULT 0,
  reviews_count INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  available BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_time TEXT NOT NULL,
  address TEXT NOT NULL,
  price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Trigger: crear perfil al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- NOTA: las policies originales (inseguras) se REEMPLAZAN en 0007_rls.sql.
-- Se dejan las de solo-lectura pública seguras aquí:
DROP POLICY IF EXISTS "Categories son públicas" ON categories;
CREATE POLICY "Categories son públicas" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Ver perfil propio" ON profiles;
CREATE POLICY "Ver perfil propio" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Editar perfil propio" ON profiles;
CREATE POLICY "Editar perfil propio" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Crear perfil propio" ON profiles;
CREATE POLICY "Crear perfil propio" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Editar profesional propio" ON professionals;
CREATE POLICY "Editar profesional propio" ON professionals FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Crear profesional propio" ON professionals;
CREATE POLICY "Crear profesional propio" ON professionals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reseñas son públicas" ON reviews;
CREATE POLICY "Reseñas son públicas" ON reviews FOR SELECT USING (true);
