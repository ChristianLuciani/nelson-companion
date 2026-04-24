# Nelson Companion 🫀

**Aplicación de acompañamiento médico diario para Nelson Luciani, 76 años.**

App web progresiva (PWA) que funciona como asistente verbal y visual para el registro de medicación, signos vitales y estructura del día. Diseñada para pacientes con afasia de Broca y secuelas de ACV.

---

## Estado actual

| Módulo | Estado | Versión |
|--------|--------|---------|
| Protocolo de medicación 24 Abr – 3 May 2026 | ✅ Activo | v0.1 |
| TTS — síntesis de voz del navegador | ✅ Funcional | v0.1 |
| Registro de signos vitales | ✅ Funcional | v0.1 |
| Foto de pastillas | 🔧 En desarrollo | v0.2 |
| Audio pregrabado | 🔧 En desarrollo | v0.2 |
| API de voz (ElevenLabs / OpenAI TTS) | 📋 Especificado | v0.3 |
| Notificaciones push | 📋 Especificado | v0.3 |
| Estructurador del día completo | 📋 Especificado | v1.0 |

---

## Inicio rápido

```bash
# No requiere build. Abrir directamente en navegador:
open src/index.html

# O servir localmente:
npx serve src/
```

Para producción, hacer push a `main` — GitHub Actions despliega en GitHub Pages automáticamente.

---

## Estructura del repositorio

```
nelson-companion/
├── history/           ← Historial clínico completo de la sesión de acompañamiento
│   ├── documentos/    ← Documentos generados (historial, régimen, cartas)
│   ├── conversacion/  ← Resumen de la sesión clínica
│   └── examenes/      ← Referencias a estudios médicos
├── src/               ← Código fuente de la app
│   ├── index.html     ← App principal (entrada única)
│   ├── protocol.json  ← Datos del protocolo (editable sin tocar código)
│   ├── assets/
│   │   ├── pills/     ← Fotos de pastillas (nombre_medicamento.jpg)
│   │   └── audio/     ← Audio pregrabado (slot_id.mp3)
│   ├── js/            ← Módulos JavaScript
│   └── css/           ← Estilos
├── specs/             ← Especificaciones (Spec-Driven Development)
├── tests/             ← Suite de pruebas (Test-Driven Development)
│   ├── unit/          ← Pruebas unitarias (Jest)
│   └── e2e/           ← Pruebas end-to-end (Playwright)
└── docs/              ← Documentación técnica y de producto
```

---

## Contexto del paciente

Nelson Luciani, 76 años. Diagnósticos activos: ACV isquémico x2 (cardioembólico por CIA), BRIHH, arritmia ventricular 27%, hipertensión arterial, HPB, afasia de Broca. Viaje PTY→GYE→Cuenca el 1 de mayo de 2026.

Ver `history/documentos/historial_medico_completo.md` para el cuadro clínico completo.

---

## Filosofía de diseño

- **Afasia de Broca**: Nelson entiende. No necesita leer para actuar. La voz y el color guían.
- **Un foco a la vez**: La app muestra qué hacer *ahora*, no todo el día.
- **Auditabilidad**: Cada acción queda registrada con timestamp para el cuidador y el médico.
- **Evolución incremental**: MVP funcional hoy. Arquitectura preparada para crecer.
