/**
 * Tests unitarios — DB module (persistencia offline-first)
 */

// Mock global dependencies
global.SupabaseClient = { isReady: jest.fn(() => false), getClient: jest.fn() };
global.localStorage   = (() => {
  let s = {};
  return {
    getItem:    k   => s[k] || null,
    setItem:    (k,v) => { s[k]=v; },
    removeItem: k   => { delete s[k]; },
    clear:      ()  => { s={}; }
  };
})();

const DB = require('../../src/js/db');

beforeEach(() => localStorage.clear());

describe('DB checks', () => {
  test('isChecked devuelve false por defecto', () => {
    expect(DB.isChecked('20260424_0800', 0)).toBe(false);
  });

  test('toggleCheck alterna entre true y false', () => {
    expect(DB.toggleCheck('20260424_0800', 0)).toBe(true);
    expect(DB.toggleCheck('20260424_0800', 0)).toBe(false);
  });

  test('saveCheck persiste el valor', () => {
    DB.saveCheck('20260424_0800', 0, true);
    expect(DB.isChecked('20260424_0800', 0)).toBe(true);
  });

  test('checks de diferentes slots no se mezclan', () => {
    DB.saveCheck('20260424_0800', 0, true);
    expect(DB.isChecked('20260424_0800', 1)).toBe(false);
    expect(DB.isChecked('20260424_1030', 0)).toBe(false);
  });
});

describe('DB vitals', () => {
  test('getVital devuelve string vacío por defecto', () => {
    expect(DB.getVital('20260424_1530', 'sys')).toBe('');
  });

  test('saveVital y getVital persisten correctamente', () => {
    DB.saveVital('20260424_1530', 'sys', '125');
    DB.saveVital('20260424_1530', 'dia', '82');
    DB.saveVital('20260424_1530', 'pul', '65');
    expect(DB.getVital('20260424_1530', 'sys')).toBe('125');
    expect(DB.getVital('20260424_1530', 'dia')).toBe('82');
    expect(DB.getVital('20260424_1530', 'pul')).toBe('65');
  });

  test('vitals de diferentes slots no se mezclan', () => {
    DB.saveVital('20260424_1530', 'sys', '125');
    expect(DB.getVital('20260424_1730', 'sys')).toBe('');
  });
});

describe('DB notes', () => {
  test('getNote devuelve string vacío por defecto', () => {
    expect(DB.getNote('20260424_0800')).toBe('');
  });

  test('saveNote y getNote persisten texto', () => {
    DB.saveNote('20260424_0800', 'Tomó con mucha agua');
    expect(DB.getNote('20260424_0800')).toBe('Tomó con mucha agua');
  });
});

describe('DB exportCSV', () => {
  test('exportCSV devuelve al menos la cabecera CSV', () => {
    const csv = DB.exportCSV();
    expect(csv).toContain('date,slotId,time,type');
  });
});

describe('DB pill photos', () => {
  test('getPillPhoto devuelve null por defecto', () => {
    expect(DB.getPillPhoto('amlodipino')).toBeNull();
  });
});
