-- ============================================================
-- MANITA — SEED DEMO: categorías + profesionales de ejemplo + disponibilidad
-- Ejecutar DESPUÉS de SETUP_COMPLETO.sql. Idempotente.
-- Deja profesionales activos, verificados y con horario, listos para reservar.
-- ============================================================

-- Categorías raíz
INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES
('limpieza','Limpieza',NULL,'🧹',1),('hogar','Hogar',NULL,'🔨',2),
('belleza','Belleza',NULL,'💅',3),('clases','Clases',NULL,'📚',4),
('mascotas','Mascotas',NULL,'🐕',5),('cuidados','Cuidados',NULL,'🧑‍⚕️',6),
('otros','Otros',NULL,'✨',7)
ON CONFLICT (id) DO NOTHING;

-- Subcategorías usadas por los pros demo
INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES
('plomeria','Plomería','hogar','🚰',2),('manitas','Manitas','hogar','🔧',1),
('electricista','Electricista','hogar','⚡',3),('mudanzas','Mudanzas y fletes','hogar','📦',4),
('manicura','Manicura y pedicura','belleza','💅',1),('maquillaje','Maquillaje','belleza','💄',2),
('clases-guitarra','Guitarra','clases','🎸',1),('clases-patinaje','Patinaje / Rollers','clases','🛼',3),
('personal-trainer','Personal trainer','clases','🏋️',4),('paseo-perros','Paseo de perros','mascotas','🦮',1),
('cuidado-ninos','Cuidado de niños','cuidados','👶',1)
ON CONFLICT (id) DO NOTHING;

-- Profesionales demo (activos y verificados). Solo se insertan si la tabla está vacía.
INSERT INTO professionals (category_id, service_name, bio, price, price_unit, zone, rating, reviews_count, verified, available, status, duration_min, buffer_min)
SELECT * FROM (VALUES
  ('limpieza','Limpieza de hogar','Limpieza profunda con productos ecológicos. 5 años de experiencia.',350,'servicio','Roma Norte',0,0,true,true,'active',120,30),
  ('limpieza','Limpieza de oficina','Especialista en oficinas y comercios. Equipo propio.',450,'servicio','Polanco',0,0,true,true,'active',120,30),
  ('manicura','Manicura y pedicura','Uñas acrílicas, gelish y nail art. Materiales premium.',250,'sesión','Condesa',0,0,true,true,'active',90,15),
  ('maquillaje','Maquillaje profesional','Maquillaje para eventos, bodas y sesiones de foto.',800,'sesión','Del Valle',0,0,true,true,'active',90,30),
  ('plomeria','Plomería general','Reparación de fugas, tuberías y calentadores.',400,'visita','Coyoacán',0,0,true,true,'active',60,30),
  ('manitas','Manitas / handyman','Montaje de muebles, colgado de TV, arreglos del hogar.',300,'hora','Narvarte',0,0,true,true,'active',60,30),
  ('clases-guitarra','Clases de guitarra','Guitarra acústica y eléctrica para todos los niveles.',400,'hora','Roma Sur',0,0,true,true,'active',60,15),
  ('clases-patinaje','Clases de patinaje / rollers','Patinaje para niños y adultos. Desde cero.',350,'sesión','Chapultepec',0,0,true,true,'active',60,15),
  ('personal-trainer','Personal trainer','Entrenamiento personalizado a domicilio.',450,'sesión','Escandón',0,0,true,true,'active',60,15),
  ('paseo-perros','Paseo de perros','Paseos de 45 min, cuidado con amor. Fotos incluidas.',150,'paseo','Escandón',0,0,true,true,'active',60,15),
  ('electricista','Electricista','Instalaciones, cortos, contactos y mantenimiento.',400,'visita','Iztacalco',0,0,true,true,'active',60,30),
  ('cuidado-ninos','Cuidado de niños','Niñera con experiencia y primeros auxilios.',250,'hora','Tlalpan',0,0,true,true,'active',120,30)
) AS v(category_id, service_name, bio, price, price_unit, zone, rating, reviews_count, verified, available, status, duration_min, buffer_min)
WHERE NOT EXISTS (SELECT 1 FROM professionals);

-- Disponibilidad para TODOS los profesionales que no tengan: lunes a sábado 08:00–20:00
INSERT INTO professional_availability (professional_id, weekday, start_time, end_time)
SELECT p.id, d, '08:00'::time, '20:00'::time
FROM professionals p CROSS JOIN generate_series(1,6) d
WHERE NOT EXISTS (SELECT 1 FROM professional_availability a WHERE a.professional_id = p.id);

-- Listo. Los profesionales demo aparecen en el marketplace y se pueden reservar.
