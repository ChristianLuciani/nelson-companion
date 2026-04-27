# CLAUDE.md — Nelson Companion

Instrucciones para Claude Code. Leer completo antes de cualquier modificación.

---

## Contexto del paciente — crítico para entender cada decisión

Nelson Luciani, 76 años. Panamá → Cuenca Ecuador (viaje 1 mayo 2026).
- **Afasia de Broca post-ACV**: entiende bien, dificultad para producir habla y texto
- **ACV isquémico x2** por embolia paradójica via CIA congénita 1.2mm
- **Arritmia ventricular 27%** con TV sostenida documentada (Holter 16/04/2026)
- **BRIHH intermitente**, NT-proBNP elevado, HPB, hipertensión

La app es literalmente un dispositivo de soporte vital. Cada decisión de UX tiene
implicaciones clínicas. **Priorizar robustez y claridad sobre elegancia técnica.**

---

## Stack técnico

```
Frontend:  Vanilla JS (sin framework) + HTML + CSS
Backend:   Supabase (PostgreSQL + Auth + Realtime)
Hosting:   GitHub Pages (src/ desplegado via GitHub Actions)
Tests:     Jest (unit) + Playwright (E2E)
```

**Por qué sin framework:** La app debe funcionar desde un archivo HTML en el móvil
del cuidador. Cero build steps, cero dependencias en runtime, máxima resiliencia.
No introducir React/Vue/Svelte sin discusión explícita en un issue.

---

## Arquitectura de persistencia — Supabase

### Conexión
```js
// src/js/supabase.js — cliente singleton
const SUPABASE_URL = 'https://[PROJECT].supabase.co';
const SUPABASE_ANON_KEY = '[ANON_KEY]';
```

Nunca hardcodear las keys. Leerlas desde:
1. `window.SUPABASE_CONFIG` (inyectado en index.html para producción)
2. Variables de entorno para tests E2E

### Esquema de base de datos

```sql
-- Tabla principal de registros
CREATE TABLE medication_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  text NOT NULL DEFAULT 'nelson_luciani',
  slot_id     text NOT NULL,          -- ej: '20260424_0800'
  date        date NOT NULL,
  time        text NOT NULL,          -- ej: '08:00'
  med_id      text,                   -- null para vitales/recordatorios
  med_name    text,
  med_dose    text,
  checked     boolean DEFAULT false,
  checked_at  timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Tabla de signos vitales
CREATE TABLE vital_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  text NOT NULL DEFAULT 'nelson_luciani',
  slot_id     text NOT NULL,
  date        date NOT NULL,
  time        text NOT NULL,
  sys         integer,                -- Presión sistólica mmHg
  dia         integer,                -- Presión diastólica mmHg
  pul         integer,                -- Pulso bpm
  spo2        integer,                -- SpO2 % (opcional)
  note        text,
  recorded_by text DEFAULT 'cuidador', -- 'nelson' | 'cuidador'
  created_at  timestamptz DEFAULT now()
);

-- Tabla de fotos de pastillas
CREATE TABLE pill_photos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  text NOT NULL DEFAULT 'nelson_luciani',
  med_id      text NOT NULL UNIQUE,
  photo_url   text NOT NULL,          -- URL en Supabase Storage
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Índices para queries frecuentes
CREATE INDEX ON medication_logs (patient_id, date);
CREATE INDEX ON vital_logs (patient_id, date);
CREATE INDEX ON pill_photos (patient_id, med_id);
```

### RLS (Row Level Security)
```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pill_photos     ENABLE ROW LEVEL SECURITY;

-- Política: lectura y escritura libre con anon key (MVP — un solo paciente)
-- TODO: en v0.2, añadir auth por device_id o magic link
CREATE POLICY "anon_all" ON medication_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON vital_logs      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON pill_photos     FOR ALL TO anon USING (true) WITH CHECK (true);
```

### Storage bucket para fotos
```
Bucket: pill-photos
Política: public read, authenticated write
Path: {patient_id}/{med_id}.jpg
```

---

## Módulo de persistencia — src/js/db.js

Crear este archivo como abstracción sobre Supabase.
**Mantener la misma API pública que Protocol.js** para no romper app.js.

```js
// Interfaz pública requerida — misma que localStorage en protocol.js
DB.saveCheck(slotId, medIdx, checked)   // → Promise<void>
DB.getChecks(dateStr)                   // → Promise<{[key]: boolean}>
DB.saveVital(slotId, field, value)      // → Promise<void>
DB.getVitals(dateStr)                   // → Promise<{[slotId]: {sys,dia,pul}}>
DB.savePillPhoto(medId, file)           // → Promise<string>  (URL)
DB.getPillPhotos()                      // → Promise<{[medId]: string}>
DB.exportDay(dateStr)                   // → Promise<string>  (CSV)
DB.exportAll()                          // → Promise<string>  (CSV completo)
```

### Estrategia offline-first
1. Escribir en localStorage primero (inmediato, sin latencia)
2. Sync a Supabase en background (con retry en caso de fallo)
3. Al cargar, merge Supabase → localStorage (Supabase gana en conflictos)
4. Si Supabase no disponible, operar solo en localStorage sin errores visibles

```js
async function saveCheck(slotId, medIdx, checked) {
  // 1. localStorage inmediato
  _localSave('checks', `${slotId}_${medIdx}`, checked);
  // 2. Supabase en background — nunca bloquear la UI
  _syncToSupabase('medication_logs', { slot_id: slotId, ... }).catch(console.warn);
}
```

---

## Módulo TTS — src/js/tts.js

Ya implementado. No modificar sin leer specs/SPEC_voice.md.

Prioridad de fuentes (no cambiar el orden):
1. `assets/audio/{slotId}.mp3` — pregrabado
2. ElevenLabs API (si `window.TTS_CONFIG.apiProvider === 'elevenlabs'`)
3. OpenAI TTS API (si `window.TTS_CONFIG.apiProvider === 'openai'`)
4. Web Speech API del navegador — siempre último fallback

Para audio pregrabado futuro con Supabase Storage:
```js
// En lugar de assets/audio/{slotId}.mp3 local:
const audioUrl = await DB.getAudioUrl(slotId); // Supabase Storage URL
```

---

## Convenciones de código

### JavaScript
- ES6+, sin TypeScript por ahora (mantener simplicidad de build)
- Módulos como IIFE (`const Mod = (() => { ... })()`), no ES modules
  - Razón: funcionar sin bundler desde file:// en móvil
- Async/await para Supabase, callbacks para Web Speech API
- No `console.log` en producción — usar `console.warn` para errores no fatales
- Comentarios en español para lógica de dominio, inglés para lógica técnica

### CSS
- Mobile-first. Breakpoint único: `@media (min-width: 480px)` para tablet/desktop
- CSS variables para colores de riesgo (ya definidas en styles.css)
- Tap targets mínimo 60px altura, 44px ancho — sin excepciones
- No introducir CSS frameworks (Tailwind, Bootstrap) sin discusión

### Naming
```
slotId:   '20260424_0800'     — YYYYMMDD_HHMM
medId:    'amlodipino'        — lowercase, sin espacios
date:     '2026-04-24'        — ISO 8601
time:     '08:00'             — HH:MM 24h
```

---

## Tests

### Unit (Jest)
```bash
npm test                    # Todos los tests unitarios
npm run test:watch          # Watch mode durante desarrollo
```

Tests unitarios en `tests/unit/`. Mockear siempre:
- `fetch` para protocol.json y Supabase
- `localStorage` con implementación en memoria
- `window.speechSynthesis` para TTS

### E2E (Playwright)
```bash
npm run test:e2e            # Requiere app en localhost:3000
npx serve src/ &            # Levantar servidor primero
```

Tests E2E en `tests/e2e/`. Testear siempre:
- Flujo de marcar medicamento
- Registro de vitales
- Navegación entre días
- Funcionamiento sin red (modo offline)

### Convención de tests (TDD)
1. Escribir el test que falla
2. Implementar el código mínimo para que pase
3. Refactorizar
4. No hacer commit con tests fallando

---

## Flujo de desarrollo

```bash
# 1. Levantar app localmente
npx serve src/

# 2. Verificar tests antes de commit
npm test && npm run lint

# 3. Commit con mensaje descriptivo
git commit -m "feat: [módulo] descripción en español"
# Prefijos: feat | fix | test | docs | refactor | perf | chore

# 4. Push a main dispara GitHub Pages deploy automáticamente
git push origin main
```

---

## Variables de entorno y secrets

### Gestión de secrets — Infisical
Todos los secrets están centralizados en **Infisical** (project ID: `2a182da9-5baf-4b8a-81b0-f8bd009a6a97`).

```bash
# Setup inicial (una vez por máquina)
brew install infisical/get-cli/infisical
infisical login

# Correr scripts con secrets inyectados automáticamente
npm run generate:audio          # infisical run --env=dev -- node scripts/generate-audio.js
```

Secrets en Infisical:
- `SUPABASE_URL` — URL del proyecto Supabase
- `SUPABASE_PUBLISHABLE_KEY` — Clave pública (sb_publishable_*), reemplaza anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Solo para Edge Functions / GitHub Actions
- `ELEVENLABS_API_KEY` — Para regenerar audios
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — Push notifications

### Desarrollo local
Copiar `src/env.example.js` como `src/env.js` y completar con los valores de Infisical:
```js
window.SUPABASE_CONFIG = {
  url: 'https://[PROJECT].supabase.co',
  publishableKey: 'sb_publishable_[KEY]'  // Nueva clave, NO usar anonKey
};
```

### Producción (GitHub Pages)
`deploy.yml` inyecta secrets desde Infisical y genera `src/env.js` durante el build.
Solo se necesitan dos GitHub Secrets en el repo:
- `INFISICAL_CLIENT_ID`
- `INFISICAL_CLIENT_SECRET`

**Nunca commitear keys reales. Nunca.**

---

## Alertas médicas hardcodeadas — NO modificar sin validación clínica

En `src/js/app.js`, función `_renderAlarms()`, las siguientes condiciones son
umbrales médicos validados para Nelson Luciani específicamente:

- PA < 95/60 → Trendelenburg + suero oral
- Pulso < 48 bpm (diurno) → Suspender nebivolol ese día
- Pulso < 40 bpm → EMERGENCIAS
- PA > 170/105 → Captopril 12.5mg oral
- Síntoma neurológico nuevo → EMERGENCIAS (antecedente ACV x2)

Cualquier cambio en estos umbrales requiere validación médica documentada en un issue.

---

## Lo que NO hacer

- ❌ No introducir frameworks JS (React, Vue, etc.) sin issue aprobado
- ❌ No usar `console.log` en código que va a producción
- ❌ No hardcodear Supabase keys en ningún archivo commiteado
- ❌ No cambiar umbrales médicos de las alertas sin documentar
- ❌ No eliminar el fallback de localStorage — Supabase puede no estar disponible
- ❌ No hacer fetch síncronos que bloqueen la UI — siempre async/await
- ❌ No reducir tap targets por debajo de 44px — afasia de Broca requiere botones grandes
- ❌ No quitar la prioridad de audio pregrabado en tts.js
- ❌ No hacer deploy a producción con tests fallando

---

## Issues y features activos

Ver `docs/ROADMAP.md` para el plan completo de 6 fases.
Ver `docs/DESIGN_SYSTEM.md` para tipografía (Lexend), paleta y motivación.
Ver `docs/ARCHITECTURE.md` para estructura de módulos actualizada.
Ver `specs/SPEC_companion.md` para especificaciones funcionales y BDD.

### Estado actual (27 abril 2026)
- `supabase.js`, `db.js`, `push.js`, `sw.js` ya implementados ✅
- Audio pregrabado: 77 MP3 generados con ElevenLabs voz Valentina ✅
- Issue #17 (audio pregrabado no suena): en scope Fase 1–2
- Issue #18 (tarjeta automática por hora): Fase 1 en ejecución

### Próximas tareas — Fase 1 en ejecución
1. `fix: ordenar slots por time en Protocol.load` (bug en 2026-04-25)
2. `feat: Protocol.getRituals(dateStr)` — agrupación por hora
3. `feat: getCurrentRitual / getCurrentStep / getNextRitual en patient.js`
4. `refactor: eliminar _state.taskIdx y _state.showDone`
5. `refactor: render() con tres ramas (pre-amanecer / acción / reposo)`
6. `test: rituals.test.js + patient-clock.test.js + auto-advance.spec.js`

---

## Contexto adicional

Ver `history/conversacion/sesion_clinica_2026-04.md` para el historial clínico completo
de la sesión que generó este proyecto. Contiene el razonamiento detrás de cada decisión
del protocolo farmacológico.

El paciente viaja el 1 de mayo de 2026 de Panamá a Cuenca, Ecuador (2500m de altitud).
El protocolo activo finaliza el 3 de mayo. A partir del 4 de mayo, un nuevo cardiólogo
en Cuenca asumirá el manejo — toda la data registrada en Supabase será entregada al médico.
