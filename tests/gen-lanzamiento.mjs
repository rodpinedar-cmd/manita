// Genera Manita_Lanzamiento.pptx — presentación de LANZAMIENTO, muy visual,
// con fotos reales de personas/servicios (Unsplash) + capturas de la app.
// Requiere: node fetch-fotos.mjs (fotos) y node user-sim.mjs (capturas).
// Ejecutar: node gen-lanzamiento.mjs
import PptxGenJS from 'pptxgenjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const CAP = join(process.cwd(), 'capturas');
const FOT = join(CAP, 'fotos');
const cap = f => join(CAP, f);
const foto = f => join(FOT, f);
const hasCap = f => existsSync(cap(f));
const hasFoto = f => existsSync(foto(f));

const CORAL='FF6B4A', CORAL_D='E8563A', CORAL_T='C43D26', NAVY='2D3E75', NAVY_D='1F2544',
      DARK='22232B', BG='FBF7F4', MINT='FFF0EC', GRAY='565D6B', WHITE='FFFFFF', OK='16A97F', AMBER='F2A93B';

const p = new PptxGenJS();
p.defineLayout({ name:'M', width:13.333, height:7.5 });
p.layout='M'; p.author='Manita'; p.company='Manita'; p.title='Manita — Lanzamiento';
const W=13.333, H=7.5;
let n=0;
function S(bg){ n++; const s=p.addSlide(); if(bg) s.background={color:bg}; return s; }
// Foto a pantalla completa + velo oscuro para legibilidad
function fotoFull(s, file, overlay){
  if (hasFoto(file)) s.addImage({ path:foto(file), x:0, y:0, w:W, h:H, sizing:{type:'cover',w:W,h:H} });
  s.addShape(p.ShapeType.rect, { x:0, y:0, w:W, h:H, fill:{ color: overlay||NAVY_D, transparency: 45 } });
}

// ===== 1. Portada fotográfica =====
{
  const s=S();
  fotoFull(s, 'hero-familia.jpg', NAVY_D);
  s.addText('🤝',{x:0,y:1.3,w:W,h:1.2,fontSize:70,align:'center',color:WHITE});
  s.addText('Manita',{x:0,y:2.6,w:W,h:1.3,fontSize:72,bold:true,align:'center',color:WHITE});
  s.addText('Cualquier servicio para tu hogar, en manos de confianza',{x:1,y:4.1,w:W-2,h:0.8,fontSize:24,align:'center',color:WHITE});
  s.addShape(p.ShapeType.roundRect,{x:W/2-1.8,y:5.2,w:3.6,h:0.7,rectRadius:0.35,fill:{color:CORAL}});
  s.addText('LANZAMIENTO · CDMX 2026',{x:W/2-1.8,y:5.2,w:3.6,h:0.7,fontSize:13,bold:true,align:'center',valign:'middle',color:WHITE,charSpacing:1});
}

// ===== 2. Gancho fotográfico =====
{
  const s=S();
  fotoFull(s, 'ciudad-cdmx.jpg', NAVY_D);
  s.addText('En una ciudad de millones,\nencontrar ayuda de confianza\nno debería ser tan difícil.',{x:1,y:2.3,w:W-2,h:2.6,fontSize:34,bold:true,align:'center',color:WHITE,lineSpacingMultiple:1.1});
  s.addText('Manita conecta a los vecinos de CDMX con profesionales verificados.',{x:1.5,y:5.2,w:W-3,h:0.7,fontSize:18,align:'center',color:'FFE4DC'});
}

// ===== 3. Todo lo que puedes pedir (mosaico de fotos) =====
{
  const s=S(WHITE);
  s.addShape(p.ShapeType.rect,{x:0,y:0,w:W,h:0.18,fill:{color:CORAL}});
  s.addText('TODO EN UN SOLO LUGAR',{x:0.7,y:0.5,w:8,h:0.4,fontSize:13,bold:true,color:CORAL_T,charSpacing:2});
  s.addText('Casi cualquier servicio, a domicilio',{x:0.7,y:0.95,w:11.9,h:0.9,fontSize:30,bold:true,color:NAVY});
  const cats=[
    ['limpieza.jpg','Limpieza'],['plomeria.jpg','Plomería'],['electricista.jpg','Electricidad'],['handyman.jpg','Manitas / Hogar'],
    ['piano.jpg','Clases de piano'],['patinaje.jpg','Clases de patinaje'],['belleza.jpg','Belleza y estética'],['mascotas.jpg','Paseo de mascotas'],
  ];
  cats.forEach((c,i)=>{ const col=i%4,row=Math.floor(i/4); const x=0.6+col*3.08,y=2.1+row*2.35;
    if(hasFoto(c[0])) s.addImage({ path:foto(c[0]), x, y, w:2.9, h:1.7, sizing:{type:'cover',w:2.9,h:1.7}, rounding:true });
    s.addText(c[1],{x,y:y+1.72,w:2.9,h:0.4,fontSize:13,bold:true,align:'center',color:NAVY});
  });
}

// ===== 4. El problema (foto + tarjetas) =====
{
  const s=S(NAVY);
  s.addText('EL PROBLEMA',{x:0.7,y:0.6,w:8,h:0.4,fontSize:13,bold:true,color:'FFB4A2',charSpacing:2});
  s.addText('Hoy contratar en casa es una apuesta',{x:0.7,y:1.05,w:11.9,h:1,fontSize:32,bold:true,color:WHITE});
  const cards=[['🤷','Sin confianza','Recomendaciones sueltas, sin garantía.'],
    ['💸','Precio incierto','No sabes si te cobran justo.'],
    ['⚠️','Sin respaldo','Si algo sale mal, no hay a quién acudir.']];
  cards.forEach((c,i)=>{ const x=0.7+i*4.05;
    s.addShape(p.ShapeType.roundRect,{x,y:2.6,w:3.8,h:2.9,rectRadius:0.15,fill:{color:WHITE}});
    s.addText(c[0],{x,y:2.85,w:3.8,h:1,fontSize:44,align:'center'});
    s.addText(c[1],{x:x+0.2,y:3.95,w:3.4,h:0.5,fontSize:18,bold:true,color:NAVY,align:'center'});
    s.addText(c[2],{x:x+0.2,y:4.5,w:3.4,h:0.9,fontSize:13,color:GRAY,align:'center'});
  });
}

// ===== 5. La solución (texto + app) =====
{
  const s=S(WHITE);
  s.addShape(p.ShapeType.rect,{x:0,y:0,w:6.6,h:H,fill:{color:BG}});
  s.addText('LA SOLUCIÓN',{x:0.7,y:0.9,w:5,h:0.4,fontSize:13,bold:true,color:CORAL_T,charSpacing:2});
  s.addText('Encuentra, reserva\ny relájate',{x:0.7,y:1.35,w:5.5,h:1.6,fontSize:38,bold:true,color:NAVY,lineSpacingMultiple:0.95});
  s.addText([
    {text:'Profesionales verificados por categoría, zona y precio.',options:{bullet:true}},
    {text:'Reserva en segundos, con precio claro.',options:{bullet:true}},
    {text:'Reseñas reales y respaldo de principio a fin.',options:{bullet:true}},
    {text:'Web y app instalable, sin tiendas de por medio.',options:{bullet:true}},
  ],{x:0.7,y:3.2,w:5.5,h:3,fontSize:17,color:DARK,lineSpacingMultiple:1.4});
  if(hasCap('02-inicio-app-iphone.png')) s.addImage({path:cap('02-inicio-app-iphone.png'),x:8.1,y:0.8,w:3.6,h:6,sizing:{type:'contain',w:3.6,h:6}});
}

// ===== 6. Cómo funciona =====
{
  const s=S(WHITE);
  s.addShape(p.ShapeType.rect,{x:0,y:0,w:W,h:0.18,fill:{color:CORAL}});
  s.addText('CÓMO FUNCIONA',{x:0.7,y:0.5,w:8,h:0.4,fontSize:13,bold:true,color:CORAL_T,charSpacing:2});
  s.addText('Tan fácil como pedir comida',{x:0.7,y:0.95,w:11.9,h:0.9,fontSize:30,bold:true,color:NAVY});
  const pasos=[['🔍','Busca','Elige y compara.'],['📅','Reserva','Fecha, hora y lugar.'],['🧑‍🔧','Recibe','Llega y trabaja.'],['⭐','Reseña','Confirmas y calificas.']];
  pasos.forEach((c,i)=>{ const x=0.7+i*3.05;
    s.addShape(p.ShapeType.roundRect,{x,y:2.6,w:2.85,h:3,rectRadius:0.15,fill:{color:i%2?MINT:BG}});
    s.addText(c[0],{x,y:2.9,w:2.85,h:1,fontSize:44,align:'center'});
    s.addText(String(i+1)+'. '+c[1],{x:x+0.15,y:4.05,w:2.55,h:0.5,fontSize:18,bold:true,color:NAVY,align:'center'});
    s.addText(c[2],{x:x+0.15,y:4.6,w:2.55,h:0.8,fontSize:13,color:GRAY,align:'center'});
  });
}

// ===== 7. Garantía / confianza (foto de fondo) =====
{
  const s=S();
  fotoFull(s, 'cliente-feliz.jpg', NAVY_D);
  s.addText('GARANTÍA MANITA',{x:0.7,y:1.0,w:8,h:0.4,fontSize:14,bold:true,color:'FFB4A2',charSpacing:3});
  s.addText('Tu tranquilidad, primero',{x:0.7,y:1.5,w:11.9,h:1,fontSize:38,bold:true,color:WHITE});
  const items=[['🛡️','Pago protegido','El pro cobra cuando confirmas que todo salió bien.'],
    ['✔️','Verificados','Identidad revisada por Manita.'],
    ['⭐','Reseñas reales','Solo quien contrató puede calificar.']];
  items.forEach((c,i)=>{ const y=2.9+i*1.2;
    s.addText(c[0],{x:0.9,y,w:0.8,h:0.9,fontSize:30,valign:'middle'});
    s.addText(c[1]+' — '+c[2],{x:1.9,y,w:10.5,h:0.9,fontSize:17,color:WHITE,valign:'middle'});
  });
}

// ===== 8. Historias de profesionales (fotos) =====
{
  const s=S(WHITE);
  s.addShape(p.ShapeType.rect,{x:0,y:0,w:W,h:0.18,fill:{color:CORAL}});
  s.addText('PARA QUIEN OFRECE SERVICIOS',{x:0.7,y:0.5,w:8,h:0.4,fontSize:13,bold:true,color:CORAL_T,charSpacing:2});
  s.addText('Convierte tu talento en ingresos',{x:0.7,y:0.95,w:11.9,h:0.9,fontSize:30,bold:true,color:NAVY});
  const pros=[['piano.jpg','Da clases de piano','Comparte tu música y llena tu agenda.'],
    ['patinaje.jpg','Enseña patinaje','Convierte tu pasión en tu trabajo.'],
    ['belleza.jpg','Servicios de belleza','Lleva tu estudio a domicilio.']];
  pros.forEach((c,i)=>{ const x=0.6+i*4.1;
    if(hasFoto(c[0])) s.addImage({path:foto(c[0]),x,y:2.1,w:3.9,h:2.3,sizing:{type:'cover',w:3.9,h:2.3},rounding:true});
    s.addText(c[1],{x,y:4.5,w:3.9,h:0.5,fontSize:17,bold:true,color:NAVY});
    s.addText(c[2],{x,y:5.0,w:3.9,h:0.8,fontSize:13,color:GRAY});
  });
  s.addText('Publicar es gratis. Manita solo cobra una comisión cuando tú ganas.',{x:0.7,y:6.1,w:11.9,h:0.5,fontSize:15,bold:true,color:CORAL_T});
}

// ===== 9. El producto (mosaico app sobre fondo oscuro) =====
{
  const s=S(NAVY);
  s.addText('EL PRODUCTO',{x:0.7,y:0.55,w:8,h:0.4,fontSize:13,bold:true,color:'FFB4A2',charSpacing:2});
  s.addText('Se ve y se siente como una app real',{x:0.7,y:1.0,w:11.9,h:0.9,fontSize:30,bold:true,color:WHITE});
  const shots=['02-inicio-app-iphone.png','04-servicios-iphone.png','06-perfil-pro-iphone.png','11-onboarding-iphone.png'];
  shots.forEach((f,i)=>{ const x=0.7+i*3.1;
    if(hasCap(f)) s.addImage({path:cap(f),x:x+0.35,y:2.2,w:2.4,h:4.7,sizing:{type:'contain',w:2.4,h:4.7}});
  });
}

// ===== 10. Mercado + modelo (compacto) =====
{
  const s=S(WHITE);
  s.addShape(p.ShapeType.rect,{x:0,y:0,w:W,h:0.18,fill:{color:CORAL}});
  s.addText('OPORTUNIDAD',{x:0.7,y:0.5,w:8,h:0.4,fontSize:13,bold:true,color:CORAL_T,charSpacing:2});
  s.addText('Mercado grande, sin líder local claro',{x:0.7,y:0.95,w:11.9,h:0.9,fontSize:28,bold:true,color:NAVY});
  const cols=[['🏙️','Local','Nacido en CDMX, en español mexicano.'],
    ['🌎','Modelo probado','Webel y TaskRabbit validan la idea.'],
    ['💳','Ingreso claro','Comisión por servicio completado (split de pago).']];
  cols.forEach((c,i)=>{ const x=0.7+i*4.05;
    s.addShape(p.ShapeType.roundRect,{x,y:2.4,w:3.8,h:2.6,rectRadius:0.15,fill:{color:BG}});
    s.addText(c[0],{x,y:2.65,w:3.8,h:0.9,fontSize:40,align:'center'});
    s.addText(c[1],{x:x+0.2,y:3.6,w:3.4,h:0.5,fontSize:17,bold:true,color:NAVY,align:'center'});
    s.addText(c[2],{x:x+0.2,y:4.15,w:3.4,h:0.8,fontSize:13,color:GRAY,align:'center'});
  });
  s.addText('📌 Cifras de mercado y % de comisión: por validar/definir.',{x:0.7,y:5.4,w:11.9,h:0.5,fontSize:12,italic:true,color:GRAY});
}

// ===== 11. Estado / listo =====
{
  const s=S(WHITE);
  s.addShape(p.ShapeType.rect,{x:0,y:0,w:W,h:0.18,fill:{color:CORAL}});
  s.addText('DÓNDE ESTAMOS',{x:0.7,y:0.5,w:8,h:0.4,fontSize:13,bold:true,color:OK,charSpacing:2});
  s.addText('Producto listo para probarse',{x:0.7,y:0.95,w:11.9,h:0.9,fontSize:30,bold:true,color:NAVY});
  const stats=[['MVP','funcional de punta a punta'],['Web + App','instalable Android/iPhone'],['0','fallos en pruebas de 20 usuarios'],['✔','base legal preparada']];
  stats.forEach((c,i)=>{ const x=0.7+i*3.05;
    s.addShape(p.ShapeType.roundRect,{x,y:2.4,w:2.85,h:2.4,rectRadius:0.15,fill:{color:MINT}});
    s.addText(c[0],{x,y:2.75,w:2.85,h:1,fontSize:36,bold:true,color:CORAL_T,align:'center'});
    s.addText(c[1],{x:x+0.15,y:3.9,w:2.55,h:0.8,fontSize:13,color:DARK,align:'center'});
  });
  s.addText('Todo funcionando y verificado: registro, búsqueda, reserva, gestión y reseñas.',{x:0.7,y:5.2,w:11.9,h:0.5,fontSize:14,bold:true,color:OK});
}

// ===== 12. Cierre / CTA (foto) =====
{
  const s=S();
  fotoFull(s, 'hero-familia.jpg', CORAL_D);
  s.addText('🤝',{x:0,y:1.3,w:W,h:1.1,fontSize:60,align:'center',color:WHITE});
  s.addText('Sumemos manos',{x:0,y:2.5,w:W,h:1,fontSize:48,bold:true,align:'center',color:WHITE});
  s.addText('Buscamos profesionales para arrancar y aliados que crean en el proyecto.',{x:1.5,y:3.8,w:W-3,h:0.8,fontSize:20,align:'center',color:WHITE});
  s.addShape(p.ShapeType.roundRect,{x:W/2-2.5,y:4.9,w:5,h:0.8,rectRadius:0.4,fill:{color:WHITE}});
  s.addText('manita-cdmx.netlify.app',{x:W/2-2.5,y:4.9,w:5,h:0.8,fontSize:18,bold:true,align:'center',valign:'middle',color:CORAL_T});
}

const OUT = join(process.cwd(), 'Manita_Lanzamiento.pptx');
await p.writeFile({ fileName: OUT });
console.log('OK LANZAMIENTO · ' + n + ' slides → ' + OUT);

