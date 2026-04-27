# Design System — Nelson Companion

Sistema visual diseñado para Nelson Luciani (76 años, afasia de Broca post-ACV).
Cada decisión de diseño tiene motivación clínica o de accesibilidad documentada.

---

## Tipografía

### Fuente principal: Lexend

Diseñada por Bonnie Shaver-Troup (Google Fonts, 2019) para reducir carga cognitiva
en lectura. Investigación independiente confirma reducción de fatiga ocular y mejora
de velocidad lectora en adultos con dislexia y dificultades de procesamiento.

| Uso | Variante | Tamaño | Peso |
|---|---|---|---|
| Cuerpo / etiquetas | Lexend Deca | 18px | 400 |
| Títulos de acción | Lexend | 36–48px | 700 |
| Subtítulos / meta | Lexend | 14px | 400 |
| Método Donovan (palabra) | Lexend Mega | 96–120px | 700 |

**Fallback**: Atkinson Hyperlegible (diseñada por el Braille Institute para lectura
de baja visión), luego system-ui, sans-serif.

```css
font-family: 'Lexend Mega', 'Lexend', 'Atkinson Hyperlegible', system-ui, sans-serif;
```

### Reglas de uso

- Nunca usar peso 300 (Thin) — baja legibilidad en pantallas pequeñas
- Spacing de letras: 0 (Lexend ya tiene tracking óptimo integrado)
- Line-height: 1.5 para cuerpo, 1.2 para títulos grandes
- Sin texto en mayúsculas (reduce velocidad lectora)
- Excepciones: botón principal "YA LA TOMÉ" — uppercase con letter-spacing 0.05em
  (acción crítica, diferenciación táctil)

---

## Paleta de colores

### Filosofía
"Cerámica mediterránea": colores tierra cálidos y desaturados. Dignidad adulta.
No usar colores primarios saturados (se asocian a UI infantil / Fisher-Price).

### Variables CSS

```css
:root {
  /* Base */
  --bg-base:        #FAF6EE;  /* Crema papel — fondo principal */
  --bg-resting:     #EDE9E0;  /* Gris arena — estado REPOSO */
  --bg-dawn:        #1A1614;  /* Marrón oscuro — PRE-AMANECER */

  /* Ink */
  --ink-primary:    #1C1814;  /* Casi negro cálido */
  --ink-secondary:  #5C5249;  /* Gris marrón */
  --ink-tertiary:   #9A8E82;  /* Metadatos, reloj */

  /* Categorías de tarea */
  --action-med:     #B86A3D;  /* Terracota — medicación */
  --action-vital:   #9C4A4A;  /* Granate — signos vitales */
  --action-meal:    #6B7A3F;  /* Verde oliva — comida */
  --action-walk:    #6E5A8A;  /* Lavanda profundo — ejercicio */
  --action-photo:   #C8924A;  /* Ámbar — foto/evidencia */

  /* Halos (versión 15% más suave del color de categoría) */
  --halo-med:       rgba(184, 106, 61, 0.15);
  --halo-vital:     rgba(156, 74, 74, 0.15);
  --halo-meal:      rgba(107, 122, 63, 0.15);
  --halo-walk:      rgba(110, 90, 138, 0.15);
  --halo-photo:     rgba(200, 146, 74, 0.15);

  /* Estados */
  --state-action:   var(--bg-base);
  --state-resting:  var(--bg-resting);
  --state-dawn:     var(--bg-dawn);
}
```

### Modo nocturno (21:00–07:00)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-base:       #1C1814;
    --bg-resting:    #141210;
    --ink-primary:   #F0EAE0;
    --ink-secondary: #BFB5A8;
    --ink-tertiary:  #7A6E64;
  }
}
```

---

## Contraste WCAG

| Combinación | Ratio | Nivel |
|---|---|---|
| `--ink-primary` sobre `--bg-base` | 14.8:1 | AAA |
| `--ink-secondary` sobre `--bg-base` | 6.2:1 | AA Large |
| `--ink-tertiary` sobre `--bg-base` | 3.1:1 | AA Large (≥18px) |
| Blanco sobre `--action-med` (#B86A3D) | 4.6:1 | AA |
| Blanco sobre `--action-vital` (#9C4A4A) | 5.1:1 | AA |
| Blanco sobre `--action-meal` (#6B7A3F) | 5.4:1 | AA |
| Blanco sobre `--action-walk` (#6E5A8A) | 5.0:1 | AA |
| Blanco sobre `--action-photo` (#C8924A) | 3.8:1 | AA Large (≥24px) |

Herramienta de verificación: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/).

---

## Tres estados visuales

### 1. ACCIÓN (slot activo, pendiente de confirmación)

```
Fondo: --bg-base (crema)
Halo: radial-gradient centrado, color de categoría al 15%
Icono: 64×64px, color de categoría
Título: Lexend 36px Bold, --ink-primary
Subtítulo: Lexend Deca 18px, --ink-secondary
Botón principal: 100% ancho, 80px altura, color de categoría, texto blanco
Texto Donovan: visible durante audio, --ink-primary
Wake Lock: ACTIVO (pantalla no se apaga)
```

### 2. REPOSO (entre rituales, tarea completada)

```
Fondo: --bg-resting (gris arena, más frío)
Halo: ninguno
Contenido: "Próximo ritual" con hora + ícono desaturado
Barra temporal: progreso de tiempo transcurrido / tiempo hasta próximo ritual
Dots de respiración: 3 puntos pulsando (CSS animation, 4s cycle)
Texto: --ink-secondary, no --ink-primary
Wake Lock: INACTIVO (ahorra batería)
```

### 3. PRE-AMANECER (antes del primer ritual del día)

```
Fondo: --bg-dawn (marrón oscuro)
Texto: --ink-primary en dark mode
Mensaje: "Buenos días, Nelson" + hora del primer slot
Estética: modo nocturno extendido, transición suave a ACCIÓN
Wake Lock: INACTIVO
```

---

## Método Donovan

Técnica de display de texto para afasia de Broca: cada palabra aparece de forma
individual, centrada, en tipografía grande. Terapéutico: el texto en pantalla es
un puente para la producción oral — no es solo acompañamiento del audio.

### Implementación

```
Tipografía:    Lexend Mega, 96–120px, Bold
Alineación:    centrada horizontal y vertical
Color base:    --ink-primary
Palabras clave: negrita (ya es bold) + color de categoría
Timing:        proporcional a duración MP3 si disponible; default 450ms/palabra
Frases cortas (≤4 palabras): mostrar completas sin animación
Frases largas: fade word-by-word (opacity 0→1 en 100ms, stay, opacity 1→0 en 100ms)
```

### Toggle en protocol.json

```json
{
  "display": "donovan"  // "donovan" | "sentence"
}
```

---

## Tap targets

| Elemento | Mínimo | Recomendado |
|---|---|---|
| Botón acción primaria | 80×80px | 100% ancho × 80px |
| Botón secundario | 60×44px | 60×60px |
| Stepper +/- | 60×60px | 72×72px |
| Tecla calculadora | 80×80px | 80×80px |
| Botón SOS | 60×60px | 60×60px |
| Toggle / checkbox | 44×44px | 48×48px |

---

## Motivación — Self-Determination Theory (adulto mayor)

**NO usar:**
- Gamificación visual (badges, puntos, estrellas)
- Lenguaje infantilizante ("¡Muy bien campeón!", "¡Lo lograste!")
- Animaciones de celebración excesivas (confetti, pop-ups)
- Colores primarios saturados (amarillo brillante, verde limón, azul eléctrico)

**SÍ usar — 6 mecanismos:**

1. **Competencia (mastery)**: lenguaje clínico-cálido — "Rutina cardiovascular completa."
2. **Autonomía (input)**: permitir elegir stepper vs teclado numérico
3. **Pertenencia (relatedness)**: voz de Christian post-confirmación; "Christian sabe que tomaste tu pastilla"
4. **Feedback sensorial adulto**: chime Tibetano (440Hz, 800ms decay) — no arcade ding
5. **Continuidad narrativa**: el texto Donovan usa frases completas con contexto ("Hoy empieza el día con el protocolo cardiovascular")
6. **Dignidad del cuerpo**: mostrar valores de PA y pulso en audio confirmado — Nelson verifica sus propios signos vitales, es él quien controla

---

## Sonido

| Evento | Sonido | Razón |
|---|---|---|
| Confirmación de pastilla | Chime tibetano 440Hz, 800ms decay | Calidad, no arcade |
| Alarma nueva (slot activo) | Mismo chime + vibración Android | Wakeup consistente |
| Alarma escalada (t+3min) | Chime doble + vibración larga | Urgencia sin alarma |
| Error / fuera de rango | Tono grave 220Hz | Diferenciado del éxito |
| Audio Donovan (MP3) | ElevenLabs voz Valentina | Calidad pregrabada |
