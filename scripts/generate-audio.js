#!/usr/bin/env node
/**
 * Genera audios pregrabados para cada slot del protocolo usando ElevenLabs TTS.
 *
 * Uso:
 *   ELEVENLABS_API_KEY=sk_... node scripts/generate-audio.js
 *   ELEVENLABS_API_KEY=sk_... node scripts/generate-audio.js --dry-run
 *   ELEVENLABS_API_KEY=sk_... node scripts/generate-audio.js --force   # regenera todos
 *
 * La voz y el modelo se configuran abajo. Deduplica por texto para minimizar
 * llamadas a la API (varios días comparten el mismo speech).
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Configuración ─────────────────────────────────────────────────────────────

const VOICE_ID  = 'VR6AewLTigWG4xSOukaG'; // Valentina — built-in multilingual, free tier
const MODEL_ID  = 'eleven_multilingual_v2';
const VOICE_SETTINGS = { stability: 0.55, similarity_boost: 0.80, style: 0.20, use_speaker_boost: true };
const OUTPUT_FORMAT  = 'mp3_44100_128';

const PROTOCOL_PATH  = path.join(__dirname, '../src/protocol.json');
const AUDIO_DIR      = path.join(__dirname, '../src/assets/audio');

// ── CLI args ──────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');

// ── API key ───────────────────────────────────────────────────────────────────

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY && !DRY_RUN) {
  console.error('Error: ELEVENLABS_API_KEY no definida. Exportá la variable antes de correr el script.');
  process.exit(1);
}

// ── Leer protocolo ────────────────────────────────────────────────────────────

const protocol = JSON.parse(fs.readFileSync(PROTOCOL_PATH, 'utf8'));
// Considerar como "existente" solo si el archivo tiene contenido (>0 bytes)
const existing = new Set(
  fs.readdirSync(AUDIO_DIR)
    .filter(f => f.endsWith('.mp3') && fs.statSync(path.join(AUDIO_DIR, f)).size > 0)
    .map(f => f.replace('.mp3', ''))
);

// Recopilar todos los slots con speech
const allSlots = [];
for (const day of Object.values(protocol.days)) {
  for (const slot of day.slots) {
    if (slot.speech && slot.speech.trim()) {
      allSlots.push({ id: slot.id, speech: slot.speech.trim() });
    }
  }
}

// Deduplicar por texto → { speechText → [slotId, slotId, ...] }
const byText = new Map();
for (const { id, speech } of allSlots) {
  if (!byText.has(speech)) byText.set(speech, []);
  byText.get(speech).push(id);
}

// Filtrar: solo los grupos donde algún slotId no tiene audio (o --force)
const toGenerate = [];
for (const [speech, ids] of byText) {
  const missing = FORCE ? ids : ids.filter(id => !existing.has(id));
  if (missing.length > 0) {
    toGenerate.push({ speech, ids, missing });
  }
}

console.log(`Protocolo: ${allSlots.length} slots con voz, ${byText.size} textos únicos`);
console.log(`A generar:  ${toGenerate.length} textos únicos → ${toGenerate.reduce((s, g) => s + g.missing.length, 0)} archivos`);
if (DRY_RUN) {
  console.log('\n── DRY RUN ──');
  for (const { speech, missing } of toGenerate) {
    console.log(`  [${missing.join(', ')}]  "${speech.slice(0, 60)}"`);
  }
  process.exit(0);
}

// ── Llamada a ElevenLabs TTS ──────────────────────────────────────────────────

function elevenlabsTTS(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: VOICE_SETTINGS,
      output_format: OUTPUT_FORMAT,
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${VOICE_ID}`,
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', chunk => (errBody += chunk));
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errBody}`)));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Generar con throttle (ElevenLabs: 2 req/s en plan gratuito) ───────────────

const DELAY_MS = 600; // ~1.6 req/s para margen

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  let generated = 0, copied = 0, errors = 0;

  for (let i = 0; i < toGenerate.length; i++) {
    const { speech, ids, missing } = toGenerate[i];
    const primaryId = missing[0];
    const outPath = path.join(AUDIO_DIR, `${primaryId}.mp3`);

    process.stdout.write(`[${i + 1}/${toGenerate.length}] Generando "${speech.slice(0, 50)}"... `);

    try {
      const audioBuffer = await elevenlabsTTS(speech);
      fs.writeFileSync(outPath, audioBuffer);
      generated++;
      console.log(`✓ ${primaryId}.mp3 (${(audioBuffer.length / 1024).toFixed(0)} KB)`);

      // Copiar el mismo audio a los demás IDs que comparten el texto
      for (const id of missing.slice(1)) {
        const destPath = path.join(AUDIO_DIR, `${id}.mp3`);
        fs.copyFileSync(outPath, destPath);
        copied++;
        console.log(`  ↳ copiado a ${id}.mp3`);
      }

      // También copiar a los IDs que ya existen y tienen el mismo texto (no regenerar)
      const alreadyExisting = ids.filter(id => existing.has(id) && !missing.includes(id));
      for (const id of alreadyExisting) {
        if (!FORCE) continue; // sin --force, no sobreescribir existentes
        const destPath = path.join(AUDIO_DIR, `${id}.mp3`);
        fs.copyFileSync(outPath, destPath);
        console.log(`  ↳ (force) actualizado ${id}.mp3`);
      }
    } catch (err) {
      errors++;
      console.error(`✗ Error: ${err.message}`);
    }

    // Throttle entre requests
    if (i < toGenerate.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nListo: ${generated} generados, ${copied} copiados, ${errors} errores`);
  if (errors > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
