-- ============================================================
-- MANITA — Probar el flujo pro <-> cliente en vivo (tú solo)
-- Te asigna UN profesional demo como "tuyo" para que puedas entrar
-- a pro-panel.html y confirmar / iniciar / completar reservas.
-- Reemplaza el correo por el TUYO antes de correr. Idempotente.
-- ============================================================

-- 1) Asigna el primer profesional demo SIN dueño a tu usuario.
--    (Desactiva temporalmente el trigger que protege user_id, igual que un alta legítima.)
ALTER TABLE professionals DISABLE TRIGGER trg_protect_professional;

UPDATE professionals
SET user_id = (SELECT id FROM auth.users WHERE lower(email) = 'rpr1805@gmail.com')
WHERE id = (
  SELECT id FROM professionals
  WHERE user_id IS NULL
  ORDER BY created_at
  LIMIT 1
);

ALTER TABLE professionals ENABLE TRIGGER trg_protect_professional;

-- 2) Verifica: debe salir 1 fila con tu profesional (service_name + tu email).
SELECT p.service_name, p.zone, p.price, u.email AS dueno
FROM professionals p
JOIN auth.users u ON u.id = p.user_id
WHERE lower(u.email) = 'rpr1805@gmail.com';

-- ============================================================
-- CÓMO PROBAR DESPUÉS DE CORRER ESTO:
-- 1) Con OTRA cuenta (o pídele a un amigo) reserva ESE servicio en la web,
--    con fecha futura (lun-sáb, 08:00-20:00). Ojo: no puedes reservarte a ti mismo
--    si el mismo usuario es cliente y pro — usa una cuenta distinta como cliente.
-- 2) Entra con TU cuenta a  https://manita-cdmx.netlify.app/pro-panel.html
--    Verás la reserva. Púlsala: Confirmar -> Iniciar -> Completar.
-- 3) El cliente entra a "Mis reservas": al estar "Completada" verá "Dejar reseña".
--    Al reseñar, el rating del profesional sube solo.
--
-- PARA DESHACER (quitarte como dueño del profesional):
--   ALTER TABLE professionals DISABLE TRIGGER trg_protect_professional;
--   UPDATE professionals SET user_id = NULL
--     WHERE user_id = (SELECT id FROM auth.users WHERE lower(email)='rpr1805@gmail.com');
--   ALTER TABLE professionals ENABLE TRIGGER trg_protect_professional;
-- ============================================================
