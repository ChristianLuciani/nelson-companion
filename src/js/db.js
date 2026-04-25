/**
 * db.js — Capa de persistencia offline-first
 *
 * Estrategia:
 *   1. Escribir en localStorage PRIMERO (inmediato, sin latencia, funciona offline)
 *   2. Sync a Supabase en background (sin bloquear la UI)
 *   3. Al cargar, merge Supabase → localStorage (Supabase gana en conflictos)
 *   4. Si Supabase no disponible, operar solo en localStorage sin error visible
 *
 * API pública compatible con protocol.js para facilitar la migración.
 */
const DB = (() => {
  const PATIENT = 'nelson_luciani';

  // ── LOCAL STORAGE HELPERS ───────────────────────────────────────────
  function _lsGet(key, fallback = {}) {
    try { return JSON.parse(localStorage.getItem(`nc_${key}`) || 'null') ?? fallback; }
    catch (_) { return fallback; }
  }
  function _lsSet(key, val) {
    try { localStorage.setItem(`nc_${key}`, JSON.stringify(val)); } catch (_) {}
  }

  // ── SUPABASE SYNC (background, never throws) ──────────────────────────
  async function _sync(table, data, matchOn = ['slot_id', 'patient_id']) {
    if (!SupabaseClient.isReady()) return;
    try {
      const { error } = await SupabaseClient.getClient()
        .from(table)
        .upsert({ patient_id: PATIENT, ...data, updated_at: new Date().toISOString() },
                 { onConflict: matchOn.join(',') });
      if (error) console.warn(`[DB] sync ${table}:`, error.message);
    } catch (e) { console.warn(`[DB] sync ${table} failed:`, e.message); }
  }

  // ── MEDICATION CHECKS ────────────────────────────────────────────────
  function saveCheck(slotId, medIdx, checked, meta = {}) {
    // 1. localStorage inmediato
    const checks = _lsGet('checks', {});
    const key    = `${slotId}_${medIdx}`;
    checks[key]  = checked;
    _lsSet('checks', checks);

    // 2. Supabase background
    _sync('medication_logs', {
      slot_id:    slotId,
      date:       slotId.slice(0,4)+'-'+slotId.slice(4,6)+'-'+slotId.slice(6,8),
      time:       slotId.slice(9,11)+':'+slotId.slice(11,13),
      med_id:     meta.medId || null,
      med_name:   meta.medName || null,
      med_dose:   meta.medDose || null,
      checked,
      checked_at: checked ? new Date().toISOString() : null,
    }, ['slot_id', 'med_id', 'patient_id']);
  }

  function isChecked(slotId, medIdx) {
    return !!_lsGet('checks', {})[`${slotId}_${medIdx}`];
  }

  function toggleCheck(slotId, medIdx, meta = {}) {
    const next = !isChecked(slotId, medIdx);
    saveCheck(slotId, medIdx, next, meta);
    return next;
  }

  // ── VITALS ───────────────────────────────────────────────────────────
  function saveVital(slotId, field, value) {
    // 1. localStorage inmediato
    const vitals = _lsGet('vitals', {});
    if (!vitals[slotId]) vitals[slotId] = {};
    vitals[slotId][field] = value;
    _lsSet('vitals', vitals);

    // 2. Supabase background — solo cuando hay los 3 campos
    const v = vitals[slotId];
    if (v.sys && v.dia && v.pul) {
      _sync('vital_logs', {
        slot_id: slotId,
        date:    slotId.slice(0,4)+'-'+slotId.slice(4,6)+'-'+slotId.slice(6,8),
        time:    slotId.slice(9,11)+':'+slotId.slice(11,13),
        sys:     parseInt(v.sys)  || null,
        dia:     parseInt(v.dia)  || null,
        pul:     parseInt(v.pul)  || null,
        spo2:    parseInt(v.spo2) || null,
        note:    v.note || null,
      }, ['slot_id', 'patient_id']);
    }
  }

  function getVital(slotId, field) {
    return _lsGet('vitals', {})[slotId]?.[field] || '';
  }

  function saveNote(slotId, text) {
    const notes = _lsGet('notes', {});
    notes[slotId] = text;
    _lsSet('notes', notes);
  }

  function getNote(slotId) { return _lsGet('notes', {})[slotId] || ''; }

  // ── PILL PHOTOS ───────────────────────────────────────────────────────
  async function savePillPhoto(medId, file) {
    // 1. localStorage base64 inmediato
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = async e => {
        try { _lsSet(`pill_${medId}`, e.target.result); } catch (_) {}

        // 2. Supabase Storage en background
        if (SupabaseClient.isReady()) {
          try {
            const sb   = SupabaseClient.getClient();
            const path = `${PATIENT}/${medId}.jpg`;
            const { data, error } = await sb.storage
              .from('pill-photos')
              .upload(path, file, { upsert: true, contentType: file.type });
            if (!error && data) {
              const { data: { publicUrl } } = sb.storage
                .from('pill-photos').getPublicUrl(path);
              await _sync('pill_photos', { med_id: medId, photo_url: publicUrl },
                         ['med_id', 'patient_id']);
            }
          } catch (e) { console.warn('[DB] pill photo upload:', e.message); }
        }
        resolve(e.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function getPillPhoto(medId) {
    try { return localStorage.getItem(`nc_pill_${medId}`); } catch (_) { return null; }
  }

  // ── HYDRATION FROM SUPABASE ───────────────────────────────────────────
  async function hydrateFromCloud(dateStr) {
    if (!SupabaseClient.isReady()) return;
    try {
      const sb = SupabaseClient.getClient();

      // Checks
      const { data: meds } = await sb.from('medication_logs')
        .select('slot_id,med_id,checked,checked_at')
        .eq('patient_id', PATIENT).eq('date', dateStr);
      if (meds) {
        const checks = _lsGet('checks', {});
        meds.forEach(m => {
          if (m.med_id) checks[`${m.slot_id}_${m.med_id}`] = m.checked;
        });
        _lsSet('checks', checks);
      }

      // Vitals
      const { data: vitals } = await sb.from('vital_logs')
        .select('slot_id,sys,dia,pul,spo2,note')
        .eq('patient_id', PATIENT).eq('date', dateStr);
      if (vitals) {
        const local = _lsGet('vitals', {});
        vitals.forEach(v => {
          if (!local[v.slot_id]) local[v.slot_id] = {};
          Object.assign(local[v.slot_id], {
            sys: v.sys?.toString(), dia: v.dia?.toString(),
            pul: v.pul?.toString(), spo2: v.spo2?.toString(), note: v.note
          });
        });
        _lsSet('vitals', local);
      }
    } catch (e) { console.warn('[DB] hydrate failed:', e.message); }
  }

  // ── EXPORT CSV ───────────────────────────────────────────────────────
  function exportCSV() {
    const checks = _lsGet('checks', {});
    const vitals = _lsGet('vitals', {});
    const rows   = ['date,slotId,time,type,medId,medName,dose,checked,sys,dia,pul,note'];

    // Reconstruir desde protocol si está disponible
    const days = window._protocolData?.days || {};
    for (const [date, day] of Object.entries(days)) {
      for (const slot of (day.slots || [])) {
        const v = vitals[slot.id] || {};
        if (slot.meds?.length) {
          slot.meds.forEach((m, i) => {
            const ck = checks[`${slot.id}_${i}`] ? 1 : 0;
            rows.push(`${date},${slot.id},${slot.time},med,${m.id||m},${m.name||m},${m.dose||''},${ck},${v.sys||''},${v.dia||''},${v.pul||''},`);
          });
        } else if (slot.type === 'vital') {
          rows.push(`${date},${slot.id},${slot.time},vital,,,,0,${v.sys||''},${v.dia||''},${v.pul||''},${v.note||''}`);
        }
      }
    }
    return rows.join('\n');
  }

  return {
    saveCheck, isChecked, toggleCheck,
    saveVital, getVital, saveNote, getNote,
    savePillPhoto, getPillPhoto,
    hydrateFromCloud, exportCSV
  };
})();

if (typeof module !== 'undefined') module.exports = DB;
