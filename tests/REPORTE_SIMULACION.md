# Reporte de simulación — 20 usuarios navegando Manita

Fecha: 2026-08-21
Usuarios simulados: 20 · Páginas visitadas: 240 · Con error JS: 0

Dispositivos: iPhone, Android, Desktop, móvil pequeño (360px). ~1/3 en "modo app".


## BLOQUEANTE (0)
Sin hallazgos.

## ALTO (0)
Sin hallazgos.

## MEDIO (0)
Sin hallazgos.

## BAJO (0)
Sin hallazgos.

---
Total de hallazgos únicos: 0

## Historial

### Corrida 1 (2026-08-21) — hallazgos y correcciones
La primera corrida con 20 usuarios / 240 páginas detectó 0 bloqueantes, 0 errores JS,
0 enlaces rotos. Solo 2 hallazgos MEDIO en `servicios.html`, ya corregidos:

1. **10 campos de filtro sin etiqueta/aria-label** → se añadió `aria-label` a los
   radios de categoría (js/servicios.js) y a los checkboxes "Disponible hoy" /
   "Solo verificados" (servicios.html).
2. **9 objetivos táctiles <44px en móvil** → se subió `min-height` de labels de filtro
   a 44px, checkboxes a 22px, y `.fchip` a `min-height:44px` con inline-flex.

Verificado tras el fix: simulación 0 hallazgos, a11y-audit 0 violaciones,
smoke 70/70, browser 37/37.

## Cómo re-ejecutar
```
cd tests
node user-sim.mjs   # genera/actualiza este reporte
```
