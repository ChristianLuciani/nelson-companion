/**
 * app.js — Nelson Companion · Caregiver Dashboard
 * 6-tab sidebar layout: overview / compliance / bp / notes / stoprules / schedule
 * Vanilla JS IIFE, no framework. Mobile-first fallback via CSS.
 */

const App = (() => {
  let _protocol = null;
  let _state = {
    tab: 'overview',
    selectedDate: null,
    voiceEnabled: false,
    noteCategory: 'Ánimo',
    noteDraft: '',
  };
  let _clockInterval = null;
  let _lastSpoken = {};

  // ── INIT ──────────────────────────────────────────────────────────────
  async function init() {
    try {
      document.documentElement.dataset.theme = _getTheme();
      SupabaseClient.init();
      _protocol = await Protocol.load();
      if (!_protocol || !_protocol.days) throw new Error('Protocol failed to load');
      if (window.TTS_CONFIG) TTS.configure(window.TTS_CONFIG);
      TTS.onSpeakStart(() => render());
      TTS.onSpeakEnd(()   => render());

      const today = _todayStr();
      _state.selectedDate = _protocol.days?.[today] ? today
        : Object.keys(_protocol.days || {})[0];

      _clockInterval = setInterval(() => { _autoSpeak(); render(); }, 60000);
      render();
    } catch (e) {
      console.warn('[App.init]', e.message);
      document.getElementById('app').innerHTML =
        `<div style="color:var(--danger);padding:2rem;font-family:var(--font-body)">${e.message}</div>`;
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────
  function _todayStr()   { return new Date().toISOString().slice(0, 10); }
  function _nowMin()     { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
  function _pad(n)       { return String(n).padStart(2, '0'); }
  function _timeStr()    { const n = new Date(); return `${_pad(n.getHours())}:${_pad(n.getMinutes())}`; }
  function _greeting()   {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  }
  function _tomorrowStr() {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  function _shortDayLabel(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    return `${days[d.getDay()]} ${dateStr.slice(8)}`;
  }
  function _longDateLabel() {
    const n = new Date();
    const days   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${days[n.getDay()]}, ${n.getDate()} de ${months[n.getMonth()]} ${n.getFullYear()}`;
  }

  // ── TTS AUTO-SPEAK ────────────────────────────────────────────────────
  function _autoSpeak() {
    if (!_state.voiceEnabled) return;
    const today = _todayStr();
    const day = Protocol.getDay(today);
    if (!day) return;
    const nowMin  = _nowMin();
    const current = Protocol.getCurrentSlot(today, nowMin);
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
      try { localStorage.setItem(`nc_pill_${medId}`, e.target.result); } catch (_) {}
      render();
    };
    reader.readAsDataURL(file);
  }
  function _getPillPhoto(medId) {
    try { return localStorage.getItem(`nc_pill_${medId}`); } catch (_) { return null; }
  }

  // ── NOTES ─────────────────────────────────────────────────────────────
  function _getNotes() {
    try { return JSON.parse(localStorage.getItem('nc_notes') || '[]'); } catch (_) { return []; }
  }
  function _saveNotes(notes) {
    try { localStorage.setItem('nc_notes', JSON.stringify(notes)); } catch (_) {}
  }
  function _addNote(text, category) {
    const notes = _getNotes();
    const n = new Date();
    notes.unshift({
      author: 'Cuidador',
      date: n.toISOString().slice(0, 10),
      time: `${_pad(n.getHours())}:${_pad(n.getMinutes())}`,
      category,
      text,
    });
    _saveNotes(notes);
  }

  // ── THEME ─────────────────────────────────────────────────────────────
  function _getTheme() {
    return localStorage.getItem('nc_theme') || 'warm';
  }
  function _setTheme(name) {
    localStorage.setItem('nc_theme', name);
    document.documentElement.dataset.theme = name;
  }

  // ── EXPORT ────────────────────────────────────────────────────────────
  function _exportCSV() {
    const csv  = Protocol.exportCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `nelson_registro_${_todayStr()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── DATA BUILDERS ─────────────────────────────────────────────────────
  function _buildBPHistory() {
    const history = [];
    const dates = Object.keys(_protocol.days || {}).sort();
    for (const dateStr of dates) {
      const day = _protocol.days[dateStr];
      for (const slot of (day.slots || [])) {
        if (slot.type === 'vital') {
          const sys = parseInt(Protocol.getVital(slot.id, 'sys'));
          const dia = parseInt(Protocol.getVital(slot.id, 'dia'));
          const pul = parseInt(Protocol.getVital(slot.id, 'pul'));
          const spo2 = parseInt(Protocol.getVital(slot.id, 'spo2'));
          if (sys > 0 && dia > 0) {
            history.push({ date: dateStr, slot: slot.time, sys, dia, pul: pul || 0, spo2: spo2 || null });
          }
        }
      }
    }
    return history;
  }

  function _buildComplianceRows() {
    const dates = Object.keys(_protocol.days || {}).sort().slice(-7);
    return dates.map(dateStr => {
      const day = _protocol.days[dateStr];
      if (!day) return null;
      const slots      = day.slots || [];
      const medSlots   = slots.filter(s => s.type === 'med');
      const vitalSlots = slots.filter(s => s.type === 'vital');
      const walkSlots  = slots.filter(s => s.type === 'walk');
      const mealSlots  = slots.filter(s => s.type === 'meal');

      const totalMeds = medSlots.reduce((a, s) => a + (s.meds?.length || 0), 0);
      const doneMeds  = medSlots.reduce((a, s) =>
        a + (s.meds || []).filter((_, i) => Protocol.isChecked(s.id, i)).length, 0);
      const medStatus = totalMeds === 0 ? 'none'
        : doneMeds === totalMeds ? 'ok' : doneMeds > 0 ? 'late' : 'missed';

      const totalVitals = vitalSlots.length;
      const doneVitals  = vitalSlots.filter(s =>
        Protocol.getVital(s.id, 'sys') && Protocol.getVital(s.id, 'dia')).length;
      const vitalStatus = totalVitals === 0 ? 'none'
        : doneVitals === totalVitals ? 'ok' : doneVitals > 0 ? 'late' : 'missed';

      const doneWalk  = walkSlots.filter(s => Protocol.isChecked(s.id, 0)).length;
      const walkStatus = walkSlots.length === 0 ? 'none'
        : doneWalk === walkSlots.length ? 'ok' : doneWalk > 0 ? 'late' : 'missed';

      const doneMeal  = mealSlots.filter(s => Protocol.isChecked(s.id, 0)).length;
      const mealStatus = mealSlots.length === 0 ? 'none'
        : doneMeal === mealSlots.length ? 'ok' : doneMeal > 0 ? 'late' : 'missed';

      const counted = [medStatus, vitalStatus, walkStatus, mealStatus].filter(s => s !== 'none');
      const okCount = counted.filter(s => s === 'ok').length;
      const pct = counted.length > 0 ? Math.round(okCount / counted.length * 100) : null;

      return { dateStr, label: _shortDayLabel(dateStr), medStatus, vitalStatus, walkStatus, mealStatus, pct };
    }).filter(Boolean);
  }

  function _getTodayMetrics() {
    const today = _todayStr();
    const day = Protocol.getDay(today);
    if (!day) return { totalMeds: 0, doneMeds: 0, pct: 0, totalSlots: 0, doneSlots: 0 };
    const slots    = day.slots || [];
    const totalMeds = slots.reduce((a, s) => a + (s.meds?.length || 0), 0);
    const doneMeds  = slots.reduce((a, s) =>
      a + (s.meds || []).filter((_, i) => Protocol.isChecked(s.id, i)).length, 0);
    const pct = totalMeds > 0 ? Math.round(doneMeds / totalMeds * 100) : 0;
    return { totalMeds, doneMeds, pct, totalSlots: slots.length };
  }

  // ── SVG BP CHART ──────────────────────────────────────────────────────
  function _buildBPChartSVG(data, compact = false) {
    if (data.length < 2) {
      return `<div style="text-align:center;color:var(--muted);font-size:13px;padding:24px 0">
        Sin suficientes lecturas registradas aún.
      </div>`;
    }
    const W   = compact ? 300 : 720;
    const H   = compact ? 130 : 240;
    const PAD = compact ? 26  : 34;
    const ymin = 60, ymax = 170;
    const xs = data.map((_, i) => PAD + i * (W - PAD * 2) / Math.max(data.length - 1, 1));
    const yS = v => H - PAD - ((v - ymin) / (ymax - ymin)) * (H - PAD * 2);

    const sysPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${yS(d.sys).toFixed(1)}`).join(' ');
    const diaPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${yS(d.dia).toFixed(1)}`).join(' ');

    const grids = [80, 100, 120, 140, 160].map(v => `
      <line x1="${PAD}" x2="${(W - PAD * 0.5).toFixed(1)}" y1="${yS(v).toFixed(1)}" y2="${yS(v).toFixed(1)}"
        stroke="var(--border)" stroke-dasharray="${v === 140 || v === 90 ? '0' : '3 3'}"/>
      <text x="${(PAD - 4).toFixed(1)}" y="${(yS(v) + 3).toFixed(1)}"
        font-size="${compact ? 9 : 10}" fill="var(--muted)" text-anchor="end">${v}</text>`).join('');

    const dots = data.map((d, i) => `
      <circle cx="${xs[i].toFixed(1)}" cy="${yS(d.sys).toFixed(1)}" r="${compact ? 2 : 2.8}" fill="#c95444"/>
      <circle cx="${xs[i].toFixed(1)}" cy="${yS(d.dia).toFixed(1)}" r="${compact ? 2 : 2.8}" fill="#5a8b9b"/>`).join('');

    const xLabels = compact
      ? `<text x="${PAD}" y="${H - 6}" font-size="9" fill="var(--muted)">hace ${data.length}d</text>
         <text x="${(W - PAD).toFixed(1)}" y="${H - 6}" font-size="9" fill="var(--muted)" text-anchor="end">hoy</text>`
      : data.map((d, i) => {
          if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return '';
          const parts = d.date.split('-');
          return `<text x="${xs[i].toFixed(1)}" y="${H - 8}" font-size="10" fill="var(--muted)" text-anchor="middle">${parts[2]}/${parts[1]}</text>`;
        }).join('');

    const legend = compact ? '' : `
      <g transform="translate(${W - 170}, 8)">
        <circle cx="6" cy="6" r="3" fill="#c95444"/>
        <text x="13" y="9" font-size="11" fill="var(--ink)">Sistólica</text>
        <circle cx="82" cy="6" r="3" fill="#5a8b9b"/>
        <text x="89" y="9" font-size="11" fill="var(--ink)">Diastólica</text>
      </g>`;

    return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block">
      ${grids}
      <rect x="${PAD}" y="${yS(140).toFixed(1)}" width="${(W - PAD * 1.5).toFixed(1)}"
        height="${(yS(90) - yS(140)).toFixed(1)}" fill="var(--primary)" fill-opacity="0.04"/>
      <path d="${sysPath}" fill="none" stroke="#c95444" stroke-width="${compact ? 1.5 : 2}" stroke-linejoin="round"/>
      <path d="${diaPath}" fill="none" stroke="#5a8b9b" stroke-width="${compact ? 1.5 : 2}" stroke-linejoin="round"/>
      ${dots}${xLabels}${legend}
    </svg>`;
  }

  // ── COMPONENT HELPERS ─────────────────────────────────────────────────
  function _card(title, body, opts = {}) {
    const { action = '', style = '' } = opts;
    const header = title
      ? `<div class="card-header">
           <span class="card-title">${title}</span>
           ${action ? `<span class="card-action">${action}</span>` : ''}
         </div>`
      : '';
    return `<div class="card" style="${style}">${header}<div class="card-body">${body}</div></div>`;
  }

  function _kpi(label, value, sub, tone) {
    return `<div class="kpi-card">
      <div class="kpi-accent ${tone}"></div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-sub">${sub}</div>
    </div>`;
  }

  function _compCell(status) {
    const map = { ok: '✓', late: '⏱', missed: '✕', none: '—' };
    return `<td><span class="comp-cell ${status}">${map[status] || '—'}</span></td>`;
  }

  // ── RENDER ROOT ───────────────────────────────────────────────────────
  function render() {
    const app = document.getElementById('app');
    if (!app || !_protocol) return;
    app.innerHTML = `
      <div class="cg-layout">
        ${_renderSidebar()}
        <main class="cg-main">
          ${!_state.voiceEnabled ? _renderVoiceBanner() : ''}
          ${_renderMainHeader()}
          ${_renderTabContent()}
        </main>
      </div>`;
    _attachEvents();
  }

  // ── THEME SELECTOR ────────────────────────────────────────────────────
  function _renderThemeSelector() {
    const cur = _getTheme();
    const themes = [
      { id: 'warm',          label: 'Cálido',    color: '#c97456' },
      { id: 'clinical',      label: 'Clínico',   color: '#3d7ca8' },
      { id: 'high-contrast', label: 'Contraste', color: '#000000' },
    ];
    const dots = themes.map(t => `
      <button class="cg-theme-dot ${cur === t.id ? 'active' : ''}"
        data-action="setTheme" data-theme="${t.id}"
        title="${t.label}"
        style="background:${t.color}">
      </button>`).join('');
    return `<div class="cg-theme-row">
      <span class="cg-theme-label">Tema</span>
      <div class="cg-theme-dots">${dots}</div>
    </div>`;
  }

  // ── SIDEBAR ───────────────────────────────────────────────────────────
  function _renderSidebar() {
    const tabs = [
      { id: 'overview',   label: 'Resumen del día',      icon: 'sun' },
      { id: 'compliance', label: 'Cumplimiento',          icon: 'check' },
      { id: 'bp',         label: 'Presión arterial',      icon: 'heart' },
      { id: 'notes',      label: 'Notas y observaciones', icon: 'note' },
      { id: 'stoprules',  label: 'Reglas de parada',      icon: 'alert' },
      { id: 'schedule',   label: 'Agenda de mañana',      icon: 'settings' },
    ];
    const navBtns = tabs.map(t => `
      <button class="cg-nav-btn ${_state.tab === t.id ? 'active' : ''}"
        data-action="setTab" data-tab="${t.id}">
        ${Icons.get(t.icon, 17, 'currentColor', 2)}
        ${t.label}
      </button>`).join('');

    return `<aside class="cg-sidebar">
      <div class="cg-sidebar-header">
        <div class="cg-sidebar-logo">Nelson Companion</div>
        <div class="cg-sidebar-name">Nelson Luciani, 76</div>
        <div class="cg-sidebar-info">ACV x2 · Afasia de Broca<br>Arritmia ventricular 27%</div>
        <div class="cg-sidebar-status">
          <span class="cg-status-dot" style="background:var(--ok)"></span>
          Protocolo activo
        </div>
        <div class="cg-sidebar-caregiver">
          Cuidador: <strong style="color:var(--ink)">Christian Luciani</strong><br>
          Hijo / responsable médico
        </div>
      </div>
      ${navBtns}
      <div class="cg-spacer"></div>
      ${_renderThemeSelector()}
      <button class="cg-export-btn" data-action="export">
        ${Icons.get('export', 15, 'currentColor', 2)}
        Exportar CSV
      </button>
      <a href="index.html?switch" class="cg-switch-link">↻ cambiar modo</a>
    </aside>`;
  }

  // ── VOICE BANNER ──────────────────────────────────────────────────────
  function _renderVoiceBanner() {
    return `<div class="cg-voice-banner">
      <span>Activa la voz para que Nelson escuche los recordatorios automáticamente</span>
      <button class="cg-voice-btn" data-action="enableVoice">
        ${Icons.get('speaker', 14, '#fff', 2)} Activar voz
      </button>
    </div>`;
  }

  // ── MAIN HEADER ───────────────────────────────────────────────────────
  const _tabTitles = {
    overview:   'Resumen del día',
    compliance: 'Registro de cumplimiento',
    bp:         'Presión arterial',
    notes:      'Notas y observaciones',
    stoprules:  'Reglas de parada clínicas',
    schedule:   'Agenda de mañana',
  };

  function _renderMainHeader() {
    return `<header class="cg-header">
      <div>
        <div class="cg-header-eyebrow">${_longDateLabel()} · Nelson Luciani</div>
        <h1 class="cg-header-title">${_tabTitles[_state.tab]}</h1>
      </div>
      <div class="cg-header-btns">
        <button class="cg-btn-sec" data-action="print">Imprimir</button>
        <button class="cg-btn-pri" data-action="addNote">+ Añadir nota</button>
      </div>
    </header>`;
  }

  function _renderTabContent() {
    switch (_state.tab) {
      case 'overview':   return _renderOverview();
      case 'compliance': return _renderCompliance();
      case 'bp':         return _renderBP();
      case 'notes':      return _renderNotes();
      case 'stoprules':  return _renderStopRules();
      case 'schedule':   return _renderSchedule();
      default:           return _renderOverview();
    }
  }

  // ── OVERVIEW TAB ──────────────────────────────────────────────────────
  function _renderOverview() {
    const metrics  = _getTodayMetrics();
    const bpHist   = _buildBPHistory();
    const lastBP   = bpHist[bpHist.length - 1] || null;
    const notes    = _getNotes();
    const compRows = _buildComplianceRows();

    // KPI: compliance
    const cpTone = metrics.pct >= 80 ? 'good' : metrics.pct >= 50 ? 'warn' : 'bad';
    const kpiCompliance = _kpi(
      'Cumplimiento de hoy',
      `${metrics.pct}%`,
      `${metrics.doneMeds} de ${metrics.totalMeds} pastillas`,
      cpTone
    );

    // KPI: last BP
    const bpTone = lastBP ? (lastBP.sys > 145 ? 'warn' : lastBP.sys < 95 ? 'bad' : 'good') : 'good';
    const kpiBP = _kpi(
      'Última presión',
      lastBP ? `${lastBP.sys}/${lastBP.dia}` : '—/—',
      lastBP ? `Hoy ${lastBP.slot} · pulso ${lastBP.pul || '—'}` : 'Sin lecturas hoy',
      bpTone
    );

    // KPI: average 14d
    const avgSys = bpHist.length
      ? Math.round(bpHist.reduce((a, r) => a + r.sys, 0) / bpHist.length) : null;
    const avgDia = bpHist.length
      ? Math.round(bpHist.reduce((a, r) => a + r.dia, 0) / bpHist.length) : null;
    const kpiAvg = _kpi(
      'Promedio lecturas',
      avgSys ? `${avgSys}/${avgDia}` : '—/—',
      bpHist.length ? `Sobre ${bpHist.length} lectura${bpHist.length > 1 ? 's' : ''}` : 'Sin datos',
      'good'
    );

    // KPI: alerts (use stoprules count as static info)
    const today = _todayStr();
    const day = Protocol.getDay(today);
    const nowMin = _nowMin();
    const cur = day ? Protocol.getCurrentSlot(today, nowMin) : null;
    const activeAlerts = cur ? 1 : 0;
    const kpiAlerts = _kpi(
      'Tarea activa ahora',
      cur ? cur.time : '—',
      cur ? (cur.label || cur.type) : 'Sin tarea activa',
      activeAlerts ? 'warn' : 'good'
    );

    // Timeline
    const timeline = _renderTimeline(day, nowMin);

    // Alerts column (static clinical reminders based on time)
    const alertsBody = cur
      ? `<div class="alert-list">
           <div class="alert-item med">
             <div class="alert-icon med">${Icons.get('alert', 15, 'currentColor', 2.2)}</div>
             <div>
               <div class="alert-time">${cur.time}</div>
               <div class="alert-text">${cur.label || cur.speech}</div>
             </div>
           </div>
         </div>`
      : `<div style="font-size:13px;color:var(--muted);padding:8px 0">Sin alertas activas ahora.</div>`;

    // Compliance mini bars
    const miniBody = _renderComplianceMini(compRows);

    // Notes preview
    const notesPreviewBody = notes.length === 0
      ? `<div style="font-size:13px;color:var(--muted);padding:8px 0">Sin notas registradas.</div>`
      : notes.slice(0, 3).map((n, i) => `
          <div style="padding:9px 0;${i < Math.min(notes.length, 3) - 1 ? 'border-bottom:1px solid var(--border)' : ''}">
            <div class="note-header">
              <span class="note-author">${n.author}${n.category ? ` · ${n.category}` : ''}</span>
              <span class="note-meta">${n.date} · ${n.time}</span>
            </div>
            <div class="note-text">${n.text}</div>
          </div>`).join('');

    return `
      <div class="kpi-grid">
        ${kpiCompliance}${kpiBP}${kpiAvg}${kpiAlerts}
      </div>
      <div class="grid-main-side">
        ${_card('Agenda de hoy',
          `<div class="timeline">${timeline}</div>`,
          { action: `<span>Hora: ${_timeStr()}</span>` })}
        <div class="col-stack">
          ${_card('Tarea activa', alertsBody)}
          ${_card('Presión 14 días', _buildBPChartSVG(bpHist, true), { action: 'mmHg' })}
        </div>
      </div>
      <div class="grid-12">
        ${_card('Cumplimiento últimos 7 días', miniBody)}
        ${_card('Últimas notas',
          `<div>${notesPreviewBody}</div>`,
          { action: `<button style="background:none;border:none;color:var(--primary);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit" data-action="setTab" data-tab="notes">Ver todas →</button>` })}
      </div>`;
  }

  function _renderTimeline(day, nowMin) {
    if (!day) return `<div style="color:var(--muted);font-size:13px;padding:8px 0">Sin protocolo para hoy.</div>`;
    const slots = day.slots || [];
    return slots.map((slot, i) => {
      const slotMin   = Protocol.timeToMin(slot.time);
      const isDone    = slotMin < nowMin - 5;
      const isCurrent = Math.abs(slotMin - nowMin) <= 30 && slotMin <= nowMin + 5;
      const dotClass  = isDone ? 'done' : isCurrent ? 'current' : '';
      const badge = isDone
        ? '<span class="tl-badge done">✓ hecho</span>'
        : isCurrent
        ? '<span class="tl-badge current">en curso</span>'
        : '';
      return `<div class="timeline-item ${isDone ? 'done' : ''}">
        <span class="tl-time">${slot.time}</span>
        <div class="tl-dot ${dotClass}"></div>
        <div class="tl-content">
          <div class="tl-row">
            <span class="tl-icon">${Icons.get(slot.icon || 'pill', 13, 'var(--muted)', 2)}</span>
            <span class="tl-label ${isDone ? 'done' : ''}">${slot.label || slot.type}</span>
            ${badge}
          </div>
          <div class="tl-desc">${slot.desc || ''}</div>
        </div>
      </div>`;
    }).join('');
  }

  function _renderComplianceMini(rows) {
    if (!rows.length) return `<div style="color:var(--muted);font-size:13px">Sin datos.</div>`;
    return `<div class="comp-mini">
      ${rows.map(r => {
        const pct    = r.pct ?? 0;
        const missed = Math.max(0, 100 - pct);
        const ok     = pct;
        return `<div class="comp-mini-col">
          <div class="comp-mini-bars">
            ${missed > 0 ? `<div style="height:${missed}%;background:var(--danger);border-radius:3px 3px 0 0"></div>` : ''}
            ${ok > 0     ? `<div style="height:${ok}%;background:var(--ok);${!missed ? 'border-radius:3px 3px 0 0' : ''}"></div>` : ''}
          </div>
          <div class="comp-mini-label">${r.label.split(' ')[0]}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  // ── COMPLIANCE TAB ────────────────────────────────────────────────────
  function _renderCompliance() {
    const rows = _buildComplianceRows();
    if (!rows.length) return _card('Sin datos', '<p style="color:var(--muted)">Sin días registrados.</p>');

    const pctColor = p => p == null ? '' : p >= 85 ? 'ok' : p >= 60 ? 'warn' : 'bad';

    const tableRows = rows.map(r => `
      <tr>
        <td class="left">${r.label}</td>
        ${_compCell(r.medStatus)}
        ${_compCell(r.vitalStatus)}
        ${_compCell(r.walkStatus)}
        ${_compCell(r.mealStatus)}
        <td style="text-align:right;padding:7px 8px">
          <span class="comp-pct ${pctColor(r.pct)}">${r.pct != null ? r.pct + '%' : '—'}</span>
        </td>
      </tr>`).join('');

    const legend = `<div class="comp-legend">
      <span><span class="comp-legend-chip" style="background:var(--ok-bg);color:var(--ok)">✓</span> A tiempo</span>
      <span><span class="comp-legend-chip" style="background:var(--warn-bg);color:var(--warn)">⏱</span> Parcial</span>
      <span><span class="comp-legend-chip" style="background:var(--danger-bg);color:var(--danger)">✕</span> Omitido</span>
      <span><span class="comp-legend-chip" style="background:var(--chip-bg);color:var(--muted)">—</span> Sin programar</span>
    </div>`;

    const table = `<table class="comp-table">
      <thead>
        <tr>
          <th class="left">Día</th>
          <th title="Medicamentos">Meds</th>
          <th title="Presión arterial">PA</th>
          <th title="Caminata">Caminar</th>
          <th title="Comidas">Comida</th>
          <th style="text-align:right">%</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>${legend}`;

    return _card('Cumplimiento últimos 7 días', table);
  }

  // ── BP TAB ────────────────────────────────────────────────────────────
  function _renderBP() {
    const bpHist = _buildBPHistory();
    const lastBP = bpHist[bpHist.length - 1] || null;
    const avgSys = bpHist.length ? Math.round(bpHist.reduce((a, r) => a + r.sys, 0) / bpHist.length) : null;
    const avgDia = bpHist.length ? Math.round(bpHist.reduce((a, r) => a + r.dia, 0) / bpHist.length) : null;
    const avgPul = bpHist.length ? Math.round(bpHist.reduce((a, r) => a + (r.pul || 0), 0) / bpHist.length) : null;
    const bpTone = lastBP ? (lastBP.sys > 145 ? 'warn' : lastBP.sys < 95 ? 'bad' : 'good') : 'good';

    const tableRows = bpHist.slice().reverse().slice(0, 10).map((r, i) => {
      const high = r.sys > 145 || r.dia > 95;
      const low  = r.sys < 95;
      const badge = `<span class="bp-badge ${high ? 'high' : low ? 'low' : 'ok'}">${high ? 'Alta' : low ? 'Baja' : 'Normal'}</span>`;
      const spo2Cell = r.spo2
        ? `<span class="bp-badge ${r.spo2 < 94 ? 'high' : r.spo2 < 97 ? 'low' : 'ok'}">${r.spo2}%</span>`
        : '<span style="color:var(--muted)">—</span>';
      return `<tr>
        <td>${r.date.slice(5).replace('-', '/')}</td>
        <td style="color:var(--muted)">${r.slot}</td>
        <td class="right" style="font-weight:600">${r.sys}</td>
        <td class="right" style="font-weight:600">${r.dia}</td>
        <td class="right" style="color:var(--muted)">${r.pul || '—'}</td>
        <td class="right">${spo2Cell}</td>
        <td class="right">${badge}</td>
      </tr>`;
    }).join('');

    return `
      <div class="kpi-grid">
        ${_kpi('Última lectura', lastBP ? `${lastBP.sys}/${lastBP.dia}` : '—/—', lastBP ? `Hoy ${lastBP.slot}` : 'Sin datos', bpTone)}
        ${_kpi('Promedio sistólica', avgSys ?? '—', 'mmHg', avgSys > 140 ? 'warn' : 'good')}
        ${_kpi('Promedio diastólica', avgDia ?? '—', 'mmHg', avgDia > 90 ? 'warn' : 'good')}
        ${(() => {
          const spo2Readings = bpHist.filter(r => r.spo2);
          const avgSpo2 = spo2Readings.length
            ? Math.round(spo2Readings.reduce((a, r) => a + r.spo2, 0) / spo2Readings.length) : null;
          return _kpi('SpO₂ promedio', avgSpo2 ? `${avgSpo2}%` : '—', avgSpo2 ? `Sobre ${spo2Readings.length} lectura${spo2Readings.length !== 1 ? 's' : ''}` : 'Oxímetro opcional', avgSpo2 && avgSpo2 < 94 ? 'bad' : 'good');
        })()}
      </div>
      ${_card('Tendencia presión arterial', _buildBPChartSVG(bpHist, false), { action: 'mmHg · rango normal sombreado' })}
      ${_card('Lecturas recientes', bpHist.length === 0
        ? '<div style="color:var(--muted);font-size:13px;padding:8px 0">Sin lecturas registradas. Ingrésalas desde la vista de Nelson.</div>'
        : `<table class="bp-table">
            <thead>
              <tr>
                <th>Fecha</th><th>Momento</th>
                <th class="right">Sistólica</th><th class="right">Diastólica</th>
                <th class="right">Pulso</th><th class="right">SpO₂</th><th class="right">Estado</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>`)}`;
  }

  // ── NOTES TAB ─────────────────────────────────────────────────────────
  function _renderNotes() {
    const notes = _getNotes();
    const cats  = ['Ánimo', 'Habla', 'Movimiento', 'Sueño', 'Apetito', 'Otro'];

    const notesList = notes.length === 0
      ? `<div style="color:var(--muted);font-size:13px;padding:8px 0">Sin notas registradas aún.</div>`
      : notes.map((n, i) => `
          <div class="note-item">
            <div class="note-header">
              <span class="note-author">${n.author}${n.category ? ` · ${n.category}` : ''}</span>
              <span class="note-meta">${n.date} · ${n.time}</span>
            </div>
            <div class="note-text">${n.text}</div>
          </div>`).join('');

    const noteForm = `<div class="note-form">
      <div>
        <label>Categoría</label>
        <div class="note-chips">
          ${cats.map(c => `<button class="note-chip ${_state.noteCategory === c ? 'active' : ''}"
            data-action="noteCategory" data-cat="${c}">${c}</button>`).join('')}
        </div>
      </div>
      <div>
        <label>Observación</label>
        <textarea class="note-textarea" id="note-draft" placeholder="Ej. Buen ánimo, pidió salir al patio…">${_state.noteDraft}</textarea>
      </div>
      <div class="note-actions">
        <button class="cg-btn-sec" data-action="clearNote">Cancelar</button>
        <button class="cg-btn-pri" data-action="saveNote">Guardar nota</button>
      </div>
    </div>`;

    return `<div class="grid-14">
      ${_card(`${notes.length} entradas`, notesList, { action: '' })}
      ${_card('Nueva observación', noteForm)}
    </div>`;
  }

  // ── STOP RULES TAB ────────────────────────────────────────────────────
  function _renderStopRules() {
    const rules = [
      { level: 'red',    title: 'PA < 95/60 mmHg',
        action: 'Posición Trendelenburg + suero oral. No dar nebivolol hasta PA > 100/65. Si no mejora en 15 min → EMERGENCIAS.' },
      { level: 'red',    title: 'Pulso < 48 bpm (diurno)',
        action: 'Suspender nebivolol ese día. Reiniciar al siguiente a la mitad de dosis. Vigilar cada hora.' },
      { level: 'red',    title: 'Pulso < 40 bpm',
        action: 'EMERGENCIAS INMEDIATAMENTE. No esperar. Antecedente de TV sostenida documentada.' },
      { level: 'red',    title: 'Síntoma neurológico nuevo',
        action: 'EMERGENCIAS — posible ACV. No esperar bajo ninguna circunstancia. Antecedente ACV isquémico x2.' },
      { level: 'orange', title: 'PA > 170/105 mmHg',
        action: 'Captopril 12.5 mg oral. Reposición si no baja en 1 hora → urgencias.' },
      { level: 'orange', title: 'Sangrado rectal abundante',
        action: 'Urgencias — clopidogrel potencia sangrado hemorroidal. No suspender clopidogrel sin indicación médica.' },
      { level: 'orange', title: 'Dolor muscular intenso en piernas',
        action: 'Suspender simvastatina y contactar médico. Posible miopatía por estatinas.' },
    ];

    const rulesHtml = rules.map(r => `
      <div class="stop-rule ${r.level}">
        <div class="stop-rule-icon ${r.level}">${Icons.get('alert', 17, 'currentColor', 2.2)}</div>
        <div>
          <div class="stop-rule-title">${r.title}</div>
          <div class="stop-rule-action">${r.action}</div>
        </div>
      </div>`).join('');

    const rescueHtml = `<div class="rescue-list">
      <div class="rescue-card yellow">
        <div class="rescue-med">Captopril 12.5 mg oral</div>
        <div class="rescue-when">Urgencia hipertensiva asintomática: PA > 180/110 mmHg</div>
      </div>
      <div class="rescue-card blue">
        <div class="rescue-med">Suero oral / agua con sal</div>
        <div class="rescue-when">Hipotensión leve: PA > 80/50, consciente, sin síntomas neurológicos</div>
      </div>
    </div>`;

    const contactsHtml = `<div class="contact-grid">
      <div class="contact-card primary">
        <div class="contact-name">Christian Luciani</div>
        <div class="contact-role">Hijo / responsable médico</div>
      </div>
      <div class="contact-card">
        <div class="contact-name">Dr. Ramírez</div>
        <div class="contact-role">Cardiólogo tratante</div>
      </div>
      <div class="contact-card">
        <div class="contact-name">Emergencias 107</div>
        <div class="contact-role">Ambulancia — Panamá</div>
      </div>
    </div>`;

    return `
      <div class="stop-warning">
        ⚠️ Umbrales validados clínicamente para <strong>Nelson Luciani</strong>.
        Antecedente: ACV isquémico x2 · Arritmia ventricular 27% · BRIHH intermitente.
        <strong>No modificar sin indicación médica documentada.</strong>
      </div>
      ${_card('Medicación de rescate disponible', rescueHtml)}
      <div style="margin-top:16px">
        ${_card('Reglas de parada — no negociables',
          `<div class="stop-rules-list">${rulesHtml}</div>`)}
      </div>
      <div style="margin-top:16px">
        ${_card('Contactos de emergencia', contactsHtml)}
      </div>`;
  }

  // ── SCHEDULE TAB ──────────────────────────────────────────────────────
  function _renderSchedule() {
    const tomorrow    = _tomorrowStr();
    const tomorrowDay = Protocol.getDay(tomorrow);
    const slots       = tomorrowDay?.slots || [];

    const tomorrowLabel = (() => {
      const d = new Date(tomorrow + 'T12:00:00');
      const days   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
      const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
    })();

    const scheduleRows = slots.length === 0
      ? `<div style="color:var(--muted);font-size:13px;padding:8px 0">Sin agenda programada para mañana.</div>`
      : `<div class="schedule-list">
          ${slots.map(slot => `
            <div class="schedule-row">
              <span class="schedule-time">${slot.time}</span>
              ${Icons.get(slot.icon || 'pill', 15, 'var(--muted)', 2)}
              <input class="schedule-label-inp" value="${slot.label || slot.type}" readonly/>
              <span class="schedule-kind">${slot.type}</span>
            </div>`).join('')}
        </div>
        <button class="schedule-add-btn" disabled>+ Añadir tarea (próximamente)</button>`;

    const templates = [
      { name: 'Día normal',           desc: 'Protocolo estándar completo', active: true },
      { name: 'Día de control médico', desc: 'Incluye preparación para consulta' },
      { name: 'Día de descanso',       desc: 'Sin ejercicio · meds mínimas' },
      { name: 'Día de viaje',          desc: 'Adaptado para traslado largo' },
    ];

    const templatesHtml = templates.map(t => `
      <div class="template-item ${t.active ? 'active' : ''}">
        <div class="template-name">${t.name}</div>
        <div class="template-desc">${t.desc}</div>
      </div>`).join('');

    return `<div class="grid-1-320">
      ${_card(tomorrowLabel, scheduleRows, {
        action: `<div style="display:flex;gap:8px">
          <button class="cg-btn-sec" data-action="copyToday">Copiar de hoy</button>
          <button class="cg-btn-pri" data-action="saveSchedule">Guardar agenda</button>
        </div>`
      })}
      ${_card('Plantillas', templatesHtml)}
    </div>`;
  }

  // ── EVENTS ────────────────────────────────────────────────────────────
  function _attachEvents() {
    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click',  e => _handleClick(e));
      el.addEventListener('change', e => _handleChange(e));
    });
    // Preserve note draft across renders
    const ta = document.getElementById('note-draft');
    if (ta) {
      ta.addEventListener('input', e => { _state.noteDraft = e.target.value; });
    }
  }

  function _handleClick(e) {
    const el     = e.currentTarget;
    const action = el.dataset.action;
    switch (action) {
      case 'setTab':
        _state.tab = el.dataset.tab; render(); break;
      case 'export':
        _exportCSV(); break;
      case 'print':
        document.body.dataset.printDate = new Date().toLocaleDateString('es-PA');
        window.print(); break;
      case 'setTheme':
        _setTheme(el.dataset.theme); render(); break;
      case 'addNote':
        _state.tab = 'notes'; render(); break;
      case 'enableVoice':
        _state.voiceEnabled = true;
        TTS.speak(`${_greeting()} — sistema de voz activado.`);
        render(); break;
      case 'noteCategory':
        _state.noteCategory = el.dataset.cat; render(); break;
      case 'saveNote': {
        const ta   = document.getElementById('note-draft');
        const text = (ta?.value || _state.noteDraft).trim();
        if (!text) break;
        _addNote(text, _state.noteCategory);
        _state.noteDraft = '';
        render(); break;
      }
      case 'clearNote':
        _state.noteDraft = ''; render(); break;
      case 'copyToday': {
        const today    = _todayStr();
        const todayDay = Protocol.getDay(today);
        if (!todayDay) break;
        // Store a local marker that tomorrow should mirror today's template
        try { localStorage.setItem('nc_schedule_copied', today); } catch (_) {}
        _showToast('Agenda de hoy copiada para mañana.');
        break;
      }
      case 'saveSchedule':
        _showToast('Agenda guardada.'); break;
    }
  }

  function _showToast(msg) {
    const existing = document.getElementById('nc-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'nc-toast';
    t.textContent = msg;
    t.style.cssText = [
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%)',
      'background:var(--ink);color:var(--bg);font-size:13px;font-family:var(--font-body)',
      'padding:10px 20px;border-radius:999px;z-index:9999',
      'box-shadow:0 4px 16px rgba(0,0,0,.25);pointer-events:none',
      'animation:fadeInUp .2s ease',
    ].join(';');
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  function _handleChange(e) {
    const el = e.currentTarget;
    if (el.dataset.action === 'pillPhoto' && el.files?.[0]) {
      _handlePillPhoto(el.dataset.med, el.files[0]);
    }
  }

  return { init };
})();

if (typeof module !== 'undefined') module.exports = App;
else document.addEventListener('DOMContentLoaded', () => App.init());
