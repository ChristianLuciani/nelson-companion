# Roadmap — Nelson Companion

Diseño aprobado en sesión de planificación del 27 de abril de 2026.
Plan de 6 fases para transformar la app en una guía ritual completa antes del viaje del 1 de mayo.

---

## Completado

- ✅ Selector de modo (`/`) — recuerda elección en localStorage
- ✅ Vista del cuidador (`/caregiver.html`) con alertas médicas hardcodeadas
- ✅ Vista del paciente (`/patient.html`) con checklist y registro de vitales
- ✅ Protocolo 24 Abr – 3 May 2026 en `protocol.json`
- ✅ TTS multicapa: pregrabado → ElevenLabs API → OpenAI → Web Speech
- ✅ Audio pregrabado: 77 MP3 generados con ElevenLabs (voz Valentina)
- ✅ Módulo `supabase.js` — cliente singleton con fallback offline
- ✅ Módulo `db.js` — persistencia offline-first (localStorage + sync Supabase)
- ✅ Módulo `push.js` — registro Web Push + solicitud de permisos
- ✅ Service Worker (`sw.js`) — offline completo + push scheduling
- ✅ Notificaciones push (Web Push API + cron GitHub Actions)
- ✅ CI pipeline (Jest + Playwright) via GitHub Actions
- ✅ Secrets management via Infisical (env-slug: dev)
- ✅ Deploy automático a GitHub Pages
- ✅ Iconos PWA (RealFaviconGenerator, apple-touch-icon, web-app-manifest)
- ✅ Modo nocturno automático (21:00–07:00)
- ✅ Soporte SpO2 en registro de vitales
- ✅ Vibración háptica en confirmación

---

## Fase 1 — Modelo de rituales y tarjeta por reloj (issue #18) 🔴 En ejecución

El paciente ve **una sola tarjeta**, determinada por el reloj del dispositivo.
Sin botón "Siguiente". Sin navegación manual.

- [ ] `fix: Protocol.load()` — ordenar slots por `time` (bug en 2026-04-25)
- [ ] `feat: Protocol.getRituals(dateStr)` — agrupar slots por hora en `[{time, steps[]}]`
- [ ] `feat: getCurrentRitual(now)` / `getCurrentStep(ritual)` / `getNextRitual(now)`
- [ ] `refactor: patient.js` — eliminar `_state.taskIdx` y `_state.showDone`
- [ ] `refactor: render()` — tres ramas: pre-amanecer / acción / reposo
- [ ] Auto-refresh 30s: re-render solo si cambió el ritual; no interrumpir flujo BP
- [ ] `test: tests/unit/rituals.test.js`
- [ ] `test: tests/unit/patient-clock.test.js`
- [ ] `test: tests/e2e/auto-advance.spec.js` con `page.clock` (Playwright ≥1.45)

---

## Fase 2 — Tres estados visuales + fix audio (issue #17) 🟠

Diseño visual completo según `docs/DESIGN_SYSTEM.md`. Fix del bug de audio pregrabado.

- [ ] Importar Lexend (Deca, Regular, Mega) + Atkinson Hyperlegible desde Google Fonts
- [ ] Aplicar paleta CSS completa (variables en `src/css/theme.css`)
- [ ] Estado ACCIÓN: halo de categoría, fondo crema, botón 80px
- [ ] Estado REPOSO: fondo gris arena, barra temporal, dots de respiración
- [ ] Estado PRE-AMANECER: fondo marrón oscuro, modo nocturno extendido
- [ ] Wake Lock: activo solo en estado ACCIÓN
- [ ] Fix issue #17: depurar por qué `assets/audio/{slotId}.mp3` falla en GitHub Pages
- [ ] Verificar contraste WCAG AAA en todos los estados

---

## Fase 3 — Método Donovan + felicitación de ritual 🟡

Texto word-by-word terapéutico. Voz de Christian al completar un ritual.

- [ ] Módulo `donovan.js`: word-by-word display sincronizado con MP3
- [ ] Timing: proporcional a duración MP3 (si disponible); default 450ms/palabra
- [ ] Palabras clave en bold + color de categoría
- [ ] Toggle en `protocol.json`: `display: 'donovan' | 'sentence'`
- [ ] Audio de felicitación por ritual: `assets/audio/praise/{hash}.mp3`
- [ ] Script `scripts/generate-praise-audio.js` para generar frases en ElevenLabs
- [ ] Actualizar ritual de desayuno en `protocol.json` (3 steps: comida → med con kéfir → felicitación)
- [ ] Test: `tests/unit/donovan.test.js`

---

## Fase 4 — Alarma tipo Android (issue #2) 🟡

La app despierta la pantalla y reproduce audio automáticamente. Sin abrir manualmente.

- [ ] `sw.js`: programar `TimestampTrigger` por cada slot al cargar la app
- [ ] Notificación con `requireInteraction: true` + audio del slot + vibración escalada
- [ ] Escalación: t+0 chime suave, t+3min chime fuerte + vibración larga, t+10min push al cuidador
- [ ] Tap en notificación: abre `patient.html?slotId={id}` en estado ACCIÓN
- [ ] Auto-activar voz tras primer tap del día (flag en `sessionStorage`)
- [ ] Documentar limitación iOS (TimestampTrigger solo en Chrome Android)
- [ ] Test E2E en Android físico (manual)

---

## Fase 5 — Teclado numérico calculadora 🟡

Alternativa al stepper para signos vitales. Más rápido y familiar para adultos.

- [ ] Grid 4×3, teclas 80×80px: `1-9`, `0`, `←`, `✓`
- [ ] Audio de confirmación del número ingresado: "El número de arriba es ciento treinta"
- [ ] Generar audios de números 0–300: `scripts/generate-numbers-audio.js`
- [ ] Persistir preferencia stepper vs teclado en localStorage
- [ ] Validación de rango: sys 60–240, dia 30–180, pul 30–200, spo2 70–100
- [ ] Test: `tests/unit/keypad.test.js`

---

## Fase 6 — Evidencia por tarea (foto / audio) 🟡

Confirmación multimedia por tipo de tarea. Galería en vista del cuidador.

- [ ] `db.js`: `saveStepEvidence(slotId, kind, blob)` — genérico por tipo
- [ ] `med`: foto de pastilla en mano con `<input capture="environment">`
- [ ] `meal`: foto del plato (opcional, toggle en protocol.json)
- [ ] `vital`: foto del display del tensiómetro (opcional)
- [ ] Toggle en slot: `confirmRequires: 'tap' | 'photo'`
- [ ] Galería de evidencias en `caregiver.html`
- [ ] Supabase Storage: `{patient_id}/{slotId}/{kind}.jpg`
- [ ] Test E2E: flujo completo con foto en Android

---

## Post-protocolo (después del 3 de mayo de 2026)

- [ ] Entregar data CSV al cardiólogo en Cuenca (exportar desde caregiver.html)
- [ ] Implementar proxy serverless para proteger API key ElevenLabs (issue #1)
- [ ] Resolver push notifications background en iOS (Capacitor wrapper)
- [ ] Editor visual de protocolo (sin edición JSON manual)
- [ ] Auth por device_id o magic link para multi-usuario
