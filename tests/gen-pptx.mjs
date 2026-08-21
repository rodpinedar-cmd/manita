// Genera Manita_Presentacion.pptx (PowerPoint editable) con las capturas reales.
// Ejecutar: node gen-pptx.mjs  → crea el .pptx en tests/
import PptxGenJS from 'pptxgenjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const CAP = join(process.cwd(), 'capturas');
const img = f => join(CAP, f);
const has = f => existsSync(img(f));

// Paleta Manita
const CORAL = 'FF6B4A', CORAL_T = 'C43D26', NAVY = '2D3E75', DARK = '22232B',
      BG = 'FBF7F4', MINT = 'FFF0EC', GRAY = '565D6B', WHITE = 'FFFFFF', OK = '0C6B4F';

const p = new PptxGenJS();
p.defineLayout({ name: 'MANITA', width: 13.333, height: 7.5 });
p.layout = 'MANITA';
p.author = 'Manita';
p.company = 'Manita';
p.subject = 'Presentación ejecutiva';
p.title = 'Manita — Servicios a domicilio CDMX';

const W = 13.333, H = 7.5;

// Helpers de slide
function bar(s){ s.addShape(p.ShapeType.rect, { x:0, y:0, w:W, h:0.18, fill:{color:CORAL} }); }
function foot(s, n){
  s.addText('Manita · manita-cdmx.netlify.app', { x:0.5, y:H-0.5, w:8, h:0.3, fontSize:10, color:GRAY });
  s.addText(String(n), { x:W-1, y:H-0.5, w:0.5, h:0.3, fontSize:10, color:GRAY, align:'right' });
}
function tag(s, t){ s.addText(t.toUpperCase(), { x:0.5, y:0.5, w:6, h:0.4, fontSize:12, bold:true, color:CORAL_T, charSpacing:1 }); }
function title(s, t){ s.addText(t, { x:0.5, y:0.95, w:12.3, h:1.0, fontSize:30, bold:true, color:NAVY }); }

let n = 0;
function slide(bgc){ n++; const s = p.addSlide(); s.background = { color: bgc || WHITE }; return s; }

// ---- 1. Portada ----
{
  const s = slide(CORAL);
  s.addText('🤝', { x:0, y:1.6, w:W, h:1.4, fontSize:80, align:'center', color:WHITE });
  s.addText('Manita', { x:0, y:3.0, w:W, h:1.2, fontSize:60, bold:true, align:'center', color:WHITE });
  s.addText('El marketplace de servicios a domicilio para la Ciudad de México', { x:1, y:4.3, w:W-2, h:0.7, fontSize:20, align:'center', color:WHITE });
  s.addText('Web + App instalable · Agosto 2026', { x:0, y:5.2, w:W, h:0.5, fontSize:14, align:'center', color:'FFE4DC' });
}

// ---- 2. Problema / oportunidad ----
{
  const s = slide(); bar(s); tag(s,'El problema'); title(s,'Contratar un servicio a domicilio en CDMX es incierto');
  s.addText([
    { text:'Recomendaciones sueltas por WhatsApp o redes, sin garantía.', options:{bullet:true} },
    { text:'No sabes si el precio es justo ni si la persona es confiable.', options:{bullet:true} },
    { text:'Sin respaldo si algo sale mal.', options:{bullet:true} },
  ], { x:0.7, y:2.1, w:11.9, h:1.8, fontSize:18, color:DARK, lineSpacingMultiple:1.3 });
  s.addText('LA OPORTUNIDAD', { x:0.7, y:4.0, w:6, h:0.4, fontSize:14, bold:true, color:CORAL_T });
  s.addText('Un solo lugar para encontrar, comparar y reservar profesionales verificados, con precio claro y respaldo.', { x:0.7, y:4.4, w:11.9, h:0.9, fontSize:18, color:DARK });
  s.addText('📌 Tamaño y demanda de mercado en CDMX: por validar con investigación de campo. No usamos cifras infladas.', { x:0.7, y:5.6, w:11.9, h:0.8, fontSize:13, italic:true, color:GRAY, fill:{color:MINT}, align:'left', valign:'middle' });
  foot(s,n);
}

// ---- 3. Solución ----
{
  const s = slide(); bar(s); tag(s,'La solución'); title(s,'Manita: confianza en cada reserva');
  const cards = [
    ['🔎 Encuentra','Profesionales por categoría, zona y precio.'],
    ['📅 Reserva','Fecha, hora y dirección. Precio calculado en el servidor.'],
    ['🛡️ Con respaldo','Reseñas reales y (próximamente) pago protegido.'],
  ];
  cards.forEach((c,i)=>{
    const x = 0.7 + i*4.05;
    s.addShape(p.ShapeType.roundRect, { x, y:2.3, w:3.8, h:2.2, rectRadius:0.12, fill:{color:BG}, line:{color:'ECE7E3'} });
    s.addText(c[0], { x:x+0.2, y:2.5, w:3.4, h:0.6, fontSize:18, bold:true, color:NAVY });
    s.addText(c[1], { x:x+0.2, y:3.15, w:3.4, h:1.2, fontSize:14, color:GRAY });
  });
  s.addText('Disponible como web y como app instalable (Android e iPhone), sin tiendas de por medio.', { x:0.7, y:4.9, w:11.9, h:0.6, fontSize:16, color:DARK, bold:true });
  foot(s,n);
}

// ---- 4. Capturas WEB ----
{
  const s = slide(); bar(s); tag(s,'La web'); title(s,'Versión web (navegador)');
  const shots = [
    ['01-inicio-web-desktop.png','Landing: hero y garantía'],
    ['05-servicios-desktop.png','Servicios: filtros y orden'],
    ['12-legal-desktop.png','Términos y privacidad'],
  ];
  shots.forEach((sh,i)=>{
    const x = 0.7 + i*4.05;
    if (has(sh[0])) s.addImage({ path: img(sh[0]), x, y:2.2, w:3.8, h:2.7, sizing:{type:'contain',w:3.8,h:2.7} });
    s.addText(sh[1], { x, y:4.95, w:3.8, h:0.5, fontSize:13, align:'center', color:GRAY });
  });
  foot(s,n);
}

// ---- 5. Capturas APP ----
{
  const s = slide(); bar(s); tag(s,'La app'); title(s,'Versión app (instalada)');
  const shots = [
    ['02-inicio-app-iphone.png','Home + barra de 5 tabs'],
    ['04-servicios-iphone.png','Listado móvil'],
    ['06-perfil-pro-iphone.png','Perfil y reserva'],
    ['11-onboarding-iphone.png','Onboarding'],
    ['10-descarga-modal-iphone.png','Instalación (QR)'],
    ['03-categorias-iphone.png','Categorías'],
  ];
  shots.forEach((sh,i)=>{
    const col = i % 3, row = Math.floor(i/3);
    const x = 0.7 + col*4.05, y = 1.9 + row*2.7;
    if (has(sh[0])) s.addImage({ path: img(sh[0]), x:x+0.9, y, w:2.0, h:2.3, sizing:{type:'contain',w:2.0,h:2.3} });
    s.addText(sh[1], { x, y:y+2.3, w:3.8, h:0.35, fontSize:11, align:'center', color:GRAY });
  });
  foot(s,n);
}

// ---- 6. Cómo funciona ----
{
  const s = slide(); bar(s); tag(s,'Cómo funciona'); title(s,'Dos flujos que encajan');
  function fila(y, label, pasos){
    s.addText(label, { x:0.7, y, w:3, h:0.5, fontSize:15, bold:true, color:CORAL_T });
    pasos.forEach((t,i)=>{
      const x = 0.7 + i*3.0;
      s.addShape(p.ShapeType.roundRect, { x, y:y+0.5, w:2.8, h:0.9, rectRadius:0.1, fill:{color:BG} });
      s.addText((i+1)+'. '+t, { x:x+0.15, y:y+0.55, w:2.5, h:0.8, fontSize:13, color:DARK, valign:'middle' });
    });
  }
  fila(2.1, 'Cliente', ['Busca y filtra','Reserva','Recibe servicio','Confirma y reseña']);
  fila(4.1, 'Profesional', ['Crea perfil','Define horario','Confirma','Completa y cobra']);
  foot(s,n);
}

// ---- 7. Estado del producto ----
{
  const s = slide(); bar(s); tag(s,'Estado del producto'); title(s,'Lo que YA funciona (verificado)');
  const items = [
    ['Cuentas','Registro/login reales + consentimiento.'],
    ['Buscar','Filtros por categoría, precio y zona + orden.'],
    ['Reservar','Precio server-side. Ciclo verificado 8/8.'],
    ['Profesional','Panel con estados y disponibilidad.'],
    ['Actividad','Notificaciones in-app del ciclo.'],
    ['PWA','Instalable Android/iPhone, onboarding, offline.'],
  ];
  items.forEach((c,i)=>{
    const col=i%3,row=Math.floor(i/3); const x=0.7+col*4.05, y=2.1+row*1.4;
    s.addShape(p.ShapeType.roundRect, { x, y, w:3.8, h:1.2, rectRadius:0.1, fill:{color:BG} });
    s.addText(c[0], { x:x+0.2, y:y+0.12, w:3.4, h:0.4, fontSize:15, bold:true, color:NAVY });
    s.addText(c[1], { x:x+0.2, y:y+0.5, w:3.4, h:0.6, fontSize:12, color:GRAY });
  });
  s.addText('Calidad: 70/70 smoke · 47/47 navegador · 0 violaciones de accesibilidad · 20 usuarios simulados sin fallos.', { x:0.7, y:5.3, w:11.9, h:0.6, fontSize:13, bold:true, color:OK, fill:{color:'E6F7F1'}, valign:'middle' });
  foot(s,n);
}

// ---- 8. Mejoras aplicadas ----
{
  const s = slide(); bar(s); tag(s,'Recorrido'); title(s,'Mejoras aplicadas hasta hoy');
  s.addText([
    { text:'Backend seguro: precio, estados y rating en el servidor (no manipulables).', options:{bullet:true} },
    { text:'Rediseño "modo app" tipo nativo + PWA/APK instalable.', options:{bullet:true} },
    { text:'Accesibilidad AA, SEO, rendimiento y estados vacíos con marca.', options:{bullet:true} },
    { text:'Ciclo transaccional completo (reservar → gestionar → reseñar → rating real).', options:{bullet:true} },
    { text:'Filtros de precio/zona, orden, centro de Actividad, disponibilidad del pro.', options:{bullet:true} },
    { text:'Base legal completa (T&C, privacidad ARCO, reembolsos) y plan de pagos.', options:{bullet:true} },
    { text:'Congruencia web ↔ app revisada y corregida.', options:{bullet:true} },
  ], { x:0.7, y:2.1, w:11.9, h:3.6, fontSize:16, color:DARK, lineSpacingMultiple:1.35 });
  foot(s,n);
}

// ---- 9. Seguridad y legal ----
{
  const s = slide(); bar(s); tag(s,'Seguridad y legal'); title(s,'Construido para ser confiable y legal');
  s.addText([
    { text:'Manita es intermediario, no presta el servicio ni es empleador (T&C).', options:{bullet:true} },
    { text:'Aviso de Privacidad conforme LFPDPPP con derechos ARCO.', options:{bullet:true} },
    { text:'Pagos con split (Mercado Pago/Stripe): el dinero no se retiene en Manita → evita el problema de la Ley Fintech.', options:{bullet:true} },
    { text:'Copy honesto, sin datos falsos (cumple PROFECO).', options:{bullet:true} },
  ], { x:0.7, y:2.1, w:11.9, h:2.6, fontSize:17, color:DARK, lineSpacingMultiple:1.3 });
  s.addText('⚠️ Requiere revisión de un abogado fintech mexicano antes de cobrar dinero real.', { x:0.7, y:5.0, w:11.9, h:0.7, fontSize:14, bold:true, color:CORAL_T, fill:{color:MINT}, valign:'middle' });
  foot(s,n);
}

// ---- 10. Modelo de pago ----
{
  const s = slide(); bar(s); tag(s,'Modelo de pago'); title(s,'Dinero protegido de punta a punta');
  const pasos = ['Cliente paga → se autoriza (aparta)','Pro realiza el servicio','Cliente confirma','Se cobra: comisión a Manita, resto al pro'];
  pasos.forEach((t,i)=>{
    const x=0.7+i*3.0;
    s.addShape(p.ShapeType.roundRect, { x, y:2.6, w:2.8, h:1.5, rectRadius:0.12, fill:{color:i===3?MINT:BG} });
    s.addText(String(i+1), { x:x+0.15, y:2.7, w:0.6, h:0.6, fontSize:22, bold:true, color:CORAL });
    s.addText(t, { x:x+0.15, y:3.3, w:2.5, h:0.8, fontSize:13, color:DARK });
  });
  s.addText('El reparto lo hace la pasarela automáticamente (split). Comisión transparente antes de reservar.', { x:0.7, y:4.5, w:11.9, h:0.6, fontSize:15, color:DARK });
  foot(s,n);
}

// ---- 11. Mercado ----
{
  const s = slide(); bar(s); tag(s,'Mercado'); title(s,'Competencia y posicionamiento');
  const rows = [
    ['Referente','Qué hace','Manita se diferencia en'],
    ['Webel (España)','Servicios a domicilio, app','Enfoque 100% CDMX, identidad propia'],
    ['TaskRabbit (EEUU)','Tareas y handyman','Español mexicano, categorías locales'],
    ['Recomendación informal','WhatsApp / redes','Verificación, reseñas y respaldo'],
  ];
  s.addTable(rows.map((r,ri)=> r.map(c=>({ text:c, options:{ fontSize:14, bold:ri===0, color:ri===0?WHITE:DARK, fill:{color:ri===0?NAVY:(ri%2?BG:WHITE)} } }))), { x:0.7, y:2.2, w:11.9, colW:[3.4,4.2,4.3], border:{type:'solid',color:'ECE7E3',pt:1} });
  s.addText('📌 Tamaño de mercado, precios y demanda: por validar con investigación de campo antes de invertir.', { x:0.7, y:5.2, w:11.9, h:0.6, fontSize:13, italic:true, color:GRAY });
  foot(s,n);
}

// ---- 12. Social media y lanzamiento ----
{
  const s = slide(); bar(s); tag(s,'Growth'); title(s,'Social media y lanzamiento');
  const cards = [
    ['Canales','Instagram y TikTok (antes/después), Facebook grupos de colonia, WhatsApp.'],
    ['Contenido','Tips del hogar, historias de profesionales, "cómo instalar la app", testimonios reales.'],
    ['Fase 1 — Semilla','Reclutar 20-30 profesionales reales por colonia (Roma, Condesa, Del Valle).'],
    ['Fase 2 — Demanda','Campañas locales geolocalizadas + referidos (invita y gana).'],
  ];
  cards.forEach((c,i)=>{
    const col=i%2,row=Math.floor(i/2); const x=0.7+col*6.05, y=2.1+row*1.5;
    s.addShape(p.ShapeType.roundRect, { x, y, w:5.8, h:1.3, rectRadius:0.1, fill:{color:BG} });
    s.addText(c[0], { x:x+0.2, y:y+0.12, w:5.4, h:0.4, fontSize:15, bold:true, color:NAVY });
    s.addText(c[1], { x:x+0.2, y:y+0.5, w:5.4, h:0.7, fontSize:12, color:GRAY });
  });
  s.addText('Estrategia gratuita primero (orgánico + boca a boca). Pauta pagada solo cuando haya oferta suficiente.', { x:0.7, y:5.3, w:11.9, h:0.6, fontSize:13, bold:true, color:CORAL_T });
  foot(s,n);
}

// ---- 13. Costos ----
{
  const s = slide(); bar(s); tag(s,'Costos'); title(s,'Qué es gratis hoy y qué cuesta a futuro');
  const rows = [
    ['Concepto','Costo','Cuándo'],
    ['Hosting (Netlify) + Backend (Supabase)','Gratis (plan free)','Ahora'],
    ['PWA / APK (instalable)','Gratis','Ahora'],
    ['Pasarela de pago (Mercado Pago)','~3-4% + IVA por venta','Al cobrar'],
    ['Correo propio (SMTP)','Plan free (Resend/Brevo)','Al escalar'],
    ['Google Play (opcional)','$25 USD único','Si se publica'],
    ['App Store (opcional)','$99 USD/año','Si se publica'],
    ['Revisión legal','Variable','Antes de cobrar'],
  ];
  s.addTable(rows.map((r,ri)=> r.map((c,ci)=>({ text:c, options:{ fontSize:13, bold:ri===0, color:ri===0?WHITE:(ci===1&&/Gratis|free/.test(c)?OK:DARK), fill:{color:ri===0?NAVY:(ri%2?BG:WHITE)} } }))), { x:0.7, y:2.1, w:11.9, colW:[6.0,3.5,2.4], border:{type:'solid',color:'ECE7E3',pt:1} });
  s.addText('Hoy no se gasta nada. Los costos aparecen solo cuando hay ventas o se decide publicar en tiendas.', { x:0.7, y:6.2, w:11.9, h:0.5, fontSize:13, bold:true, color:OK });
  foot(s,n);
}

// ---- 14. Roadmap ----
{
  const s = slide(); bar(s); tag(s,'Roadmap'); title(s,'Hacia el lanzamiento');
  const cards = [
    ['Esta semana','Config Supabase pendiente + reclutar primeros profesionales reales.'],
    ['Este mes','Definir modelo económico, contenido social, primeras reservas reales.'],
    ['3 meses','Integrar pagos con split, revisión legal, verificación de profesionales.'],
    ['6 meses','Escalar colonias, notificaciones push/email, evaluar tiendas.'],
  ];
  cards.forEach((c,i)=>{
    const col=i%2,row=Math.floor(i/2); const x=0.7+col*6.05, y=2.1+row*1.5;
    s.addShape(p.ShapeType.roundRect, { x, y, w:5.8, h:1.3, rectRadius:0.1, fill:{color:MINT} });
    s.addText(c[0], { x:x+0.2, y:y+0.12, w:5.4, h:0.4, fontSize:15, bold:true, color:CORAL_T });
    s.addText(c[1], { x:x+0.2, y:y+0.5, w:5.4, h:0.7, fontSize:12, color:DARK });
  });
  foot(s,n);
}

// ---- 15. Pendientes ----
{
  const s = slide(); bar(s); tag(s,'Pendientes'); title(s,'Lo que falta para lanzar');
  s.addText([
    { text:'Negocio: definir comisión y las 10 decisiones del modelo económico.', options:{bullet:true} },
    { text:'Legal: revisión con abogado + datos fiscales/razón social.', options:{bullet:true} },
    { text:'Pagos: integrar Mercado Pago con split (Edge Functions).', options:{bullet:true} },
    { text:'Correo: SMTP propio para reactivar confirmación.', options:{bullet:true} },
    { text:'Oferta: reclutar profesionales reales por colonia.', options:{bullet:true} },
    { text:'Mercado: validar demanda y precios con investigación de campo.', options:{bullet:true} },
  ], { x:0.7, y:2.1, w:11.9, h:3.4, fontSize:17, color:DARK, lineSpacingMultiple:1.35 });
  foot(s,n);
}

// ---- 16. Cierre ----
{
  const s = slide(NAVY);
  s.addText('🤝', { x:0, y:1.6, w:W, h:1.2, fontSize:64, align:'center', color:WHITE });
  s.addText('Manita está listo para probarse', { x:1, y:2.9, w:W-2, h:1.0, fontSize:36, bold:true, align:'center', color:WHITE });
  s.addText('MVP funcional, instalable y con base legal. El siguiente paso: primeros profesionales y clientes reales en CDMX.', { x:1.5, y:4.0, w:W-3, h:1.0, fontSize:18, align:'center', color:'D8DEF0' });
  s.addText('manita-cdmx.netlify.app', { x:0, y:5.3, w:W, h:0.5, fontSize:15, align:'center', color:'A9B4D9' });
}

const OUT = join(process.cwd(), 'Manita_Presentacion.pptx');
await p.writeFile({ fileName: OUT });
console.log('OK · ' + n + ' slides → ' + OUT);

