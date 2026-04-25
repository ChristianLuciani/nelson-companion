/**
 * Tests unitarios — Protocol module
 * Ejecutar con: npm test
 */
const Protocol = require('../../src/js/protocol');

// Mock fetch para pruebas unitarias
global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve({
    patient: { name: 'Nelson' },
    medications: {
      amlodipino: { name: 'Amlodipino', dose: '2.5mg', description: 'Pastilla naranja' }
    },
    days: {
      '2026-04-26': {
        label: 'Dom 26 Abr', risk: 'red',
        slots: [
          { id: '20260426_0800', time: '08:00', type: 'med',
            meds: ['amlodipino'], speech: 'Buenos días Nelson.' },
          { id: '20260426_1030', time: '10:30', type: 'vital', speech: 'Mide la presión.' }
        ]
      }
    }
  }) })
);

global.localStorage = (() => {
  let store = {};
  return {
    getItem: k => store[k] || null,
    setItem: (k,v) => { store[k]=v; },
    removeItem: k => { delete store[k]; },
    clear: () => { store={}; }
  };
})();

describe('Protocol.timeToMin', () => {
  test('convierte 08:00 a 480', () => expect(Protocol.timeToMin('08:00')).toBe(480));
  test('convierte 10:30 a 630', () => expect(Protocol.timeToMin('10:30')).toBe(630));
  test('convierte 00:00 a 0',   () => expect(Protocol.timeToMin('00:00')).toBe(0));
  test('convierte 23:59 a 1439',() => expect(Protocol.timeToMin('23:59')).toBe(1439));
});

describe('Protocol.getCurrentSlot', () => {
  beforeAll(() => Protocol.load());

  test('devuelve null si es antes del primer slot', async () => {
    await Protocol.load();
    const slot = Protocol.getCurrentSlot('2026-04-26', 400); // 06:40 — antes de 08:00
    expect(slot).toBeNull();
  });

  test('devuelve slot 08:00 si son las 09:00', async () => {
    await Protocol.load();
    const slot = Protocol.getCurrentSlot('2026-04-26', 540); // 09:00
    expect(slot?.id).toBe('20260426_0800');
  });

  test('devuelve slot 10:30 si son las 11:00', async () => {
    await Protocol.load();
    const slot = Protocol.getCurrentSlot('2026-04-26', 660); // 11:00
    expect(slot?.id).toBe('20260426_1030');
  });
});

describe('Protocol.getNextSlot', () => {
  test('devuelve slot 10:30 si son las 09:00', async () => {
    await Protocol.load();
    const slot = Protocol.getNextSlot('2026-04-26', 540);
    expect(slot?.id).toBe('20260426_1030');
  });

  test('devuelve null si no hay slot siguiente', async () => {
    await Protocol.load();
    const slot = Protocol.getNextSlot('2026-04-26', 700); // después de las 11:40
    expect(slot).toBeNull();
  });
});

describe('Protocol check/vital state', () => {
  test('toggleCheck marca y desmarca', async () => {
    await Protocol.load();
    expect(Protocol.isChecked('20260426_0800', 0)).toBe(false);
    Protocol.toggleCheck('20260426_0800', 0);
    expect(Protocol.isChecked('20260426_0800', 0)).toBe(true);
    Protocol.toggleCheck('20260426_0800', 0);
    expect(Protocol.isChecked('20260426_0800', 0)).toBe(false);
  });

  test('saveVital y getVital persisten valores', async () => {
    await Protocol.load();
    Protocol.saveVital('20260426_1030', 'sys', '125');
    Protocol.saveVital('20260426_1030', 'dia', '82');
    Protocol.saveVital('20260426_1030', 'pul', '65');
    expect(Protocol.getVital('20260426_1030', 'sys')).toBe('125');
    expect(Protocol.getVital('20260426_1030', 'dia')).toBe('82');
    expect(Protocol.getVital('20260426_1030', 'pul')).toBe('65');
  });
});
