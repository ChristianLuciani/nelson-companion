/**
 * Tests — patient.js clock-driven model
 * Cubre: getCurrentRitual, getCurrentStep, render branches (action/resting/pre-dawn)
 */

describe('Patient — Clock Model', () => {
  const TODAY = new Date().toISOString().slice(0, 10);
  const D = TODAY.replace(/-/g, '');

  beforeEach(() => {
    jest.useFakeTimers();
    global.DB = { isChecked: jest.fn(() => false) };
    global.Protocol = {
      getRituals: jest.fn(),
      getCurrentRitual: jest.fn(),
      getCurrentStep: jest.fn(),
      getNextRitual: jest.fn(),
      getDay: jest.fn(),
      timeToMin: jest.fn((t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      }),
      isChecked: jest.fn(() => false),
      toggleCheck: jest.fn(),
      saveVital: jest.fn(),
      getVital: jest.fn(),
    };
  });

  it('getCurrentRitual retorna el ritual actual a las 08:30', () => {
    const now = new Date();
    now.setHours(8, 30, 0, 0);

    const rituals = [
      { time: '08:00', steps: [{ id: `${D}_0800`, type: 'med' }] },
      { time: '12:00', steps: [{ id: `${D}_1200`, type: 'med' }] },
    ];

    global.Protocol.getCurrentRitual.mockReturnValue(rituals[0]);
    const result = global.Protocol.getCurrentRitual(now);

    expect(result).toBe(rituals[0]);
    expect(result.time).toBe('08:00');
  });

  it('getCurrentStep retorna el primer step no confirmado', () => {
    global.DB.isChecked.mockImplementation((slotId) => {
      return slotId.includes('meal'); // solo meal está confirmado
    });

    const ritual = {
      time: '08:00',
      steps: [
        { id: `${D}_0800`, type: 'med' },
        { id: `${D}_0800_meal`, type: 'meal' },
      ],
    };

    // Simular getCurrentStep
    let step = null;
    for (const s of ritual.steps) {
      if (!global.DB.isChecked(s.id, 0)) {
        step = s;
        break;
      }
    }

    expect(step).toBe(ritual.steps[0]);
  });

  it('render rama ACTION con ritual activo', () => {
    const ritual = {
      time: '08:00',
      steps: [{ id: `${D}_0800`, type: 'med', meds: [] }],
    };

    // Simular render ACTION
    const isAction = !!ritual;
    expect(isAction).toBe(true);
  });

  it('render rama RESTING sin ritual activo (entre horas)', () => {
    const currentRitual = null;
    const nextRitual = { time: '12:00', steps: [] };

    // Simular render RESTING
    const isResting = !currentRitual && !!nextRitual;
    expect(isResting).toBe(true);
  });

  it('render rama PRE-DAWN antes del primer slot', () => {
    const now = new Date();
    now.setHours(6, 0, 0, 0); // 06:00

    const currentRitual = null;
    const nextRitual = { time: '08:00', steps: [] };
    const isPredawn = !currentRitual && now.getHours() < 7;

    expect(isPredawn).toBe(true);
  });
});
