/**
 * app.js — Nelson Companion MVP
 * Acompañante médico diario. Sincronizado con reloj del dispositivo.
 * Diseñado para afasia de Broca: voz + color + botones grandes.
 */

const App = (() => {
  let _protocol = null;
  let _state = { view:'schedule', selectedDate:null, voiceEnabled:false };
  let _clockInterval = null;
  let _lastSpoken = {};

  // ── INIT ──────────────────────────────────────────────────────────────
  async function init() {
    _protocol = await Protocol.load();
    if (window.TTS_CONFIG) TTS.configure(window.TTS_CONFIG);
    TTS.onSpeakStart(() => render());
    TTS.onSpeakEnd(()   => render());
    window.speechSynthesis?.addEventListener('voiceschanged', ()=>{});

    const today = _todayStr();
    _state.selectedDate = _protocol.days?.[today] ? today : Object.keys(_protocol.days||{})[0];

    _clockInterval = setInterval(() => { _autoSpeak(); render(); }, 30000);
    render();
  }

  // ── HELPERS ───────────────────────────────────────────────────────────
  function _todayStr() { return new Date().toISOString().slice(0,10); }
  function _nowMin()   { const n=new Date(); return n.getHours()*60+n.getMinutes(); }
  function _pad(n)     { return String(n).padStart(2,'0'); }
  function _timeStr()  { const n=new Date(); return `${_pad(n.getHours())}:${_pad(n.getMinutes())}`; }
  function _greeting() {
    const h=new Date().getHours();
    if(h<12) return 'Buenos días'; if(h<18) return 'Buenas tardes'; return 'Buenas noches';
  }

  function _autoSpeak() {
    if (!_state.voiceEnabled || _state.selectedDate !== _todayStr()) return;
    const day = Protocol.getDay(_state.selectedDate);
    if (!day) return;
    const nowMin = _nowMin();
    const current = Protocol.getCurrentSlot(_state.selectedDate, nowMin);
    if (!current) return;
    const age = nowMin - Protocol.timeToMin(current.time);
    if (age <= 5 && !_lastSpoken[current.id]) {
      _lastSpoken[current.id] = true;
      TTS.speak(current.speech, current.id);
    }
  }

  // ── PILL PHOTO ────────────────────────────────────────────────────────
  function _handlePillPhoto(medId, file) {
    const reader = new FileReader();
    reader.onload = e => {
      try { localStorage.setItem(`nc_pill_${medId}`, e.target.result); } catch(_) {}
      render();
    };
    reader.readAsDataURL(file);
  }

  function _getPillPhoto(medId) {
    try { return localStorage.getItem(`nc_pill_${medId}`); } catch(_) { return null; }
  }

  // ── EXPORT ────────────────────────────────────────────────────────────
  function _exportCSV() {
    const csv = Protocol.exportCSV();
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`nelson_registro_${_todayStr()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── RENDER ────────────────────────────────────────────────────────────
  function render() {
    const app = document.getElementById('app');
    if (!app || !_protocol) return;

    const todayStr = _todayStr();
    const dateStr  = _state.selectedDate || todayStr;
    const day      = Protocol.getDay(dateStr);
    const nowMin   = _nowMin();
    const current  = day ? Protocol.getCurrentSlot(dateStr, nowMin) : null;
    const nextSlot = day ? Protocol.getNextSlot(dateStr, nowMin)    : null;

    const riskClass = day?.risk || 'yellow';
    const riskLabel = {red:'🔴 Vigilancia máxima',yellow:'🟡 Vigilancia moderada',green:'🟢 Configuración óptima'}[riskClass];

    const totalMeds = (day?.slots||[]).reduce((a,s)=>a+(s.meds?.length||0),0);
    const doneMeds  = (day?.slots||[]).reduce((a,s)=>
      a+(s.meds||[]).filter((_,i)=>Protocol.isChecked(s.id,i)).length, 0);
    const progress  = totalMeds>0 ? Math.round(doneMeds/totalMeds*100) : 0;

    app.innerHTML = `
      ${_renderExportBar()}
      ${_renderDayScroll(todayStr, dateStr)}
      ${_renderHeader(day, riskClass, riskLabel, progress, doneMeds, totalMeds)}
      <div class="content" style="padding:0.75rem 0 0">
        ${!_state.voiceEnabled ? _renderVoiceBanner() : ''}
        ${_state.view==='schedule' ? _renderSchedule(day, current, nextSlot, dateStr, nowMin) : ''}
        ${_state.view==='vitals'   ? _renderVitals(day) : ''}
        ${_state.view==='alarms'   ? _renderAlarms() : ''}
        ${_state.view==='pills'    ? _renderPills() : ''}
      </div>`;

    _attachEvents(day, dateStr);
  }

  function _renderExportBar() {
    return `<div class="export-bar">
      <span>Nelson Luciani · Protocolo Abr–May 2026</span>
      <button class="export-btn" data-action="export">↓ CSV</button>
    </div>`;
  }

  function _renderDayScroll(todayStr, selectedDate) {
    const days = Object.entries(_protocol.days||{});
    const btns = days.map(([d,dd])=>`
      <button class="day-btn ${d===todayStr?'today':''} ${d===selectedDate?'active':''} ${dd.risk}"
        data-action="selectDay" data-date="${d}">
        ${d.slice(5).replace('-','/')}${d==='2026-05-01'?' ✈':''}
      </button>`).join('');
    return `<div class="day-scroll">${btns}</div>`;
  }

  function _renderHeader(day, riskClass, riskLabel, progress, doneMeds, totalMeds) {
    const timeStr  = _timeStr();
    const n        = new Date();
    const days     = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const months   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const dateLabel= `${days[n.getDay()]} ${n.getDate()} ${months[n.getMonth()]}`;
    const riskColor= {red:'var(--risk-red-text)',yellow:'var(--risk-yellow-text)',green:'var(--risk-green-text)'}[riskClass];
    const tabs     = [{id:'schedule',label:'Agenda'},{id:'vitals',label:'Presión'},
                      {id:'alarms',label:'Alertas'},{id:'pills',label:'Pastillas'}];
    return `<div class="header ${riskClass}" style="color:${riskColor}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="date-label">${dateLabel}</div>
          <div class="time">${timeStr}</div>
        </div>
        <div style="text-align:right">
          <div class="day-label">${day?.label||'—'}</div>
          <div style="font-size:11px;margin-top:3px;opacity:.8">${riskLabel}</div>
          <div style="font-size:11px;margin-top:2px">${doneMeds}/${totalMeds} pastillas ✓</div>
        </div>
      </div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
      <div class="tabs" style="color:${riskColor}">
        ${tabs.map(t=>`<button class="tab-btn ${t.id===_state.view?'active':''}"
          data-action="setView" data-view="${t.id}" style="color:${riskColor}">
          <span>${t.label}</span></button>`).join('')}
      </div>
    </div>`;
  }

  function _renderVoiceBanner() {
    return `<div class="voice-banner" style="margin:0.75rem 1rem">
      <p>Activa la voz para que Nelson escuche los recordatorios</p>
      <button class="export-btn" data-action="enableVoice">🔊 Activar</button>
    </div>`;
  }

  function _renderSchedule(day, current, nextSlot, dateStr, nowMin) {
    if (!day) return `<p style="padding:1rem;color:#888;font-size:14px">Sin protocolo para este día.</p>`;
    let html = '';
    for (const slot of day.slots) {
      const isCurrent = current?.id === slot.id;
      const slotMin   = Protocol.timeToMin(slot.time);
      const isPast    = slotMin < nowMin - 5;
      html += `<div class="slot-card ${isCurrent?'current':''}" style="${isPast&&!isCurrent?'opacity:.6':''}">
        <div class="slot-time">
          ${slot.time} &nbsp;·&nbsp; ${{med:'💊 Medicación',vital:'❤️ Medir presión',meal:'🌿 Comida',reminder:'✈️ Recordatorio'}[slot.type]||'📋'}
          <button class="speak-btn ${TTS.isSpeaking()?'speaking':''}" data-action="speak"
            data-text="${slot.speech}" data-slot="${slot.id}">🔊</button>
        </div>
        ${slot.meds?.length ? slot.meds.map((m,mi)=>{
          const checked = Protocol.isChecked(slot.id, mi);
          const photo   = _getPillPhoto(m.id);
          return `<button class="med-btn ${checked?'checked':''}" data-action="toggleMed"
            data-slot="${slot.id}" data-idx="${mi}">
            ${photo
              ? `<img class="pill-thumb" src="${photo}" alt="${m.name}"/>`
              : `<div class="pill-placeholder">💊</div>`}
            <div>
              <div>${m.name}</div>
              <div style="font-size:13px;font-weight:400;color:#888">${m.dose}</div>
            </div>
            <div class="check-circle ${checked?'done':''}" style="margin-left:auto">
              ${checked?'✓':''}
            </div>
          </button>`;
        }).join('') : ''}
        ${slot.type==='vital' ? `
          <div class="vital-grid">
            ${[['sys','Alta','mmHg'],['dia','Baja','mmHg'],['pul','Pulso','bpm']].map(([f,l,u])=>`
              <div class="vital-field">
                <label>${l}</label>
                <input type="number" inputmode="numeric" placeholder="---"
                  value="${Protocol.getVital(slot.id,f)}"
                  data-action="saveVital" data-slot="${slot.id}" data-field="${f}"/>
                <span class="vital-unit">${u}</span>
              </div>`).join('')}
          </div>` : ''}
        ${slot.type!=='med'&&slot.type!=='vital' ? `<div class="slot-note">${slot.speech}</div>` : ''}
      </div>`;
    }
    if (nextSlot) {
      html += `<div class="next-slot">
        <strong>Próximo:</strong> ${nextSlot.time} —
        ${{med:'💊 '+(nextSlot.meds||[]).map(m=>m.name).join(', '),vital:'❤️ Medir presión',
           meal:'🌿 Comida',reminder:'✈️ Recordatorio'}[nextSlot.type]||'📋'}
      </div>`;
    }
    html += `<div class="btn-grid">
      <button class="action-btn" data-action="greet">🔊 Saludo</button>
      <button class="action-btn" data-action="exportCSV">📄 Exportar</button>
    </div>`;
    return html;
  }

  function _renderVitals(day) {
    if (!day) return '';
    const vitalSlots = (day.slots||[]).filter(s=>s.type==='vital');
    if (!vitalSlots.length) return `<p style="padding:1rem;color:#888;font-size:14px">Sin mediciones programadas hoy.</p>`;
    let html = `<div class="section-header">Registro de presión — ${day.label}</div>`;
    for (const slot of vitalSlots) {
      const sys = Protocol.getVital(slot.id,'sys');
      const dia = Protocol.getVital(slot.id,'dia');
      const pul = Protocol.getVital(slot.id,'pul');
      const done = sys && dia && pul;
      html += `<div class="slot-card ${done?'':''}">
        <div class="slot-time">${slot.time}</div>
        <div class="vital-grid">
          ${[['sys','Sistólica','mmHg'],['dia','Diastólica','mmHg'],['pul','Pulso','bpm']].map(([f,l,u])=>`
            <div class="vital-field">
              <label>${l}</label>
              <input type="number" inputmode="numeric" placeholder="---"
                value="${Protocol.getVital(slot.id,f)}"
                data-action="saveVital" data-slot="${slot.id}" data-field="${f}"/>
              <span class="vital-unit">${u}</span>
            </div>`).join('')}
        </div>
        ${done ? `<p style="margin-top:8px;font-size:12px;color:#1E8449;text-align:center">
          ✓ ${sys}/${dia} mmHg &nbsp;·&nbsp; Pulso ${pul} bpm</p>` : ''}
      </div>`;
    }
    return html;
  }

  function _renderAlarms() {
    const alarms = [
      {title:'PA < 95/60',action:'Trendelenburg + suero oral. No dar nebivolol hasta PA > 100/65.',level:'red'},
      {title:'Pulso < 48 bpm (día)',action:'Suspender nebivolol ese día. Reiniciar al siguiente a mitad de dosis.',level:'red'},
      {title:'Pulso < 40 bpm',action:'EMERGENCIAS INMEDIATAMENTE.',level:'red'},
      {title:'PA > 170/105',action:'Captopril 12.5mg oral. Si no baja en 1h → urgencias.',level:'orange'},
      {title:'Síntoma neurológico nuevo',action:'EMERGENCIAS — posible ACV. No esperar bajo ninguna circunstancia.',level:'red'},
      {title:'Sangrado rectal abundante',action:'Urgencias — clopidogrel potencia el sangrado hemorroidal.',level:'orange'},
      {title:'Dolor muscular intenso en piernas',action:'Suspender simvastatina y contactar médico.',level:'orange'},
    ];
    let html = `<div class="section-header">Reglas de parada — no negociables</div>`;
    for (const a of alarms) {
      html += `<div class="alarm-card ${a.level==='orange'?'orange':''}">
        <div class="alarm-title">${a.title}</div>
        <div class="alarm-action">${a.action}</div>
      </div>`;
    }
    html += `<div class="slot-card" style="margin:0 1rem;background:#EBF5FB;border-color:#1B4F72">
      <div class="slot-time" style="color:#1B4F72">Medicación de rescate disponible</div>
      <div class="slot-note">Captopril 12.5mg oral — urgencia hipertensiva asintomática (PA > 180/110)</div>
      <div class="slot-note" style="margin-top:4px">Suero oral / agua con sal — hipotensión (PA > 80/50)</div>
    </div>`;
    return html;
  }

  function _renderPills() {
    const meds = Object.entries(_protocol.medications||{});
    let html = `<div class="section-header">Fotos de pastillas — toca para agregar foto</div>`;
    for (const [id, med] of meds) {
      const photo = _getPillPhoto(id);
      html += `<div class="slot-card" style="display:flex;align-items:center;gap:12px">
        <label style="cursor:pointer">
          ${photo
            ? `<img src="${photo}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;border:0.5px solid #DDD"/>`
            : `<div class="pill-upload-zone" style="width:56px;height:56px;padding:0;display:flex;align-items:center;justify-content:center;font-size:28px">📷</div>`}
          <input type="file" accept="image/*" capture="environment"
            data-action="pillPhoto" data-med="${id}" style="display:none"/>
        </label>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:500">${med.name}</div>
          <div style="font-size:13px;color:#888">${med.dose} · ${med.description}</div>
          ${photo ? `<button data-action="clearPill" data-med="${id}" style="font-size:11px;color:#C0392B;background:none;border:none;cursor:pointer;padding:0;margin-top:3px">✕ Quitar foto</button>` : ''}
        </div>
      </div>`;
    }
    return html;
  }

  // ── EVENTS ────────────────────────────────────────────────────────────
  function _attachEvents(day, dateStr) {
    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', e => _handleClick(e));
      el.addEventListener('change', e => _handleChange(e));
    });
  }

  function _handleClick(e) {
    const el = e.currentTarget;
    const action = el.dataset.action;
    switch (action) {
      case 'export':      _exportCSV(); break;
      case 'exportCSV':   _exportCSV(); break;
      case 'selectDay':   _state.selectedDate=el.dataset.date; render(); break;
      case 'setView':     _state.view=el.dataset.view; render(); break;
      case 'enableVoice':
        _state.voiceEnabled=true;
        TTS.speak(`${_greeting()} Nelson. Estoy aquí para ayudarte con tu medicación de hoy.`);
        render(); break;
      case 'greet':
        TTS.speak(`${_greeting()} Nelson. ¿Cómo te sientes hoy?`); break;
      case 'speak':
        TTS.speak(el.dataset.text, el.dataset.slot); break;
      case 'toggleMed': {
        const checked = Protocol.toggleCheck(el.dataset.slot, parseInt(el.dataset.idx));
        if (checked) TTS.speak('Muy bien Nelson. Pastilla registrada.');
        render(); break;
      }
      case 'clearPill':
        try { localStorage.removeItem(`nc_pill_${el.dataset.med}`); } catch(_) {}
        render(); break;
    }
  }

  function _handleChange(e) {
    const el = e.currentTarget;
    const action = el.dataset.action;
    if (action === 'saveVital') {
      Protocol.saveVital(el.dataset.slot, el.dataset.field, el.value);
      // No re-render on every keystroke — render on blur instead
    }
    if (action === 'pillPhoto' && el.files?.[0]) {
      _handlePillPhoto(el.dataset.med, el.files[0]);
    }
  }

  // Add blur re-render for vitals
  document.addEventListener('blur', e => {
    if (e.target.dataset?.action === 'saveVital') render();
  }, true);

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
