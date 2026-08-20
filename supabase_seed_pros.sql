-- ============================================
-- MANITA — Profesionales de ejemplo (seed)
-- Ejecutar DESPUÉS del schema principal
-- ============================================

INSERT INTO professionals (category_id, service_name, bio, price, price_unit, zone, rating, reviews_count, verified, available) VALUES
('limpieza', 'Limpieza de hogar', 'Limpieza profunda y detallada con productos ecológicos. 5 años de experiencia.', 350, 'servicio', 'Roma Norte', 4.9, 128, true, true),
('limpieza', 'Limpieza de oficina', 'Especialista en espacios de oficina y comercios. Equipo propio.', 450, 'servicio', 'Polanco', 4.7, 86, true, true),
('limpieza', 'Limpieza profunda', 'Limpieza a fondo de cocinas, baños y áreas difíciles.', 500, 'servicio', 'Nápoles', 4.8, 112, true, true),
('belleza', 'Manicura y pedicura', 'Uñas acrílicas, gelish y nail art. Materiales premium.', 250, 'sesión', 'Condesa', 5.0, 210, true, true),
('belleza', 'Maquillaje profesional', 'Maquillaje para eventos, bodas y sesiones de foto.', 800, 'sesión', 'Del Valle', 4.8, 95, true, true),
('plomeria', 'Plomería general', 'Reparación de fugas, instalación de tuberías y calentadores.', 400, 'visita', 'Coyoacán', 4.6, 64, true, true),
('manitas', 'Manitas / handyman', 'Montaje de muebles, colgado de TV, arreglos generales del hogar.', 300, 'hora', 'Narvarte', 4.9, 143, true, true),
('clases-guitarra', 'Clases de guitarra', 'Guitarra acústica y eléctrica para todos los niveles.', 400, 'hora', 'Roma Sur', 4.8, 52, false, true),
('clases-patinaje', 'Clases de patinaje / rollers', 'Patinaje sobre ruedas para niños y adultos. Desde cero hasta trucos.', 350, 'sesión', 'Chapultepec', 4.9, 67, true, true),
('personal-trainer', 'Personal trainer', 'Entrenamiento personalizado a domicilio. Rutinas según tu meta.', 450, 'sesión', 'Escandón', 4.9, 88, true, true),
('paseo-perros', 'Paseo de perros', 'Paseos de 45 min, cuidado con amor. Fotos incluidas.', 150, 'paseo', 'Escandón', 5.0, 189, true, true),
('cuidado-ninos', 'Cuidado de niños', 'Niñera con experiencia y certificación en primeros auxilios.', 250, 'hora', 'Tlalpan', 4.9, 41, true, true),
('electricista', 'Electricista', 'Instalaciones, cortos, contactos y mantenimiento eléctrico.', 400, 'visita', 'Iztacalco', 4.7, 38, true, true),
('mudanzas', 'Mudanzas y fletes', 'Mudanzas locales con camioneta y personal. Cuidamos tus cosas.', 900, 'servicio', 'GAM', 4.6, 55, true, true);
