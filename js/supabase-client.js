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
async function crearReserva(reserva) {
  const user = await usuarioActual();
  if (!user) return { error: { message: 'Debes iniciar sesión para reservar' } };
  reserva.client_id = user.id;
  const { data, error } = await supa.from('bookings').insert(reserva).select();
  return { data, error };
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

// ===== RESEÑAS =====
async function obtenerReseñas(professionalId) {
  const { data, error } = await supa.from('reviews')
    .select('*')
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}
