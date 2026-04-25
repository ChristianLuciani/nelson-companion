# SPEC — Módulo de Voz (TTS)

## Prioridad de fuentes de voz

1. **Audio pregrabado** (`assets/audio/{slotId}.mp3`)
   - Calidad máxima, sin latencia, funciona offline
   - Grabar con voz humana o API de alta calidad
   - Naming: `20260424_0800.mp3` (fecha + hora del slot)

2. **API externa** (ElevenLabs | OpenAI TTS)
   - Configurar via `window.TTS_CONFIG` antes de cargar app.js
   - ElevenLabs: modelo `eleven_multilingual_v2`, idioma español
   - OpenAI: modelo `tts-1`, voz `nova` (más natural para español)
   - Solo se activa si se provee apiKey

3. **Web Speech API del navegador**
   - Siempre disponible, sin configuración
   - Calidad variable según dispositivo
   - Funciona offline
   - Selección automática de voz española femenina si disponible

## Parámetros de voz recomendados para Nelson
- Rate: 0.85 (más lento que normal — afasia de Broca requiere habla clara)
- Pitch: 1.0 (natural)
- Volume: 1.0

## Guía de escritura de mensajes de voz
Para un paciente con afasia de Broca:
1. Frases cortas, máximo 2 por mensaje
2. Nombre al inicio: "Nelson, ..."
3. Una sola instrucción por vez
4. Confirmar acciones completadas: "Muy bien Nelson."
5. Evitar negaciones complejas: en lugar de "No olvides", usar "Recuerda"
6. Mencionar el nombre del medicamento y describir su aspecto físico

## Cómo agregar audio pregrabado
1. Grabar el audio en español con voz clara y cálida
2. Guardar como MP3, ~64kbps, nombre = ID del slot del protocol.json
3. Colocar en `src/assets/audio/`
4. El módulo TTS lo detectará automáticamente

## Cómo conectar ElevenLabs
```html
<!-- En index.html, antes del script app.js -->
<script>
window.TTS_CONFIG = {
  apiProvider: 'elevenlabs',
  apiKey: 'tu_api_key_aqui',
  voiceId: 'id_de_voz_espanola'
};
</script>
```
