/**
 * env.example.js — Plantilla de configuración local
 *
 * Copiá este archivo como src/env.js y completá con tus valores.
 * src/env.js está en .gitignore — nunca commitear keys reales.
 *
 * En producción GitHub Actions inyecta estas variables desde Infisical
 * durante el deploy (ver .github/workflows/deploy.yml).
 */
window.SUPABASE_CONFIG = {
  url: 'https://[PROJECT-REF].supabase.co',
  publishableKey: 'sb_publishable_[TU-PUBLISHABLE-KEY]'  // Dashboard → Project Settings → API → Publishable key
};

window.TTS_CONFIG = {
  apiProvider: 'elevenlabs',   // 'elevenlabs' | 'openai' | null
  apiKey: '[TU-ELEVENLABS-API-KEY]',
  voiceId: 'VR6AewLTigWG4xSOukaG'  // Valentina (built-in, free tier)
};
