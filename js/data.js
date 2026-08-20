// ===== MANITA — Datos de ejemplo (prototipo) =====

const CATEGORIES = [
  { id: 'limpieza', name: 'Limpieza', icon: '🧹', desc: 'Hogar y oficina', sub: [
    { id: 'limpieza', name: 'Limpieza', icon: '🧹' },
    { id: 'plancha', name: 'Plancha', icon: '👕' },
    { id: 'limpieza-profunda', name: 'Limpieza profunda', icon: '✨' },
    { id: 'limpieza-oficinas', name: 'Oficinas y negocios', icon: '🏢' },
    { id: 'limpieza-turistico', name: 'Alquiler turístico', icon: '🏨' },
    { id: 'limpieza-post-obra', name: 'Post-obra', icon: '🧱' },
    { id: 'limpieza-ventanas', name: 'Ventanas y cristales', icon: '🪟' },
    { id: 'limpieza-tapiceria', name: 'Tapicería', icon: '🛋️' },
    { id: 'limpieza-exteriores', name: 'Exteriores', icon: '🌳' }
  ]},
  { id: 'hogar', name: 'Hogar', icon: '🔨', desc: 'Manitas y reparaciones', sub: [
    { id: 'manitas', name: 'Manitas', icon: '🔧' },
    { id: 'plomeria', name: 'Plomería', icon: '🚰' },
    { id: 'pintura', name: 'Pintura', icon: '🎨' },
    { id: 'electricista', name: 'Electricista', icon: '⚡' },
    { id: 'electrodomesticos', name: 'Electrodomésticos', icon: '🔌' },
    { id: 'mudanzas', name: 'Mudanzas y fletes', icon: '📦' },
    { id: 'climatizacion', name: 'Climatización', icon: '❄️' },
    { id: 'reformas', name: 'Pequeñas reformas', icon: '🏗️' },
    { id: 'cerrajero', name: 'Cerrajero', icon: '🔑' },
    { id: 'jardineria', name: 'Jardinería', icon: '🌿' },
    { id: 'piscinas', name: 'Mantenimiento de albercas', icon: '🏊' }
  ]},
  { id: 'belleza', name: 'Belleza', icon: '💅', desc: 'Estética a domicilio', sub: [
    { id: 'depilacion', name: 'Depilación', icon: '🪒' },
    { id: 'manicura', name: 'Manicura y pedicura', icon: '💅' },
    { id: 'peluqueria', name: 'Peluquería', icon: '💇' },
    { id: 'maquillaje', name: 'Maquillaje', icon: '💄' },
    { id: 'estetica-facial', name: 'Estética facial', icon: '🧖' }
  ]},
  { id: 'clases', name: 'Clases', icon: '📚', desc: 'Refuerzo y particulares', groups: [
    { name: 'Colegio', icon: '🎒', items: [
      { id: 'clases-mates', name: 'Matemáticas' },
      { id: 'clases-refuerzo', name: 'Refuerzo escolar' },
      { id: 'clases-fisica', name: 'Física y Química' },
      { id: 'clases-dibujo', name: 'Dibujo Técnico' }
    ]},
    { name: 'Idiomas', icon: '🗣️', items: [
      { id: 'clases-ingles', name: 'Inglés' },
      { id: 'clases-frances', name: 'Francés' },
      { id: 'clases-aleman', name: 'Alemán' }
    ]},
    { name: 'Música', icon: '🎵', items: [
      { id: 'clases-guitarra', name: 'Guitarra' },
      { id: 'clases-piano', name: 'Piano' }
    ]},
    { name: 'Deporte', icon: '🎾', items: [
      { id: 'clases-boxeo', name: 'Boxeo' },
      { id: 'personal-trainer', name: 'Personal trainer' },
      { id: 'clases-yoga', name: 'Yoga' },
      { id: 'clases-pilates', name: 'Pilates' },
      { id: 'clases-padel', name: 'Pádel' },
      { id: 'clases-tenis', name: 'Tenis' },
      { id: 'clases-patinaje', name: 'Patinaje / Rollers' }
    ]},
    { name: 'Otros', icon: '✨', items: [
      { id: 'fisioterapia', name: 'Fisioterapia' },
      { id: 'fotografia', name: 'Fotografía y video' }
    ]}
  ], sub: [
    { id: 'clases-mates', name: 'Matemáticas', icon: '🔢' },
    { id: 'clases-refuerzo', name: 'Refuerzo escolar', icon: '🎒' },
    { id: 'clases-ingles', name: 'Inglés', icon: '🇬🇧' },
    { id: 'clases-guitarra', name: 'Guitarra', icon: '🎸' },
    { id: 'clases-patinaje', name: 'Patinaje / Rollers', icon: '🛼' }
  ]},
  { id: 'mascotas', name: 'Mascotas', icon: '🐕', desc: 'Cuidado y paseo', sub: [
    { id: 'paseo-perros', name: 'Paseo de perros', icon: '🦮' },
    { id: 'cuidado-mascotas', name: 'Cuidado de mascotas', icon: '🐾' },
    { id: 'peluqueria-canina', name: 'Peluquería canina', icon: '✂️' }
  ]},
  { id: 'cuidados', name: 'Cuidados', icon: '🧑‍⚕️', desc: 'Personas y salud', sub: [
    { id: 'cuidado-ninos', name: 'Cuidado de niños', icon: '👶' },
    { id: 'cuidado-ancianos', name: 'Cuidado de adultos mayores', icon: '👴' }
  ]},
  { id: 'otros', name: 'Otros', icon: '✨', desc: 'Y mucho más', sub: [] }
];

// Fotos de Unsplash (licencia libre, uso comercial sin atribución)
const POPULAR = [
  { id: 'limpieza', name: 'Limpieza', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80', badge: 'Más demandado' },
  { id: 'belleza', name: 'Manicura', img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&q=80' },
  { id: 'hogar', name: 'Manitas', img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80' },
  { id: 'hogar', name: 'Plomería', img: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=500&q=80' },
  { id: 'hogar', name: 'Mudanzas y fletes', img: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=500&q=80' },
  { id: 'hogar', name: 'Electricista', img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=500&q=80' },
  { id: 'clases', name: 'Clases de refuerzo', img: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&q=80' },
  { id: 'clases', name: 'Personal Trainer', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&q=80' }
];

// Testimonios con retratos de Unsplash (libres)
const TESTIMONIALS = [
  { text: 'Super puntual, muy educada, limpió todos los rincones y detalles. Encantados, repetiremos.', name: 'Luis', service: 'Limpieza', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80' },
  { text: 'Nunca me habían hecho las uñas tan bien. Muy profesional y simpática. ¡Para repetir!', name: 'Bea', service: 'Manicura', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80' },
  { text: 'Contraté para montar un mueble y colgar una TV, lo hizo rápido y bien. Recomendado.', name: 'Miguel', service: 'Manitas', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80' },
  { text: 'Gran profesional, sabe mucho de entrenamiento. Además una crack en lo personal.', name: 'Rodrigo', service: 'Personal trainer', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&q=80' },
  { text: 'El mejor día de mi vida, me vi espectacular. ¡El maquillaje quedó increíble!', name: 'Mariana', service: 'Maquillaje', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80' },
  { text: 'Mi hijo quedó contento con sus clases. Supo conectar y hacer la clase dinámica.', name: 'Lía', service: 'Clases de Francés', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80' }
];

// Profesionales de ejemplo por categoría
const PROS = [
  { id: 1, name: 'Diana Ramírez', cat: 'limpieza', service: 'Limpieza de hogar', rating: 4.9, reviews: 128, price: 350, priceUnit: 'servicio', zone: 'Roma Norte', avatar: '👩', verified: true, bio: 'Limpieza profunda y detallada con productos ecológicos. 5 años de experiencia.', available: 'Hoy' },
  { id: 2, name: 'Carlos Méndez', cat: 'limpieza', service: 'Limpieza de oficina', rating: 4.7, reviews: 86, price: 450, priceUnit: 'servicio', zone: 'Polanco', avatar: '🧑', verified: true, bio: 'Especialista en espacios de oficina y comercios. Equipo propio.', available: 'Mañana' },
  { id: 3, name: 'Sofía Herrera', cat: 'belleza', service: 'Manicura y pedicura', rating: 5.0, reviews: 210, price: 250, priceUnit: 'sesión', zone: 'Condesa', avatar: '👩‍🦰', verified: true, bio: 'Uñas acrílicas, gelish y nail art. Materiales premium.', available: 'Hoy' },
  { id: 4, name: 'Mariana López', cat: 'belleza', service: 'Maquillaje profesional', rating: 4.8, reviews: 95, price: 800, priceUnit: 'sesión', zone: 'Del Valle', avatar: '💇‍♀️', verified: true, bio: 'Maquillaje para eventos, bodas y sesiones de foto.', available: 'Hoy' },
  { id: 5, name: 'Roberto Sánchez', cat: 'plomeria', service: 'Plomería general', rating: 4.6, reviews: 64, price: 400, priceUnit: 'visita', zone: 'Coyoacán', avatar: '👨‍🔧', verified: true, bio: 'Reparación de fugas, instalación de tuberías y calentadores.', available: 'Hoy' },
  { id: 6, name: 'Adalberto Cruz', cat: 'hogar', service: 'Manitas / handyman', rating: 4.9, reviews: 143, price: 300, priceUnit: 'hora', zone: 'Narvarte', avatar: '🧔‍♂️', verified: true, bio: 'Montaje de muebles, colgado de TV, arreglos generales del hogar.', available: 'Mañana' },
  { id: 7, name: 'Sabrina Torres', cat: 'clases', service: 'Clases de matemáticas', rating: 4.9, reviews: 78, price: 350, priceUnit: 'hora', zone: 'San Ángel', avatar: '👩‍🏫', verified: true, bio: 'Refuerzo escolar de primaria y secundaria. Método dinámico.', available: 'Hoy' },
  { id: 8, name: 'Diego Flores', cat: 'clases', service: 'Clases de guitarra', rating: 4.8, reviews: 52, price: 400, priceUnit: 'hora', zone: 'Roma Sur', avatar: '🧑‍🎤', verified: false, bio: 'Guitarra acústica y eléctrica para todos los niveles.', available: 'Mañana' },
  { id: 13, name: 'Paola Nava', cat: 'clases', service: 'Clases de patinaje / rollers', rating: 4.9, reviews: 67, price: 350, priceUnit: 'sesión', zone: 'Chapultepec', avatar: '🛼', verified: true, bio: 'Patinaje sobre ruedas para niños y adultos. Desde cero hasta trucos avanzados.', available: 'Hoy' },
  { id: 14, name: 'Kevin Ruiz', cat: 'clases', service: 'Clases de patinaje / rollers', rating: 4.7, reviews: 34, price: 300, priceUnit: 'sesión', zone: 'Parque México', avatar: '🧑', verified: true, bio: 'Rollers y freestyle. Clases en parques de CDMX, equipo incluido.', available: 'Mañana' },
  { id: 9, name: 'Lucía Vega', cat: 'mascotas', service: 'Paseo de perros', rating: 5.0, reviews: 189, price: 150, priceUnit: 'paseo', zone: 'Escandón', avatar: '👧', verified: true, bio: 'Paseos de 45 min, cuidado con amor. Fotos incluidas.', available: 'Hoy' },
  { id: 10, name: 'Fernando Ríos', cat: 'cuidados', service: 'Cuidado de adultos mayores', rating: 4.9, reviews: 41, price: 250, priceUnit: 'hora', zone: 'Tlalpan', avatar: '👨‍⚕️', verified: true, bio: 'Enfermero certificado. Acompañamiento y cuidados básicos.', available: 'Hoy' },
  { id: 11, name: 'Ana Gómez', cat: 'limpieza', service: 'Limpieza profunda', rating: 4.8, reviews: 112, price: 500, priceUnit: 'servicio', zone: 'Nápoles', avatar: '👩‍🦱', verified: true, bio: 'Limpieza a fondo de cocinas, baños y áreas difíciles.', available: 'Hoy' },
  { id: 12, name: 'Jorge Ramos', cat: 'plomeria', service: 'Instalación de calentadores', rating: 4.7, reviews: 38, price: 600, priceUnit: 'servicio', zone: 'Iztacalco', avatar: '👷', verified: true, bio: 'Instalación y mantenimiento de boilers y calentadores solares.', available: 'Mañana' }
];

function getProsByCategory(catId) {
  if (!catId || catId === 'all') return PROS;
  return PROS.filter(p => p.cat === catId);
}
function getCatBySub(subId) {
  for (var i = 0; i < CATEGORIES.length; i++) {
    var c = CATEGORIES[i];
    if (c.sub && c.sub.some(function(s){ return s.id === subId; })) return c;
    if (c.groups) {
      for (var g = 0; g < c.groups.length; g++) {
        if (c.groups[g].items.some(function(s){ return s.id === subId; })) return c;
      }
    }
  }
  return null;
}
function getSubName(subId) {
  for (var i = 0; i < CATEGORIES.length; i++) {
    var c = CATEGORIES[i];
    if (c.sub) { var f = c.sub.find(function(s){ return s.id === subId; }); if (f) return f.name; }
    if (c.groups) {
      for (var g = 0; g < c.groups.length; g++) {
        var f2 = c.groups[g].items.find(function(s){ return s.id === subId; });
        if (f2) return f2.name;
      }
    }
  }
  return null;
}
function getProById(id) {
  return PROS.find(p => p.id === parseInt(id));
}
function getCategory(id) {
  return CATEGORIES.find(c => c.id === id);
}
