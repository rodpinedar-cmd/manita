# PROMPT MAESTRO — Generar la presentación de Manita

Copia este prompt para pedirle a una IA (o a mí) que genere/actualice la presentación
ejecutiva de Manita. Está alineado con las reglas del proyecto (PROMPT_MAESTRO.md).

---

Eres un equipo senior (Product + Diseño + Growth + Negocio) creando la PRESENTACIÓN
EJECUTIVA de "Manita", un marketplace de servicios a domicilio para CDMX
(PWA/APK + web, stack HTML/CSS/JS vanilla + Supabase + Netlify).

OBJETIVO: una presentación navegable (HTML de una sola página, tipo slides) que sirva
para mostrar el proyecto a socios, inversionistas o al equipo. Debe incluir imágenes
reales de la web y la app.

REGLAS INNEGOCIABLES:
- Identidad Manita: coral #FF6B4A, índigo #2D3E75, crema #FBF7F4, Poppins. Español mexicano cálido.
- NADA de datos inventados (riesgo PROFECO): cifras de mercado = estimaciones marcadas como tales
  o "por validar". Métricas del producto reales o "aún sin datos".
- Usar las capturas reales de tests/capturas/ (generadas con node user-sim.mjs).
- Accesible, mobile-first, se ve bien en pantalla y al imprimir/exportar a PDF.
- Sin dependencias externas pesadas (CSS propio). Animaciones solo transform/opacity.

CONTENIDO OBLIGATORIO (secciones/slides):
1. Portada: nombre, tagline, "marketplace de servicios a domicilio en CDMX".
2. El problema y la oportunidad (por validar).
3. La solución: qué es Manita (web + app instalable).
4. Capturas de la WEB (landing, servicios, perfil).
5. Capturas de la APP (home modo app, onboarding, modal de descarga, actividad).
6. Cómo funciona (flujo cliente + flujo profesional).
7. Estado del producto: lo que YA funciona (verificado con tests).
8. Mejoras aplicadas (recorrido desde el inicio hasta hoy).
9. Seguridad y legal (intermediario, LFPDPPP/ARCO, split de pagos, PROFECO).
10. Modelo de pago (autoriza→captura al confirmar, comisión, split).
11. Estudio de mercado (estimaciones honestas + competidores: Webel, TaskRabbit).
12. Estrategia de social media y lanzamiento (canales, contenido, fases).
13. Costos (qué es gratis hoy, qué cuesta a futuro: pasarela %, Play $25, etc.).
14. Roadmap (hoy / semana / mes / 3 meses / 6 meses).
15. Lo que falta para lanzar (checklist claro).
16. Cierre / llamado a la acción.

FORMATO DE SALIDA: un archivo HTML (presentacion.html) autocontenido con navegación por
teclado (flechas) y scroll, imágenes desde tests/capturas/. Al terminar, reportar:
QUÉ CONTIENE · CÓMO VERLA · QUÉ FALTA COMPLETAR CON DATOS REALES.
