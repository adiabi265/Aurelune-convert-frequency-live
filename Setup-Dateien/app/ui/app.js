'use strict';
const $ = (id) => document.getElementById(id);
let lang = 'en';
const t = (k, v = {}) => String((I18N[lang] && I18N[lang][k]) ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => (v[n] ?? ''));
const fmt = (v, d = 1) => { const s = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d); return lang === 'de' ? s.replace('.', ',') : s; };
const fmtC = (c) => `${c >= 0 ? '+' : '−'}${fmt(Math.abs(c), 1)} ¢`;
let api = null, state = null, settings = { target_a4: 432, auto: true, manual_ref: 440, quality: 'music' }, ui = { presetHz: 432 };
let status = { running: false }, busy = false, abHeld = false, check = null, lastErr = null;

// ---------- helpers ----------
function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove('show'), 2600); }
function showAlert(code, err, kind) {
  const box = $('alert');
  if (!code) { box.hidden = true; lastErr = null; return; }
  lastErr = code;
  $('alertText').textContent = I18N.en[code] ? t(code, { e: err || '' }) : (err || code);
  const btns = $('alertBtns'); btns.innerHTML = '';
  if (['E_NO_CABLE', 'E_CABLE_DISABLED'].includes(code) || kind === 'fix') {
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = t('fixAuto'); b.onclick = fixCable; btns.appendChild(b);
  }
  box.hidden = false;
}
async function call(name, ...args) {
  if (!api) return { ok: false, code: 'E_GENERIC', error: 'not ready' };
  const ms = name === 'fix_cable' ? 300000 : 25000;
  try {
    return await Promise.race([api[name](...args), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout: ' + name)), ms))]);
  } catch (e) { return { ok: false, code: 'E_GENERIC', error: String(e && e.message || e) }; }
}
function presetFor(hz) {
  const f = FREQUENCIES.find((x) => x.hz === Number(hz));
  if (f) return { hz: f.hz, emoji: f.emoji, color: f.color, ...f[lang] };
  return { hz: Number(hz), name: t('custom'), tag: t('customTag'), emoji: '🎚️', color: '#9fd3c7', desc: t('customDesc') };
}
function showView(v) {
  document.querySelectorAll('.view').forEach((e) => e.classList.toggle('active', e.id === 'view-' + v));
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  document.querySelector('main').scrollTop = 0;
  if (v === 'settings') refreshCheck();
}

// ---------- i18n ----------
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((e) => (e.textContent = t(e.dataset.i18n)));
  $('langBtn').textContent = lang.toUpperCase();
  document.querySelectorAll('#langSeg button').forEach((b) => b.classList.toggle('sel', b.dataset.v === lang));
  buildList(); renderSettings(); fillDevices(); renderCheck(); renderStatus(true);
}
async function setLang(l) { lang = l === 'de' ? 'de' : 'en'; applyLang(); await call('set_lang', lang); }

// ---------- frequencies ----------
function buildList() {
  const list = $('freqList'); list.innerHTML = '';
  FREQUENCIES.forEach((f) => {
    const p = presetFor(f.hz), tu = tuningFor(f.hz, 440, lang);
    const b = document.createElement('button');
    b.className = 'fitem'; b.dataset.hz = f.hz; b.style.setProperty('--c', f.color);
    const tech = f.hz === 432 ? 'A4 = 432 Hz' : `= ${tu.noteName} · A4 = ${fmt(tu.a4)} Hz`;
    b.innerHTML = `<div class="ficon">${f.emoji}</div><div class="fbody"><div class="ftop"><span class="fhz">${f.hz} <small>Hz</small></span>
      <span class="fname"></span><span class="ftag"></span></div><div class="fdesc"></div>
      <div class="muted" style="margin-top:3px">${tech}</div></div><div class="fcheck"></div>`;
    b.querySelector('.fname').textContent = p.name; b.querySelector('.ftag').textContent = p.tag; b.querySelector('.fdesc').textContent = p.desc;
    b.onclick = () => { choose(f.hz); toast(`${f.emoji} ${f.hz} Hz · ${p.name}`); };
    list.appendChild(b);
  });
  renderSettings();
}
function choose(hz) { setS({ target_a4: tuningFor(hz).a4 }, { presetHz: hz }); }

// ---------- render ----------
function renderSettings() {
  const p = presetFor(ui.presetHz || 432);
  document.documentElement.style.setProperty('--acc', p.color);
  document.querySelectorAll('.fitem').forEach((c) => c.classList.toggle('sel', Number(c.dataset.hz) === p.hz));
  if (!status.running) $('orbHz').textContent = p.hz;
  $('pillEmoji').textContent = p.emoji; $('pillName').textContent = `${p.name} · ${p.tag}`;
  $('auto').checked = !!settings.auto; $('manualRow').hidden = !!settings.auto; $('manualRef').value = settings.manual_ref;
  document.querySelectorAll('#profileSeg button').forEach((b) => b.classList.toggle('sel', b.dataset.v === settings.quality));
  $('profileHint').textContent = settings.quality === 'voice' ? t('pVoiceHint') : t('pMusicHint');
  if ($('precise')) $('precise').checked = !!settings.precision;
  $('lgGrid').textContent = t('grid', { hz: p.hz });
  $('specHint').textContent = t('specHint', { hz: p.hz });
  renderBinaural();
}

let dispHz = null, lastText = 0;
function renderStatus(force) {
  renderBinStatus();
  const s = status, on = !!s.running, p = presetFor(ui.presetHz || 432);
  $('orb').classList.toggle('on', on); $('orb').classList.toggle('busy', busy);
  $('orbState').textContent = busy ? t('oneMoment') : on ? t('tapStop') : t('tapStart');
  const chip = $('chip'); chip.className = 'chip' + (on ? (s.underruns > 5 ? ' on warn' : ' on') : '');
  chip.querySelector('span').textContent = on ? t('on') : t('off');
  $('ab').disabled = !on;
  const now = performance.now();
  if (!force && now - lastText < 200) return;
  lastText = now;
  if (!on) {
    ['fIn', 'fOut', 'fDev'].forEach((i) => ($(i).textContent = '–'));
    $('verdict').textContent = '–'; $('verdict').className = 'verdict';
    $('anaText').textContent = t('anaOff'); $('peakLine').textContent = '–';
    $('orbHz').textContent = p.hz; $('orbCap').textContent = t('target'); dispHz = null;
    $('lvIn').style.width = $('lvOut').style.width = 0; $('routeLine').textContent = '';
    return;
  }
  const music = s.source !== 'fallback' && !s.silent;
  const outOk = music && s.out_conf > 0.5;
  // orb: the frequency that is REALLY playing (measured in the output signal)
  if (outOk) {
    const live = p.hz * s.out_a4 / s.target_a4;
    dispHz = dispHz == null ? live : dispHz + (live - dispHz) * 0.35;
    $('orbHz').textContent = fmt(dispHz, 1); $('orbCap').textContent = s.enabled ? t('measuredLive') : t('original');
  } else {
    $('orbHz').textContent = p.hz; $('orbCap').textContent = s.silent ? t('waiting') : t('target'); dispHz = null;
  }
  $('fIn').textContent = s.silent ? t('silence') : (s.source === 'fallback' ? '≈ 440 Hz' : `${fmt(s.reference)} Hz`);
  $('fOut').textContent = outOk ? `${fmt(s.out_a4)} Hz` : '–';
  $('fDev').textContent = outOk ? fmtC(s.out_dev) : '–';
  const v = $('verdict');
  if (s.silent) { v.textContent = t('silence'); v.className = 'verdict'; }
  else if (!s.enabled) { v.textContent = t('bypassV'); v.className = 'verdict warn'; }
  else if (!music) { v.textContent = t('noMusic'); v.className = 'verdict'; }
  else if (outOk && Math.abs(s.out_dev) < 3) { v.textContent = t('verified'); v.className = 'verdict ok'; }
  else { v.textContent = t('measuring'); v.className = 'verdict'; }
  let txt;
  if (!s.enabled) txt = t('anaBypass');
  else if (s.silent) txt = t('anaWait');
  else if (s.source === 'manual') txt = t('anaManual', { in: fmt(s.reference) });
  else if (s.source === 'measured') txt = t('anaMeasured', { in: fmt(s.reference), out: outOk ? fmt(s.out_a4) : '…' });
  else txt = t('anaFallback');
  $('anaText').textContent = txt;
  if (s.peak_out > 0 && !s.silent) {
    const a4 = s.expected_a4, n = Math.round(12 * Math.log2(s.peak_out / a4)), dev = 1200 * Math.log2(s.peak_out / (a4 * 2 ** (n / 12)));
    $('peakLine').textContent = t('peak', { f: fmt(s.peak_out, 1), note: noteName(n, lang), grid: fmt(a4, 1), dev: fmtC(dev) });
  } else $('peakLine').textContent = '–';
  $('lvIn').style.width = Math.min(100, s.level_in * 100) + '%'; $('lvOut').style.width = Math.min(100, s.level_out * 100) + '%';
  if (s.devices) $('routeLine').textContent = t('route', { in: s.devices[0], out: s.devices[1] });
  $('techInfo').textContent = t('techLine', { lat: Math.round(s.latency_ms), buf: Math.round(s.buffer_ms), cpu: fmt(s.cpu * 100), sr: `${s.sr[0] / 1000}/${s.sr[1] / 1000}`,
    fft: s.fft[0], ov: s.fft[1], lim: fmt(-s.limiter_db, 1), u: s.underruns });
}

// ---------- visualizers (real data from the engine) ----------
const SPEC_MIN = 40, SPEC_MAX = 12000;
let specOut = new Float32Array(240), specIn = new Float32Array(240), histOut = new Float32Array(100), histIn = new Float32Array(100), ph = 0;
function ease(arr, src, k) { if (!src) { for (let i = 0; i < arr.length; i++) arr[i] *= 0.9; return; } for (let i = 0; i < arr.length; i++) arr[i] += ((src[i] || 0) / 255 - arr[i]) * k; }
function accent() { return getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#f5b971'; }
function drawOrb(x, W, col, on) {
  const R = W / 2, inner = 206, n = 120;
  x.clearRect(0, 0, W, W);
  x.save(); x.translate(R, R);
  for (let i = 0; i < n; i++) {
    const band = Math.floor((i < n / 2 ? i : n - 1 - i) * (200 / (n / 2)));   // mirrored, low freq at top
    const v = on ? specOut[band] : 0;
    const len = 4 + Math.pow(Math.max(0, v - 0.18) / 0.82, 1.6) * 120 + (on ? 0 : 2 * Math.sin(ph * 2 + i * 0.3) + 2);
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    x.strokeStyle = col; x.globalAlpha = on ? 0.35 + 0.65 * v : 0.18; x.lineWidth = 6; x.lineCap = 'round';
    x.beginPath(); x.moveTo(Math.cos(a) * inner, Math.sin(a) * inner); x.lineTo(Math.cos(a) * (inner + len), Math.sin(a) * (inner + len)); x.stroke();
  }
  x.restore(); x.globalAlpha = 1;
}
const xOf = (f, W) => Math.log(f / SPEC_MIN) / Math.log(SPEC_MAX / SPEC_MIN) * W;
function drawSpec(c, col) {
  const x = c.getContext('2d'), W = c.width, H = c.height, s = status, p = presetFor(ui.presetHz || 432);
  x.clearRect(0, 0, W, H);
  const a4 = s.running ? s.expected_a4 || settings.target_a4 : settings.target_a4;
  const ratio440 = 440 / settings.target_a4;
  // fine grid: all notes of the target tuning
  x.globalAlpha = 0.07; x.strokeStyle = '#fff'; x.lineWidth = 1;
  for (let n = -60; n <= 40; n++) { const f = a4 * 2 ** (n / 12); if (f < SPEC_MIN || f > SPEC_MAX) continue; const px = xOf(f, W); x.beginPath(); x.moveTo(px, 0); x.lineTo(px, H - 22); x.stroke(); }
  // 440 reference (dashed grey) and target frequency octaves (accent)
  x.font = '600 19px Segoe UI, sans-serif'; x.textAlign = 'center';
  for (let k = -5; k <= 5; k++) {
    const fg = p.hz * ratio440 * 2 ** k, ft = p.hz * 2 ** k;
    if (fg > SPEC_MIN && fg < SPEC_MAX) { x.setLineDash([5, 6]); x.globalAlpha = 0.35; x.strokeStyle = '#9b97ad'; const px = xOf(fg, W); x.beginPath(); x.moveTo(px, 0); x.lineTo(px, H - 22); x.stroke(); x.setLineDash([]); }
    if (ft > SPEC_MIN && ft < SPEC_MAX) { x.globalAlpha = 0.9; x.strokeStyle = col; x.lineWidth = 2; const px = xOf(ft, W); x.beginPath(); x.moveTo(px, 0); x.lineTo(px, H - 22); x.stroke(); x.lineWidth = 1; x.fillStyle = col; x.fillText(fmt(ft, ft < 100 ? 1 : 0), px, H - 3); }
  }
  const bars = specOut.length, path = (arr) => { x.beginPath(); for (let i = 0; i < bars; i++) { const px = i / (bars - 1) * W, py = (H - 24) * (1 - arr[i]); i ? x.lineTo(px, py) : x.moveTo(px, py); } };
  // original (grey line)
  path(specIn); x.globalAlpha = 0.55; x.strokeStyle = '#b9b4cc'; x.lineWidth = 1.5; x.stroke();
  // output (filled accent)
  path(specOut); x.lineTo(W, H - 24); x.lineTo(0, H - 24); x.closePath();
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col); g.addColorStop(1, 'transparent');
  x.globalAlpha = 0.45; x.fillStyle = g; x.fill(); path(specOut); x.globalAlpha = 1; x.strokeStyle = col; x.lineWidth = 2.2; x.stroke();
  x.globalAlpha = 1;
}
function drawFp(c, col) {
  const x = c.getContext('2d'), W = c.width, H = c.height, s = status;
  x.clearRect(0, 0, W, H);
  const base = H - 30, cx = (cents) => ((cents + 50) / 100) * W;
  const tc = ((1200 * Math.log2(settings.target_a4 / 440) + 50) % 100 + 100) % 100 - 50;
  // axis labels (as A4 values)
  x.font = '600 19px Segoe UI, sans-serif'; x.textAlign = 'center'; x.fillStyle = '#8f8aa3';
  [-50, -25, 0, 25, 50].forEach((c) => { x.fillText(`${fmt(440 * 2 ** (c / 1200), 0)}`, Math.min(W - 24, Math.max(24, cx(c))), H - 4); });
  const curve = (arr) => { x.beginPath(); for (let i = 0; i < 100; i++) { const px = (i + 0.5) / 100 * W, py = base - arr[i] * (base - 12); i ? x.lineTo(px, py) : x.moveTo(px, py); } };
  // markers
  x.setLineDash([5, 6]); x.strokeStyle = '#9b97ad'; x.globalAlpha = 0.6; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx(0), 0); x.lineTo(cx(0), base); x.stroke(); x.setLineDash([]);
  x.strokeStyle = col; x.globalAlpha = 0.95; x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx(tc), 0); x.lineTo(cx(tc), base); x.stroke();
  x.fillStyle = col; x.textAlign = cx(tc) > W - 120 ? 'right' : 'left'; x.fillText(`${t('target')} ${fmt(settings.target_a4)}`, cx(tc) + (x.textAlign === 'left' ? 8 : -8), 22);
  x.fillStyle = '#b9b4cc'; x.textAlign = cx(0) > W - 120 ? 'right' : 'left'; x.fillText('440', cx(0) + 8, 44);
  if (!s.running) return;
  curve(histIn); x.globalAlpha = 0.6; x.strokeStyle = '#b9b4cc'; x.lineWidth = 2; x.stroke();
  curve(histOut); x.lineTo(W, base); x.lineTo(0, base); x.closePath(); x.globalAlpha = 0.35; x.fillStyle = col; x.fill();
  curve(histOut); x.globalAlpha = 1; x.strokeStyle = col; x.lineWidth = 2.6; x.stroke();
}
function animate() {
  const oc = $('orbCanvas').getContext('2d'), sc = $('spec'), fc = $('fp');
  const frame = () => {
    const on = status.running, col = accent();
    ease(specOut, on ? status.spec_out : null, 0.35); ease(specIn, on ? status.spec_in : null, 0.35);
    ease(histOut, on ? status.hist_out : null, 0.2); ease(histIn, on ? status.hist_in : null, 0.2);
    drawOrb(oc, oc.canvas.width, col, on && !status.silent);
    drawCymatics(on);
    if ($('view-home').classList.contains('active')) { drawSpec(sc, col); drawFp(fc, col); }
    ph += 0.02; requestAnimationFrame(frame);
  };
  frame();
}

// ---------- system check ----------
function renderCheck() {
  const box = $('checks'); if (!box) return;
  const c = check; box.innerHTML = '';
  if (!c) return;
  const row = (ok, label, val) => { const d = document.createElement('div'); d.className = 'ck ' + (ok === true ? 'ok' : ok === false ? 'bad' : 'info'); d.innerHTML = `<i></i><span></span><b></b>`; d.querySelector('span').textContent = label; d.querySelector('b').textContent = val; box.appendChild(d); };
  if (!c.supported && !c.installed) { row(null, 'VB-CABLE', t('ckNA')); $('fixBtn').hidden = true; return; }
  row(!!c.installed, t('ckDriver'), c.installed ? t('ckYes') : t('ckNo'));
  if (c.installed) row(c.active, t('ckActive'), c.active ? t('ckOn') : c.disabled ? t('ckDisabled') : t('ckReboot'));
  if (c.supported && c.active) row(!!c.format_ok, t('ckFormat'), c.rates.length ? c.rates.map((r) => `${r / 1000} kHz`).join(' / ') : '–');
  row(status.running ? !!c.default_is_cable : null, t('ckRoute'), status.running ? (c.default_is_cable ? t('ckRouteOn') : (c.default || '–')) : t('ckRouteOff'));
  const outName = status.running && status.devices ? status.devices[1] : (state && (state.out_choice !== 'auto' ? state.out_choice : state.auto_out)) || '–';
  row(null, t('ckOut'), outName);
  const bad = !c.installed || !c.active || (c.supported && !c.format_ok);
  $('fixBtn').hidden = !(c.supported && bad && !(c.installed && !c.active && !c.disabled));
  $('setDot').hidden = !bad;
  if (bad && !status.running && !lastErr) {
    if (!c.installed) showAlert('E_NO_CABLE'); else if (c.disabled) showAlert('E_CABLE_DISABLED'); else if (!c.active) showAlert('E_REBOOT');
  }
}
async function refreshCheck() { const r = await call('system_check'); if (r && r.ok !== false) { check = r; renderCheck(); } }
async function fixCable() {
  toast(t('fixing')); showAlert(null);
  $('fixBtn').disabled = true;
  const r = await call('fix_cable');
  $('fixBtn').disabled = false;
  if (r && r.installed !== undefined) { check = r; renderCheck(); }
  if (r && r.ok && r.active) { toast(t('fixOk')); await refreshState(); }
  else if (r && r.code) showAlert(r.code, r.error);
  else { toast(t('fixFail')); refreshCheck(); }
}

// ---------- actions ----------
async function setS(patch, uiPatch) {
  if (uiPatch) Object.assign(ui, uiPatch);
  Object.assign(settings, patch); renderSettings();
  const r = await call('set_settings', patch, uiPatch || null);
  if (r && r.ok !== false) settings = r; else if (r) showAlert(r.code, r.error);
  renderSettings();
}
async function togglePower() {
  if (busy) return;
  if (!api) { toast(t('oneMoment')); return; }
  busy = true; showAlert(null); renderStatus(true);
  const r = status.running ? await call('power_off') : await call('power_on');
  busy = false;
  if (r && r.ok === false) showAlert(r.code || 'E_GENERIC', r.error);
  await pollOnce(); refreshCheck();
  if (status.running) toast(t('toastOn'));
}
let polling = false;
async function pollOnce() {
  if (!api || polling) return; polling = true;
  try { const s = await call('status'); if (s && s.running !== undefined) status = s; } finally { polling = false; }
  renderStatus();
}
function poll() { pollOnce().finally(() => setTimeout(poll, status.running ? 70 : 400)); }

// ---------- devices ----------
function fillDevices() {
  if (!state || !state.devices) return;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const opt = (v, label) => `<option value="${esc(v)}">${esc(label)}</option>`;
  $('outDev').innerHTML = opt('auto', t('autoOut', { name: state.auto_out || '–' })) + state.outputs.map((n) => opt(n, n)).join('');
  $('outDev').value = state.outputs.includes(state.out_choice) ? state.out_choice : 'auto';
  $('inDev').innerHTML = state.devices.inputs.map((d) => opt(d.name, d.name + (d.virtual ? '  ★' : ''))).join('');
  const vin = state.devices.inputs.find((d) => d.name === state.manual_in) || state.devices.inputs.find((d) => d.virtual);
  if (vin) $('inDev').value = vin.name;
  $('autoDev').checked = state.device_mode !== 'manual'; $('manualDev').hidden = $('autoDev').checked;
}
async function refreshState() {
  const s = await call('get_state');
  if (!s || s.ok === false) { showAlert((s && s.code) || 'E_GENERIC', s && s.error); return false; }
  state = s; settings = s.settings; ui = Object.assign({ presetHz: 432 }, s.ui || {}); check = s.check;
  fillDevices(); renderSettings(); renderCheck();
  return true;
}

// ---------- wiring (works even before the backend is ready) ----------
function wire() {
  $('orb').onclick = togglePower;
  $('freqPill').onclick = () => showView('freq');
  document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => showView(b.dataset.view)));
  $('langBtn').onclick = () => setLang(lang === 'en' ? 'de' : 'en');
  document.querySelectorAll('#langSeg button').forEach((b) => (b.onclick = () => setLang(b.dataset.v)));
  $('auto').onchange = () => setS({ auto: $('auto').checked });
  $('manualRef').onchange = () => { const v = parseFloat($('manualRef').value); if (v >= 400 && v <= 480) setS({ manual_ref: v }); };
  document.querySelectorAll('#profileSeg button').forEach((b) => (b.onclick = () => setS({ quality: b.dataset.v })));
  wireBinaural();
  if ($('precise')) $('precise').onchange = (e) => setS({ precision: e.target.checked });
  const applyCustom = () => { const v = parseFloat(String($('custom').value).replace(',', '.')); if (v >= 20 && v <= 2000) { choose(Math.round(v * 10) / 10); toast(`🎚️ ${fmt(v)} Hz`); } };
  $('customGo').onclick = applyCustom; $('custom').onkeydown = (e) => e.key === 'Enter' && applyCustom();
  $('outDev').onchange = async () => { const r = await call('set_output', $('outDev').value); if (r && r.ok === false) showAlert(r.code, r.error); else toast(t('toastOutput')); await refreshState(); };
  $('autoDev').onchange = async () => {
    $('manualDev').hidden = $('autoDev').checked;
    if ($('autoDev').checked) { const r = await call('set_devices', 'auto'); if (r && r.ok === false) showAlert(r.code, r.error); else toast(t('autoDevOn')); }
  };
  $('applyDev').onclick = async () => { const r = await call('set_devices', 'manual', $('inDev').value); if (r && r.ok === false) showAlert(r.code, r.error); else toast(t('devApplied')); };
  $('autostart').onchange = async () => { const r = await call('set_autostart', $('autostart').checked); $('autostart').checked = r === true; toast(r === true ? t('autostartOn') : t('autostartOff')); };
  $('resetSound').onclick = async () => { const r = await call('reset_sound'); await pollOnce(); toast(r && r.ok ? t('resetOk', { d: r.device }) : t('resetFail')); };
  $('openSound').onclick = () => call('open_sound_settings');
  $('openLog').onclick = () => call('open_log');
  $('recheck').onclick = refreshCheck;
  $('fixBtn').onclick = fixCable;
  const ab = $('ab');
  const hold = (v) => { if (ab.disabled || abHeld === v) return; abHeld = v; ab.classList.toggle('held', v); ab.textContent = v ? t('abHeld') : t('abIdle'); call('bypass', v); };
  ab.addEventListener('pointerdown', () => hold(true)); ['pointerup', 'pointerleave', 'pointercancel'].forEach((e) => ab.addEventListener(e, () => hold(false)));
  document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !['INPUT', 'SELECT'].includes(e.target.tagName)) { e.preventDefault(); togglePower(); } });
}

async function start() {
  if (!(await refreshState())) { setTimeout(start, 1500); return; }
  lang = state.lang === 'de' ? 'de' : 'en';
  applyLang();
  $('autostart').checked = !!state.autostart;
  $('version').textContent = `Aurelune Studio ${state.version}`;
  poll();
}

window.addEventListener('error', (e) => showAlert('E_GENERIC', e.message));
window.addEventListener('unhandledrejection', (e) => showAlert('E_GENERIC', String(e.reason)));
wire(); applyLang(); requestAnimationFrame(animate);  // deferred: CYM etc. are declared further below
// pywebview bridge, or HTTP bridge when running in an Edge app window
// pywebview 5 also serves the UI over http - only the Edge fallback sets ?bridge=http
if (!window.pywebview && new URLSearchParams(location.search).get('bridge') === 'http') {
  api = new Proxy({}, { get: (_, n) => (...a) => fetch('/api/' + n, { method: 'POST', body: JSON.stringify(a) }).then((r) => r.json()) });
  start();
} else {
  let started = false;
  const go = () => { if (started) return; if (!(window.pywebview && window.pywebview.api && window.pywebview.api.get_state)) return; started = true; api = window.pywebview.api; start(); };
  window.addEventListener('pywebviewready', go);
  const iv = setInterval(() => { go(); if (started) clearInterval(iv); }, 150);
}

// ---------- brainwave layers (binaural beats) ----------
function binPresets() {
  return {
    delta: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
    theta: [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5],
    alpha: [8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 12.0],
    gateway: [1.5, 3.0, 4.0, 5.5, 7.0, 7.83, 10.0, 14.0],
  };
}
function binCarriers() { return [108, 128.43, 144.16, 162, 192.43, 216, 256.87, 324]; }
function renderBinaural() {
  if (!$('binOn')) return;
  const all = binPresets(), pr = all[settings.bin_preset] ? settings.bin_preset : 'gateway', beats = all[pr], car = binCarriers();
  $('binOn').checked = !!settings.binaural;
  document.querySelectorAll('#binSeg button').forEach((b) => b.classList.toggle('sel', b.dataset.v === pr));
  $('binDesc').textContent = t('binDesc_' + pr);
  const box = $('binLayers'); box.innerHTML = '';
  beats.forEach((bt, i) => {
    const s = document.createElement('span'); s.textContent = `${fmt(bt, Number.isInteger(bt * 10) ? 1 : 2)} Hz`;
    const sm = document.createElement('small'); sm.textContent = `${fmt(car[i], 0)} Hz`; s.appendChild(sm); box.appendChild(s);
  });
  box.classList.toggle('on', !!settings.binaural);
  if (document.activeElement !== $('binLevel')) $('binLevel').value = Math.round((settings.bin_level ?? 0.2) * 100);
  if (document.activeElement !== $('binNoise')) $('binNoise').value = Math.round((settings.bin_noise ?? 0.3) * 100);
  $('binLevelV').textContent = `${$('binLevel').value} %`; $('binNoiseV').textContent = `${$('binNoise').value} %`;
  renderBinStatus();
}
function renderBinStatus() {
  const el = $('binState'); if (!el) return;
  const b = status && status.binaural;
  if (!settings.binaural) { el.textContent = t('off'); el.className = 'verdict'; return; }
  if (!status.running) { el.textContent = t('binOff'); el.className = 'verdict'; return; }
  if (b && b.mono) { el.textContent = t('binMono'); el.className = 'verdict warn'; return; }
  const beats = binPresets()[settings.bin_preset] || binPresets().gateway;
  el.textContent = t('binActive', { n: beats.length, lo: fmt(Math.min(...beats), 1), hi: fmt(Math.max(...beats), 1) }); el.className = 'verdict ok';
}
function wireBinaural() {
  if (!$('binOn')) return;
  $('binOn').onchange = (e) => setS({ binaural: e.target.checked });
  document.querySelectorAll('#binSeg button').forEach((b) => (b.onclick = () => setS({ bin_preset: b.dataset.v })));
  $('binLevel').oninput = () => { $('binLevelV').textContent = `${$('binLevel').value} %`; };
  $('binLevel').onchange = () => setS({ bin_level: Number($('binLevel').value) / 100 });
  $('binNoise').oninput = () => { $('binNoiseV').textContent = `${$('binNoise').value} %`; };
  $('binNoise').onchange = () => setS({ bin_noise: Number($('binNoise').value) / 100 });
}

// ---------- cymatics: Chladni plate driven by the live dominant frequency ----------
const CYM = { ready: false };
function cymInit() {
  const M = 11, XN = 3200, XMAX = 42, dx = XMAX / (XN - 1), T = 96, J = [];
  for (let m = 0; m < M; m++) {        // Bessel J_m(x) via its integral form (trapezoid, spectrally accurate)
    const a = new Float32Array(XN);
    for (let i = 0; i < XN; i++) {
      const x = i * dx; let s = 0;
      for (let k = 0; k <= T; k++) { const tau = Math.PI * k / T; s += (k === 0 || k === T ? 0.5 : 1) * Math.cos(m * tau - x * Math.sin(tau)); }
      a[i] = s / T;
    }
    J.push(a);
  }
  const modes = [];
  for (let m = 0; m < M; m++) {        // eigenmodes of a circular plate with nodal rim: k = n-th zero of J_m
    const a = J[m]; let n = 0;
    for (let i = 2; i < XN && n < 7; i++) {
      if ((a[i - 1] < 0) !== (a[i] < 0)) {
        const k = (i - 1 + a[i - 1] / (a[i - 1] - a[i])) * dx; n++;
        if (k > 36) break;
        let mx = 0; for (let j = 0; j * dx <= k; j++) mx = Math.max(mx, Math.abs(a[j]));
        modes.push({ m, n, k, norm: mx || 1 });
      }
    }
  }
  modes.sort((p, q) => p.k - q.k);
  const ref = modes.find((d) => d.m === 6 && d.n === 3) || modes[Math.floor(modes.length / 2)];
  const P = 2400, px = new Float32Array(P), py = new Float32Array(P);
  for (let i = 0; i < P; i++) { const r = Math.sqrt(Math.random()) * 0.98, a = Math.random() * Math.PI * 2; px[i] = r * Math.cos(a); py[i] = r * Math.sin(a); }
  Object.assign(CYM, { ready: true, J, dx, XN, modes, C: 432 / (ref.k * ref.k), P, px, py, cur: ref, prev: ref, mix: 1, cand: ref, candT: 0, last: performance.now() });
}
function cymMode(f) {
  while (f > 1500) f /= 2;
  while (f < 60) f *= 2;
  const kt = Math.sqrt(f / CYM.C); let best = CYM.modes[0];
  for (const d of CYM.modes) if (Math.abs(d.k - kt) < Math.abs(best.k - kt)) best = d;
  return best;
}
function cymField(d, r, c, s) {      // J_m(k r) cos(m theta), normalised; c/s = cos/sin(theta)
  const xi = d.k * r / CYM.dx, i = Math.min(CYM.XN - 2, xi | 0), fr = xi - i, a = CYM.J[d.m];
  let cm = 1, sm = 0;
  for (let j = 0; j < d.m; j++) { const t = cm * c - sm * s; sm = sm * c + cm * s; cm = t; }
  return (a[i] + (a[i + 1] - a[i]) * fr) * cm / d.norm;
}
function drawCymatics(on) {
  const cv = $('cymCanvas'); if (!cv) return;
  if (!CYM.ready) cymInit();
  const now = performance.now(), dt = Math.min(0.1, (now - CYM.last) / 1000); CYM.last = now;
  const live = on && status.running && !status.silent && status.peak_out > 0;
  const f = live ? status.peak_out : presetFor(ui.presetHz || 432).hz;
  const want = cymMode(f);
  if (want !== CYM.cand) { CYM.cand = want; CYM.candT = now; }
  if (CYM.cand !== CYM.cur && now - CYM.candT > 300 && CYM.mix >= 1) { CYM.prev = CYM.cur; CYM.cur = CYM.cand; CYM.mix = 0; }
  CYM.mix = Math.min(1, CYM.mix + dt / 0.8);
  const energy = live ? 0.35 + 0.65 * Math.min(1, (status.level_out || 0) * 1.5) : 0.22;
  const { P, px, py, prev, cur, mix } = CYM;
  for (let i = 0; i < P; i++) {
    let x = px[i], y = py[i];
    const r = Math.sqrt(x * x + y * y) || 1e-6, c = x / r, s = y / r;
    let u = cymField(cur, r, c, s);
    if (mix < 1) u = u * mix + cymField(prev, r, c, s) * (1 - mix);
    const st = (0.045 * Math.pow(Math.abs(u), 0.9) + 0.0006) * energy * dt * 60;
    x += (Math.random() - 0.5) * 2 * st; y += (Math.random() - 0.5) * 2 * st;
    const rr = x * x + y * y; if (rr > 0.98) { const q = 0.99 / Math.sqrt(rr); x *= q; y *= q; }
    px[i] = x; py[i] = y;
  }
  const g = cv.getContext('2d'), W = cv.width, h = W / 2;
  g.clearRect(0, 0, W, W);
  g.fillStyle = on ? '#1a1222' : accent(); g.globalAlpha = on ? 0.42 : 0.3;
  for (let i = 0; i < P; i++) g.fillRect(h + px[i] * h - 1, h + py[i] * h - 1, 2.2, 2.2);
  g.globalAlpha = 1;
}
