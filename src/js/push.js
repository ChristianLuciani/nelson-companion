/**
 * push.js — Web Push subscription · Nelson Companion
 *
 * Gestiona la suscripción a notificaciones push del Service Worker.
 * Las suscripciones se guardan en Supabase para que el servidor pueda
 * enviar recordatorios de medicación.
 *
 * Uso:
 *   Push.request()        → pide permiso + suscribe
 *   Push.getStatus()      → 'granted' | 'denied' | 'default'
 *   Push.getSubscription()→ Promise<PushSubscription | null>
 */

const Push = (() => {
  // VAPID public key — reemplazar con tu propia key en producción
  // Generar con: npx web-push generate-vapid-keys
  const VAPID_PUBLIC_KEY = window.PUSH_CONFIG?.vapidPublicKey || '';

  const SUBSCRIPTION_KEY = 'nc_push_subscription_id';

  function _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = atob(base64);
    const arr     = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  async function _getSWRegistration() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return reg;
    } catch (_) {
      return null;
    }
  }

  async function _saveSubscriptionToSupabase(sub) {
    if (!window.supabase) return;
    try {
      const subJSON = sub.toJSON();
      await window.supabase
        .from('push_subscriptions')
        .upsert({
          patient_id: 'nelson_luciani',
          endpoint:   subJSON.endpoint,
          p256dh:     subJSON.keys?.p256dh || '',
          auth:       subJSON.keys?.auth   || '',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'endpoint' });
    } catch (e) {
      console.warn('[Push] No se pudo guardar suscripción en Supabase:', e.message);
    }
  }

  function getStatus() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  async function getSubscription() {
    const reg = await _getSWRegistration();
    if (!reg) return null;
    return reg.pushManager.getSubscription();
  }

  async function request() {
    if (!('Notification' in window) || !('PushManager' in window)) {
      console.warn('[Push] Browser no soporta notificaciones push.');
      return 'unsupported';
    }

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return perm;

    const reg = await _getSWRegistration();
    if (!reg) return 'no-sw';

    try {
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        if (!VAPID_PUBLIC_KEY) {
          console.warn('[Push] VAPID_PUBLIC_KEY no configurada — omitiendo suscripción push remota.');
          return 'granted-local';
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      await _saveSubscriptionToSupabase(sub);
      return 'granted';
    } catch (e) {
      console.warn('[Push] Error al suscribir:', e.message);
      return 'error';
    }
  }

  async function unsubscribe() {
    const sub = await getSubscription();
    if (sub) await sub.unsubscribe();
  }

  return { request, getStatus, getSubscription, unsubscribe };
})();

if (typeof module !== 'undefined') module.exports = Push;
