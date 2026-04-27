// Service Worker registration — cargado en todos los HTML
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch(e => console.warn('[SW] registro fallido:', e.message));
  });
}
