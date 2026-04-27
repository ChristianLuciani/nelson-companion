/**
 * Protocol module — carga y gestiona el protocolo diario de medicamentos y vitales
 * Integrado con DB para persistencia offline-first
 */
const Protocol = (() => {
  let _protocol = null;

  async function load() {
    if (_protocol) return _protocol;
    try {
      const res = await fetch('protocol.json');
      _protocol = await res.json();
      // Ordenar slots por time en cada día (fix: 2026-04-25 tiene 12:30 antes de 12:00)
      if (_protocol.days) {
        Object.values(_protocol.days).forEach(day => {
          if (day.slots) {
            day.slots.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
          }
        });
      }
      window._protocolData = _protocol; // para exportCSV
      // Hydrate from cloud se hace en background sin bloquear UI
      if (typeof DB !== 'undefined' && DB) DB.hydrateFromCloud(todayStr()).catch(e => console.warn('[DB] hydrate:', e));
      return _protocol;
    } catch (e) {
      console.warn('[Protocol] load failed:', e.message);
      return { medications: {}, days: {} };
    }
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function timeToMin(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  function getDay(dateStr) {
    return _protocol?.days?.[dateStr] || null;
  }

  function getCurrentSlot(dateStr, nowMin) {
    const day = getDay(dateStr);
    if (!day) return null;
    let current = null;
    for (const slot of day.slots || []) {
      if (timeToMin(slot.time) <= nowMin) current = slot;
    }
    return current;
  }

  function getNextSlot(dateStr, nowMin) {
    const day = getDay(dateStr);
    if (!day) return null;
    for (const slot of day.slots || []) {
      if (timeToMin(slot.time) > nowMin) return slot;
    }
    return null;
  }

  function getRituals(dateStr) {
    const day = getDay(dateStr);
    if (!day) return [];
    const ritualMap = {};
    for (const slot of day.slots || []) {
      if (!ritualMap[slot.time]) {
        ritualMap[slot.time] = { time: slot.time, steps: [] };
      }
      ritualMap[slot.time].steps.push(slot);
    }
    return Object.values(ritualMap).sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
  }

  function getCurrentRitual(now) {
    const dateStr = now.toISOString().slice(0, 10);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const rituals = getRituals(dateStr);
    let current = null;
    for (const ritual of rituals) {
      if (timeToMin(ritual.time) <= nowMin) current = ritual;
    }
    return current;
  }

  function getCurrentStep(ritual) {
    if (!ritual || !ritual.steps) return null;
    for (const step of ritual.steps) {
      if (!DB.isChecked(step.id, 0)) return step;
    }
    return null;
  }

  function getNextRitual(now) {
    const dateStr = now.toISOString().slice(0, 10);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const rituals = getRituals(dateStr);
    for (const ritual of rituals) {
      if (timeToMin(ritual.time) > nowMin) return ritual;
    }
    return null;
  }

  function isChecked(slotId, medIdx) {
    return DB.isChecked(slotId, medIdx);
  }

  function toggleCheck(slotId, medIdx) {
    const meds = _protocol?.medications || {};
    const day = Object.values(_protocol?.days || {}).find(d =>
      (d.slots || []).some(s => s.id === slotId)
    );
    const slot = day?.slots?.find(s => s.id === slotId);
    const med = slot?.meds?.[medIdx];
    return DB.toggleCheck(slotId, medIdx, {
      medId: med?.id || med,
      medName: med?.name || med,
      medDose: med?.dose || ''
    });
  }

  function saveVital(slotId, field, value) {
    return DB.saveVital(slotId, field, value);
  }

  function getVital(slotId, field) {
    return DB.getVital(slotId, field);
  }

  function exportCSV() {
    return DB.exportCSV();
  }

  return {
    load, getDay, getCurrentSlot, getNextSlot,
    getRituals, getCurrentRitual, getCurrentStep, getNextRitual,
    timeToMin, isChecked, toggleCheck,
    saveVital, getVital, exportCSV
  };
})();

if (typeof module !== 'undefined') module.exports = Protocol;
