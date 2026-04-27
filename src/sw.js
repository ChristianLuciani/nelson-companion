/**
 * sw.js — Service Worker · Nelson Companion
 *
 * Estrategia:
 *   - Cache-first para todos los assets estáticos (JS, CSS, HTML, imágenes)
 *   - Network-first + fallback para protocol.json (puede actualizarse)
 *   - Pass-through para peticiones cross-origin (Supabase, CDN)
 *
 * Actualizar CACHE_VER al hacer cambios en assets estáticos para
 * que los clientes existentes reciban la versión nueva.
 */

const CACHE_VER   = 'nelson-v2';
const STATIC      = [
  './',
  './index.html',
  './patient.html',
  './caregiver.html',
  './manifest.json',
  './protocol.json',
  './css/theme.css',
  './css/patient.css',
  './css/styles.css',
  './js/icons.js',
  './js/tts.js',
  './js/supabase.js',
  './js/db.js',
  './js/protocol.js',
  './js/patient.js',
  './js/app.js',
  './js/sw-register.js',
  './favicon.svg',
  './favicon.ico',
  './favicon-96x96.png',
  './apple-touch-icon.png',
  './assets/web-app-manifest-192x192.png',
  './assets/web-app-manifest-512x512.png',
];

// ── INSTALL: pre-cache todos los assets ───────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VER)
      .then(cache => cache.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: borrar caches viejos ────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VER).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Pass-through para cross-origin (Supabase, CDN de Supabase JS, ElevenLabs, etc.)
  if (url.origin !== self.location.origin) return;

  // Network-first para protocol.json — puede ser reemplazado por GitHub Actions
  if (url.pathname.endsWith('protocol.json')) {
    event.respondWith(networkFirstWithCache(req));
    return;
  }

  // Cache-first para todo lo demás
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) {
    const cache = await caches.open(CACHE_VER);
    cache.put(req, res.clone());
  }
  return res;
}

async function networkFirstWithCache(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE_VER);
      cache.put(req, res.clone());
    }
    return res;
  } catch (_) {
    return caches.match(req);
  }
}

// ── PUSH: mostrar notificación del SO ─────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'Nelson Companion', body: 'Es hora de tomar tu medicación.' };
  try {
    if (event.data) data = event.data.json();
  } catch (_) {}

  const options = {
    body:    data.body,
    icon:    './assets/web-app-manifest-192x192.png',
    badge:   './favicon-96x96.png',
    tag:     data.tag || 'nelson-reminder',
    renotify: true,
    requireInteraction: true,
    data:    { url: data.url || './patient.html' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── NOTIFICATION CLICK: abrir/enfocar patient.html ────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || './patient.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        for (const client of clients) {
          if (client.url.includes('patient.html') && 'focus' in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
