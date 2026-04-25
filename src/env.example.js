/**
 * env.example.js — Copiar como env.js y completar con tus keys
 * env.js está en .gitignore — nunca commitear keys reales
 */
window.SUPABASE_CONFIG = {
  url: 'https://vvqpknduifkkfywpiwkn.supabase.co',
  anonKey: '[TU-ANON-KEY]'  // Dashboard → Project Settings → API → anon public
};

// Opcional — para TTS de alta calidad
window.TTS_CONFIG = {
  apiProvider: 'elevenlabs',   // 'elevenlabs' | 'openai' | null
  apiKey: '[TU-API-KEY]',
  voiceId: '[TU-VOICE-ID]'     // ElevenLabs voice ID en español
};
