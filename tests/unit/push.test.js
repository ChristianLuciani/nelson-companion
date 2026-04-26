/**
 * Tests unitarios — Push module (suscripción Web Push)
 */

// Cada test resetea el módulo para que window.PUSH_CONFIG se lea de nuevo
beforeEach(() => {
  jest.resetModules();
  delete global.Notification;
  delete global.PushManager;
  // En jsdom window === global
  global.PUSH_CONFIG = undefined;
  global.supabase    = undefined;
  // Limpiar el mock de serviceWorker entre tests
  try {
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: undefined, configurable: true, writable: true,
    });
  } catch (_) {}
});

function loadPush() {
  return require('../../src/js/push');
}

// ── getStatus ─────────────────────────────────────────────────────
describe('Push.getStatus()', () => {
  test('devuelve "unsupported" si no hay API de Notification', () => {
    const Push = loadPush();
    expect(Push.getStatus()).toBe('unsupported');
  });

  test('devuelve el permiso actual cuando Notification existe', () => {
    global.Notification = { permission: 'default' };
    const Push = loadPush();
    expect(Push.getStatus()).toBe('default');
  });

  test('devuelve "granted" cuando el permiso fue concedido', () => {
    global.Notification = { permission: 'granted' };
    const Push = loadPush();
    expect(Push.getStatus()).toBe('granted');
  });

  test('devuelve "denied" cuando el permiso fue denegado', () => {
    global.Notification = { permission: 'denied' };
    const Push = loadPush();
    expect(Push.getStatus()).toBe('denied');
  });
});

// ── getSubscription ───────────────────────────────────────────────
describe('Push.getSubscription()', () => {
  test('devuelve null si no hay service worker', async () => {
    const Push = loadPush();
    const result = await Push.getSubscription();
    expect(result).toBeNull();
  });

  test('delega en pushManager.getSubscription() si hay SW', async () => {
    const mockSub = { endpoint: 'https://push.example.com/sub123' };
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ pushManager: { getSubscription: () => Promise.resolve(mockSub) } }) },
      configurable: true,
    });
    const Push = loadPush();
    const result = await Push.getSubscription();
    expect(result).toBe(mockSub);
  });
});

// ── request ───────────────────────────────────────────────────────
describe('Push.request()', () => {
  test('devuelve "unsupported" si no hay Notification ni PushManager', async () => {
    const Push = loadPush();
    const result = await Push.request();
    expect(result).toBe('unsupported');
  });

  test('devuelve "denied" si el usuario rechaza el permiso', async () => {
    global.Notification = {
      permission: 'default',
      requestPermission: jest.fn().mockResolvedValue('denied'),
    };
    global.PushManager = {};
    const Push = loadPush();
    const result = await Push.request();
    expect(result).toBe('denied');
  });

  test('devuelve "no-sw" si no hay service worker registrado', async () => {
    global.Notification = {
      permission: 'granted',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    };
    global.PushManager = {};
    // navigator.serviceWorker no existe en jsdom por defecto
    const Push = loadPush();
    const result = await Push.request();
    expect(result).toBe('no-sw');
  });

  test('devuelve "granted-local" si permiso OK pero no hay VAPID key', async () => {
    global.Notification = {
      permission: 'granted',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    };
    global.PushManager = {};
    const mockSW = {
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest.fn(),
      },
    };
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: { ready: Promise.resolve(mockSW) },
      configurable: true,
    });
    // Sin VAPID key (window.PUSH_CONFIG vacío)
    global.PUSH_CONFIG = { vapidPublicKey: '' };
    const Push = loadPush();
    const result = await Push.request();
    expect(result).toBe('granted-local');
    expect(mockSW.pushManager.subscribe).not.toHaveBeenCalled();
  });

  test('suscribe con VAPID key y guarda en Supabase si está disponible', async () => {
    const mockSub = {
      endpoint: 'https://push.example.com/abc',
      toJSON: () => ({ endpoint: 'https://push.example.com/abc', keys: { p256dh: 'aaa', auth: 'bbb' } }),
    };
    const upsertMock = jest.fn().mockResolvedValue({});
    global.supabase = {
      from: jest.fn(() => ({ upsert: upsertMock })),
    };
    global.Notification = {
      permission: 'granted',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    };
    global.PushManager = {};
    global.atob = str => Buffer.from(str, 'base64').toString('binary');
    const mockSW = {
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest.fn().mockResolvedValue(mockSub),
      },
    };
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: { ready: Promise.resolve(mockSW) },
      configurable: true,
    });
    // VAPID key válida (base64url)
    global.PUSH_CONFIG = { vapidPublicKey: 'BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' };
    const Push = loadPush();
    const result = await Push.request();
    expect(result).toBe('granted');
    expect(mockSW.pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(global.supabase.from).toHaveBeenCalledWith('push_subscriptions');
    expect(upsertMock).toHaveBeenCalled();
  });

  test('devuelve "error" si pushManager.subscribe lanza excepción', async () => {
    global.Notification = {
      permission: 'granted',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    };
    global.PushManager = {};
    global.atob = str => Buffer.from(str, 'base64').toString('binary');
    const mockSW = {
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest.fn().mockRejectedValue(new Error('DOMException: permission denied')),
      },
    };
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: { ready: Promise.resolve(mockSW) },
      configurable: true,
    });
    global.PUSH_CONFIG = { vapidPublicKey: 'BKabc123' };
    const Push = loadPush();
    const result = await Push.request();
    expect(result).toBe('error');
  });
});

// ── unsubscribe ───────────────────────────────────────────────────
describe('Push.unsubscribe()', () => {
  test('llama a sub.unsubscribe() si hay suscripción activa', async () => {
    const unsubFn = jest.fn().mockResolvedValue(true);
    const mockSub = { endpoint: 'https://x', unsubscribe: unsubFn };
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ pushManager: { getSubscription: () => Promise.resolve(mockSub) } }) },
      configurable: true,
    });
    const Push = loadPush();
    await Push.unsubscribe();
    expect(unsubFn).toHaveBeenCalled();
  });

  test('no lanza si no hay suscripción', async () => {
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ pushManager: { getSubscription: () => Promise.resolve(null) } }) },
      configurable: true,
    });
    const Push = loadPush();
    await expect(Push.unsubscribe()).resolves.toBeUndefined();
  });
});
