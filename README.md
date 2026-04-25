# Nelson Companion 🫀

**Aplicación de acompañamiento médico diario para Nelson Luciani, 76 años.**

App web progresiva (PWA) que funciona como asistente verbal y visual para el registro
de medicación, signos vitales y estructura del día. Diseñada específicamente para
pacientes con afasia de Broca y secuelas de ACV.

---

## 🌐 Acceder a la App

**URL de producción**: https://christianluciani.github.io/nelson-companion/

Al entrar verás un **selector de modo** con dos opciones:

- **🧑 Soy Nelson** → interfaz minimalista con una sola tarea visible, botones gigantes y voz automática.
- **👩‍⚕️ Soy cuidador** → vista completa con agenda, presión, alertas, fotos y exportación CSV.

Ambas escriben en el **mismo backend (Supabase)**. Lo que Nelson marca aparece en la vista del cuidador y viceversa. Marca "Recordar mi elección" para saltar el selector la próxima vez.

URLs directas (para bookmark):
- `https://christianluciani.github.io/nelson-companion/patient.html` — Nelson
- `https://christianluciani.github.io/nelson-companion/caregiver.html` — Cuidador

---

## 📲 Instalar en el iPhone de Nelson (PWA)

**Importante**: para que las alarmas de voz suenen aunque la app esté en background, hay que instalarla como PWA en el home screen. Esto se hace **una sola vez**.

### Paso a paso (iOS 16.4 o superior)

1. **Abre Safari** en el iPhone (no Chrome — Apple solo permite PWA install desde Safari).
2. Ve a `https://christianluciani.github.io/nelson-companion/`.
3. Toca **🧑 Soy Nelson** y marca "Recordar mi elección".
4. Toca el botón **Compartir** (cuadrado con flecha hacia arriba) en la barra inferior.
5. Desplázate hacia abajo y toca **"Añadir a pantalla de inicio"**.
6. Confirma el nombre **"Nelson"** y toca **Añadir** (arriba a la derecha).
7. El icono aparece en la pantalla de inicio. Cierra Safari.
8. **Abre la app desde el icono** (no desde Safari) — se ejecuta a pantalla completa.
9. Al cargar, toca **🔊 Activar voz**. El sistema preguntará por:
   - **Permiso de notificaciones** → toca **Permitir** (para alarmas con la app cerrada).
   - **Permiso de audio** → automático al tocar el botón.
10. Listo. La app saluda a Nelson y queda lista para las alarmas del día.

### Sobre las alarmas

Cuando llega la hora de un slot (pastilla, presión, comida) la app:

1. **Suena un chime corto** (880Hz → 660Hz) para llamar la atención.
2. **Vibra el teléfono** (Android — iOS no permite vibración desde web).
3. **Habla el recordatorio**: "Es la hora del nebivolol", "Es hora de medir la presión", etc.
4. **Muestra una notificación del sistema** (si el permiso está concedido) que persiste hasta que Nelson la toca.
5. **Repite cada 3 minutos** durante 30 minutos hasta que Nelson marca la tarea.

### Limitaciones que Christian debe conocer

- **iOS antes de 16.4** → no soporta notificaciones PWA. La voz solo suena si la app está abierta en pantalla.
- **App cerrada por completo** → en iOS, las alarmas programadas en JavaScript no se disparan. Solución: dejar la app instalada como PWA (no cerrarla manualmente desde el switcher) y permitir notificaciones — el sistema mantiene el service worker vivo el tiempo suficiente para los pings de notificación push del backend.
- **Para garantía absoluta** (Nelson olvida abrir la app, viaje con conexión inestable): la app aún no envía push notifications desde el servidor. Ver [issue de Background Push](https://github.com/ChristianLuciani/nelson-companion/issues) en el repo.
- **Backup recomendado**: configurar también alarmas nativas en el iPhone (Reloj → Alarma) para los horarios fijos del protocolo, como red de seguridad.

### Verificar que las alarmas funcionan

Después de instalar:
1. Abre la app desde el icono de home screen.
2. Toca **🔊 Activar voz**.
3. En el slot card del día, toca el botón **🔊** (a la derecha de la hora) → debe sonar la voz.
4. Bloquea el iPhone y espera al siguiente slot programado → debe llegar la notificación.

---

## ✨ Características

- **Horario sincronizado**: Medicamentos y mediciones a la hora correcta del dispositivo
- **Voz guiada**: Avisa automáticamente cuando es hora de tomar medicamento
- **Registro de vitales**: Sistólica, Diastólica, Pulso y **SpO₂** (oxígeno)
- **Alertas médicas**: Umbrales críticos validados por cardiólogo (PA, pulso, síntomas)
- **Offline-first**: Funciona sin internet; sincroniza cuando está disponible
- **Fotos de pastillas**: Captura visual de cada medicamento
- **Exportación CSV**: Descarga el registro para compartir con médicos
- **Botones grandes**: Optimizado para afasia de Broca (tap targets ≥44px)
- **PWA**: Funciona como app nativa en móvil (agregar a pantalla principal)

---

## 📱 Instalación Local (Desarrollo)

### Requisitos
- Node.js 16+
- Git

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/ChristianLuciani/nelson-companion.git
cd nelson-companion

# 2. Instalar dependencias
npm install

# 3. Levantar servidor local
npx serve src/

# Luego abrir en el navegador:
# http://localhost:3000
```

**Sin build**: Como alternativa, abrir `src/index.html` directamente en el navegador.

---

## 🚀 Desplegar a Producción

Los cambios en rama `main` se despliegan automáticamente a GitHub Pages via GitHub Actions.

```bash
git push origin main
```

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
│   ├── index.html          ← Selector de modo (paciente / cuidador)
│   ├── patient.html        ← Interfaz de Nelson (minimalista, alarmas de voz)
│   ├── caregiver.html      ← Interfaz del cuidador (vista completa)
│   ├── protocol.json       ← Datos del protocolo (editable)
│   ├── js/
│   │   ├── tts.js          ← Síntesis de voz multicapa
│   │   ├── supabase.js     ← Cliente Supabase singleton
│   │   ├── db.js           ← Persistencia offline-first (compartida)
│   │   ├── protocol.js     ← Estado y acceso a datos (compartido)
│   │   ├── app.js          ← Controlador del cuidador
│   │   └── patient.js      ← Controlador del paciente (alarmas + UI grande)
│   ├── css/
│   │   ├── styles.css      ← Estilos del cuidador
│   │   └── patient.css     ← Estilos del paciente (botones gigantes)
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

## 📖 Cómo Usar la App

### Para Nelson (Paciente)

1. **Abrir la app**
   - Tocar el ícono/link en el móvil
   - App carga automáticamente con horario de hoy

2. **Tomar medicamento a la hora programada**
   - Escuchar el aviso de voz automático
   - Ver ícono 💊 con el medicamento
   - **Tocar el nombre de la pastilla** para confirmar
   - Escuchar confirmación: "Muy bien Nelson. Pastilla registrada."

3. **Medir presión y oxígeno**
   - A las 08:30 y cada slot de medición
   - Tocar ❤️ **"Medir presión"**
   - Ingresar 4 valores:
     - **Sistólica** (número alto, ej: 140)
     - **Diastólica** (número bajo, ej: 90)
     - **Pulso** (latidos/min, ej: 72)
     - **SpO₂** (oxígeno %, ej: 98)
   - **Tocar fuera del formulario** para guardar

4. **Ver próxima toma**
   - Sección "Próximo:" muestra el próximo medicamento/medición
   - Hora en rojo grande para fácil lectura

5. **En caso de emergencia**
   - Ver sección **"Reglas de parada"** (rojo)
   - Si cumples alguna condición → **Llamar al 911**

### Para el Cuidador (Christian)

1. **Monitorear medicación**
   - Pestaña **Agenda**: ver checklist completo del día
   - Medicamentos con ✓ = tomados
   - Medicamentos vacíos = pendientes

2. **Registrar signos vitales**
   - Pestaña **Presión**: vista detallada de todas las mediciones
   - Completar campos: Sistólica, Diastólica, Pulso, SpO₂
   - Nota (opcional): comentarios o síntomas observados

3. **Ver alertas médicas**
   - Pestaña **Alertas**: condiciones de emergencia (rojo = crítico)
   - Si alguna se cumple → actuar inmediatamente

4. **Exportar registro**
   - Botón 📄 **Exportar**: descarga CSV con todo el día
   - Compartir con médicos en Cuenca

5. **Fotos de pastillas**
   - Pestaña **Pastillas**
   - Tocar 📷 para fotografiar cada pastilla
   - Útil para recordar medicamentos en el viaje

---

## 🎥 Agregar Foto de una Pastilla

1. Abrir la app en el móvil
2. Ir a la pestaña **Pastillas**
3. Tocar el ícono 📷 junto al medicamento
4. Tomar la foto con la cámara del dispositivo
5. La foto aparece automáticamente en el botón de medicación

---

## 🔊 Configurar Voz Personalizada

### Opción 1: Audio Pregrabado (Recomendado)

Grabar mensajes de voz clara en español:

1. Grabar con la voz de Christian o Nelson (recomendado)
2. Guardar como MP3 con nombre = ID del slot (ej: `20260424_0800.mp3`)
3. Colocar en `src/assets/audio/`
4. La app detecta y prioriza esta voz sobre síntesis

Ejemplo de slots:
```
src/assets/audio/
├── 20260424_0800.mp3    ← "Buenos días Nelson. Toma amlodipino"
├── 20260424_0830.mp3    ← "Mide tu presión"
└── 20260424_1200.mp3    ← "Es hora del nebivolol"
```

### Opción 2: ElevenLabs API (Voz Premium)

Para voz de síntesis de alta calidad en español:

En `src/index.html`, descomentar y completar:
```html
<script>
window.TTS_CONFIG = {
  apiProvider: 'elevenlabs',
  apiKey: 'tu_api_key_de_elevenlabs',
  voiceId: 'id_de_voz_espanola'
};
</script>
```

### Opción 3: Síntesis del Navegador (Default)

Si no hay audio pregrabado ni ElevenLabs configurado, usa Web Speech API del navegador (gratis pero robótica).

---

## 🧪 Testear la App

```bash
# Tests unitarios (Jest)
npm test

# Tests E2E (Playwright) — requiere app en localhost:3000
npx serve src/ &
npm run test:e2e
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
