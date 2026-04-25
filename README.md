# Nelson Companion 🫀

**Aplicación de acompañamiento médico diario para Nelson Luciani, 76 años.**

App web progresiva (PWA) que funciona como asistente verbal y visual para el registro
de medicación, signos vitales y estructura del día. Diseñada específicamente para
pacientes con afasia de Broca y secuelas de ACV.

---

## Inicio rápido

```bash
# Sin build. Abrir directamente:
open src/index.html

# O servir localmente:
npx serve src/
```

Para producción, hacer push a `main` — GitHub Actions despliega en GitHub Pages.

---

## Estado actual del protocolo

| Día | Amlodipino | Nebivolol | Tamsulosina | Riesgo |
|-----|-----------|-----------|-------------|--------|
| Vie 24 Abr | 2.5mg | 1.25mg | ❌ | 🔴 |
| Sáb 25 Abr | ❌ | 2.5mg | ✅ noche | 🟡 |
| Dom 26 Abr | 2.5mg | 1.25mg | ❌ | 🔴 |
| Lun 27 Abr | ❌ | 2.5mg | ✅ noche | 🟡 |
| Mar 28 Abr | 2.5mg | 1.25mg | ❌ | 🔴 |
| Mié 29 Abr | ❌ | 2.5mg | ✅ noche | 🟡 |
| Jue 30 Abr | 2.5mg | 1.25mg | ❌ estratégico | 🔴 |
| **Vie 1 May — VUELO** | **❌** | **2.5mg** | **❌** | **🟢** |
| Sáb 2 May — Cuenca | 2.5mg | 1.25mg | ✅ noche | 🔴 altitud |
| Dom 3 May — Cuenca | ❌ | 2.5mg | ✅ noche | 🟡 |

---

## Estructura del repositorio

```
nelson-companion/
├── src/                    ← App web (desplegada en GitHub Pages)
│   ├── index.html          ← Entrada única
│   ├── protocol.json       ← Datos del protocolo (editable)
│   ├── js/
│   │   ├── tts.js          ← Síntesis de voz multicapa
│   │   ├── protocol.js     ← Estado y acceso a datos
│   │   └── app.js          ← UI y lógica principal
│   ├── css/styles.css      ← Estilos mobile-first
│   └── assets/
│       ├── pills/          ← Fotos de pastillas (agregar aquí)
│       └── audio/          ← Audio pregrabado (slotId.mp3)
├── specs/                  ← Especificaciones (SDD)
├── tests/
│   ├── unit/               ← Jest unit tests
│   └── e2e/                ← Playwright E2E tests
├── history/                ← Historial clínico de la sesión
│   ├── conversacion/       ← Resumen de la sesión completa
│   ├── documentos/         ← Índice de documentos generados
│   └── examenes/           ← Índice de estudios médicos
└── docs/                   ← Documentación técnica
    ├── ARCHITECTURE.md
    └── ROADMAP.md
```

---

## Cómo agregar foto de una pastilla

1. Abrir la app en el móvil
2. Ir a la pestaña **Pastillas**
3. Tocar el ícono 📷 junto al medicamento
4. Tomar la foto con la cámara del dispositivo
5. La foto aparece automáticamente en el botón de medicación

## Cómo agregar audio pregrabado

1. Grabar el mensaje en español con voz clara
2. Guardar como MP3, nombre = ID del slot (ej: `20260424_0800.mp3`)
3. Colocar en `src/assets/audio/`
4. La app lo detecta y prioriza sobre la síntesis del navegador

## Cómo conectar ElevenLabs

En `src/index.html`, descomentar y completar:
```html
<script>
window.TTS_CONFIG = {
  apiProvider: 'elevenlabs',
  apiKey: 'tu_api_key',
  voiceId: 'id_de_voz_espanola'
};
</script>
```

---

## Tests

```bash
npm install
npm test           # Unit tests (Jest)
npm run test:e2e   # E2E tests (Playwright) — requiere app en localhost:3000
```

---

## Contexto del paciente

Nelson Luciani, 76 años. Diagnósticos activos: ACV isquémico x2 (cardioembólico por CIA
congénita 1.2mm), BRIHH intermitente, arritmia ventricular 27% con TV sostenida documentada,
hipertensión arterial, HPB, hemorroides grado III, afasia de Broca.

Ver `history/conversacion/sesion_clinica_2026-04.md` para el cuadro clínico completo.

---

## Filosofía de diseño

> Nelson entiende. No necesita leer para actuar.
> La voz y el color guían. Un foco a la vez.
