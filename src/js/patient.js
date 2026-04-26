/**
 * patient.js — Vista de Nelson (paciente)
 *
 * Flujo secuencial de tareas con alarmas por tiempo.
 * BP: multi-paso (intro → sys → dia → confirm)
 * Walk: timer independiente que no reinicia el render completo
 * SOS: modal bottom-sheet con 3 contactos
 *
 * Lógica preservada: _autoSpeak, _playChime, _showOSNotification, TTS, DB
 */
const Patient = (() => {
  let _protocol = null;
  let _state = {
    voiceEnabled: false,
    taskIdx: 0,
    showDone: false,
    sosOpen: false,
    bpStep: 'intro',  // intro | sys | dia | pul | spo2 | confirm
    bpSys: 130,
    bpDia: 80,
    bpPul: 70,
    bpSpo2: null,     // null = no medido (oxímetro opcional)
    walkSec: 0,
    walkRunning: false,
    walkInterval: null,
    lastSpokenAt: {},
    notifPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  };

  const ALARM_WINDOW_MIN = 30;
  const ALARM_REPEAT_MIN = 3;

  const HALO_TONE = { med: 'butter', vital: 'rose', meal: 'sage', walk: 'lavender', photo: 'terracotta' };
  const ICON_COL  = { med: '#8a5a1a', vital: '#a13a3a', meal: '#3d6b2f', walk: '#5a4585', photo: '#a05030' };

  // ── INIT ──────────────────────────────────────────────────────
  async function init() {
    try {
      SupabaseClient.init();
      _protocol = await Protocol.load();
      if (!_protocol || !_protocol.days) throw new Error('Protocolo no disponible');

      if (window.TTS_CONFIG) TTS.configure(window.TTS_CONFIG);
      TTS.onSpeakStart(() => _updateSpeakingState());
      TTS.onSpeakEnd(()   => _updateSpeakingState());

      _state.taskIdx = _findStartingIdx();
      setInterval(() => { _autoSpeak(); _tickClock(); }, 15000);
      render();
    } catch (e) {
      console.error('[Patient.init]', e.message);
      document.getElementById('app').innerHTML =
        `<div class="p-idle"><p style="color:var(--danger);font-size:18px">${_esc(e.message)}</p></div>`;
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────
  function _todayStr() { return new Date().toISOString().slice(0, 10); }
  function _nowMin()   { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
  function _pad(n)     { return String(n).padStart(2, '0'); }
  function _timeStr()  { const n = new Date(); return `${_pad(n.getHours())}:${_pad(n.getMinutes())}`; }
  function _dateLabel() {
    const d = new Date();
    const days   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  }
  function _greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  }
  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function _todaySlots() {
    const day = Protocol.getDay(_todayStr());
    return day ? (day.slots || []) : [];
  }
  function _isSlotDone(slot) {
    if (!slot) return false;
    if (slot.type === 'med' && slot.meds?.length)
      return slot.meds.every((_, i) => Protocol.isChecked(slot.id, i));
    if (slot.type === 'vital')
      return !!(Protocol.getVital(slot.id, 'sys') && Protocol.getVital(slot.id, 'dia'));
    return Protocol.isChecked(slot.id, 0);
  }
  function _findStartingIdx() {
    const slots = _todaySlots();
    if (!slots.length) return 0;
    const now = _nowMin();
    for (let i = 0; i < slots.length; i++) {
      if (!_isSlotDone(slots[i]) && Protocol.timeToMin(slots[i].time) <= now + 60) return i;
    }
    for (let i = 0; i < slots.length; i++) {
      if (!_isSlotDone(slots[i])) return i;
    }
    return slots.length;
  }

  // ── ALARMA ────────────────────────────────────────────────────
  function _autoSpeak() {
    if (!_state.voiceEnabled) return;
    const now = _nowMin();
    for (const slot of _todaySlots()) {
      if (_isSlotDone(slot)) continue;
      const age = now - Protocol.timeToMin(slot.time);
      if (age < 0 || age > ALARM_WINDOW_MIN) continue;
      const last = _state.lastSpokenAt[slot.id] || 0;
      if (last && (Date.now() - last) / 60000 < ALARM_REPEAT_MIN) continue;
      _state.lastSpokenAt[slot.id] = Date.now();
      _fireAlarm(slot);
      break;
    }
  }
  function _fireAlarm(slot) {
    _playChime();
    if (navigator.vibrate) navigator.vibrate([220, 100, 220, 100, 440]);
    _showOSNotification(slot);
    setTimeout(() => TTS.speak(slot.speech, slot.id), 650);
  }
  function _playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch (_) {}
  }
  function _showOSNotification(slot) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      const titles = { med: 'Hora de pastilla', vital: 'Hora de medir presión', meal: 'Hora de comer', walk: 'Hora de caminar' };
      new Notification(titles[slot.type] || 'Nelson', { body: slot.speech, icon: 'assets/icon-192.png', tag: slot.id, requireInteraction: true });
    } catch (_) {}
  }
  function _requestNotifPermission() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    Notification.requestPermission().then(p => { _state.notifPermission = p; }).catch(() => {});
  }

  // ── LIVE UPDATES (sin re-render completo) ─────────────────────
  function _tickClock() {
    const el = document.querySelector('.p-time');
    if (el) el.textContent = _timeStr();
  }
  function _updateSpeakingState() {
    document.querySelectorAll('.p-replay').forEach(btn => btn.classList.toggle('speaking', TTS.isSpeaking()));
  }

  // ── WALK TIMER ────────────────────────────────────────────────
  function _startWalkTimer() {
    if (_state.walkRunning) return;
    _state.walkRunning = true;
    _state.walkInterval = setInterval(() => {
      _state.walkSec++;
      const el = document.getElementById('walk-timer-display');
      if (el) el.textContent = `${_pad(Math.floor(_state.walkSec / 60))}:${_pad(_state.walkSec % 60)}`;
      const btn = document.getElementById('walk-toggle-btn');
      if (btn) btn.textContent = 'Pausar';
    }, 1000);
  }
  function _pauseWalkTimer() {
    _state.walkRunning = false;
    clearInterval(_state.walkInterval);
    _state.walkInterval = null;
    const btn = document.getElementById('walk-toggle-btn');
    if (btn) btn.textContent = _state.walkSec === 0 ? 'Empezar' : 'Continuar';
  }

  // ── RENDER ────────────────────────────────────────────────────
  function render() {
    const app = document.getElementById('app');
    if (!app || !_protocol) return;

    const slots = _todaySlots();
    const allDone = slots.length > 0 && _state.taskIdx >= slots.length;
    const task = slots[Math.min(_state.taskIdx, slots.length - 1)];

    _pauseWalkTimer();
    if (!_state.showDone) _state.walkSec = 0;

    let html = _renderHeader();
    if (!_state.voiceEnabled) html += _renderVoiceBanner();

    if (!slots.length) {
      html += _renderIdle('🌿', 'Sin tareas hoy', 'Descansá bien Nelson.');
    } else {
      html += _renderProgressDots(slots);
      if (allDone && !_state.showDone) {
        html += _renderIdleAllDone();
      } else if (_state.showDone) {
        html += _renderDoneScreen(_state.taskIdx < slots.length - 1, allDone);
      } else {
        html += _renderTaskScreen(task);
      }
    }

    html += `<a href="index.html?switch" class="p-switch-mode">↻ cambiar modo</a>`;
    app.innerHTML = html;

    if (_state.sosOpen) _showSOS();
    _attachEvents();
  }

  // ── PARTIALS ──────────────────────────────────────────────────
  function _renderHeader() {
    return `<div class="p-header">
      <div class="p-header-left">
        <div class="p-date">${_dateLabel()}</div>
        <div class="p-time">${_timeStr()}</div>
      </div>
      <button class="p-sos-btn" data-action="sos" aria-label="Llamar al cuidador">
        ${Icons.get('phone', 32, '#fff', 2.6)}
      </button>
    </div>`;
  }

  function _renderProgressDots(slots) {
    return `<div class="p-progress">${slots.map((_, i) => {
      const cls = i < _state.taskIdx ? 'done' : i === _state.taskIdx ? 'current' : 'pending';
      return `<div class="p-progress-dot ${cls}"></div>`;
    }).join('')}</div>`;
  }

  function _renderVoiceBanner() {
    const notifGranted = _state.notifPermission === 'granted';
    const notifBlocked = _state.notifPermission === 'denied';
    const notifHint = notifGranted
      ? '· Notificaciones activas'
      : notifBlocked
      ? '· Notificaciones bloqueadas en ajustes del navegador'
      : '· Activar también pedirá permiso para notificaciones';
    return `<div class="p-voice-banner">
      <p>Activá la voz para escuchar los recordatorios <span style="font-size:14px;opacity:.7">${notifHint}</span></p>
      <button class="p-voice-unlock-btn" data-action="enableVoice">
        ${Icons.get('speaker', 24, '#fff', 2.4)} Activar voz
      </button>
    </div>`;
  }

  function _taskArea(content) {
    return `<div class="p-task-area">${content}</div>`;
  }

  function _replayBtn(text) {
    return `<button class="p-replay" data-action="speak" data-text="${_esc(text)}">
      ${Icons.get('speaker', 28, 'currentColor', 2.4)} Escuchar otra vez
    </button>`;
  }

  function _listoBtn(label, tone) {
    tone = tone || 'primary';
    const icon = tone === 'primary' ? Icons.get('check', 42, '#fff', 3.2) : '';
    return `<button class="p-listo ${tone}" data-action="listo">${icon} ${_esc(label)}</button>`;
  }

  // ── TASK SCREENS ──────────────────────────────────────────────
  function _renderTaskScreen(slot) {
    const map = { med: _renderMedScreen, vital: _renderBPScreen, meal: _renderMealScreen, walk: _renderWalkScreen, photo: _renderPhotoScreen };
    return (map[slot.type] || _renderGenericScreen)(slot);
  }

  function _renderMedScreen(slot) {
    const meds = slot.meds || [];
    const rows = meds.map((m, i) => `<div class="p-pill-row">
      <div class="p-pill-num">${i + 1}</div>
      <span>${_esc(m.name)} <span style="color:var(--muted);font-weight:500">${_esc(m.dose || '')}</span></span>
    </div>`).join('');
    const speech = slot.speech || `Tomá ${meds.map(m => m.name).join(' y ')}.`;
    return _taskArea(`
      <div class="p-halo butter">${Icons.get('pill', 120, ICON_COL.med, 2.5)}</div>
      <div class="p-task-text">
        <div class="p-task-title">Tomá tu pastilla</div>
        <p class="p-task-desc">${_esc(slot.desc || (meds[0] && meds[0].description) || '')}</p>
      </div>
      <div class="p-pill-card">${rows}</div>
      ${_replayBtn(speech)}
      ${_listoBtn('YA LA TOMÉ')}
    `);
  }

  function _renderMealScreen(slot) {
    const icon   = slot.icon || 'plate';
    const speech = slot.speech || `Hora de ${(slot.label || 'comer').toLowerCase()}.`;
    return _taskArea(`
      <div class="p-halo sage">${Icons.get(icon, 120, ICON_COL.meal, 2.5)}</div>
      <div class="p-task-text">
        <div class="p-task-title">${_esc(slot.label || 'Comida')}</div>
        <p class="p-task-desc">${_esc(slot.desc || '')}</p>
      </div>
      ${_replayBtn(speech)}
      ${_listoBtn('YA COMÍ')}
    `);
  }

  function _renderWalkScreen(slot) {
    const speech = slot.speech || `${slot.label || 'Caminar'}. ${slot.desc || ''}`;
    const mm = _pad(Math.floor(_state.walkSec / 60));
    const ss = _pad(_state.walkSec % 60);
    const toggleLabel = _state.walkRunning ? 'Pausar' : (_state.walkSec === 0 ? 'Empezar' : 'Continuar');
    return _taskArea(`
      <div class="p-halo lavender">${Icons.get('walk', 120, ICON_COL.walk, 2.5)}</div>
      <div class="p-task-text">
        <div class="p-task-title">${_esc(slot.label || 'Caminata')}</div>
        <p class="p-task-desc">${_esc(slot.desc || '')}</p>
      </div>
      <div class="p-walk-timer-card">
        <div class="p-walk-timer" id="walk-timer-display">${mm}:${ss}</div>
        <button class="p-walk-toggle" id="walk-toggle-btn" data-action="walkToggle">${toggleLabel}</button>
      </div>
      ${_replayBtn(speech)}
      ${_listoBtn('TERMINÉ')}
    `);
  }

  function _renderPhotoScreen(slot) {
    const isMorning = slot.icon === 'sun' || slot.id.includes('0730');
    const speech = slot.speech || (isMorning ? 'Buen día Nelson.' : 'Hora de descansar.');
    const card = isMorning
      ? `<div class="p-photo-card" style="background:linear-gradient(160deg,#f5d8a3 0%,#e8a577 50%,#c97456 100%)">
           <div style="position:absolute;top:30px;right:40px;width:70px;height:70px;border-radius:50%;background:#fff5d6;box-shadow:0 0 60px rgba(255,240,180,.9)"></div>
           <div style="position:absolute;bottom:0;left:0;right:0;height:40%;background:radial-gradient(ellipse at 30% 100%,#8b9d5a,#6b7d3a 60%,transparent 70%),radial-gradient(ellipse at 80% 100%,#a8b06a,#758c4a 60%,transparent 70%)"></div>
           <div class="p-photo-label">${_dateLabel()}</div>
         </div>`
      : `<div class="p-photo-card" style="background:linear-gradient(180deg,#2b3a55 0%,#5a6788 60%,#d8a567 100%)">
           <div style="position:absolute;top:30px;right:40px;width:70px;height:70px;border-radius:50%;background:#f0e6c8;box-shadow:0 0 40px rgba(240,230,200,.6)"></div>
           <div style="position:absolute;bottom:0;left:0;right:0;height:40%;background:radial-gradient(ellipse at 30% 100%,#1f2a3a,#14202e 60%,transparent 70%),radial-gradient(ellipse at 80% 100%,#2a3a4a,#1a2738 60%,transparent 70%)"></div>
           <div class="p-photo-label">Hora de descansar</div>
         </div>`;
    return _taskArea(`
      ${card}
      <div class="p-task-text">
        <div class="p-task-title">${_esc(slot.label || (isMorning ? 'Buen día, Nelson' : 'Siesta'))}</div>
        <p class="p-task-desc">${_esc(slot.desc || '')}</p>
      </div>
      ${_replayBtn(speech)}
      ${_listoBtn(isMorning ? 'EMPEZAR EL DÍA' : 'LISTO')}
    `);
  }

  function _renderBPScreen(slot) {
    const step = _state.bpStep;
    if (step === 'intro') {
      const speech = slot.speech || 'Ponete el tensiómetro en el brazo izquierdo.';
      return _taskArea(`
        <div class="p-halo rose">${Icons.get('heart', 120, ICON_COL.vital, 2.5)}</div>
        <div class="p-task-text">
          <div class="p-task-title">Tomar la presión</div>
          <p class="p-task-desc">Brazo izquierdo, sentado<br>Esperá el resultado</p>
        </div>
        ${_replayBtn(speech)}
        <button class="p-listo primary" data-action="bpNext">
          ${Icons.get('arrow-right', 42, '#fff', 3)} YA LO TENGO
        </button>
      `);
    }
    if (step === 'sys' || step === 'dia' || step === 'pul') {
      const isPul = step === 'pul';
      const isSys = step === 'sys';
      const value = isPul ? _state.bpPul : (isSys ? _state.bpSys : _state.bpDia);
      const label = isPul ? 'Pulso' : (isSys ? 'Número de arriba' : 'Número de abajo');
      const sub   = isPul ? '(latidos por minuto)' : (isSys ? '(sistólica)' : '(diastólica)');
      const replayText = isPul
        ? `El pulso es ${value}.`
        : `El ${isSys ? 'número de arriba' : 'número de abajo'} es ${value}.`;
      return _taskArea(`
        <div class="p-bp-label">
          <div class="p-bp-label-main">${label}</div>
          <div class="p-bp-label-sub">${sub}</div>
        </div>
        <div class="p-bp-stepper">
          <button class="p-bp-step-btn" data-action="bpAdj" data-delta="-1">${Icons.get('minus', 44, '#fff', 3.2)}</button>
          <div class="p-bp-value" id="bp-value-display">${value}</div>
          <button class="p-bp-step-btn" data-action="bpAdj" data-delta="1">${Icons.get('plus', 44, '#fff', 3.2)}</button>
        </div>
        <div class="p-bp-jumps">
          ${[-10,-5,+5,+10].map(d =>
            `<button class="p-bp-jump" data-action="bpAdj" data-delta="${d}">${d > 0 ? '+' + d : d}</button>`
          ).join('')}
        </div>
        ${_replayBtn(replayText)}
        <button class="p-listo primary" data-action="bpNext">
          ${Icons.get('arrow-right', 42, '#fff', 3)} SIGUIENTE
        </button>
      `);
    }
    // spo2 — optional step with SALTAR
    if (step === 'spo2') {
      const val = _state.bpSpo2 ?? 98;
      return _taskArea(`
        <div class="p-halo rose">${Icons.get('heart', 120, ICON_COL.vital, 2.5)}</div>
        <div class="p-bp-label">
          <div class="p-bp-label-main">Oxígeno en sangre</div>
          <div class="p-bp-label-sub">(SpO₂ — si tenés el oxímetro)</div>
        </div>
        <div class="p-bp-stepper">
          <button class="p-bp-step-btn" data-action="bpAdj" data-delta="-1">${Icons.get('minus', 44, '#fff', 3.2)}</button>
          <div class="p-bp-value" id="bp-value-display">${val}</div>
          <button class="p-bp-step-btn" data-action="bpAdj" data-delta="1">${Icons.get('plus', 44, '#fff', 3.2)}</button>
        </div>
        <div class="p-bp-jumps">
          ${[-2,-1,+1,+2].map(d =>
            `<button class="p-bp-jump" data-action="bpAdj" data-delta="${d}">${d > 0 ? '+' + d : d}</button>`
          ).join('')}
        </div>
        ${_replayBtn(`El oxígeno es ${val} por ciento.`)}
        <button class="p-listo primary" data-action="bpNext">
          ${Icons.get('arrow-right', 42, '#fff', 3)} SIGUIENTE
        </button>
        <button class="p-bp-redo" data-action="bpSpo2Skip">No tengo oxímetro — Saltar</button>
      `);
    }
    // confirm
    const spo2Line = _state.bpSpo2 != null
      ? `<p class="p-bp-confirm" style="margin-top:6px">SpO₂: <strong>${_state.bpSpo2}%</strong></p>`
      : '';
    const confirmSpeech = `Tu presión es ${_state.bpSys} sobre ${_state.bpDia}. Pulso ${_state.bpPul}${_state.bpSpo2 != null ? `. Oxígeno ${_state.bpSpo2} por ciento` : ''}.`;
    return _taskArea(`
      <div class="p-halo rose" style="width:180px;height:180px">${Icons.get('heart', 100, ICON_COL.vital, 2.5)}</div>
      <div style="text-align:center">
        <p class="p-bp-confirm">Tu presión es</p>
        <div class="p-bp-result">${_state.bpSys}/${_state.bpDia}</div>
        <p class="p-bp-confirm" style="margin-top:10px">Pulso: <strong>${_state.bpPul}</strong> lpm</p>
        ${spo2Line}
      </div>
      ${_replayBtn(confirmSpeech)}
      <button class="p-bp-redo" data-action="bpRedo">Volver a escribir</button>
      ${_listoBtn('GUARDAR')}
    `);
  }

  function _renderGenericScreen(slot) {
    const speech = slot.speech || slot.label || '';
    return _taskArea(`
      <div class="p-halo terracotta">${Icons.get(slot.icon || 'note', 100, ICON_COL.photo, 2.5)}</div>
      <div class="p-task-text">
        <div class="p-task-title">${_esc(slot.label || 'Tarea')}</div>
        <p class="p-task-desc">${_esc(slot.desc || speech)}</p>
      </div>
      ${_replayBtn(speech)}
      ${_listoBtn('LISTO')}
    `);
  }

  function _renderDoneScreen(hasNext, allDone) {
    return _taskArea(`
      <div class="p-halo sage" style="width:240px;height:240px">${Icons.get('check', 140, '#2f6020', 3.2)}</div>
      <div>
        <div class="p-done-title">¡Muy bien, Nelson!</div>
        <p class="p-done-sub">${allDone ? 'Ya terminaste todo por hoy' : 'Lo hiciste'}</p>
      </div>
      ${hasNext && !allDone
        ? _listoBtn('SIGUIENTE')
        : `<button class="p-listo secondary" data-action="listo">VOLVER</button>`}
    `);
  }

  function _renderIdleAllDone() {
    return `<div class="p-idle">
      <div class="p-halo sage" style="width:260px;height:260px">${Icons.get('moon', 140, '#2f6020', 2.5)}</div>
      <div class="p-done-title">¡Buen día, Nelson!</div>
      <p class="p-done-sub">Terminaste todo<br>Descansá tranquilo</p>
      ${_replayBtn('Muy bien Nelson. Terminaste todo. Descansá tranquilo.')}
    </div>`;
  }

  function _renderIdle(emoji, title, sub) {
    return `<div class="p-idle">
      <div style="font-size:72px">${emoji}</div>
      <div class="p-done-title">${_esc(title)}</div>
      <p class="p-done-sub">${_esc(sub)}</p>
    </div>`;
  }

  // ── SOS MODAL ─────────────────────────────────────────────────
  function _showSOS() {
    const contacts = [
      { name: 'Christian', role: 'Hijo', tone: 'terracotta', icon: 'user' },
      { name: 'Dr. Ramírez', role: 'Cardiólogo', tone: 'sage', icon: 'doctor' },
      { name: 'Emergencias 107', role: 'Ambulancia', tone: 'rose', icon: 'alert' },
    ];
    const overlay = document.createElement('div');
    overlay.className = 'p-sos-overlay';
    overlay.id = 'sos-overlay';
    overlay.innerHTML = `<div class="p-sos-sheet">
      <div class="p-sos-handle"></div>
      <div class="p-sos-title">¿A quién llamamos?</div>
      ${contacts.map(c => `
        <button class="p-sos-contact" data-action="sosCall" data-name="${_esc(c.name)}">
          <div class="p-halo ${c.tone}" style="width:56px;height:56px;flex-shrink:0">
            ${Icons.get(c.icon, 28, '#5a3a1a', 2.4)}
          </div>
          <div style="flex:1">
            <div class="p-sos-contact-name">${_esc(c.name)}</div>
            <div class="p-sos-contact-role">${_esc(c.role)}</div>
          </div>
          ${Icons.get('phone', 28, 'var(--primary)', 2.4)}
        </button>`).join('')}
      <button class="p-sos-cancel" data-action="sosClose">Cancelar</button>
    </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) _closeSOS(); });
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', _onClick));
  }

  function _closeSOS() {
    _state.sosOpen = false;
    const el = document.getElementById('sos-overlay');
    if (el) el.remove();
  }

  // ── EVENTS ────────────────────────────────────────────────────
  function _attachEvents() {
    document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', _onClick));
  }

  function _onClick(e) {
    const el = e.currentTarget;
    switch (el.dataset.action) {

      case 'enableVoice':
        _state.voiceEnabled = true;
        _playChime();
        _requestNotifPermission();
        TTS.speak(`${_greeting()} Nelson. Estoy aquí para ayudarte.`);
        render();
        break;

      case 'speak':
        TTS.speak(el.dataset.text);
        break;

      case 'listo': {
        const slots = _todaySlots();
        const slot  = slots[_state.taskIdx];
        if (!slot && !_state.showDone) break;

        if (_state.showDone) {
          // Navigation tap — short single pulse
          if (navigator.vibrate) navigator.vibrate(60);
          _state.showDone = false;
          _state.bpStep = 'intro';
          _state.bpSys  = 130;
          _state.bpDia  = 80;
          _state.bpPul  = 70;
          _state.bpSpo2 = null;
          if (_state.taskIdx < slots.length - 1) _state.taskIdx++;
          render();
          break;
        }

        // Save completion
        if (slot.type === 'med' && slot.meds?.length) {
          slot.meds.forEach((_, i) => {
            if (!Protocol.isChecked(slot.id, i)) Protocol.toggleCheck(slot.id, i);
          });
        } else if (slot.type === 'vital') {
          // saved via bpNext confirm path (capture listener below)
        } else {
          if (!Protocol.isChecked(slot.id, 0)) Protocol.toggleCheck(slot.id, 0);
        }

        // Confirmation tap — double pulse = success feel
        if (navigator.vibrate) navigator.vibrate([80, 60, 120]);
        if (_state.voiceEnabled) TTS.speak('Muy bien Nelson. Lo hiciste.');
        _state.showDone = true;
        render();
        break;
      }

      case 'bpNext':
        if (_state.bpStep === 'intro') {
          _state.bpStep = 'sys';
          if (_state.voiceEnabled) TTS.speak('Escribí el número de arriba.');
        } else if (_state.bpStep === 'sys') {
          _state.bpStep = 'dia';
          if (_state.voiceEnabled) TTS.speak('Ahora el número de abajo.');
        } else if (_state.bpStep === 'dia') {
          _state.bpStep = 'pul';
          if (_state.voiceEnabled) TTS.speak('Ahora el pulso.');
        } else if (_state.bpStep === 'pul') {
          _state.bpStep = 'spo2';
          _state.bpSpo2 = 98;
          if (_state.voiceEnabled) TTS.speak('Si tenés el oxímetro, ponételo ahora.');
        } else if (_state.bpStep === 'spo2') {
          _state.bpStep = 'confirm';
          if (_state.voiceEnabled) TTS.speak(`Tu presión es ${_state.bpSys} sobre ${_state.bpDia}. Pulso ${_state.bpPul}. ¿Está bien?`);
        }
        render();
        break;

      case 'bpAdj': {
        const delta = parseInt(el.dataset.delta, 10);
        if (_state.bpStep === 'sys')  _state.bpSys  = Math.max(40,  Math.min(260, _state.bpSys  + delta));
        if (_state.bpStep === 'dia')  _state.bpDia  = Math.max(30,  Math.min(180, _state.bpDia  + delta));
        if (_state.bpStep === 'pul')  _state.bpPul  = Math.max(30,  Math.min(200, _state.bpPul  + delta));
        if (_state.bpStep === 'spo2') _state.bpSpo2 = Math.max(70,  Math.min(100, (_state.bpSpo2 ?? 98) + delta));
        const display = document.getElementById('bp-value-display');
        if (display) {
          if (_state.bpStep === 'sys')  display.textContent = _state.bpSys;
          if (_state.bpStep === 'dia')  display.textContent = _state.bpDia;
          if (_state.bpStep === 'pul')  display.textContent = _state.bpPul;
          if (_state.bpStep === 'spo2') display.textContent = _state.bpSpo2;
        }
        break;
      }

      case 'bpRedo':
        _state.bpStep = 'sys';
        render();
        break;

      case 'bpSpo2Skip':
        _state.bpSpo2 = null;
        _state.bpStep = 'confirm';
        render();
        break;

      case 'walkToggle':
        _state.walkRunning ? _pauseWalkTimer() : _startWalkTimer();
        break;

      case 'sos':
        _state.sosOpen = true;
        _showSOS();
        break;

      case 'sosClose':
        _closeSOS();
        break;

      case 'sosCall': {
        const slots = _todaySlots();
        const slot  = slots[_state.taskIdx];
        // Save BP before hanging up if on confirm step
        if (slot?.type === 'vital' && _state.bpStep === 'confirm') {
          Protocol.saveVital(slot.id, 'sys',  _state.bpSys);
          Protocol.saveVital(slot.id, 'dia',  _state.bpDia);
          Protocol.saveVital(slot.id, 'pul',  _state.bpPul);
          if (_state.bpSpo2 != null)
            Protocol.saveVital(slot.id, 'spo2', _state.bpSpo2);
        }
        _closeSOS();
        if (_state.voiceEnabled) TTS.speak(`Llamando a ${el.dataset.name}.`);
        break;
      }
    }
  }

  // Save BP vitals when GUARDAR is tapped on confirm step
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="listo"]');
    if (!btn) return;
    const slots = _todaySlots();
    const slot  = slots[_state.taskIdx];
    if (slot?.type === 'vital' && _state.bpStep === 'confirm') {
      Protocol.saveVital(slot.id, 'sys',  _state.bpSys);
      Protocol.saveVital(slot.id, 'dia',  _state.bpDia);
      Protocol.saveVital(slot.id, 'pul',  _state.bpPul);
      if (_state.bpSpo2 != null)
        Protocol.saveVital(slot.id, 'spo2', _state.bpSpo2);
    }
  }, true);

  return { init };
})();

if (typeof module !== 'undefined') module.exports = Patient;
else document.addEventListener('DOMContentLoaded', () => Patient.init());
