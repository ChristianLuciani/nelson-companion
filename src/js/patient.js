/**
 * patient.js — Interfaz simplificada para Nelson
 *
 * Diseño: una sola tarea visible a la vez.
 * - Slot actual o próximo en una tarjeta grande con foto y un botón ✓
 * - Vitales: 4 inputs grandes (sys/dia/pul/spo2)
 * - Voz auto-activada al confirmar identidad
 * - Sin tabs, sin export, sin alertas, sin historial
 *
 * Comparte db.js / supabase.js / protocol.js / tts.js con el cuidador.
 */
const Patient = (() => {
  let _protocol = null;
  let _state = {
    voiceEnabled: false,
    lastSpokenAt: {},   // slotId → timestamp (ms) de la última alarma
    notifPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  };
  let _tickInterval = null;
  let _audioCtx = null;

  // Ventana de alarma: hasta cuándo se considera "vigente" la hora del slot
  const ALARM_WINDOW_MIN = 30;
  // Repetición: si Nelson no marca el slot, vuelve a sonar cada N min
  const ALARM_REPEAT_MIN = 3;

  // ── INIT ──────────────────────────────────────────────────────────────
  async function init() {
    try {
      SupabaseClient.init();
      _protocol = await Protocol.load();
      if (!_protocol || !_protocol.days) throw new Error('Protocolo no disponible');

      if (window.TTS_CONFIG) TTS.configure(window.TTS_CONFIG);
      TTS.onSpeakStart(() => render());
      TTS.onSpeakEnd(()   => render());

      // Tick cada 15s — chequea alarmas pendientes y refresca reloj
      _tickInterval = setInterval(() => { _autoSpeak(); render(); }, 15000);
      render();
    } catch (e) {
      console.error('[Patient.init]', e.message);
      document.getElementById('app').innerHTML =
        `<div style="color:#C0392B;padding:2rem;font-size:18px;text-align:center">${e.message}</div>`;
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────
  function _todayStr() { return new Date().toISOString().slice(0,10); }
  function _nowMin()   { const n=new Date(); return n.getHours()*60+n.getMinutes(); }
  function _pad(n)     { return String(n).padStart(2,'0'); }
  function _timeStr()  { const n=new Date(); return `${_pad(n.getHours())}:${_pad(n.getMinutes())}`; }
  function _greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function _getPillPhoto(medId) {
    try { return localStorage.getItem(`nc_pill_${medId}`); } catch (_) { return null; }
  }

  // Slot vigente (15 min de ventana después de la hora) o el próximo del día
  function _getActiveSlot(day, nowMin) {
    if (!day) return null;
    const slots = day.slots || [];
    // Busca un slot reciente con tarea pendiente
    for (const slot of slots) {
      const slotMin = Protocol.timeToMin(slot.time);
      const age = nowMin - slotMin;
      if (age >= -5 && age <= 60) return slot;  // ±60min ventana
    }
    // Si no hay activo, devolvemos el próximo del día
    for (const slot of slots) {
      if (Protocol.timeToMin(slot.time) > nowMin) return slot;
    }
    return null;
  }

  function _isSlotDone(slot) {
    if (!slot) return false;
    if (slot.type === 'med' && slot.meds?.length) {
      return slot.meds.every((_, i) => Protocol.isChecked(slot.id, i));
    }
    if (slot.type === 'vital') {
      return !!(Protocol.getVital(slot.id, 'sys')
             && Protocol.getVital(slot.id, 'dia')
             && Protocol.getVital(slot.id, 'pul'));
    }
    return Protocol.isChecked(slot.id, 0);
  }

  // ── ALARMA ────────────────────────────────────────────────────────────
  // Suena al cruzar la hora del slot y se repite cada ALARM_REPEAT_MIN
  // hasta que Nelson marca la tarea o se cierra la ventana ALARM_WINDOW_MIN.
  function _autoSpeak() {
    if (!_state.voiceEnabled) return;
    const day = Protocol.getDay(_todayStr());
    const slot = _getActiveSlot(day, _nowMin());
    if (!slot || _isSlotDone(slot)) return;

    const slotMin = Protocol.timeToMin(slot.time);
    const age = _nowMin() - slotMin;
    if (age < 0 || age > ALARM_WINDOW_MIN) return;

    const lastAt = _state.lastSpokenAt[slot.id] || 0;
    const minSinceLast = (Date.now() - lastAt) / 60000;
    if (lastAt !== 0 && minSinceLast < ALARM_REPEAT_MIN) return;

    _state.lastSpokenAt[slot.id] = Date.now();
    _fireAlarm(slot);
  }

  function _fireAlarm(slot) {
    _playChime();
    if (navigator.vibrate) navigator.vibrate([220, 100, 220, 100, 440]);
    _showOSNotification(slot);
    // Voz después del chime (~600ms) para no solaparse
    setTimeout(() => TTS.speak(slot.speech, slot.id), 650);
  }

  // Chime corto (880Hz → 660Hz) usando Web Audio API — no requiere archivo
  function _playChime() {
    try {
      _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const ctx = _audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { /* Audio API no disponible — silencio */ }
  }

  // Notificación del SO (visible aunque la pestaña esté en background)
  // En iOS solo funciona si la app está instalada como PWA en home screen.
  function _showOSNotification(slot) {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    try {
      const titleByType = {
        med:      'Hora de pastilla',
        vital:    'Hora de medir presión',
        meal:     'Hora de comer',
        reminder: 'Recordatorio',
      };
      new Notification(titleByType[slot.type] || 'Nelson', {
        body: slot.speech,
        icon: 'assets/icon-192.png',
        badge: 'assets/icon-192.png',
        tag: slot.id,
        requireInteraction: true,
      });
    } catch (_) {}
  }

  function _requestNotificationPermission() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;
    Notification.requestPermission().then(p => {
      _state.notifPermission = p;
    }).catch(()=>{});
  }

  // ── RENDER ────────────────────────────────────────────────────────────
  function render() {
    const app = document.getElementById('app');
    if (!app || !_protocol) return;

    const today = _todayStr();
    const day   = Protocol.getDay(today);
    const slot  = _getActiveSlot(day, _nowMin());
    const next  = day ? Protocol.getNextSlot(today, _nowMin()) : null;

    let html = _renderHeader();

    if (!_state.voiceEnabled) html += _renderVoiceBanner();

    if (!day) {
      html += `<div class="p-card idle">
        <div class="p-big-icon">🌿</div>
        <p class="p-card-title" style="font-size:22px">Hoy no tienes pastillas programadas</p>
        <p style="color:#6B7280;font-size:15px;margin:0">Descansa bien Nelson.</p>
      </div>`;
    } else if (!slot) {
      html += `<div class="p-card idle">
        <div class="p-big-icon">✓</div>
        <p class="p-card-title" style="font-size:22px">Todo hecho por hoy</p>
        <p style="color:#6B7280;font-size:15px;margin:0">Muy bien Nelson. Buen trabajo.</p>
      </div>`;
    } else {
      html += _renderSlotCard(slot);
      if (next && next.id !== slot.id) html += _renderNextHint(next);
    }

    html += `<a href="index.html?switch" class="p-switch-mode">↻ cambiar modo</a>`;

    app.innerHTML = html;
    _attachEvents();
  }

  function _renderHeader() {
    return `<div class="p-header">
      <div>
        <p class="p-greeting">${_greeting()} Nelson</p>
      </div>
      <div class="p-time">${_timeStr()}</div>
    </div>`;
  }

  function _renderVoiceBanner() {
    return `<div class="p-voice-banner">
      <p>Activa la voz para escuchar los recordatorios</p>
      <button class="p-action-btn" data-action="enableVoice">🔊 Activar voz</button>
    </div>`;
  }

  function _renderSlotCard(slot) {
    const done = _isSlotDone(slot);
    const cardClass = done ? 'p-card done' : 'p-card current';
    const speaking = TTS.isSpeaking();
    const speakBtn = `<button class="p-voice-btn ${speaking?'speaking':''}"
      data-action="speak" data-text="${_escape(slot.speech)}" data-slot="${slot.id}">🔊</button>`;

    let body = '';
    const titleByType = {
      med:      '💊 Tu pastilla',
      vital:    '❤️ Mide tu presión',
      meal:     '🌿 Comida',
      reminder: '✈️ Recordatorio',
    };
    const title = titleByType[slot.type] || '📋 Tarea';

    if (slot.type === 'med' && slot.meds?.length) {
      body = slot.meds.map((m, i) => _renderPillRow(slot.id, i, m)).join('');
    } else if (slot.type === 'vital') {
      body = _renderVitalInputs(slot.id);
    } else {
      body = `<p style="font-size:18px;line-height:1.4;margin:0 0 1rem">${_escape(slot.speech)}</p>`;
      body += `<button class="p-action-btn ${done?'done':''}" data-action="ackSlot" data-slot="${slot.id}">
        ${done ? '✓ Hecho' : '✓ Hecho'}
      </button>`;
    }

    return `<div class="${cardClass}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.75rem">
        <div style="flex:1;min-width:0">
          <p class="p-card-time">${slot.time}</p>
          <p class="p-card-title">${title}</p>
        </div>
        ${speakBtn}
      </div>
      ${body}
    </div>`;
  }

  function _renderPillRow(slotId, idx, med) {
    const checked = Protocol.isChecked(slotId, idx);
    const photo = _getPillPhoto(med.id || med);
    const name  = med.name || med;
    const dose  = med.dose || '';
    return `
      <div class="p-pill">
        ${photo
          ? `<img class="p-pill-photo" src="${photo}" alt="${_escape(name)}"/>`
          : `<div class="p-pill-placeholder">💊</div>`}
        <div class="p-pill-info">
          <p class="p-pill-name">${_escape(name)}</p>
          <p class="p-pill-dose">${_escape(dose)}</p>
        </div>
      </div>
      <button class="p-action-btn ${checked?'done':''}"
        data-action="toggleMed" data-slot="${slotId}" data-idx="${idx}"
        style="margin-bottom:0.5rem">
        ${checked ? '✓ Tomada' : '✓ Tomada'}
      </button>`;
  }

  function _renderVitalInputs(slotId) {
    const fields = [
      ['sys',  'Alta',  'mmHg'],
      ['dia',  'Baja',  'mmHg'],
      ['pul',  'Pulso', 'bpm'],
      ['spo2', 'SpO₂',  '%'],
    ];
    const grid = fields.map(([f, l, u]) => `
      <div class="p-vital-field">
        <p class="p-vital-label">${l}</p>
        <input type="number" inputmode="numeric" placeholder="—"
          class="p-vital-input"
          value="${Protocol.getVital(slotId, f) || ''}"
          data-action="saveVital" data-slot="${slotId}" data-field="${f}"/>
        <span class="p-vital-unit">${u}</span>
      </div>`).join('');
    return `<div class="p-vital-grid">${grid}</div>`;
  }

  function _renderNextHint(next) {
    const summary = next.type === 'med' && next.meds?.length
      ? '💊 ' + next.meds.map(m => m.name || m).join(', ')
      : ({vital: '❤️ Medir presión', meal: '🌿 Comida', reminder: '✈️ Recordatorio'})[next.type] || '📋';
    return `<div class="p-next">
      <strong>Después:</strong> ${next.time} — ${_escape(summary)}
    </div>`;
  }

  function _escape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── EVENTS ────────────────────────────────────────────────────────────
  function _attachEvents() {
    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', _onClick);
      el.addEventListener('change', _onChange);
    });
  }

  function _onClick(e) {
    const el = e.currentTarget;
    const a = el.dataset.action;
    switch (a) {
      case 'enableVoice':
        _state.voiceEnabled = true;
        // Desbloquea AudioContext (requiere gesto de usuario en iOS)
        _playChime();
        // Pide permiso de notificación OS si está disponible
        _requestNotificationPermission();
        TTS.speak(`${_greeting()} Nelson. Estoy aquí para ayudarte. Te avisaré cuando sea hora de tus pastillas.`);
        render();
        break;
      case 'speak':
        TTS.speak(el.dataset.text, el.dataset.slot);
        break;
      case 'toggleMed': {
        const checked = Protocol.toggleCheck(el.dataset.slot, parseInt(el.dataset.idx));
        if (checked) TTS.speak('Muy bien Nelson. Pastilla registrada.');
        render();
        break;
      }
      case 'ackSlot': {
        // Para meal/reminder: marca como completado (slot, índice 0)
        const checked = Protocol.toggleCheck(el.dataset.slot, 0);
        if (checked) TTS.speak('Muy bien Nelson.');
        render();
        break;
      }
    }
  }

  function _onChange(e) {
    const el = e.currentTarget;
    if (el.dataset.action === 'saveVital') {
      Protocol.saveVital(el.dataset.slot, el.dataset.field, el.value);
    }
  }

  // Re-render al perder foco un input (para reflejar el ✓ de "completo")
  document.addEventListener('blur', e => {
    if (e.target.dataset?.action === 'saveVital') render();
  }, true);

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => Patient.init());
