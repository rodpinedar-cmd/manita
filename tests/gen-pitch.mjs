// Genera Manita_Pitch.pptx — presentación COMERCIAL para presentar el proyecto a
// otras personas (socios, inversionistas, profesionales). Más visual y menos técnica.
// Ejecutar: node gen-pitch.mjs
import PptxGenJS from 'pptxgenjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const CAP = join(process.cwd(), 'capturas');
const img = f => join(CAP, f);
const has = f => existsSync(img(f));

const CORAL='FF6B4A', CORAL_D='E8563A', CORAL_T='C43D26', NAVY='2D3E75', NAVY_D='1F2544',
      DARK='22232B', BG='FBF7F4', MINT='FFF0EC', GRAY='565D6B', WHITE='FFFFFF', OK='0C6B4F', AMBER='F2A93B';

const p = new PptxGenJS();
p.defineLayout({ name:'M', width:13.333, height:7.5 });
p.layout='M'; p.author='Manita'; p.company='Manita'; p.title='Manita — Pitch';
const W=13.333, H=7.5;
let n=0;
function S(bg){ n++; const s=p.addSlide(); s.background={color:bg||WHITE}; return s; }
function kicker(s,t,color){ s.addText(t.toUpperCase(),{x:0.7,y:0.6,w:8,h:0.4,fontSize:13,bold:true,color:color||CORAL_T,charSpacing:2}); }
function big(s,t,color){ s.addText(t,{x:0.7,y:1.1,w:11.9,h:1.6,fontSize:40,bold:true,color:color||NAVY,lineSpacingMultiple:0.95}); }

// ===== 1. Portada impactante =====
{
  const s=S(CORAL);
  s.addShape(p.ShapeType.rect,{x:0,y:0,w:W,h:H,fill:{type:'solid',color:CORAL}});
  s.addText('🤝',{x:0,y:1.4,w:W,h:1.5,fontSize:90,align:'center',color:WHITE});
  s.addText('Manita',{x:0,y:3.0,w:W,h:1.3,fontSize:70,bold:true,align:'center',color:WHITE});
  s.addText('Servicios a domicilio de confianza, en tu ciudad',{x:1,y:4.4,w:W-2,h:0.7,fontSize:22,align:'center',color:WHITE});
  s.addText('CIUDAD DE MÉXICO',{x:0,y:5.4,w:W,h:0.4,fontSize:14,align:'center',color:'FFE4DC',charSpacing:3});
}

// ===== 2. Gancho / historia =====
{
  const s=S(NAVY);
  s.addText('"¿Alguien me recomienda una persona de confianza\npara limpiar / arreglar / cuidar en casa?"',{x:1,y:2.2,w:W-2,h:2,fontSize:30,bold:true,italic:true,align:'center',color:WHITE,lineSpacingMultiple:1.1});
  s.addText('Esta pregunta se repite miles de veces al día en CDMX.\nManita la convierte en una reserva segura.',{x:1.5,y:4.6,w:W-3,h:1,fontSize:18,align:'center',color:'D8DEF0'});
}

// ===== 3. El problema =====
{
  const s=S(); kicker(s,'El problema'); big(s,'Hoy, contratar en casa\nes una apuesta');
  const cards=[['🤷','Sin confianza','Recomendaciones sueltas por WhatsApp, sin garantía.'],
    ['💸','Precio incierto','No sabes si lo que te cobran es justo.'],
    ['⚠️','Sin respaldo','Si algo sale mal, no hay a quién acudir.']];
  cards.forEach((c,i)=>{ const x=0.7+i*4.05;
    s.addShape(p.ShapeType.roundRect,{x,y:3.4,w:3.8,h:2.6,rectRadius:0.15,fill:{color:BG}});
    s.addText(c[0],{x,y:3.65,w:3.8,h:0.9,fontSize:40,align:'center'});
    s.addText(c[1],{x:x+0.2,y:4.6,w:3.4,h:0.5,fontSize:18,bold:true,color:NAVY,align:'center'});
    s.addText(c[2],{x:x+0.2,y:5.1,w:3.4,h:0.8,fontSize:13,color:GRAY,align:'center'});
  });
}

// ===== 4. La solución (con captura app grande) =====
{
  const s=S(); kicker(s,'La solución'); big(s,'Encuentra, reserva y\nrelájate');
  s.addText([
    {text:'Profesionales verificados por categoría, zona y precio.',options:{bullet:true}},
    {text:'Reserva en segundos, con precio claro desde el inicio.',options:{bullet:true}},
    {text:'Reseñas reales y respaldo de principio a fin.',options:{bullet:true}},
    {text:'Web y app instalable — sin descargar de tiendas.',options:{bullet:true}},
  ],{x:0.7,y:3.0,w:6.5,h:3,fontSize:18,color:DARK,lineSpacingMultiple:1.4});
  if (has('02-inicio-app-iphone.png')) s.addImage({path:img('02-inicio-app-iphone.png'),x:8.4,y:1.2,w:3.2,h:5.8,sizing:{type:'contain',w:3.2,h:5.8}});
}

// ===== 5. Producto — mosaico app =====
{
  const s=S(NAVY); kicker(s,'El producto','FFB4A2');
  s.addText('Se ve y se siente como una app real',{x:0.7,y:1.05,w:11.9,h:1,fontSize:34,bold:true,color:WHITE});
  const shots=['02-inicio-app-iphone.png','04-servicios-iphone.png','06-perfil-pro-iphone.png','11-onboarding-iphone.png'];
  shots.forEach((f,i)=>{ const x=0.7+i*3.1;
    if(has(f)) s.addImage({path:img(f),x:x+0.35,y:2.3,w:2.4,h:4.6,sizing:{type:'contain',w:2.4,h:4.6}});
  });
}

// ===== 6. También en la web =====
{
  const s=S(); kicker(s,'Multiplataforma'); big(s,'También en la web');
  const shots=[['18-inicio-web-hero.png','Portada'],['13-categorias-web.png','Categorías'],['16-perfil-web.png','Perfil del profesional']];
  shots.forEach((sh,i)=>{ const x=0.7+i*4.05;
    if(has(sh[0])) s.addImage({path:img(sh[0]),x,y:3.0,w:3.8,h:2.5,sizing:{type:'contain',w:3.8,h:2.5}});
    s.addText(sh[1],{x,y:5.55,w:3.8,h:0.4,fontSize:13,align:'center',color:GRAY});
  });
  s.addText('La misma experiencia, en el navegador o instalada como app.',{x:0.7,y:6.2,w:11.9,h:0.5,fontSize:15,bold:true,color:CORAL_T});
}

// ===== 7. Cómo funciona =====
{
  const s=S(); kicker(s,'Cómo funciona'); big(s,'Cuatro pasos');
  const pasos=[['🔍','Busca','Elige categoría y compara.'],['📅','Reserva','Fecha, hora y dirección.'],['🧑‍🔧','Recibe','El profesional llega y trabaja.'],['⭐','Reseña','Confirmas y calificas.']];
  pasos.forEach((c,i)=>{ const x=0.7+i*3.05;
    s.addShape(p.ShapeType.roundRect,{x,y:3.2,w:2.85,h:2.8,rectRadius:0.15,fill:{color:i%2?MINT:BG}});
    s.addText(c[0],{x,y:3.4,w:2.85,h:0.9,fontSize:38,align:'center'});
    s.addText(String(i+1)+'. '+c[1],{x:x+0.15,y:4.4,w:2.55,h:0.5,fontSize:17,bold:true,color:NAVY,align:'center'});
    s.addText(c[2],{x:x+0.15,y:4.95,w:2.55,h:0.9,fontSize:13,color:GRAY,align:'center'});
  });
}

// ===== 8. Por qué confiar =====
{
  const s=S(); kicker(s,'Confianza'); big(s,'Por qué Manita es diferente');
  const cards=[['🛡️','Pago protegido','El profesional cobra cuando confirmas que todo salió bien.'],
    ['✔️','Verificados','Identidad revisada por Manita, no auto-asignada.'],
    ['⭐','Reseñas reales','Solo quien contrató puede calificar.'],
    ['⚖️','Legal y claro','Términos, privacidad (ARCO) y reembolsos transparentes.']];
  cards.forEach((c,i)=>{ const col=i%2,row=Math.floor(i/2); const x=0.7+col*6.05,y=3.0+row*1.7;
    s.addShape(p.ShapeType.roundRect,{x,y,w:5.8,h:1.5,rectRadius:0.12,fill:{color:BG}});
    s.addText(c[0],{x:x+0.15,y:y+0.15,w:1,h:1.2,fontSize:34,align:'center'});
    s.addText(c[1],{x:x+1.2,y:y+0.2,w:4.4,h:0.5,fontSize:17,bold:true,color:NAVY});
    s.addText(c[2],{x:x+1.2,y:y+0.7,w:4.4,h:0.7,fontSize:13,color:GRAY});
  });
}

// ===== 9. Mercado =====
{
  const s=S(NAVY); kicker(s,'Mercado','FFB4A2');
  s.addText('Un mercado enorme y sin líder claro en CDMX',{x:0.7,y:1.05,w:11.9,h:1,fontSize:32,bold:true,color:WHITE});
  s.addText([
    {text:'Millones de hogares en CDMX contratan servicios cada año.',options:{bullet:true,color:'FFFFFF'}},
    {text:'La mayoría se resuelve por recomendación informal, sin plataforma.',options:{bullet:true,color:'FFFFFF'}},
    {text:'Referentes internacionales (Webel, TaskRabbit) validan el modelo.',options:{bullet:true,color:'FFFFFF'}},
    {text:'Manita nace local, en español mexicano y con identidad propia.',options:{bullet:true,color:'FFFFFF'}},
  ],{x:0.9,y:2.6,w:11.5,h:2.6,fontSize:18,lineSpacingMultiple:1.4});
  s.addText('📌 Cifras exactas de mercado y demanda: en proceso de validación con investigación de campo.',{x:0.7,y:6.1,w:11.9,h:0.6,fontSize:12,italic:true,color:'D8DEF0'});
}

// ===== 10. Modelo de negocio =====
{
  const s=S(); kicker(s,'Modelo de negocio'); big(s,'Comisión por servicio\ncompletado');
  s.addText([
    {text:'Manita cobra una comisión sobre cada servicio que se concreta.',options:{bullet:true}},
    {text:'El profesional recibe su pago; Manita se queda su parte automáticamente (split).',options:{bullet:true}},
    {text:'Publicar y usar la app es gratis: solo se cobra cuando hay negocio.',options:{bullet:true}},
    {text:'A futuro: destacados, verificación premium y planes para profesionales.',options:{bullet:true}},
  ],{x:0.7,y:3.1,w:11.9,h:2.6,fontSize:18,color:DARK,lineSpacingMultiple:1.4});
  s.addText('El porcentaje exacto de comisión está por definir.',{x:0.7,y:6.0,w:11.9,h:0.5,fontSize:13,italic:true,color:GRAY});
}

// ===== 11. Estado / tracción =====
{
  const s=S(); kicker(s,'Dónde estamos', OK); big(s,'Producto listo para probarse');
  const stats=[['MVP','funcional de punta a punta'],['Web + App','instalable Android/iPhone'],['0','fallos en pruebas de 20 usuarios'],['100%','base legal preparada']];
  stats.forEach((c,i)=>{ const x=0.7+i*3.05;
    s.addShape(p.ShapeType.roundRect,{x,y:3.2,w:2.85,h:2.2,rectRadius:0.15,fill:{color:MINT}});
    s.addText(c[0],{x,y:3.5,w:2.85,h:0.9,fontSize:34,bold:true,color:CORAL_T,align:'center'});
    s.addText(c[1],{x:x+0.15,y:4.5,w:2.55,h:0.8,fontSize:13,color:DARK,align:'center'});
  });
  s.addText('Registro, búsqueda, reserva, gestión y reseñas: todo funcionando y verificado.',{x:0.7,y:5.7,w:11.9,h:0.5,fontSize:14,bold:true,color:OK});
}

// ===== 12. Roadmap =====
{
  const s=S(); kicker(s,'Plan'); big(s,'Próximos pasos');
  const fases=[['Ahora','Reclutar profesionales reales por colonia y primeras reservas.'],
    ['1-3 meses','Activar pagos con split + revisión legal + verificación.'],
    ['3-6 meses','Crecer en colonias, notificaciones, y medir retención.'],
    ['+6 meses','Evaluar tiendas de apps y nuevas categorías.']];
  fases.forEach((c,i)=>{ const y=2.9+i*1.0;
    s.addShape(p.ShapeType.roundRect,{x:0.7,y,w:2.4,h:0.8,rectRadius:0.1,fill:{color:CORAL}});
    s.addText(c[0],{x:0.7,y,w:2.4,h:0.8,fontSize:15,bold:true,color:WHITE,align:'center',valign:'middle'});
    s.addText(c[1],{x:3.4,y,w:9.2,h:0.8,fontSize:15,color:DARK,valign:'middle'});
  });
}

// ===== 13. Cierre / llamado a la acción =====
{
  const s=S(NAVY_D);
  s.addText('🤝',{x:0,y:1.4,w:W,h:1.2,fontSize:64,align:'center',color:WHITE});
  s.addText('Sumemos manos',{x:0,y:2.8,w:W,h:1,fontSize:44,bold:true,align:'center',color:WHITE});
  s.addText('Buscamos profesionales para arrancar y aliados que crean en el proyecto.\n¿Te sumas?',{x:1.5,y:4.0,w:W-3,h:1,fontSize:20,align:'center',color:'D8DEF0'});
  s.addText('manita-cdmx.netlify.app',{x:0,y:5.5,w:W,h:0.5,fontSize:16,align:'center',color:CORAL});
}

const OUT = join(process.cwd(), 'Manita_Pitch.pptx');
await p.writeFile({ fileName: OUT });
console.log('OK PITCH · ' + n + ' slides → ' + OUT);

