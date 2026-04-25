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
      window._protocolData = _protocol; // para exportCSV
      // Hydrate from cloud se hace en background sin bloquear UI
      if (DB) DB.hydrateFromCloud(todayStr()).catch(e => console.warn('[DB] hydrate:', e));
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
    for (const slot of day.slots || []) {
      const slotMin = timeToMin(slot.time);
      if (slotMin <= nowMin) {
        let hasNextSlot = false;
        for (const s of (day.slots || [])) {
          if (timeToMin(s.time) > nowMin) { hasNextSlot = true; break; }
        }
        if (hasNextSlot || slotMin === nowMin) return slot;
      }
    }
    return null;
  }

  function getNextSlot(dateStr, nowMin) {
    const day = getDay(dateStr);
    if (!day) return null;
    for (const slot of day.slots || []) {
      if (timeToMin(slot.time) > nowMin) return slot;
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
    timeToMin, isChecked, toggleCheck,
    saveVital, getVital, exportCSV
  };
})();

if (typeof module !== 'undefined') module.exports = Protocol;
