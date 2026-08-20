-- ============================================
-- MANITA — Database Schema
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PROFILES (extiende auth.users)
-- Todo usuario tiene un perfil. Puede ser cliente y/o profesional.
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_professional BOOLEAN DEFAULT FALSE,
  city TEXT DEFAULT 'Ciudad de México',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CATEGORIES (catálogo de servicios)
-- ============================================
CREATE TABLE categories (
  id TEXT PRIMARY KEY,          -- ej: 'limpieza', 'clases-guitarra'
  name TEXT NOT NULL,           -- ej: 'Limpieza', 'Clases de guitarra'
  parent_id TEXT,               -- categoría padre (null si es raíz)
  icon TEXT,
  sort_order INT DEFAULT 0
);

-- ============================================
-- 3. PROFESSIONALS (perfil de profesional)
-- ============================================
CREATE TABLE professionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id),
  service_name TEXT NOT NULL,   -- ej: 'Limpieza de hogar'
  bio TEXT,
  price NUMERIC NOT NULL,
  price_unit TEXT DEFAULT 'servicio',  -- servicio, hora, sesión
  zone TEXT,                    -- ej: 'Roma Norte'
  rating NUMERIC DEFAULT 0,
  reviews_count INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  available BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. BOOKINGS (reservas)
-- ============================================
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_time TEXT NOT NULL,
  address TEXT NOT NULL,
  price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, confirmed, completed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. REVIEWS (reseñas)
-- ============================================
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Categories: lectura pública
CREATE POLICY "Categories son públicas" ON categories FOR SELECT USING (true);

-- Profiles: cada quien ve/edita el suyo
CREATE POLICY "Ver perfil propio" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Editar perfil propio" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Crear perfil propio" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Professionals: lectura pública, edición solo del dueño
CREATE POLICY "Profesionales son públicos" ON professionals FOR SELECT USING (true);
CREATE POLICY "Editar profesional propio" ON professionals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Crear profesional propio" ON professionals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bookings: cliente y profesional involucrados pueden ver
CREATE POLICY "Ver reservas propias (cliente)" ON bookings FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Crear reserva" ON bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Actualizar reserva propia" ON bookings FOR UPDATE USING (auth.uid() = client_id);

-- Reviews: lectura pública, escritura del cliente
CREATE POLICY "Reseñas son públicas" ON reviews FOR SELECT USING (true);
CREATE POLICY "Crear reseña propia" ON reviews FOR INSERT WITH CHECK (auth.uid() = client_id);

-- ============================================
-- SEED: Categorías raíz
-- ============================================
INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES
('limpieza', 'Limpieza', NULL, '🧹', 1),
('hogar', 'Hogar', NULL, '🔨', 2),
('belleza', 'Belleza', NULL, '💅', 3),
('clases', 'Clases', NULL, '📚', 4),
('mascotas', 'Mascotas', NULL, '🐕', 5),
('cuidados', 'Cuidados', NULL, '🧑‍⚕️', 6),
('otros', 'Otros', NULL, '✨', 7);

-- Subcategorías (ejemplos principales)
INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES
('limpieza-profunda', 'Limpieza profunda', 'limpieza', '✨', 1),
('plancha', 'Plancha', 'limpieza', '👕', 2),
('manitas', 'Manitas', 'hogar', '🔧', 1),
('plomeria', 'Plomería', 'hogar', '🚰', 2),
('electricista', 'Electricista', 'hogar', '⚡', 3),
('mudanzas', 'Mudanzas y fletes', 'hogar', '📦', 4),
('manicura', 'Manicura y pedicura', 'belleza', '💅', 1),
('maquillaje', 'Maquillaje', 'belleza', '💄', 2),
('peluqueria', 'Peluquería', 'belleza', '💇', 3),
('clases-guitarra', 'Guitarra', 'clases', '🎸', 1),
('clases-ingles', 'Inglés', 'clases', '🇬🇧', 2),
('clases-patinaje', 'Patinaje / Rollers', 'clases', '🛼', 3),
('personal-trainer', 'Personal trainer', 'clases', '🏋️', 4),
('paseo-perros', 'Paseo de perros', 'mascotas', '🦮', 1),
('cuidado-ninos', 'Cuidado de niños', 'cuidados', '👶', 1);

-- ============================================
-- FUNCIÓN: crear perfil automático al registrarse
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
