/**
 * supabase.js — Cliente Supabase singleton
 *
 * Configuración via window.SUPABASE_CONFIG (inyectado en index.html)
 * o env.js (local, en .gitignore)
 *
 * Si Supabase no está configurado, todas las operaciones fallan silenciosamente
 * y el módulo DB.js usará solo localStorage.
 */
const SupabaseClient = (() => {
  let _client = null;
  let _ready   = false;

  function init() {
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg?.url || !cfg?.anonKey) {
      console.info('[Supabase] No configurado — operando en modo offline');
      return;
    }
    // Cargar cliente Supabase desde CDN si no está disponible
    if (window.supabase?.createClient) {
      _client = window.supabase.createClient(cfg.url, cfg.anonKey);
      _ready  = true;
      console.info('[Supabase] Conectado a', cfg.url);
    } else {
      console.warn('[Supabase] Librería no cargada — agregar script en index.html');
    }
  }

  function isReady()  { return _ready && _client !== null; }
  function getClient(){ return _client; }

  return { init, isReady, getClient };
})();

if (typeof module !== 'undefined') module.exports = SupabaseClient;
