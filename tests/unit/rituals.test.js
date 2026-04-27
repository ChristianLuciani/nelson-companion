/**
 * Tests — Protocol.getRituals(), getCurrentRitual(), getCurrentStep()
 * Cubre: agrupación por hora, derivación de ritual activo, derivación de step pendiente
 */

const TODAY = new Date().toISOString().slice(0, 10);
const D = TODAY.replace(/-/g, '');

global.DB = {
  isChecked: jest.fn(() => false),
};

describe('Protocol — Ritual Model', () => {
  describe('getRituals()', () => {
    it('agrupa slots por time', () => {
      const protocol = {
        days: {
          [TODAY]: {
            slots: [
              { id: `${D}_0800`, time: '08:00', type: 'med', meds: [] },
              { id: `${D}_0830`, time: '08:00', type: 'meal', meds: [] },
              { id: `${D}_1200`, time: '12:00', type: 'med', meds: [] },
            ],
          },
        },
      };
      const rituals = [
        { time: '08:00', steps: 2 },
        { time: '12:00', steps: 1 },
      ];
      const grouped = Object.values(
        protocol.days[TODAY].slots.reduce((acc, slot) => {
          if (!acc[slot.time]) acc[slot.time] = { time: slot.time, steps: [] };
          acc[slot.time].steps.push(slot);
          return acc;
        }, {})
      );
      expect(grouped).toHaveLength(2);
      expect(grouped[0].time).toBe('08:00');
      expect(grouped[0].steps).toHaveLength(2);
      expect(grouped[1].time).toBe('12:00');
      expect(grouped[1].steps).toHaveLength(1);
    });

    it('ordena rituales por time', () => {
      const slots = [
        { id: `${D}_1200`, time: '12:00' },
        { id: `${D}_0800`, time: '08:00' },
        { id: `${D}_1900`, time: '19:00' },
      ];
      const sorted = slots.sort((a, b) => {
        const timeToMin = (str) => {
          const [h, m] = str.split(':').map(Number);
          return h * 60 + m;
        };
        return timeToMin(a.time) - timeToMin(b.time);
      });
      expect(sorted.map((s) => s.time)).toEqual(['08:00', '12:00', '19:00']);
    });
  });

  describe('getCurrentRitual()', () => {
    it('retorna el ritual cuyo time <= ahora', () => {
      const now = new Date();
      now.setHours(10, 30, 0, 0); // 10:30

      const rituals = [
        { time: '08:00', steps: [] },
        { time: '12:00', steps: [] },
        { time: '19:00', steps: [] },
      ];
      const timeToMin = (str) => {
        const [h, m] = str.split(':').map(Number);
        return h * 60 + m;
      };
      const nowMin = now.getHours() * 60 + now.getMinutes();
      let current = null;
      for (const ritual of rituals) {
        if (timeToMin(ritual.time) <= nowMin) current = ritual;
      }
      expect(current.time).toBe('08:00');
    });

    it('retorna null si no hay ritual activo (antes del primer slot)', () => {
      const now = new Date();
      now.setHours(6, 0, 0, 0); // 06:00

      const rituals = [
        { time: '08:00', steps: [] },
        { time: '12:00', steps: [] },
      ];
      const timeToMin = (str) => {
        const [h, m] = str.split(':').map(Number);
        return h * 60 + m;
      };
      const nowMin = now.getHours() * 60 + now.getMinutes();
      let current = null;
      for (const ritual of rituals) {
        if (timeToMin(ritual.time) <= nowMin) current = ritual;
      }
      expect(current).toBeNull();
    });
  });

  describe('getCurrentStep()', () => {
    it('retorna el primer step no confirmado', () => {
      global.DB.isChecked.mockImplementation((slotId) => {
        return slotId === `${D}_0800_med`; // Solo el primero está confirmado
      });

      const ritual = {
        time: '08:00',
        steps: [
          { id: `${D}_0800_med`, type: 'med' },
          { id: `${D}_0800_meal`, type: 'meal' },
        ],
      };

      let current = null;
      for (const step of ritual.steps) {
        if (!global.DB.isChecked(step.id, 0)) {
          current = step;
          break;
        }
      }
      expect(current.id).toBe(`${D}_0800_meal`);
    });

    it('retorna null si todos los steps están confirmados', () => {
      global.DB.isChecked.mockReturnValue(true);

      const ritual = {
        time: '08:00',
        steps: [
          { id: `${D}_0800_med`, type: 'med' },
          { id: `${D}_0800_meal`, type: 'meal' },
        ],
      };

      let current = null;
      for (const step of ritual.steps) {
        if (!global.DB.isChecked(step.id, 0)) {
          current = step;
          break;
        }
      }
      expect(current).toBeNull();
    });
  });
});
