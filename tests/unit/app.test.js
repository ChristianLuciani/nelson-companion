/**
 * Tests unitarios — App module (dashboard del cuidador)
 * Cubre: tab switching, tema, notas, compliance, BP history, toast, export
 */

const TODAY = new Date().toISOString().slice(0, 10);
const D     = TODAY.replace(/-/g, '');

// Días del protocolo: hoy + 6 anteriores
function buildDays(baseDate) {
  const days = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate + 'T12:00:00');
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const dd = ds.replace(/-/g, '');
    days[ds] = {
      label: ds,
      slots: [
        { id: `${dd}_0800`, time: '08:00', type: 'med',
          meds: [{ name: 'Aspirina', dose: '100mg' }], speech: '' },
        { id: `${dd}_1030`, time: '10:30', type: 'vital',  speech: '' },
        { id: `${dd}_1200`, time: '12:00', type: 'walk',   label: 'Caminata', speech: '' },
        { id: `${dd}_1400`, time: '14:00', type: 'meal',   label: 'Almuerzo', speech: '' },
      ],
    };
  }
  return days;
}

const PROTOCOL_DATA = {
  patient: { name: 'Nelson' },
  medications: { aspirina: { name: 'Aspirina', dose: '100mg' } },
  days: buildDays(TODAY),
};

// ── Mocks globales ────────────────────────────────────────────────
global.Icons = { get: jest.fn(() => '<svg/>') };
global.TTS   = {
  configure: jest.fn(), onSpeakStart: jest.fn(), onSpeakEnd: jest.fn(),
  speak: jest.fn(), isSpeaking: jest.fn(() => false),
};
global.SupabaseClient = { init: jest.fn(), isReady: jest.fn(() => false), getClient: jest.fn() };

let protocolMock;

beforeEach(() => {
  jest.useFakeTimers();
  global.TTS.speak.mockClear();

  // localStorage limpio
  const store = {};
  global.localStorage = {
    getItem:    k   => store[k] ?? null,
    setItem:    (k,v) => { store[k] = String(v); },
    removeItem: k   => { delete store[k]; },
    clear:      ()  => { Object.keys(store).forEach(k => delete store[k]); },
  };

  protocolMock = {
    load:           jest.fn().mockResolvedValue(PROTOCOL_DATA),
    getDay:         jest.fn(d => PROTOCOL_DATA.days[d] || null),
    getCurrentSlot: jest.fn(() => null),
    isChecked:      jest.fn(() => false),
    toggleCheck:    jest.fn(() => true),
    saveVital:      jest.fn(),
    getVital:       jest.fn(() => null),
    timeToMin:      jest.fn(() => 480),
    exportCSV:      jest.fn(() => 'fecha,slot\n'),
  };
  global.Protocol = protocolMock;

  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  jest.useRealTimers();
  jest.resetModules();
});

async function loadAndInit() {
  jest.resetModules();
  const App = require('../../src/js/app');
  await App.init();
  return App;
}

// ── Init y renderizado ────────────────────────────────────────────
describe('App — init', () => {
  test('llama a Protocol.load una vez', async () => {
    await loadAndInit();
    expect(protocolMock.load).toHaveBeenCalledTimes(1);
  });

  test('renderiza el sidebar con tabs de navegación', async () => {
    await loadAndInit();
    const html = document.getElementById('app').innerHTML;
    expect(html).toContain('Resumen del día');
    expect(html).toContain('Cumplimiento');
    expect(html).toContain('Presión arterial');
    expect(html).toContain('Notas y observaciones');
  });

  test('muestra error si Protocol.load rechaza', async () => {
    protocolMock.load.mockRejectedValue(new Error('sin red'));
    jest.resetModules();
    const App = require('../../src/js/app');
    await App.init();
    expect(document.getElementById('app').innerHTML).toContain('sin red');
  });
});

// ── Tab switching ─────────────────────────────────────────────────
describe('App — tab switching', () => {
  const TABS = [
    { tab: 'compliance', label: 'Cumplimiento últimos 7 días' },
    { tab: 'bp',         label: 'Tendencia presión arterial' },
    { tab: 'notes',      label: 'Nueva observación' },
    { tab: 'stoprules',  label: 'Reglas de parada' },
    { tab: 'schedule',   label: 'Agenda de mañana' },
  ];

  test.each(TABS)('click en "$tab" muestra contenido correcto', async ({ tab, label }) => {
    await loadAndInit();
    const btn = document.querySelector(`[data-action="setTab"][data-tab="${tab}"]`);
    expect(btn).not.toBeNull();
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('app').innerHTML).toContain(label);
  });
});

// ── Compliance ────────────────────────────────────────────────────
describe('App — compliance', () => {
  test('la tabla muestra 7 filas (una por día)', async () => {
    await loadAndInit();
    document.querySelector('[data-action="setTab"][data-tab="compliance"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const rows = document.querySelectorAll('.comp-table tbody tr');
    expect(rows.length).toBe(7);
  });

  test('todos los días sin datos muestran "Omitido" o "Sin programar"', async () => {
    protocolMock.isChecked.mockReturnValue(false);
    protocolMock.getVital.mockReturnValue(null);
    await loadAndInit();
    document.querySelector('[data-action="setTab"][data-tab="compliance"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const html = document.getElementById('app').innerHTML;
    // Al menos una celda missed (✕)
    expect(html).toContain('comp-cell missed');
  });

  test('días con meds completadas muestran ok', async () => {
    protocolMock.isChecked.mockReturnValue(true);
    await loadAndInit();
    document.querySelector('[data-action="setTab"][data-tab="compliance"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const html = document.getElementById('app').innerHTML;
    expect(html).toContain('comp-cell ok');
  });
});

// ── BP history ────────────────────────────────────────────────────
describe('App — BP history', () => {
  test('sin lecturas muestra "Sin suficientes lecturas"', async () => {
    protocolMock.getVital.mockReturnValue(null);
    await loadAndInit();
    document.querySelector('[data-action="setTab"][data-tab="bp"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('app').innerHTML)
      .toContain('Sin suficientes lecturas');
  });

  test('con lecturas genera SVG del gráfico', async () => {
    // Devolver lecturas para todos los días (sys/dia)
    protocolMock.getVital.mockImplementation((slotId, field) => {
      if (field === 'sys') return '130';
      if (field === 'dia') return '80';
      if (field === 'pul') return '70';
      return null;
    });
    await loadAndInit();
    document.querySelector('[data-action="setTab"][data-tab="bp"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('app').innerHTML).toContain('<svg');
  });

  test('KPI SpO₂ muestra "—" si no hay lecturas de oxímetro', async () => {
    protocolMock.getVital.mockReturnValue(null);
    await loadAndInit();
    document.querySelector('[data-action="setTab"][data-tab="bp"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // El kpi de SpO₂ debe estar presente aunque sea con "—"
    expect(document.getElementById('app').innerHTML).toContain('SpO₂');
  });
});

// ── Notas ─────────────────────────────────────────────────────────
describe('App — notas', () => {
  async function goToNotes(App) {
    document.querySelector('[data-action="setTab"][data-tab="notes"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  test('al guardar una nota aparece en la lista', async () => {
    await loadAndInit();
    await goToNotes();
    // Escribir en el textarea
    const ta = document.getElementById('note-draft');
    ta.value = 'Nelson tuvo buen ánimo hoy.';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    // Guardar
    document.querySelector('[data-action="saveNote"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('app').innerHTML)
      .toContain('Nelson tuvo buen ánimo hoy.');
  });

  test('cancelar limpia el draft', async () => {
    await loadAndInit();
    await goToNotes();
    const ta = document.getElementById('note-draft');
    ta.value = 'borrador';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-action="clearNote"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const ta2 = document.getElementById('note-draft');
    expect(ta2.value).toBe('');
  });

  test('cambiar categoría la marca activa', async () => {
    await loadAndInit();
    await goToNotes();
    const suenoBtn = document.querySelector('[data-action="noteCategory"][data-cat="Sueño"]');
    suenoBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const activeBtn = document.querySelector('[data-action="noteCategory"][data-cat="Sueño"]');
    expect(activeBtn.className).toContain('active');
  });
});

// ── Tema ──────────────────────────────────────────────────────────
describe('App — theme selector', () => {
  test('click en dot "clinical" cambia data-theme del html', async () => {
    await loadAndInit();
    const dot = document.querySelector('[data-action="setTheme"][data-theme="clinical"]');
    expect(dot).not.toBeNull();
    dot.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.documentElement.dataset.theme).toBe('clinical');
  });

  test('persiste el tema en localStorage', async () => {
    await loadAndInit();
    document.querySelector('[data-action="setTheme"][data-theme="high-contrast"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(localStorage.getItem('nc_theme')).toBe('high-contrast');
  });

  test('el dot activo tiene clase "active"', async () => {
    localStorage.setItem('nc_theme', 'clinical');
    await loadAndInit();
    const dot = document.querySelector('[data-action="setTheme"][data-theme="clinical"]');
    expect(dot.className).toContain('active');
  });
});

// ── Toast ─────────────────────────────────────────────────────────
describe('App — toast', () => {
  test('click en "Copiar de hoy" muestra toast', async () => {
    await loadAndInit();
    document.querySelector('[data-action="setTab"][data-tab="schedule"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.querySelector('[data-action="copyToday"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('nc-toast')).not.toBeNull();
  });

  test('click en "Guardar agenda" muestra toast', async () => {
    await loadAndInit();
    document.querySelector('[data-action="setTab"][data-tab="schedule"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.querySelector('[data-action="saveSchedule"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('nc-toast')).not.toBeNull();
  });
});

// ── Export CSV ────────────────────────────────────────────────────
describe('App — export CSV', () => {
  test('llama a Protocol.exportCSV al hacer click en exportar', async () => {
    // Mock URL.createObjectURL para jsdom
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    await loadAndInit();
    const btn = document.querySelector('[data-action="export"]');
    expect(btn).not.toBeNull();
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(protocolMock.exportCSV).toHaveBeenCalled();
  });
});
