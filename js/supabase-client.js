// ===== MANITA — Cliente Supabase =====
// Requiere cargar antes: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2

const SUPABASE_URL = 'https://fxmavukqzyskmuvzsyac.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rNhxAyVoIDHGQ8nRLIPmyQ_0UJ7PdzL';

// Crea el cliente global
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== AUTH =====
async function registrar(email, password, fullName) {
  const { data, error } = await supa.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } }
  });
  return { data, error };
}

async function login(email, password) {
  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  // Red de seguridad: asegura que exista el perfil (por si el trigger no lo creó).
  if (!error) { try { await supa.rpc('ensure_profile'); } catch (e) {} }
  return { data, error };
}

async function logout() {
  return await supa.auth.signOut();
}

async function usuarioActual() {
  const { data } = await supa.auth.getUser();
  return data.user;
}

// ===== PROFESIONALES =====
async function obtenerProfesionales(categoryId) {
  let query = supa.from('professionals').select('*').eq('available', true);
  if (categoryId && categoryId !== 'all') query = query.eq('category_id', categoryId);
  const { data, error } = await query.order('rating', { ascending: false });
  return { data: data || [], error };
}

async function obtenerProfesional(id) {
  const { data, error } = await supa.from('professionals').select('*').eq('id', id).single();
  return { data, error };
}

async function crearProfesional(pro) {
  const user = await usuarioActual();
  if (!user) return { error: { message: 'Debes iniciar sesión' } };
  pro.user_id = user.id;
  const { data, error } = await supa.from('professionals').insert(pro).select();
  return { data, error };
}

// ===== CATEGORÍAS =====
async function obtenerCategorias() {
  const { data, error } = await supa.from('categories').select('*').order('sort_order');
  return { data: data || [], error };
}

// ===== RESERVAS =====
// Mapa de errores de RPC → mensajes UX (sin exponer internals)
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Debes iniciar sesión.',
  USER_SUSPENDED: 'Tu cuenta está suspendida. Contacta a soporte.',
  ADDRESS_REQUIRED: 'Ingresa una dirección válida (mín. 5 caracteres).',
  INVALID_TIME: 'La fecha/hora no es válida.',
  PRO_UNAVAILABLE: 'Este profesional ya no está disponible.',
  OUTSIDE_AVAILABILITY: 'El profesional no atiende en ese horario. Elige otro.',
  SLOT_TAKEN: 'Ese horario acaba de ocuparse. Elige otro.',
  INVALID_STATE: 'Esa acción no está permitida en este momento.',
  FORBIDDEN: 'No tienes permiso para esta acción.',
  BOOKING_NOT_FOUND: 'No se encontró la reserva.',
  BOOKING_NOT_COMPLETED: 'Solo puedes reseñar servicios completados.',
  ALREADY_REVIEWED: 'Ya dejaste una reseña para este servicio.',
  INVALID_RATING: 'La calificación debe ser de 1 a 5.'
};
var ERROR_CODES = Object.keys(ERROR_MESSAGES).join('|');
function traducirError(error) {
  if (!error) return null;
  var re = new RegExp('(' + ERROR_CODES + ')');
  var m = re.exec(error.message || '');
  var raw = m ? m[1] : '';
  return { message: ERROR_MESSAGES[raw] || 'Ocurrió un error. Inténtalo de nuevo.', code: raw };
}

// Crea reserva vía RPC: el PRECIO se calcula en el servidor (nunca se envía desde el cliente).
// start_at es un timestamp ISO; idempotency_key evita reservas duplicadas por doble submit.
async function crearReserva(reserva) {
  const { data, error } = await supa.rpc('crear_reserva', {
    p_professional_id: reserva.professional_id,
    p_start_at: reserva.start_at,
    p_address: reserva.address,
    p_idempotency_key: reserva.idempotency_key || null,
    p_notes: reserva.notes || null
  });
  return { data, error: traducirError(error) };
}

// Disponibilidad publicada del profesional (para construir slots reales en UI)
async function disponibilidadProfesional(professionalId) {
  const { data, error } = await supa.from('professional_availability')
    .select('weekday, start_time, end_time')
    .eq('professional_id', professionalId);
  return { data: data || [], error };
}

// Cambia el estado de una reserva vía RPC (valida rol y transición en servidor)
async function transicionReserva(bookingId, nuevoEstado) {
  const { data, error } = await supa.rpc('transicion_reserva', {
    p_booking_id: bookingId,
    p_nuevo: nuevoEstado
  });
  return { data, error: traducirError(error) };
}

// ===== DISPONIBILIDAD DEL PROFESIONAL (lado dueño) =====
// Obtiene el/los profesional(es) que pertenecen al usuario autenticado.
async function misProfesionales() {
  const user = await usuarioActual();
  if (!user) return { data: [], error: null };
  const { data, error } = await supa.from('professionals')
    .select('id, service_name, zone, price').eq('user_id', user.id);
  return { data: data || [], error };
}

// Reemplaza la disponibilidad semanal de un profesional del que soy dueño.
// slots: array de { weekday (0-6), start_time 'HH:MM', end_time 'HH:MM' }.
// Borra la anterior e inserta la nueva (transacción simple del lado cliente vía RLS del dueño).
async function guardarDisponibilidad(professionalId, slots) {
  const user = await usuarioActual();
  if (!user) return { error: { message: 'Debes iniciar sesión' } };
  // Borra la existente del profesional
  const del = await supa.from('professional_availability').delete().eq('professional_id', professionalId);
  if (del.error) return { error: del.error };
  if (!slots || !slots.length) return { data: [], error: null };
  const rows = slots.map(function (s) {
    return { professional_id: professionalId, weekday: s.weekday, start_time: s.start_time, end_time: s.end_time };
  });
  const { data, error } = await supa.from('professional_availability').insert(rows).select();
  return { data, error };
}

// Reservas que recibe el profesional autenticado
async function reservasDelProfesional() {
  const user = await usuarioActual();
  if (!user) return { data: [], error: null };
  const { data, error } = await supa.from('bookings')
    .select('*, professionals!inner(service_name, user_id, zone)')
    .eq('professionals.user_id', user.id)
    .order('service_date', { ascending: true });
  return { data: data || [], error };
}

async function misReservas() {
  const user = await usuarioActual();
  if (!user) return { data: [], error: null };
  const { data, error } = await supa.from('bookings')
    .select('*, professionals(service_name, zone)')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// ===== PERFIL DE CLIENTE =====
async function obtenerMiPerfil() {
  const user = await usuarioActual();
  if (!user) return { data: null, error: null };
  const { data, error } = await supa.from('profiles').select('*').eq('id', user.id).single();
  return { data, error };
}

async function actualizarMiPerfil(campos) {
  const user = await usuarioActual();
  if (!user) return { error: { message: 'Debes iniciar sesión' } };
  // role/suspended están protegidos por trigger server-side; aquí solo enviamos campos editables
  const permitido = {};
  ['full_name', 'phone', 'city', 'avatar_url'].forEach(function(k){ if (campos[k] !== undefined) permitido[k] = campos[k]; });
  const { data, error } = await supa.from('profiles').update(permitido).eq('id', user.id).select();
  return { data, error };
}

// ===== DIRECCIONES DEL CLIENTE =====
async function misDirecciones() {
  const user = await usuarioActual();
  if (!user) return { data: [], error: null };
  const { data, error } = await supa.from('client_addresses')
    .select('*').eq('user_id', user.id).order('is_default', { ascending: false });
  return { data: data || [], error };
}

async function crearDireccion(dir) {
  const user = await usuarioActual();
  if (!user) return { error: { message: 'Debes iniciar sesión' } };
  dir.user_id = user.id;
  const { data, error } = await supa.from('client_addresses').insert(dir).select();
  return { data, error };
}

async function borrarDireccion(id) {
  const { data, error } = await supa.from('client_addresses').delete().eq('id', id);
  return { data, error };
}

async function marcarDireccionDefault(id) {
  const { data, error } = await supa.from('client_addresses').update({ is_default: true }).eq('id', id).select();
  return { data, error };
}

// ===== RESEÑAS =====
async function obtenerReseñas(professionalId) {
  const { data, error } = await supa.from('reviews')
    .select('*')
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Crear reseña vía RPC (valida booking completado y propiedad en servidor)
async function crearReseña(bookingId, rating, comment) {
  const { data, error } = await supa.rpc('crear_resena', {
    p_booking_id: bookingId,
    p_rating: rating,
    p_comment: comment || null
  });
  return { data, error: traducirError(error) };
}
