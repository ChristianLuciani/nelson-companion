# STATUS_HUMAN.md — Tareas que requieren acción humana

Este documento lista lo que **Christian (el humano)** debe hacer para que la app esté
100% operativa. Está separado del README porque son acciones one-off de configuración
(claves, instalación física, validación), no parte del uso diario.

**Última actualización**: rama `user-type` después del segundo commit de alarmas.

---

## 🟢 ¿La app es funcional?

**Resumen corto**: Sí, en modo offline. No, en modo cross-device sync.

| Capa | Estado | Notas |
|---|---|---|
| Selector de modo (`/`) | ✅ Funcional | Recuerda elección en localStorage |
| Interfaz cuidador (`/caregiver.html`) | ✅ Funcional con caveats CSS | Las clases están en `app.js` pero `src/css/styles.css` está **vacío** — el cuidador renderiza con HTML sin estilizar. Pre-existente, no introducido por esta rama |
| Interfaz paciente (`/patient.html`) | ✅ Funcional | CSS completo en `src/css/patient.css` |
| Persistencia local | ✅ Funcional | localStorage opera siempre |
| Sync a Supabase | ⚠️ Falla silencioso | Requiere `env.js` con keys (ver tarea 1) |
| Voz (Web Speech API browser) | ✅ Funcional | Robótica pero entendible en español |
| Voz premium (ElevenLabs/OpenAI) | ⚠️ No configurada | Opcional, ver tarea 4 |
| Alarmas con chime + vibración + voz | ✅ Funcional **con app abierta** | iOS no permite vibración desde web |
| Notificación OS (lockscreen) | ⚠️ Requiere PWA instalada | Tarea 3 |
| Push background (app cerrada) | ❌ No implementado | Bloqueado por [issue #2](https://github.com/ChristianLuciani/nelson-companion/issues/2) |

**Conclusión operativa**: Si Christian **no hace ninguna tarea de abajo**, la app
funciona en localhost y en GitHub Pages para una sola persona, una sola sesión, un
solo dispositivo, sin sincronización ni alarmas confiables fuera de la pantalla.

Para que Nelson la use de verdad en el viaje del 1 de mayo, **las tareas 1, 2, 3
son obligatorias**. La 4 y 5 son mejoras opcionales.

---

## ✅ Tareas pendientes — orden de prioridad

### 1. Configurar Supabase 🔴 OBLIGATORIA

**Por qué**: Sin esto, lo que Nelson registre en su iPhone NO aparece en el
dispositivo del cuidador. La app funciona pero como dos copias aisladas.

**Pasos**:

1. Ir a https://supabase.com → crear proyecto nuevo (free tier alcanza).
   - Region recomendada: `South America (São Paulo)` para baja latencia desde Cuenca.
   - Anota el password del DB en un gestor seguro.

2. En el dashboard del proyecto: **SQL Editor → New query** → pegar el contenido
   de [supabase/schema.sql](supabase/schema.sql) → **Run**. Debe completarse sin
   errores y crear 3 tablas + 2 vistas.

3. **Storage → New bucket**:
   - Name: `pill-photos`
   - Public bucket: ✅ **sí**
   - Allowed MIME types: `image/jpeg, image/png, image/webp`

4. **Settings → API** → copiar:
   - `Project URL` → ej: `https://xxxxx.supabase.co`
   - `anon public` key (la larga que empieza con `eyJ...`)

5. **Configurar local** (para desarrollo):
   ```bash
   cp src/env.example.js src/env.js
   # Editar src/env.js con la URL y la anon key reales
   ```
   `src/env.js` está en `.gitignore` — nunca se commitea.

6. **Configurar producción** (GitHub Pages): hay dos opciones:

   **Opción A (rápido, menos seguro)**: editar `src/env.example.js` directamente
   en el branch `main` con la URL y anon key. La anon key de Supabase está
   diseñada para ser pública (RLS la protege), así que es aceptable. Renombrar
   `env.example.js` → `env.js` y quitar `env.js` del `.gitignore`.

   **Opción B (recomendado)**: GitHub Actions secret + script de inyección en
   build. Modificar [deploy.yml](deploy.yml) para que un step genere `src/env.js`
   con `${{ secrets.SUPABASE_URL }}` y `${{ secrets.SUPABASE_ANON_KEY }}` antes
   del upload. Es más limpio pero requiere editar el workflow.

7. **Verificar**: abrir DevTools en local → Console → debe aparecer:
   ```
   [Supabase] Conectado a https://xxxxx.supabase.co
   ```
   Y al marcar una pastilla, debe aparecer una fila nueva en
   `medication_logs` desde el SQL Editor.

---

### 2. Crear iconos PWA 🔴 OBLIGATORIA para instalación

**Por qué**: [src/manifest.json](src/manifest.json) referencia `assets/icon-192.png`
y `assets/icon-512.png` que **no existen**. iOS/Android usarán un icono genérico
(captura de pantalla o letra) si faltan, lo cual queda feo y poco profesional.

**Pasos**:

1. Conseguir o diseñar un icono cuadrado, fondo sólido (no transparente), simple.
   Sugerencia: corazón estilizado 🫀 sobre fondo `#1B4F72`, o las iniciales "NL".
   Herramientas:
   - https://realfavicongenerator.net/ (genera todas las tallas desde un PNG)
   - https://www.figma.com (diseñar a mano)
   - Cualquier app de imagen + plantilla 512x512

2. Guardar como:
   - `src/assets/icon-192.png` (192×192 px, PNG)
   - `src/assets/icon-512.png` (512×512 px, PNG)

3. Commit y push.

4. Verificar: en iPhone Safari → "Añadir a pantalla de inicio" → debe mostrar
   el icono diseñado, no la letra "N" genérica.

---

### 3. Instalar y probar en el Android de Nelson 🔴 OBLIGATORIA

**Por qué**: Ningún test automatizado prueba el comportamiento real en Android.
Los permisos de notificaciones, la persistencia del service worker, la vibración
y el chime de audio se comportan distinto entre emulador y dispositivo real.

**Pasos**:

1. Seguir la sección **"Instalar en el Android de Nelson (PWA)"** del [README.md](README.md).
2. Verificar primero en el Android de Christian (control), después en el de Nelson:
   - [ ] El selector inicial aparece y deja elegir "Soy Nelson".
   - [ ] La elección se recuerda al cerrar y reabrir.
   - [ ] El icono aparece correcto en pantalla principal (depende de la tarea 2).
   - [ ] Al abrir desde el icono, la app va a pantalla completa (sin barra de Chrome).
   - [ ] Tocar "🔊 Activar voz" → suena el chime y la voz saluda.
   - [ ] Android pide permiso de notificaciones → conceder.
   - [ ] El teléfono **vibra** al recibir el chime de prueba (en Android sí funciona, en iOS no).
   - [ ] Bloquear el Android, esperar al siguiente slot programado, verificar que llega notificación con sonido.
   - [ ] Tocar la notificación → abre la app en el slot activo.
   - [ ] Marcar la pastilla → la voz dice "Muy bien Nelson. Pastilla registrada."
   - [ ] En el Mac mini de Christian, abrir `/caregiver.html` en Chrome o Safari → la marca aparece (requiere tarea 1 hecha).

3. **Si algo falla**: documentar versión de Android, versión de Chrome, y abrir
   issue en el repo describiendo el comportamiento esperado vs observado.

**Nota sobre el escritorio del cuidador**: Christian usa **Mac mini**. La interfaz
del cuidador funciona idéntica en macOS Chrome/Safari/Firefox — no hay nada
específico de plataforma en `/caregiver.html`.

---

### 4. (Opcional) Configurar voz premium ElevenLabs/OpenAI 🟡

**Por qué**: La voz nativa del navegador es entendible pero robótica. Para Nelson
una voz humana cálida (idealmente la de un familiar) reduce la fricción cognitiva.

**Estado actual**: el código de `tts.js` ya soporta esta opción, solo falta la key.

**⚠️ Antes de hacer esto**, leer [issue #1 de proxy serverless](https://github.com/ChristianLuciani/nelson-companion/issues/1).
Si pones la API key de ElevenLabs en `env.js`, queda **expuesta a cualquiera que
abra DevTools en el iPhone de Nelson o consulte el Network tab**. Para producción
real, primero hay que implementar el proxy.

Para uso personal/testing, los pasos son:

1. Cuenta en https://elevenlabs.io/ → API key.
2. Elegir una voz en español (ej: "Antoni", "Bella", o clonar una voz familiar
   con sus 30s de muestra).
3. Copiar el `voice_id`.
4. Editar `src/env.js`:
   ```js
   window.TTS_CONFIG = {
     apiProvider: 'elevenlabs',
     apiKey: 'sk_...',
     voiceId: 'xxxxxxxx'
   };
   ```

---

### 5. Generar los 55 audios con Revoicer 🟡 (alta prioridad para el viaje)

**Por qué**: Es la opción de máxima calidad y máxima resiliencia (no depende de
APIs en runtime ni de internet). Voz humana clara — sin la rigidez de Web Speech.

**Estado actual**: Los 55 archivos `.mp3` ya están **creados como placeholders
vacíos** en `src/assets/audio/`. La app los detecta y, al fallar la reproducción
(por estar vacíos), cae al fallback de Web Speech automáticamente. Una vez los
reemplaces con audio real de Revoicer, se reproducen ellos.

**Pasos**:

1. Abrir [docs/audio_scripts.md](docs/audio_scripts.md) — contiene los 55 guiones
   con su nombre de archivo correspondiente (`{YYYYMMDD}_{HHMM}.mp3`).
2. En [Revoicer](https://revoicer.com/) elegir:
   - Idioma: **Spanish (Latin America)** o **Spanish (Spain)** — ambos funcionan.
   - Voz: una voz **masculina cálida y pausada** (sugerencia: probar con 2-3
     voces y elegir la que Nelson reconozca mejor en una prueba A/B).
   - Velocidad: ~0.95x (un pelín más lento que default — ayuda con afasia).
3. Pegar cada guion, generar, descargar como MP3.
4. Renombrar el archivo descargado al nombre exacto de la columna "Filename"
   de [docs/audio_scripts.md](docs/audio_scripts.md).
5. Reemplazar el placeholder vacío en `src/assets/audio/`.
6. Commit: `git add src/assets/audio/ && git commit -m "feat(audio): voces Revoicer para protocolo abr-may"`.

**Atajo si vas con prisa**: el día del vuelo (1 de mayo) tiene 8 slots. Si
tienes que priorizar, graba primero esos 8 (`20260501_*.mp3`).

**Limitación actual**: Solo `2026-04-24` está cargado en
[src/protocol.json](src/protocol.json). Los otros 54 audios quedarán grabados
pero **no se dispararán hasta que se expanda `protocol.json` con el resto del
calendario** (Apr 25 → May 3, ya extraído de [nelson_companion_mvp.html](nelson_companion_mvp.html)).
Esa migración del JSON es una tarea separada — graba los audios igual ahora,
quedan listos para cuando se expanda.

---

### 6. (Opcional) Agregar fotos de las pastillas 🟡

**Por qué**: Nelson reconoce mejor por color y forma que por nombre escrito.

**Pasos**:

1. Abrir la app como cuidador → pestaña **Pastillas** → tocar 📷 junto a cada med.
2. Tomar la foto desde la cámara del dispositivo.
3. Si la tarea 1 (Supabase) está hecha, las fotos se sincronizan al bucket
   `pill-photos` y aparecen también en el dispositivo de Nelson.
4. Si no, viven solo en el localStorage del dispositivo del cuidador.

---

### 7. (Opcional) Configurar GitHub Pages 🟡

Si la URL `https://christianluciani.github.io/nelson-companion/` ya carga, está hecho.

Si no:
1. Repo → **Settings → Pages → Source: GitHub Actions**.
2. Push a `main` → workflow [deploy.yml](deploy.yml) corre automáticamente.

---

### 8. Backup con alarmas nativas Android 🟡 — recomendado para el viaje

**Por qué**: Hasta que [issue #2 (push background)](https://github.com/ChristianLuciani/nelson-companion/issues/2)
esté resuelto, no hay garantía absoluta de que las alarmas suenen con la app
cerrada por completo.

**Pasos**:

1. En el Android de Nelson → app **Reloj** → pestaña **Alarma** → **+**.
2. Configurar una alarma para cada horario fijo del protocolo (08:00, 12:00, 19:00, etc.)
   con el sonido más fuerte y `Repetir: Diariamente` (o solo los días que aplica).
3. Etiqueta de la alarma: nombre de la pastilla (ej: "Amlodipino" para la de 8am).
4. La alarma del Reloj de Android suena 100% confiable, también en modo
   silencio si está configurada como alarma (no notificación). La PWA Nelson
   Companion es la guía visual + voz + registro; el Reloj Android es la red
   de seguridad mientras [issue #2](https://github.com/ChristianLuciani/nelson-companion/issues/2)
   no esté implementado.

---

## ✅ Cosas que YO (Claude) ya hice y NO requieren tu acción

- Implementación de las dos interfaces y el selector ([commit 73f7c11](#)).
- Implementación de chime + vibración + notificación OS + repetición de alarmas ([commit 8bd1448](#)).
- Documentación de instalación PWA en iPhone en [README.md](README.md).
- Apertura de [issue #1 (proxy TTS)](https://github.com/ChristianLuciani/nelson-companion/issues/1).
- Apertura de [issue #2 (push background)](https://github.com/ChristianLuciani/nelson-companion/issues/2).
- Verificación de que las rutas sirven 200 en localhost y que el JS parsea sin errores.

## ❌ Cosas que NO verifiqué (no podía sin tu intervención)

- Que la app abra correctamente en un iPhone físico.
- Que las notificaciones del sistema lleguen en background a iOS real.
- Que Supabase esté creado y la SQL del schema corra sin errores.
- Que los iconos PWA se generen con buen aspecto.
- Que las APIs de ElevenLabs/OpenAI funcionen con tus keys.
- El status del CI (no corrí `npm test` porque `node_modules` no estaba instalado
  en este entorno; recomiendo correr `npm install && npm test` localmente antes
  de mergear).

---

## 🗺️ Roadmap inmediato (orden sugerido)

1. **Hoy**: tareas 1 (Supabase) + 2 (iconos) + 3 (instalación de prueba en tu propio iPhone primero).
2. **Esta semana**: tarea 8 (alarmas backup) + tarea 6 (fotos de pastillas).
3. **Antes del 1 de mayo**: re-verificar tarea 3 en el iPhone de Nelson + tarea 5 (audio pregrabado para los 3 slots del día del vuelo).
4. **Después del 1 de mayo**: trabajar en [issue #1](https://github.com/ChristianLuciani/nelson-companion/issues/1) y [#2](https://github.com/ChristianLuciani/nelson-companion/issues/2) para robustez a largo plazo.
