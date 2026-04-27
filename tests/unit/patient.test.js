/**
 * Tests unitarios — Patient module (vista de Nelson)
 * Cubre: BP stepper, SpO₂ opcional, haptic, flujo de tareas
 */

const TODAY = new Date().toISOString().slice(0, 10);
const D     = TODAY.replace(/-/g, '');

const MED_SLOT = {
  id: `${D}_0800`, time: '08:00', type: 'med',
  meds: [{ name: 'Amlodipino', dose: '2.5mg', description: 'Pastilla naranja' }],
  speech: 'Tomá la pastilla naranja.',
};
const VITAL_SLOT = {
  id: `${D}_1030`, time: '10:30', type: 'vital', speech: 'Ponete el tensiómetro.',
};

// ── Mocks globales ────────────────────────────────────────────────
global.SupabaseClient = { init: jest.fn(), isReady: jest.fn(() => false), getClient: jest.fn() };
global.Icons = { get: jest.fn(() => '<svg/>') };
global.TTS  = {
  configure: jest.fn(), onSpeakStart: jest.fn(), onSpeakEnd: jest.fn(),
  speak: jest.fn(), isSpeaking: jest.fn(() => false),
};
global.navigator.vibrate = jest.fn();

let protocolMock;
beforeEach(() => {
  jest.useFakeTimers();
  global.navigator.vibrate.mockClear();
  global.TTS.speak.mockClear();

  protocolMock = {
    days: { [TODAY]: { label: 'Test', slots: [MED_SLOT, VITAL_SLOT] } },
    load: jest.fn().mockResolvedValue(null),
    getDay:          jest.fn(d => protocolMock.days[d] || null),
    getCurrentSlot:  jest.fn(() => null),
    isChecked:       jest.fn(() => false),
    toggleCheck:     jest.fn(() => true),
    saveVital:       jest.fn(),
    getVital:        jest.fn(() => null),
    timeToMin:       jest.fn(() => 480),
    exportCSV:       jest.fn(() => ''),
  };
  protocolMock.load = jest.fn().mockResolvedValue(protocolMock);
  global.Protocol = protocolMock;

  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  jest.useRealTimers();
  jest.resetModules();
});

async function loadAndInit() {
  jest.resetModules();
  const Patient = require('../../src/js/patient');
  await Patient.init();
  return Patient;
}

// ── Renderizado inicial ───────────────────────────────────────────
describe('Patient — renderizado inicial', () => {
  test('muestra el banner de voz si no está activada', async () => {
    await loadAndInit();
    expect(document.getElementById('app').innerHTML).toContain('Activar voz');
  });

  test('muestra la hora en formato HH:MM', async () => {
    await loadAndInit();
    const app = document.getElementById('app').innerHTML;
    expect(app).toMatch(/\d{2}:\d{2}/);
  });

  test('carga el protocolo una vez', async () => {
    await loadAndInit();
    expect(protocolMock.load).toHaveBeenCalledTimes(1);
  });
});

// ── BP Stepper — máquina de estados ──────────────────────────────
describe('Patient — BP stepper', () => {
  async function setupBP() {
    await loadAndInit();
    // Navegar al slot vital (taskIdx=1)
    // Simular click en listo del primer slot para avanzar al vital
    const app = document.getElementById('app');
    // Forzar taskIdx=1 clickando listo y luego done→siguiente
    const listoBtn = app.querySelector('[data-action="listo"]');
    if (listoBtn) listoBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Ahora estamos en showDone=true, click otra vez para avanzar
    const listoBtn2 = app.querySelector('[data-action="listo"]');
    if (listoBtn2) listoBtn2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  test('el paso inicial del BP es "intro" — muestra YA LO TENGO', async () => {
    await setupBP();
    const html = document.getElementById('app').innerHTML;
    expect(html).toContain('YA LO TENGO');
    expect(html).toContain('Tomar la presión');
  });

  test('intro → sys al hacer click en bpNext', async () => {
    await setupBP();
    const nextBtn = document.querySelector('[data-action="bpNext"]');
    expect(nextBtn).not.toBeNull();
    nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const html = document.getElementById('app').innerHTML;
    expect(html).toContain('Número de arriba');
  });

  test('sys → dia → pul → spo2 en clicks sucesivos', async () => {
    await setupBP();
    const steps = ['sys', 'dia', 'pul', 'spo2'];
    const labels = ['Número de arriba', 'Número de abajo', 'Pulso', 'Oxígeno en sangre'];
    for (let i = 0; i < steps.length; i++) {
      const btn = document.querySelector('[data-action="bpNext"]');
      expect(btn).not.toBeNull();
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const html = document.getElementById('app').innerHTML;
      expect(html).toContain(labels[i]);
    }
  });

  test('SALTAR en spo2 avanza a confirm sin guardar spo2', async () => {
    await setupBP();
    // Avanzar hasta spo2
    for (let i = 0; i < 4; i++) {
      const btn = document.querySelector('[data-action="bpNext"]');
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    // Ahora estamos en spo2 — click en SALTAR
    const skipBtn = document.querySelector('[data-action="bpSpo2Skip"]');
    expect(skipBtn).not.toBeNull();
    skipBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const html = document.getElementById('app').innerHTML;
    expect(html).toContain('GUARDAR');
    // SpO2 no debe aparecer en la pantalla de confirmación
    expect(html).not.toContain('SpO₂:');
  });

  test('confirm muestra los tres valores (sin SpO₂ si fue saltado)', async () => {
    await setupBP();
    // Avanzar hasta confirm (intro→sys→dia→pul→spo2→skip→confirm)
    for (let i = 0; i < 4; i++) {
      const btn = document.querySelector('[data-action="bpNext"]');
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    const skipBtn = document.querySelector('[data-action="bpSpo2Skip"]');
    if (skipBtn) skipBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const html = document.getElementById('app').innerHTML;
    expect(html).toContain('130');   // bpSys inicial
    expect(html).toContain('80');    // bpDia inicial
    expect(html).toContain('70');    // bpPul inicial
  });

  test('bpAdj actualiza el display en tiempo real (sys)', async () => {
    await setupBP();
    // Avanzar a sys
    document.querySelector('[data-action="bpNext"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Incrementar +10
    const plusBtn = document.querySelector('[data-action="bpAdj"][data-delta="10"]');
    expect(plusBtn).not.toBeNull();
    plusBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const display = document.getElementById('bp-value-display');
    expect(display).not.toBeNull();
    expect(Number(display.textContent)).toBe(140); // 130 + 10
  });

  test('GUARDAR en confirm llama a Protocol.saveVital con sys, dia, pul', async () => {
    await setupBP();
    // Avanzar hasta confirm pasando SpO₂
    for (let i = 0; i < 4; i++) {
      const btn = document.querySelector('[data-action="bpNext"]');
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    const skipBtn = document.querySelector('[data-action="bpSpo2Skip"]');
    if (skipBtn) skipBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Click en GUARDAR
    const guardarBtn = document.querySelector('[data-action="listo"]');
    expect(guardarBtn).not.toBeNull();
    guardarBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(protocolMock.saveVital).toHaveBeenCalledWith(VITAL_SLOT.id, 'sys', 130);
    expect(protocolMock.saveVital).toHaveBeenCalledWith(VITAL_SLOT.id, 'dia', 80);
    expect(protocolMock.saveVital).toHaveBeenCalledWith(VITAL_SLOT.id, 'pul', 70);
  });

  test('GUARDAR NO llama saveVital("spo2") cuando fue saltado', async () => {
    await setupBP();
    for (let i = 0; i < 4; i++) {
      const btn = document.querySelector('[data-action="bpNext"]');
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    const skipBtn = document.querySelector('[data-action="bpSpo2Skip"]');
    if (skipBtn) skipBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const guardarBtn = document.querySelector('[data-action="listo"]');
    if (guardarBtn) guardarBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const spo2Calls = protocolMock.saveVital.mock.calls.filter(c => c[1] === 'spo2');
    expect(spo2Calls).toHaveLength(0);
  });
});

// ── Haptic feedback ───────────────────────────────────────────────
describe('Patient — haptic', () => {
  test('vibra con patrón de éxito al completar una tarea (listo)', async () => {
    await loadAndInit();
    const listoBtn = document.querySelector('[data-action="listo"]');
    if (listoBtn) listoBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(global.navigator.vibrate).toHaveBeenCalledWith([80, 60, 120]);
  });

  test('vibra un pulso corto al navegar al siguiente slot', async () => {
    await loadAndInit();
    const listoBtn = document.querySelector('[data-action="listo"]');
    if (listoBtn) listoBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Pantalla done — click otra vez para navegar
    global.navigator.vibrate.mockClear();
    const nextBtn = document.querySelector('[data-action="listo"]');
    if (nextBtn) nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(global.navigator.vibrate).toHaveBeenCalledWith(60);
  });
});

// ── Medicamentos ──────────────────────────────────────────────────
describe('Patient — medicamentos', () => {
  test('muestra el nombre y dosis del medicamento', async () => {
    await loadAndInit();
    const html = document.getElementById('app').innerHTML;
    expect(html).toContain('Amlodipino');
    expect(html).toContain('2.5mg');
  });

  test('llama a Protocol.toggleCheck al guardar med', async () => {
    await loadAndInit();
    const listoBtn = document.querySelector('[data-action="listo"]');
    if (listoBtn) listoBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(protocolMock.toggleCheck).toHaveBeenCalledWith(MED_SLOT.id, 0);
  });
});
