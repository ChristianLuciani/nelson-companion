# Nelson Companion

Aplicación de acompañamiento médico diario para Nelson Luciani, 76 años.

PWA (Progressive Web App) con voz guiada, registro de medicación y signos vitales, y alertas médicas. Diseñada para afasia de Broca post-ACV: botones grandes, una tarea a la vez, voz automática.

---

## Acceder a la app

**URL de producción:** https://christianluciani.github.io/nelson-companion/

Al entrar aparece un selector con dos modos:

| Modo | URL directa | Para quién |
|------|------------|-----------|
| Paciente | `/patient.html` | Nelson — interfaz minimalista, botones gigantes, voz automática |
| Cuidador | `/caregiver.html` | Christian — agenda completa, gráficos, alertas, exportación CSV |

Marcá **"Recordar mi elección"** para saltar el selector la próxima vez.

---

## Instalar en el celular de Nelson (Android)

Hacerlo una sola vez, con conexión a internet.

1. Abrir **Chrome** en el Android
2. Entrar a `https://christianluciani.github.io/nelson-companion/`
3. Tocar **Soy Nelson** → marcar **Recordar mi elección**
4. Tocar el menú **⋮** (tres puntos arriba a la derecha) → **"Instalar app"** o **"Añadir a pantalla principal"**
5. Confirmar. El ícono aparece en la pantalla principal
6. **Cerrar Chrome** y abrir la app desde el ícono — se ejecuta a pantalla completa
7. Tocar **Activar voz** → conceder los permisos que pida Android (notificaciones y audio)

Desde ese momento la app funciona sin internet (modo offline) y recibe notificaciones de push aunque esté cerrada.

### Instalar en la Mac del cuidador

Abrir `https://christianluciani.github.io/nelson-companion/caregiver.html` en Chrome o Safari.

- **Chrome:** menú ⋮ → Más herramientas → Crear acceso directo → marcar "Abrir como ventana"
- **Safari:** Archivo → Añadir al Dock (macOS Sonoma+)

---

## Cómo usa la app Nelson (paciente)

La app muestra **una sola tarea a la vez**. Para cada slot:

1. Suena el aviso de voz automático cuando llega la hora
2. Se lee la instrucción en pantalla (letra grande)
3. Se toca **LISTO** cuando se completa
4. Pasa automáticamente a la siguiente tarea

Para la **presión arterial**, la app guía paso a paso: sistólica → diastólica → pulso → SpO₂ (opcional con botón SALTAR). Los valores se ajustan con **+10 / −10**.

---

## Cómo usa la app Christian (cuidador)

El dashboard tiene seis pestañas:

| Pestaña | Contenido |
|---------|-----------|
| **Resumen** | KPIs del día, alertas activas, accesos rápidos |
| **Cumplimiento** | Tabla de los últimos 7 días |
| **Presión arterial** | Gráfico de tendencia + SpO₂ |
| **Notas** | Observaciones del día con categorías |
| **Reglas de parada** | Umbrales médicos de emergencia |
| **Agenda de mañana** | Vista del próximo día |

Botón **Exportar CSV** en el encabezado → descarga el registro completo para compartir con médicos.

---

## Alertas médicas — NO modificar sin validación clínica

Umbrales hardcodeados validados para Nelson:

| Condición | Acción |
|-----------|--------|
| PA < 95/60 | Trendelenburg + suero oral |
| Pulso < 48 bpm (diurno) | Suspender nebivolol ese día |
| Pulso < 40 bpm | EMERGENCIAS |
| PA > 170/105 | Captopril 12.5mg oral |
| Síntoma neurológico nuevo | EMERGENCIAS (antecedente ACV x2) |

---

## Deploy a producción

### Prerequisitos (primera vez)

**1. GitHub Secrets** (Settings → Security → Secrets and variables → Actions → New repository secret):
```
INFISICAL_CLIENT_ID      ← Machine Identity de Infisical
INFISICAL_CLIENT_SECRET  ← Machine Identity de Infisical
```

**2. Infisical** — project `2a182da9-5baf-4b8a-81b0-f8bd009a6a97`, entorno `production`:
```
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY   ← sb_publishable_* del dashboard de Supabase
SUPABASE_SERVICE_ROLE_KEY
ELEVENLABS_API_KEY
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

**3. GitHub Pages** (Settings → Pages):
- Source: **GitHub Actions** (no "Deploy from branch")

### Hacer deploy

```bash
git push origin main
```

El workflow `deploy.yml` corre automáticamente:
1. Lee los secrets desde Infisical
2. Genera `src/env.js` con las keys de Supabase, ElevenLabs y VAPID
3. Publica `src/` en GitHub Pages

El workflow `send-push.yml` corre en cron y envía push notifications en los horarios del protocolo (08:00, 12:00, 16:00, 20:00 hora Panamá) via Supabase Edge Function.

---

## Desarrollo local

### Requisitos

- Node.js 18+
- Infisical CLI: `brew install infisical/get-cli/infisical`

### Setup

```bash
git clone https://github.com/ChristianLuciani/nelson-companion.git
cd nelson-companion
npm install

# Autenticarse en Infisical
infisical login

# Generar src/env.js local con los secrets de Infisical
infisical run --env=dev -- node -e "
const fs = require('fs');
fs.writeFileSync('src/env.js', \`window.SUPABASE_CONFIG = {
  url: '\${process.env.SUPABASE_URL}',
  publishableKey: '\${process.env.SUPABASE_PUBLISHABLE_KEY}'
};
window.TTS_CONFIG = {
  apiProvider: 'elevenlabs',
  apiKey: '\${process.env.ELEVENLABS_API_KEY}',
  voiceId: 'VR6AewLTigWG4xSOukaG'
};
window.PUSH_CONFIG = {
  vapidPublicKey: '\${process.env.VAPID_PUBLIC_KEY}'
};\`);
console.log('src/env.js generado');
"

# Levantar servidor local
npx serve src/
# → http://localhost:3000
```

### Scripts

```bash
npm test                     # Unit tests — Jest (78 tests)
npm run test:e2e             # E2E tests — Playwright (requiere app en :3000)
npm run test:watch           # Tests en modo watch

npm run generate:audio       # Genera audios faltantes via ElevenLabs (usa Infisical)
npm run generate:audio:dry   # Muestra qué se generaría sin llamar a la API
npm run generate:audio:force # Regenera todos los audios

npx serve src/               # Servidor local de desarrollo
```

### Audios pregrabados

Los audios en `src/assets/audio/{slotId}.mp3` se generan con ElevenLabs (voz Valentina, multilingual v2). Para regenerar alguno:

```bash
npm run generate:audio       # Solo los que faltan
npm run generate:audio:force # Todos
```

Requiere `infisical login` previo. El script deduplica por texto — varios slots con el mismo mensaje comparten el audio.

---

## Arquitectura

```
nelson-companion/
├── .github/workflows/
│   ├── deploy.yml          ← Deploy a GitHub Pages con secrets de Infisical
│   └── send-push.yml       ← Cron de push notifications
├── src/                    ← App web estática (publicada en GitHub Pages)
│   ├── index.html          ← Selector de modo
│   ├── patient.html        ← Vista de Nelson
│   ├── caregiver.html      ← Vista del cuidador
│   ├── sw.js               ← Service worker (offline-first + push)
│   ├── protocol.json       ← Protocolo farmacológico completo
│   ├── env.example.js      ← Plantilla de configuración (commitear)
│   ├── env.js              ← Configuración local con keys reales (gitignored)
│   ├── js/
│   │   ├── protocol.js     ← Estado y acceso al protocolo
│   │   ├── tts.js          ← Síntesis de voz multicapa
│   │   ├── supabase.js     ← Cliente Supabase (publishableKey)
│   │   ├── db.js           ← Persistencia offline-first
│   │   ├── push.js         ← Web Push subscription
│   │   ├── app.js          ← Controlador del cuidador
│   │   └── patient.js      ← Controlador del paciente
│   ├── css/
│   │   ├── styles.css      ← Estilos del cuidador + print CSS
│   │   └── patient.css     ← Estilos del paciente (botones ≥60px)
│   └── assets/audio/       ← Audios pregrabados (slotId.mp3)
├── scripts/
│   └── generate-audio.js   ← Generador TTS ElevenLabs con deduplicación
├── supabase/
│   ├── migrations/         ← Esquema de base de datos
│   └── functions/send-push/← Edge Function para Web Push
├── tests/
│   ├── unit/               ← Jest (78 tests)
│   └── e2e/                ← Playwright
└── .infisical.json         ← Project ID de Infisical
```

### Stack

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Frontend | Vanilla JS + HTML + CSS | Sin build step — funciona desde `file://` en móvil |
| Persistencia | Supabase (PostgreSQL) + localStorage | Offline-first con sync en background |
| Voz | Audio pregrabado → ElevenLabs → Web Speech API | Prioridad: calidad > disponibilidad |
| Push | Web Push API + Supabase Edge Function | Notificaciones nativas sin app store |
| Hosting | GitHub Pages | Gratis, HTTPS, deploy automático |
| Secrets | Infisical | Centralizado, sin keys en código |

---

## Contexto del paciente

Nelson Luciani, 76 años. Panamá → Cuenca Ecuador (viaje 1 mayo 2026).

- Afasia de Broca post-ACV: entiende bien, dificultad para producir habla y texto
- ACV isquémico x2 por embolia paradójica via CIA congénita 1.2mm
- Arritmia ventricular 27% con TV sostenida documentada (Holter 16/04/2026)
- BRIHH intermitente, NT-proBNP elevado, HPB, hipertensión

Ver `history/conversacion/sesion_clinica_2026-04.md` para el cuadro clínico completo.
