# Arquitectura — Nelson Companion

## Stack técnico

Aplicación web estática. Sin framework, sin build step, sin dependencias de npm en producción.
Funciona offline después de la primera carga. Desplegable en GitHub Pages en < 1 minuto.

```
index.html          ← Entrada única
  └── css/styles.css
  └── js/tts.js       ← Módulo de voz (sin dependencias)
  └── js/protocol.js  ← Estado y datos (sin dependencias)
  └── js/app.js       ← UI y lógica (sin dependencias)
  └── protocol.json   ← Datos del protocolo (editable)
  └── assets/
      ├── pills/      ← Fotos de pastillas (cargadas por usuario)
      └── audio/      ← Audio pregrabado (slotId.mp3)
```

## Persistencia

| Datos | Dónde | Cómo |
|-------|-------|------|
| Medicación tomada | localStorage | JSON key-value |
| Signos vitales | localStorage | JSON nested |
| Fotos de pastillas | localStorage | Base64 DataURL |
| Notas del cuidador | localStorage | JSON key-value |
| Exportación | Descarga CSV | Blob URL |

## Módulos

### tts.js
Singleton IIFE. Gestiona la síntesis de voz con tres fuentes en cascada.
No tiene efectos secundarios en el DOM. Exportable como módulo CommonJS para tests.

### protocol.js
Singleton IIFE. Carga protocol.json via fetch. Gestiona el estado de la sesión.
Expone helpers de tiempo y acceso a datos. Exportable como módulo CommonJS para tests.

### app.js
Singleton IIFE. Orquesta la UI. Renderiza el DOM completo en cada cambio de estado.
Pattern: estado mínimo → render completo → eventos delegados. No usa frameworks.

## Flujo de datos

```
Tiempo real (setInterval 30s)
  → Protocol.getCurrentSlot()
  → TTS.speak() si nuevo slot
  → App.render()

Evento táctil
  → _handleClick() / _handleChange()
  → Protocol.toggle/save()
  → App.render()
```

## Decisiones de diseño

**¿Por qué sin framework?**
La app debe funcionar desde un archivo HTML en el móvil del cuidador, sin conexión, sin
node_modules, sin build. La simplicidad es una característica de seguridad.

**¿Por qué re-render completo?**
El estado es mínimo y el DOM es pequeño. Re-renderizar todo en cada evento es más
predecible y más fácil de debuggear que diff/patch. No hay percepción de lentitud.

**¿Por qué localStorage?**
No hay backend. Los datos son solo del cuidador y el paciente. localStorage es suficiente
para una semana de datos. La exportación CSV permite auditoría médica posterior.
