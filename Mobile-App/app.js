/* Aurelune Mobile – Musik & Live in 432 Hz / Solfeggio */
const $ = (id) => document.getElementById(id);
const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const fmtTime = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const S = Object.assign({ presetHz: 432, targetA4: 432, mode: 'rein', autoMeasure: true }, JSON.parse(localStorage.getItem('aur_settings') || '{}'));
const save = () => localStorage.setItem('aur_settings', JSON.stringify(S));
let premium = false, tracks = [], cur = -1, playing = false;
const elRein = $('elRein'), elPitch = $('elPitch');
let ctx = null, pitchNode = null, pitchSrc = null, workletReady = null;

function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); }
function showView(v) {
  document.querySelectorAll('.view').forEach((e) => e.classList.toggle('active', e.id === 'view-' + v));
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  document.querySelector('main').scrollTop = 0;
}
const isFree = (hz) => CONFIG.freeFrequencies.includes(Number(hz));
function presetFor(hz) {
  return FREQUENCIES.find((f) => f.hz === Number(hz)) || { hz: Number(hz), name: 'Eigene Frequenz', tag: 'Individuell', emoji: '🎚️', color: '#9fd3c7', desc: '' };
}

/* ---------------- IndexedDB library ---------------- */
let dbP = null;
function db() {
  if (!dbP) dbP = new Promise((res, rej) => {
    const r = indexedDB.open('aurelune', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbP;
}
async function store(mode, fn) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('tracks', mode); const st = tx.objectStore('tracks'); const r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); }
const dbAll = () => store('readonly', (s) => s.getAll());
const dbPut = (t) => store('readwrite', (s) => s.put(t));
const dbDel = (id) => store('readwrite', (s) => s.delete(id));

/* ---------------- Tuning analysis ---------------- */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}
function analyzeTuning(x, sr) {
  const N = 8192, H = 256, K = N / 2, win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const positions = 48, start = Math.floor(x.length * 0.1), span = Math.floor(x.length * 0.8) - N - H;
  if (span <= 0) return null;
  let vr = 0, vi = 0, W = 0;
  const r1 = new Float64Array(N), i1 = new Float64Array(N), r2 = new Float64Array(N), i2 = new Float64Array(N), mag = new Float64Array(K);
  const princ = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
  for (let p = 0; p < positions; p++) {
    const o = start + Math.floor(span * p / (positions - 1));
    for (let i = 0; i < N; i++) { r1[i] = x[o + i] * win[i]; i1[i] = 0; r2[i] = x[o + H + i] * win[i]; i2[i] = 0; }
    fft(r1, i1); fft(r2, i2);
    let mx = 0; for (let k = 0; k < K; k++) { mag[k] = Math.hypot(r1[k], i1[k]); if (mag[k] > mx) mx = mag[k]; }
    if (mx < 1e-3) continue;
    const kLo = Math.ceil(60 * N / sr), kHi = Math.min(K - 3, Math.floor(4000 * N / sr));
    for (let k = Math.max(2, kLo); k <= kHi; k++) {
      const m = mag[k];
      if (m < mx * 0.003 || !(m > mag[k - 1] && m >= mag[k + 1] && m > mag[k - 2] && m >= mag[k + 2])) continue;
      const d = princ(Math.atan2(i2[k], r2[k]) - Math.atan2(i1[k], r1[k]) - 2 * Math.PI * k * H / N);
      const f = (k + d * N / (2 * Math.PI * H)) * sr / N;
      const c = 1200 * Math.log2(f / 440), th = 2 * Math.PI * c / 100;
      vr += m * Math.cos(th); vi += m * Math.sin(th); W += m;
    }
  }
  if (W <= 0) return null;
  const conf = Math.hypot(vr, vi) / W, dev = Math.atan2(vi, vr) / (2 * Math.PI) * 100;
  return { ref: 440 * Math.pow(2, dev / 1200), conf };
}
async function decodeAndAnalyze(blob) {
  const buf = await blob.arrayBuffer();
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oc = new OAC(1, 1, 44100);
  const audio = await new Promise((res, rej) => { const p = oc.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); });
  const ch0 = audio.getChannelData(0), ch1 = audio.numberOfChannels > 1 ? audio.getChannelData(1) : null;
  const mono = new Float32Array(ch0.length);
  for (let i = 0; i < mono.length; i++) mono[i] = ch1 ? 0.5 * (ch0[i] + ch1[i]) : ch0[i];
  const a = analyzeTuning(mono, audio.sampleRate);
  return { duration: audio.duration, ref: a && a.conf > 0.4 ? a.ref : null, conf: a ? a.conf : 0 };
}

/* ---------------- Library UI ---------------- */
function renderLib() {
  $('libEmpty').hidden = tracks.length > 0;
  $('lib').innerHTML = '';
  tracks.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'track' + (i === cur ? ' cur' : '');
    const info = t.analyzing ? 'Messe Stimmung …' : t.ref ? `Original A4 = ${fmt(t.ref)} Hz · ${fmtTime(t.duration)}` : `Standard 440 Hz · ${fmtTime(t.duration)}`;
    d.innerHTML = `<div class="art">${i === cur && playing ? '🔊' : '🎵'}</div><div class="meta"><div class="tn"></div><div class="ti">${info}</div></div><button class="del" aria-label="Entfernen">×</button>`;
    d.querySelector('.tn').textContent = t.name;
    d.onclick = (e) => { if (e.target.classList.contains('del')) return; playIndex(i); };
    d.querySelector('.del').onclick = async () => {
      if (i === cur) { stop(); cur = -1; }
      await dbDel(t.id); tracks.splice(i, 1); if (cur > i) cur--; renderLib(); renderNow();
    };
    $('lib').appendChild(d);
  });
}
async function importFiles(files) {
  for (const f of files) {
    const t = { name: f.name.replace(/\.[^.]+$/, ''), blob: f, duration: 0, ref: null, conf: 0, added: Date.now() };
    t.id = await dbPut(t);
    t.analyzing = true; tracks.push(t); renderLib();
    try { Object.assign(t, await decodeAndAnalyze(f)); } catch (e) { console.warn(e); }
    t.analyzing = false;
    const { analyzing, ...rec } = t; await dbPut(rec);
    renderLib(); if (tracks.indexOf(t) === cur) applyRatio();
  }
  toast(`🎵 ${files.length} ${files.length === 1 ? 'Song' : 'Songs'} hinzugefügt`);
}

/* ---------------- Player ---------------- */
const activeEl = () => (S.mode === 'pitch' ? elPitch : elRein);
function ratioFor(t) { const ref = S.autoMeasure && t && t.ref ? t.ref : 440; return S.targetA4 / ref; }
async function ensurePitchGraph() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
  if (ctx.state !== 'running') await ctx.resume();
  if (!workletReady) workletReady = ctx.audioWorklet.addModule('pitch-processor.js');
  await workletReady;
  return ctx;
}
async function ensureElementGraph() {
  await ensurePitchGraph();
  if (!pitchSrc) {
    pitchSrc = ctx.createMediaElementSource(elPitch);
    pitchNode = new AudioWorkletNode(ctx, 'pitch-shifter', { outputChannelCount: [2], processorOptions: { ratio: 1, fftSize: 4096, overlap: 8 } });
    pitchSrc.connect(pitchNode).connect(ctx.destination);
  }
}
function setPP(el, v) { el.preservesPitch = v; el.mozPreservesPitch = v; el.webkitPreservesPitch = v; }
function applyRatio() {
  const t = tracks[cur], r = ratioFor(t);
  if (S.mode === 'rein') { setPP(elRein, false); elRein.playbackRate = r; }
  else { setPP(elPitch, true); elPitch.playbackRate = 1; if (pitchNode) pitchNode.port.postMessage({ ratio: r }); }
  renderNow();
}
async function playIndex(i, at = 0) {
  if (i < 0 || i >= tracks.length) return;
  const t = tracks[i];
  stopElements();
  cur = i;
  const el = activeEl();
  if (el._url) URL.revokeObjectURL(el._url);
  el._url = URL.createObjectURL(t.blob); el.src = el._url;
  if (S.mode === 'pitch') await ensureElementGraph();
  el.currentTime = at;
  applyRatio();
  try { await el.play(); playing = true; } catch (e) { playing = false; toast('Wiedergabe nicht möglich'); }
  applyRatio();
  setupMediaSession(t); renderLib(); renderNow();
}
function stopElements() { [elRein, elPitch].forEach((e) => { e.pause(); }); }
function stop() { stopElements(); playing = false; renderNow(); renderLib(); }
async function togglePlay() {
  if (cur < 0) { if (tracks.length) return playIndex(0); toast('Füge zuerst Musik hinzu'); return; }
  const el = activeEl();
  if (playing) { el.pause(); playing = false; }
  else { if (S.mode === 'pitch') await ensureElementGraph(); applyRatio(); await el.play(); playing = true; }
  renderNow(); renderLib();
}
async function switchMode(m) {
  if (m === S.mode) return;
  const old = activeEl(), t = old.currentTime, wasPlaying = playing;
  S.mode = m; save(); renderModes();
  if (cur >= 0) { old.pause(); if (wasPlaying || old.src) await playIndex(cur, t); if (!wasPlaying) { activeEl().pause(); playing = false; renderNow(); } }
  toast(m === 'rein' ? '✨ Rein – verlustfrei, läuft auch im Hintergrund' : '🎚️ Pitch-Shift – Tempo bleibt gleich');
}
[elRein, elPitch].forEach((el) => {
  el.addEventListener('timeupdate', () => { if (el !== activeEl()) return; const d = el.duration || 0; $('tCur').textContent = fmtTime(el.currentTime); $('tDur').textContent = fmtTime(d); if (!seeking && d) $('seek').value = Math.round(el.currentTime / d * 1000); });
  el.addEventListener('ended', () => { if (el === activeEl()) { if (cur + 1 < tracks.length) playIndex(cur + 1); else stop(); } });
  el.addEventListener('ratechange', () => { if (el === elRein && S.mode === 'rein' && cur >= 0) { const r = ratioFor(tracks[cur]); if (Math.abs(el.playbackRate - r) > 1e-6) el.playbackRate = r; } });
});
let seeking = false;
function setupMediaSession(t) {
  if (!('mediaSession' in navigator)) return;
  const p = presetFor(S.presetHz);
  navigator.mediaSession.metadata = new MediaMetadata({ title: t.name, artist: `Aurelune · ${p.hz} Hz ${p.name}`, album: 'Aurelune',
    artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => togglePlay()); ms.setActionHandler('pause', () => togglePlay());
  ms.setActionHandler('nexttrack', () => playIndex(cur + 1)); ms.setActionHandler('previoustrack', () => playIndex(Math.max(0, cur - 1)));
  try { ms.setActionHandler('seekto', (d) => { activeEl().currentTime = d.seekTime; }); } catch (e) {}
}

/* ---------------- Live mode ---------------- */
let live = null;
async function toggleLive() {
  if (live) {
    live.stream.getTracks().forEach((t) => t.stop()); live.src.disconnect(); live.node.disconnect(); live = null;
    $('liveBtn').classList.remove('on'); $('liveText').textContent = 'Live starten'; $('liveIcon').textContent = '🎙️'; return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    await ensurePitchGraph();
    const src = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, 'pitch-shifter', { outputChannelCount: [2], processorOptions: { ratio: S.targetA4 / 440, fftSize: 2048 } });
    const an = ctx.createAnalyser(); an.fftSize = 512;
    src.connect(node).connect(ctx.destination); src.connect(an);
    live = { stream, src, node, an };
    if (playing) stop();
    $('liveBtn').classList.add('on'); $('liveText').textContent = `Live · ${presetFor(S.presetHz).hz} Hz – Stoppen`; $('liveIcon').textContent = '⏹';
    const buf = new Float32Array(512);
    const meter = () => { if (!live) { $('liveLvl').style.width = 0; return; } an.getFloatTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v)); $('liveLvl').style.width = Math.min(100, m * 140) + '%'; requestAnimationFrame(meter); };
    meter();
  } catch (e) { toast('Mikrofon-Zugriff nicht erlaubt'); }
}

/* ---------------- Frequencies & premium ---------------- */
function buildFreqList() {
  const list = $('freqList'); list.innerHTML = '';
  FREQUENCIES.forEach((f) => {
    const free = isFree(f.hz), locked = !free && !premium, t = tuningFor(f.hz);
    const b = document.createElement('button');
    b.className = 'fitem' + (locked ? ' locked' : '') + (Number(S.presetHz) === f.hz ? ' sel' : ''); b.style.setProperty('--c', f.color);
    b.innerHTML = `<div class="ficon">${f.emoji}</div><div class="fbody"><div class="ftop"><span class="fhz">${f.hz} <small>Hz</small></span><span class="fname">${f.name}</span></div>
      <div class="ftop" style="margin-top:3px"><span class="ftag">${f.tag}</span><span class="muted" style="font-size:11px;color:var(--mut)">${f.hz === 432 ? 'A4 = 432 Hz' : '= Ton ' + t.noteName}</span></div>
      <div class="fdesc">${f.desc}</div></div>${free ? '<span class="free-tag">GRATIS</span>' : locked ? '<span class="lock-tag">👑 Premium</span>' : ''}`;
    b.onclick = () => choose(f.hz);
    list.appendChild(b);
  });
  $('customLock').hidden = premium;
}
function choose(hz) {
  if (!isFree(hz) && !premium) return openSheet(hz);
  S.presetHz = hz; S.targetA4 = tuningFor(hz).a4; save();
  renderPreset(); buildFreqList(); applyRatio();
  if (live) live.node.port.postMessage({ ratio: S.targetA4 / 440 });
  if (cur >= 0 && playing) setupMediaSession(tracks[cur]);
  const p = presetFor(hz); toast(`${p.emoji} ${p.hz} Hz · ${p.name}`);
}
function openSheet(hz) {
  const p = presetFor(hz);
  $('sheetTitle').textContent = `${p.emoji} ${p.hz} Hz · ${p.name}`;
  $('sheetText').textContent = `${p.tag} – diese Frequenz ist Teil von Aurelune Premium. Schalte alle Solfeggio-Frequenzen frei.`;
  $('sheetBg').hidden = false;
}
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function sigFor(part) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(CONFIG.licenseSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(part)));
  let bits = 0, val = 0, out = '';
  for (const byte of mac) { val = (val << 8) | byte; bits += 8; while (bits >= 5 && out.length < 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } if (out.length >= 5) break; }
  return out;
}
async function verifyCode(code) {
  const m = /^AUR-([A-Z0-9]{5})-([A-Z0-9]{5})$/.exec((code || '').trim().toUpperCase());
  if (!m || !(crypto && crypto.subtle)) return false;
  return (await sigFor(m[1])) === m[2];
}
async function redeem() {
  const code = $('codeIn').value.trim().toUpperCase();
  if (await verifyCode(code)) {
    localStorage.setItem('aur_license', code); premium = true; renderPremium(); buildFreqList();
    $('codeMsg').textContent = '✅ Premium ist freigeschaltet – viel Freude!'; toast('👑 Premium aktiv');
  } else $('codeMsg').textContent = '❌ Dieser Code ist ungültig. Bitte prüfen (Format AUR-XXXXX-XXXXX).';
}
function renderPremium() {
  $('planBadge').textContent = premium ? '👑 Premium' : 'Free'; $('planBadge').classList.toggle('premium', premium);
  document.querySelector('.premium-hero').classList.toggle('owned', premium);
  $('phTitle').textContent = premium ? 'Premium ist aktiv' : 'Aurelune Premium';
  $('phPrice').textContent = premium ? 'Danke für deine Unterstützung 💛' : CONFIG.premiumPrice;
  $('buyBtn').textContent = premium ? '✓ Alle Frequenzen freigeschaltet' : 'Premium freischalten';
  $('buyBtn').disabled = premium;
  document.querySelector('.code-row').hidden = premium;
}

/* ---------------- Render ---------------- */
function renderPreset() {
  const p = presetFor(S.presetHz);
  document.documentElement.style.setProperty('--acc', p.color);
  $('orbHz').textContent = p.hz; $('pillEmoji').textContent = p.emoji; $('pillName').textContent = `${p.hz} Hz · ${p.tag}`;
}
function renderModes() { document.querySelectorAll('#modeSeg button').forEach((b) => b.classList.toggle('sel', b.dataset.v === S.mode)); }
function renderNow() {
  const t = tracks[cur];
  $('orb').classList.toggle('on', playing); $('orbIcon').innerHTML = playing ? '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>' : '▶';
  if (!t) { $('nowTitle').textContent = tracks.length ? 'Tippe auf einen Song' : 'Keine Musik ausgewählt'; $('nowSub').textContent = tracks.length ? `${tracks.length} Songs in deiner Bibliothek` : 'Füge Songs von deinem Handy hinzu'; return; }
  const r = ratioFor(t), cents = 1200 * Math.log2(r);
  $('nowTitle').textContent = t.name;
  const src = S.autoMeasure && t.ref ? `Original ${fmt(t.ref)} Hz` : 'Original 440 Hz';
  $('nowSub').textContent = `${src} → ${fmt(S.targetA4)} Hz · ${cents >= 0 ? '+' : ''}${fmt(cents)} Cent` + (S.mode === 'rein' ? ` · Tempo ${r >= 1 ? '+' : ''}${fmt((r - 1) * 100)} %` : '');
}
function animate() {
  const c = $('orbCanvas'), x = c.getContext('2d'); let ph = 0;
  const draw = () => {
    const W = c.width, R = W / 2, on = playing || !!live;
    x.clearRect(0, 0, W, W);
    const col = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
    for (let l = 0; l < 3; l++) {
      x.beginPath();
      const base = 225 + l * 20, amp = on ? 14 - l * 3 : 2.5, k = 6 + l * 2;
      for (let a = 0; a <= Math.PI * 2 + 0.02; a += 0.025) {
        const r = base + Math.sin(a * k + ph * (1 + l * 0.35)) * amp * (0.6 + 0.4 * Math.sin(a * 3 - ph));
        const px = R + Math.cos(a) * r, py = R + Math.sin(a) * r; a ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.strokeStyle = col; x.globalAlpha = (on ? 0.6 : 0.22) - l * 0.15; x.lineWidth = 3 - l * 0.7; x.stroke();
    }
    x.globalAlpha = 1; ph += on ? 0.045 : 0.01; requestAnimationFrame(draw);
  };
  draw();
}

/* ---------------- Init ---------------- */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
async function init() {
  premium = await verifyCode(localStorage.getItem('aur_license'));
  if (!premium && !isFree(S.presetHz)) { S.presetHz = 432; S.targetA4 = 432; save(); }
  tracks = (await dbAll()).sort((a, b) => a.added - b.added);
  renderPreset(); renderModes(); renderPremium(); buildFreqList(); renderLib(); renderNow(); animate();
  $('autoMeasure').checked = S.autoMeasure;
  document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => showView(b.dataset.view)));
  $('crownBtn').onclick = () => showView('me');
  $('orb').onclick = togglePlay;
  $('prev').onclick = () => playIndex(Math.max(0, cur - 1));
  $('next').onclick = () => playIndex(Math.min(tracks.length - 1, cur + 1));
  $('freqPill').onclick = () => showView('freq');
  document.querySelectorAll('#modeSeg button').forEach((b) => (b.onclick = () => switchMode(b.dataset.v)));
  $('fileIn').onchange = (e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) importFiles(f); };
  const sk = $('seek');
  sk.oninput = () => { seeking = true; const el = activeEl(); $('tCur').textContent = fmtTime((el.duration || 0) * sk.value / 1000); };
  sk.onchange = () => { const el = activeEl(); if (el.duration) el.currentTime = el.duration * sk.value / 1000; seeking = false; };
  $('liveBtn').onclick = toggleLive;
  $('customGo').onclick = () => { const v = parseFloat($('custom').value); if (!(v >= 20 && v <= 2000)) return toast('Bitte 20 – 2000 Hz eingeben'); if (!premium) return openSheet(v); choose(Math.round(v * 10) / 10); };
  $('buyBtn').onclick = () => { if (CONFIG.checkoutUrl) window.open(CONFIG.checkoutUrl, '_blank'); else toast('Kauf-Link noch nicht eingerichtet'); };
  $('codeGo').onclick = redeem;
  $('sheetGo').onclick = () => { $('sheetBg').hidden = true; showView('me'); };
  $('sheetClose').onclick = () => ($('sheetBg').hidden = true);
  $('sheetBg').onclick = (e) => { if (e.target === $('sheetBg')) $('sheetBg').hidden = true; };
  $('autoMeasure').onchange = () => { S.autoMeasure = $('autoMeasure').checked; save(); applyRatio(); };
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (window.matchMedia('(display-mode: standalone)').matches) { $('installHint').textContent = 'Bereits installiert ✓'; $('installBtn').hidden = true; }
  else if (ios) $('installHint').textContent = 'Safari: Teilen ⬆︎ → „Zum Home-Bildschirm“';
  $('installBtn').onclick = async () => { if (installEvt) { installEvt.prompt(); installEvt = null; } else toast(ios ? 'Teilen ⬆︎ → „Zum Home-Bildschirm“' : 'Browser-Menü → „App installieren“'); };
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
init();
