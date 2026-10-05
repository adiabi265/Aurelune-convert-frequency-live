/* Aurelune 3.17 – (1) "Optimal mix" in the player bar: one popover with every volume that is active right now
   (live meters from the engine mixer, sliders, Auto-Mix, one-click optimal mix + undo) and (2) a new 3D cymatics
   viewer with five views (Chladni plate 3D, water surface, sphere, mandala, sand), colours, quality, rotation,
   live / fixed frequency, audio reaction. Audio stays in the engine (mixer.py); this file is UI only. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var L = function () { return (typeof lang !== 'undefined' && lang === 'de') ? 'de' : 'en'; };
  var tt = function (k, v) { return typeof t === 'function' ? t(k, v) : k; };
  var S = function () { return (typeof settings !== 'undefined' && settings) || {}; };
  var ST = function () { return (typeof status !== 'undefined' && status) || {}; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var num = function (v, d) { var s = Number(v).toFixed(d == null ? 0 : d); return L() === 'de' ? s.replace('.', ',') : s; };
  var dbs = function (v) { return v == null ? '–' : (v > 0 ? '+' : '') + num(v, 0) + ' dB'; };
  try {
    Object.assign(I18N.en, {
      mxBtn: 'Mix', mxTitle: 'Mix · all volumes', mxSub: 'Everything that plays right now - live level and volume.',
      mxOpt: '✨ Optimal mix', mxOptH: 'Balances music, nature, brainwaves and isochronic beats individually - effective, but never too loud.',
      mxUndo: 'Undo', mxAuto: 'Auto-Mix', mxAutoH: 'balances every active source automatically under the music (live)',
      mxGap: 'Distance to the music', mxG10: 'Subtle', mxG6: 'Normal', mxG3: 'Clear',
      mxAll: 'Show all sources', mxActive: 'Only active', mxNone: 'Nothing extra is playing - only the music.',
      mxOff: 'Aurelune is off - no live levels. The sliders still work.',
      mxOut: 'Output', mxAdds: 'Added sounds', mxRed: 'Auto-Mix', mxEar: 'Ear guard', mxLim: 'Limiter',
      mxUnder: '{d} under the music', mxEq: '⚠ as loud as the music', mxOver: '⚠ {d} louder than the music',
      mxDone: '✨ Mixed - {n} controls adjusted', mxSame: '✨ Already optimal - nothing to change', mxUndone: 'Mix restored',
      mxMusic: 'Music (system)', mxMusicH: 'volume in your music app', mxPl: 'Playlist music', mxNat: 'Nature sounds',
      mxBin: 'Brainwave layers', mxBeat: 'Beat (session / pulse)', mxPad: 'Breathing tone', mxSleep: 'Sleep noise',
      mxBowls: 'Singing bowls', mxGw: 'Gateway journey', mxSurf: 'Ocean surf', mxAutoChip: 'Auto', mxFixed: 'fixed',
      cyBtn: '✨ 3D cymatics', cyView: 'View', cyPlate: 'Plate 3D', cyWater: 'Water', cySphere: 'Sphere', cyMandala: 'Mandala', cySand: 'Sand',
      cyColor: 'Colours', cyQual: 'Quality', cyLow: 'Low', cyMid: 'Medium', cyHigh: 'High',
      cyFreq: 'Frequency', cyLive: 'Live', cyFix: 'Fixed', cyRot: 'Auto-rotate', cySpeed: 'Speed', cyReact: 'React to the audio',
      cyTrail: 'Light trails', cyInfo: 'Info', cyShot: 'Save picture', cyFs: 'Full screen', cyClose: 'Close', cyOpts: 'Options',
      cyHelp: 'Drag = rotate · wheel = zoom · 1-5 = view · ←/→ = semitone · Space = pause · H = hide · Esc = close',
      cyLiveT: 'live from the output', cyFixT: 'fixed', cyPaused: 'paused', cyReset: 'Reset view',
      cyNoteP: 'Sand gathers on the still lines (nodes) of a vibrating square plate - mode {n}·{m}.',
      cyNoteW: 'Standing capillary waves on water (Faraday) - {f}-fold symmetry.',
      cyNoteS: 'A vibrating sphere - spherical harmonic l={n}, m={m}.',
      cyNoteM: 'Top view of the water surface, like a CymaScope picture - {f}-fold.',
      cyNoteD: 'Classic Chladni figure from above - mode {n}·{m}.'
    });
    Object.assign(I18N.de, {
      mxBtn: 'Mix', mxTitle: 'Mix · alle Lautstärken', mxSub: 'Alles, was gerade läuft - Live-Pegel und Lautstärke.',
      mxOpt: '✨ Optimal mischen', mxOptH: 'Mischt Musik, Naturklänge, Brainwaves und isochrone Beats einzeln - wirksam, aber nie zu laut.',
      mxUndo: 'Rückgängig', mxAuto: 'Auto-Mix', mxAutoH: 'mischt jede aktive Quelle automatisch unter die Musik (live)',
      mxGap: 'Abstand zur Musik', mxG10: 'Dezent', mxG6: 'Normal', mxG3: 'Deutlich',
      mxAll: 'Alle Quellen zeigen', mxActive: 'Nur aktive', mxNone: 'Gerade läuft nichts zusätzlich - nur die Musik.',
      mxOff: 'Aurelune ist aus - keine Live-Pegel. Die Regler funktionieren trotzdem.',
      mxOut: 'Ausgang', mxAdds: 'Zusatzklänge', mxRed: 'Auto-Mix', mxEar: 'Gehörschutz', mxLim: 'Limiter',
      mxUnder: '{d} unter der Musik', mxEq: '⚠ so laut wie die Musik', mxOver: '⚠ {d} lauter als die Musik',
      mxDone: '✨ Optimal gemischt - {n} Regler angepasst', mxSame: '✨ Schon optimal - nichts zu ändern', mxUndone: 'Mix wiederhergestellt',
      mxMusic: 'Musik (System)', mxMusicH: 'Lautstärke im Musikprogramm', mxPl: 'Playlist-Musik', mxNat: 'Naturklänge',
      mxBin: 'Brainwave-Schichten', mxBeat: 'Takt (Sitzung / Puls)', mxPad: 'Atem-Ton', mxSleep: 'Schlaf-Rauschen',
      mxBowls: 'Klangschalen', mxGw: 'Gateway-Reise', mxSurf: 'Meeresbrandung', mxAutoChip: 'Auto', mxFixed: 'fest',
      cyBtn: '✨ 3D-Kymatik', cyView: 'Ansicht', cyPlate: 'Platte 3D', cyWater: 'Wasser', cySphere: 'Kugel', cyMandala: 'Mandala', cySand: 'Sand',
      cyColor: 'Farben', cyQual: 'Qualität', cyLow: 'Niedrig', cyMid: 'Mittel', cyHigh: 'Hoch',
      cyFreq: 'Frequenz', cyLive: 'Live', cyFix: 'Fest', cyRot: 'Automatisch drehen', cySpeed: 'Tempo', cyReact: 'Auf den Klang reagieren',
      cyTrail: 'Lichtspuren', cyInfo: 'Info', cyShot: 'Bild speichern', cyFs: 'Vollbild', cyClose: 'Schließen', cyOpts: 'Optionen',
      cyHelp: 'Ziehen = drehen · Mausrad = Zoom · 1-5 = Ansicht · ←/→ = Halbton · Leertaste = Pause · H = ausblenden · Esc = schließen',
      cyLiveT: 'live vom Ausgang', cyFixT: 'fest', cyPaused: 'pausiert', cyReset: 'Ansicht zurücksetzen',
      cyNoteP: 'Sand sammelt sich auf den ruhenden Linien (Knoten) einer schwingenden Quadratplatte - Mode {n}·{m}.',
      cyNoteW: 'Stehende Kapillarwellen auf Wasser (Faraday) - {f}-fache Symmetrie.',
      cyNoteS: 'Eine schwingende Kugel - Kugelflächenfunktion l={n}, m={m}.',
      cyNoteM: 'Wasseroberfläche von oben, wie ein CymaScope-Bild - {f}-fach.',
      cyNoteD: 'Klassische Chladni-Figur von oben - Mode {n}·{m}.'
    });
  } catch (e) {}

  /* =====================================================================================================
     1) MIX POPOVER
     ===================================================================================================== */
  var PL = function () { try { return window.AurelunePlaylists && window.AurelunePlaylists._state(); } catch (e) { return null; } };
  var plOn = function () { var p = PL(); return !!(p && p.playing); };
  function plSet(id, v) { var el = $(id); if (!el) return; el.value = Math.round(v * 100); el.dispatchEvent(new Event('input', { bubbles: true })); }
  function plGet(id) { var el = $(id); return el ? (+el.value || 0) / 100 : 0; }
  var sesOn = function () { var s = S(); return !!(s.session && s.session.id); };
  var ROWS = [
    { k: 'pl', n: 'mxPl', ic: '🎶', m: 'music', on: plOn, get: function () { return plGet('plMv'); }, set: function (v) { plSet('plMv', v); } },
    { k: 'nat', n: 'mxNat', ic: '🌿', m: null, on: plOn, get: function () { return plGet('plNv'); }, set: function (v) { plSet('plNv', v); } },
    { k: 'music', n: 'mxMusic', ic: '🎵', m: 'music', on: function () { return !plOn(); }, hint: 'mxMusicH' },
    { k: 'bin', n: 'mxBin', ic: '🧠', m: 'bin', key: 'bin_level', max: 0.5, auto: 'bin_auto', on: function () { return !!S().binaural; } },
    { k: 'beat', n: 'mxBeat', ic: '〰️', m: 'beat', key: 'beat_level', on: function () { return !!S().beat_on || sesOn(); } },
    { k: 'pad', n: 'mxPad', ic: '🌬️', m: 'pad', on: function () { return !!(S().breath_on && S().breath_tone); }, hint: 'mxFixed' },
    { k: 'sleep', n: 'mxSleep', ic: '🌙', m: 'sleep', key: 'sleep_level', on: function () { return !!S().sleep_on; } },
    { k: 'bowls', n: 'mxBowls', ic: '🔔', m: 'bowls', on: function () { var w = ST().well; return !!(w && w.bowls > 0); }, hint: 'mxFixed' },
    { k: 'gw', n: 'mxGw', ic: '🌀', m: 'gw', key: 'gw_level', on: function () { return !!S().gw; } },
    { k: 'surf', n: 'mxSurf', ic: '🌊', m: null, key: 'gw_surf', on: function () { return !!S().gw; } }
  ];
  var showAll = false, undo = null, popT = null;
  var MIXIC = '<svg viewBox="0 0 24 24"><path d="M5 4v16M12 4v16M19 4v16"/><circle cx="5" cy="14" r="2.2" fill="currentColor"/><circle cx="12" cy="8" r="2.2" fill="currentColor"/><circle cx="19" cy="15" r="2.2" fill="currentColor"/></svg>';

  function mixBtn() {
    var r = document.querySelector('#bwBar .bwb-r');
    if (!r || $('bwbMix')) return !!r;
    var b = document.createElement('button'); b.id = 'bwbMix'; b.className = 'bwb-mix'; b.type = 'button';
    b.innerHTML = MIXIC + '<span>' + esc(tt('mxBtn')) + '</span><i class="mx-dot"></i>';
    b.onclick = function (e) { e.stopPropagation(); togglePop(); };
    r.insertBefore(b, r.firstChild);
    return true;
  }
  function togglePop(force) {
    var p = $('mixPop'), open = force != null ? force : !p;
    if (!open) { if (p) p.remove(); clearInterval(popT); popT = null; $('bwbMix') && $('bwbMix').classList.remove('on'); return; }
    if (p) return;
    p = document.createElement('div'); p.id = 'mixPop'; p.className = 'mix-pop'; p.setAttribute('role', 'dialog');
    p.innerHTML = '<div class="mx-h"><div><b>' + esc(tt('mxTitle')) + '</b><small>' + esc(tt('mxSub')) + '</small></div><button class="mx-x" id="mxX" aria-label="close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="mx-opt"><button class="btn primary" id="mxOpt">' + esc(tt('mxOpt')) + '</button><button class="btn ghost" id="mxUndo" hidden>' + esc(tt('mxUndo')) + '</button></div>' +
      '<small class="mx-opth">' + esc(tt('mxOptH')) + '</small>' +
      '<div class="mx-off" id="mxOff" hidden>' + esc(tt('mxOff')) + '</div>' +
      '<div class="mx-rows" id="mxRows"></div>' +
      '<button class="mx-all" id="mxAllT"></button>' +
      '<div class="mx-sum" id="mxSum"></div>' +
      '<div class="mx-auto"><label class="mx-sw"><input type="checkbox" id="mxAutoC"><span></span></label><div><b>' + esc(tt('mxAuto')) + '</b><small>' + esc(tt('mxAutoH')) + '</small></div></div>' +
      '<div class="mx-gap"><small>' + esc(tt('mxGap')) + '</small><div class="seg" id="mxGapS"><button data-g="10">' + esc(tt('mxG10')) + '</button><button data-g="6">' + esc(tt('mxG6')) + '</button><button data-g="3">' + esc(tt('mxG3')) + '</button></div></div>';
    document.body.appendChild(p);
    p.onclick = function (e) { e.stopPropagation(); };
    $('mxX').onclick = function () { togglePop(false); };
    $('mxOpt').onclick = optimize;
    $('mxUndo').onclick = doUndo;
    $('mxAllT').onclick = function () { showAll = !showAll; build(); };
    $('mxAutoC').onchange = function (e) { setS({ mix_auto: e.target.checked }); };
    $('mxGapS').querySelectorAll('button').forEach(function (b) { b.onclick = function () { setS({ mix_gap_db: +b.dataset.g }); paint(); }; });
    $('bwbMix').classList.add('on');
    build(); popT = setInterval(paint, 200);
  }
  var built = '';
  function visible() { return ROWS.filter(function (r) { return showAll || r.on(); }); }
  function build() {
    if (!$('mxRows')) return;
    var vis = visible(); built = vis.map(function (r) { return r.k; }).join(',');
    $('mxRows').innerHTML = vis.map(function (r) {
      var sl = (r.key || r.set) ? '<input type="range" min="0" max="100" step="1" data-k="' + r.k + '">' : '<span class="mx-hint">' + esc(tt(r.hint || 'mxFixed')) + '</span>';
      return '<div class="mx-row' + (r.on() ? '' : ' idle') + '" data-k="' + r.k + '"><span class="mx-ic">' + r.ic + '</span><div class="mx-mid"><div class="mx-nm"><b>' + esc(tt(r.n)) + '</b>' +
        (r.auto ? '<button class="mx-chip" data-auto="' + r.k + '">' + esc(tt('mxAutoChip')) + '</button>' : '') + '<em class="mx-db"></em></div>' +
        '<div class="mx-meter"><i></i></div>' + sl + '</div><span class="mx-pc"></span></div>';
    }).join('') || '<div class="mx-none">' + esc(tt('mxNone')) + '</div>';
    $('mxRows').querySelectorAll('input[type=range]').forEach(function (inp) {
      var r = ROWS.filter(function (x) { return x.k === inp.dataset.k; })[0];
      inp.oninput = function () {
        var v = inp.value / 100;
        if (r.set) r.set(v);
        else { var p = {}; p[r.key] = Math.round(v * (r.max || 1) * 1000) / 1000; if (r.auto) p[r.auto] = false; setS(p); }
        paint();
      };
    });
    $('mxRows').querySelectorAll('[data-auto]').forEach(function (b) { b.onclick = function () { var r = ROWS.filter(function (x) { return x.k === b.dataset.auto; })[0], p = {}; p[r.auto] = !(S()[r.auto] !== false); setS(p); paint(); }; });
    $('mxAllT').textContent = showAll ? tt('mxActive') : tt('mxAll');
    paint();
  }
  function lvlOf(r) {
    if (r.get) return r.get();
    var s = S(), st = ST();
    if (r.auto && s[r.auto] !== false && st.bin_level_eff != null) return Math.min(1, st.bin_level_eff / (r.max || 1));
    var d = { bin_level: 0.2, beat_level: 0.5, sleep_level: 0.3, gw_level: 0.5, gw_surf: 0.5 }[r.key];
    return Math.min(1, (s[r.key] != null ? +s[r.key] : d) / (r.max || 1));
  }
  function meterP(db) { return db == null ? 0 : Math.max(0, Math.min(100, (db + 60) / 60 * 100)); }
  function paint() {
    var p = $('mixPop'); if (!p) return;
    var vis = visible().map(function (r) { return r.k; }).join(',');
    if (vis !== built && document.activeElement && document.activeElement.type !== 'range') return build();
    var st = ST(), s = S(), mx = st.mix || null, on = !!st.running, D = (mx && mx.db) || {};
    $('mxOff').hidden = on;
    p.querySelectorAll('.mx-row').forEach(function (el) {
      var r = ROWS.filter(function (x) { return x.k === el.dataset.k; })[0]; if (!r) return;
      var db = on && r.m ? D[r.m] : null, inp = el.querySelector('input[type=range]'), v = lvlOf(r);
      el.classList.toggle('idle', !r.on());
      var bar = el.querySelector('.mx-meter i'); bar.style.width = meterP(db) + '%';
      bar.className = db == null ? '' : db > -10 ? 'hot' : db > -20 ? 'warm' : 'ok';
      el.querySelector('.mx-meter').style.display = r.m ? '' : 'none';
      el.querySelector('.mx-db').textContent = r.m && on ? dbs(db) : '';
      if (inp && document.activeElement !== inp) inp.value = Math.round(v * 100);
      if (inp) inp.style.setProperty('--p', Math.round(v * 100) + '%');
      el.querySelector('.mx-pc').textContent = (inp ? Math.round(v * 100) + ' %' : '');
      var ch = el.querySelector('.mx-chip'); if (ch) ch.classList.toggle('sel', s[r.auto] !== false);
    });
    var sum = '';
    if (on && mx) {
      var md = D.music, ad = mx.adds_db, rel = (md != null && ad != null) ? ad - md : null;
      sum += '<div class="mx-kv"><span>' + esc(tt('mxOut')) + '</span><b>' + dbs(mx.out_db) + '</b></div>';
      if (ad != null) {
        var eff = ad - (mx.auto_red_db || 0), rr = rel != null ? rel - (mx.auto_red_db || 0) : null;
        var txt = rr == null ? '' : rr > -1 ? (rr > 1 ? tt('mxOver', { d: num(rr, 0) + ' dB' }) : tt('mxEq')) : tt('mxUnder', { d: num(-rr, 0) + ' dB' });
        sum += '<div class="mx-kv"><span>' + esc(tt('mxAdds')) + '</span><b>' + dbs(eff) + (txt ? ' · <em class="' + (rr > -3 ? 'bad' : 'good') + '">' + esc(txt) + '</em>' : '') + '</b></div>';
      }
      var red = [];
      if (mx.auto_red_db > 0.3) red.push(tt('mxRed') + ' −' + num(mx.auto_red_db, 1) + ' dB');
      var er = st.well && st.well.ear_red_db; if (er > 0.3) red.push(tt('mxEar') + ' −' + num(er, 1) + ' dB');
      if (st.limiter_db > 0.3) red.push(tt('mxLim') + ' −' + num(st.limiter_db, 1) + ' dB');
      if (red.length) sum += '<div class="mx-red">' + red.map(esc).join(' · ') + '</div>';
    }
    $('mxSum').innerHTML = sum; $('mxSum').hidden = !sum;
    $('mxAutoC').checked = s.mix_auto !== false;
    var g = s.mix_gap_db != null ? +s.mix_gap_db : 6;
    $('mxGapS').querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', +b.dataset.g === g); });
    $('mxUndo').hidden = !undo;
  }
  function dot() {
    var b = $('bwbMix'); if (!b) return;
    var st = ST(), mx = st.mix, hot = false;
    if (st.running && mx && mx.adds_db != null && mx.db && mx.db.music != null) hot = mx.adds_db - mx.auto_red_db - mx.db.music > -3;
    if (st.running && mx && mx.out_db != null && mx.out_db > -9) hot = true;
    b.classList.toggle('hot', hot);
    b.title = tt('mxTitle');
  }
  async function optimize() {
    var s = S(), keys = ['mix_auto', 'mix_gap_db', 'bin_auto', 'ear_on', 'ear_tame', 'ear_max_db', 'beat_level', 'sleep_level', 'gw_level', 'gw_surf'];
    var old = {}; keys.forEach(function (k) { old[k] = s[k]; });
    var pl0 = plOn() ? { mv: plGet('plMv'), nv: plGet('plNv') } : null;
    $('mxOpt').disabled = true;
    try {
      var r = await call('mix_optimize');
      if (!r || r.ok === false) { if (r && typeof showAlert === 'function') showAlert(r.code, r.error); return; }
      if (r.settings) { Object.assign(settings, r.settings); try { renderSettings(); } catch (e) {} }
      var n = (r.changes || []).filter(function (c) { return ['mix_auto', 'mix_gap_db', 'bin_auto', 'ear_on', 'ear_tame'].indexOf(c.key) < 0 || s[c.key] != null; }).length;
      if (pl0 && r.pl) { if (Math.abs(pl0.mv - r.pl.mv) > 0.01) { plSet('plMv', r.pl.mv); n++; } if (Math.abs(pl0.nv - r.pl.nv) > 0.01) { plSet('plNv', r.pl.nv); n++; } }
      undo = n ? { s: old, pl: pl0 } : null;
      if (typeof toast === 'function') toast(n ? tt('mxDone', { n: n }) : tt('mxSame'));
    } finally { if ($('mxOpt')) $('mxOpt').disabled = false; paint(); }
  }
  function doUndo() {
    if (!undo) return;
    var p = {}; Object.keys(undo.s).forEach(function (k) { if (undo.s[k] !== undefined) p[k] = undo.s[k]; });
    setS(p);
    if (undo.pl) { plSet('plMv', undo.pl.mv); plSet('plNv', undo.pl.nv); }
    undo = null; if (typeof toast === 'function') toast(tt('mxUndone')); paint();
  }
  document.addEventListener('click', function () { if ($('mixPop')) togglePop(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('mixPop')) togglePop(false); });

  /* =====================================================================================================
     2) 3D CYMATICS VIEWER
     ===================================================================================================== */
  var CK = 'aur.cym', CY = null;
  var OPT = { view: 'plate', color: 'gold', q: 'mid', live: true, hz: 432, rot: true, speed: 0.5, react: true, trail: true, info: true };
  try { Object.assign(OPT, JSON.parse(localStorage.getItem(CK) || '{}')); } catch (e) {}
  var saveO = function () { try { localStorage.setItem(CK, JSON.stringify(OPT)); } catch (e) {} };
  var VIEWS = [['plate', 'cyPlate'], ['water', 'cyWater'], ['sphere', 'cySphere'], ['mandala', 'cyMandala'], ['sand', 'cySand']];
  var PAL = {   // colour stops 0..1
    gold: [[8, 6, 14], [120, 70, 20], [243, 180, 91], [255, 236, 190]],
    aurora: [[6, 10, 20], [40, 90, 200], [80, 230, 190], [240, 255, 250]],
    ocean: [[4, 8, 20], [10, 60, 130], [60, 170, 230], [220, 245, 255]],
    fire: [[10, 2, 2], [150, 20, 10], [255, 120, 30], [255, 240, 170]],
    violet: [[10, 6, 22], [80, 40, 170], [175, 120, 255], [245, 230, 255]],
    white: [[6, 6, 8], [80, 80, 90], [190, 190, 200], [255, 255, 255]],
    rainbow: null
  };
  var PALN = { gold: 'Gold', aurora: 'Aurora', ocean: { de: 'Ozean', en: 'Ocean' }, fire: { de: 'Feuer', en: 'Fire' }, violet: 'Violett', white: { de: 'Weiß', en: 'White' }, rainbow: { de: 'Regenbogen', en: 'Rainbow' } };
  var LUT = null, LUTS = null;
  function mkLut() {
    LUT = new Uint8ClampedArray(256 * 3); LUTS = [];
    var st = PAL[OPT.color];
    for (var i = 0; i < 256; i++) {
      var x = i / 255, r, g, b;
      if (!st) { var h = (x * 300 + 200) % 360, l = 0.15 + 0.6 * x; var c = (1 - Math.abs(2 * l - 1)), hp = h / 60, X = c * (1 - Math.abs(hp % 2 - 1)), m = l - c / 2;
        var rr = hp < 1 ? [c, X, 0] : hp < 2 ? [X, c, 0] : hp < 3 ? [0, c, X] : hp < 4 ? [0, X, c] : hp < 5 ? [X, 0, c] : [c, 0, X]; r = (rr[0] + m) * 255; g = (rr[1] + m) * 255; b = (rr[2] + m) * 255; }
      else { var f = x * (st.length - 1), k = Math.min(st.length - 2, Math.floor(f)), u = f - k; r = st[k][0] + (st[k + 1][0] - st[k][0]) * u; g = st[k][1] + (st[k + 1][1] - st[k][1]) * u; b = st[k][2] + (st[k + 1][2] - st[k][2]) * u; }
      LUT[i * 3] = r; LUT[i * 3 + 1] = g; LUT[i * 3 + 2] = b; LUTS.push('rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')');
    }
  }
  var col = function (x) { return LUTS[Math.max(0, Math.min(255, (x * 255) | 0))]; };

  function curHz() {
    var st = ST();
    if (OPT.live && st.running && st.peak_out > 30 && !st.silent) return { hz: st.peak_out, live: true };
    if (OPT.live) { var p = typeof presetFor === 'function' ? presetFor((typeof ui !== 'undefined' && ui.presetHz) || OPT.hz) : null; if (p && p.hz) return { hz: p.hz, live: false }; }
    return { hz: OPT.hz, live: false };
  }
  // deterministic: the same frequency always gives the same figure
  function modes(hz) {
    var i = Math.max(0, Math.round(12 * Math.log2(Math.max(20, hz) / 27)));
    return { n: 2 + (i % 5), m: 3 + (i % 5) + (Math.floor(i / 5) % 3) + 1, fold: 3 + (i % 9), k: 5 + 9 * Math.pow(Math.max(20, Math.min(2000, hz)) / 432, 2 / 3), l: 4 + (i % 6), mm: 2 + (Math.floor(i / 6) % 4) };
  }
  var QN = { low: 0.5, mid: 1, high: 1.8 };

  function cymatics() {
    if (CY) return;
    if (!LUT) mkLut();
    var d = document.createElement('div'); d.className = 'cy-wrap'; d.id = 'cyWrap';
    d.innerHTML = '<canvas id="cyC"></canvas>' +
      '<div class="cy-hud" id="cyHud"><b id="cyHz"></b><span id="cyTag"></span><small id="cyNote"></small></div>' +
      '<div class="cy-top"><button id="cyOptB" title=""><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg></button>' +
      '<button id="cyShotB" title=""><svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></button>' +
      '<button id="cyFsB" title=""><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>' +
      '<button id="cyX" title=""><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="cy-views" id="cyViews"></div>' +
      '<aside class="cy-panel" id="cyPanel" hidden></aside><div class="cy-help" id="cyHelp"></div>';
    document.body.appendChild(d);
    var c = $('cyC');
    CY = { d: d, c: c, g: c.getContext('2d'), run: true, paused: false, yaw: 0.6, pitch: 0.95, zoom: 1, cur: null, t: 0, last: performance.now(), drag: null, idle: 0, P: null, N: 0, off: null, sph: null, en: 0.3 };
    panel(); viewsBar();
    $('cyHelp').textContent = tt('cyHelp');
    $('cyOptB').title = tt('cyOpts'); $('cyShotB').title = tt('cyShot'); $('cyFsB').title = tt('cyFs'); $('cyX').title = tt('cyClose');
    $('cyX').onclick = close;
    $('cyOptB').onclick = function () { $('cyPanel').hidden = !$('cyPanel').hidden; };
    $('cyFsB').onclick = function () { try { if (document.fullscreenElement) document.exitFullscreen(); else d.requestFullscreen(); } catch (e) {} };
    $('cyShotB').onclick = function () { try { var a = document.createElement('a'); a.download = 'aurelune-kymatik-' + Math.round(curHz().hz) + 'hz.png'; a.href = c.toDataURL('image/png'); a.click(); } catch (e) {} };
    c.onpointerdown = function (e) { CY.drag = { x: e.clientX, y: e.clientY, yaw: CY.yaw, pitch: CY.pitch }; c.setPointerCapture(e.pointerId); };
    c.onpointermove = function (e) { wake(); if (!CY.drag) return; CY.yaw = CY.drag.yaw + (e.clientX - CY.drag.x) * 0.008; CY.pitch = Math.max(0.05, Math.min(1.5, CY.drag.pitch + (e.clientY - CY.drag.y) * 0.006)); };
    c.onpointerup = c.onpointercancel = function () { CY.drag = null; };
    c.ondblclick = resetView;
    c.addEventListener('wheel', function (e) { e.preventDefault(); CY.zoom = Math.max(0.5, Math.min(2.6, CY.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); }, { passive: false });
    d.onmousemove = wake;
    document.addEventListener('keydown', key);
    try { d.requestFullscreen && d.requestFullscreen().catch(function () {}); } catch (e) {}
    reinit(); wake(); requestAnimationFrame(frame);
  }
  function resetView() { if (!CY) return; CY.yaw = 0.6; CY.pitch = 0.95; CY.zoom = 1; }
  function wake() { if (!CY) return; CY.idle = performance.now(); CY.d.classList.remove('calm'); }
  function close() {
    if (!CY) return; CY.run = false; CY.d.remove(); CY = null; document.removeEventListener('keydown', key);
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
  }
  function key(e) {
    if (!CY || (e.target && /INPUT|SELECT/.test(e.target.tagName) && e.key !== 'Escape')) return;
    wake();
    if (e.key === 'Escape') close();
    else if (e.key >= '1' && e.key <= '5') setO({ view: VIEWS[+e.key - 1][0] });
    else if (e.key === ' ') { e.preventDefault(); CY.paused = !CY.paused; }
    else if (e.key === 'h' || e.key === 'H') CY.d.classList.toggle('bare');
    else if (e.key === 'r' || e.key === 'R') resetView();
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var h = curHz().hz * Math.pow(2, (e.key === 'ArrowRight' ? 1 : -1) / 12); setO({ live: false, hz: Math.round(h * 10) / 10 }); }
  }
  function setO(p) {
    var re = (p.view && p.view !== OPT.view) || (p.q && p.q !== OPT.q);
    Object.assign(OPT, p); saveO();
    if (p.color) mkLut();
    if (re) reinit();
    panel(); viewsBar();
  }
  function viewsBar() {
    var v = $('cyViews'); if (!v) return;
    v.innerHTML = VIEWS.map(function (x, i) { return '<button data-v="' + x[0] + '" class="' + (OPT.view === x[0] ? 'sel' : '') + '"><kbd>' + (i + 1) + '</kbd>' + esc(tt(x[1])) + '</button>'; }).join('');
    v.querySelectorAll('button').forEach(function (b) { b.onclick = function () { setO({ view: b.dataset.v }); }; });
  }
  function panel() {
    var p = $('cyPanel'); if (!p) return;
    var seg = function (id, opts, cur) { return '<div class="seg cy-seg" id="' + id + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '" class="' + (String(cur) === String(o[0]) ? 'sel' : '') + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; };
    var nm = function (o) { return typeof o === 'string' ? o : o[L()]; };
    var tg = function (id, on, label) { return '<label class="cy-tg"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span></span>' + esc(label) + '</label>'; };
    p.innerHTML = '<h4>' + esc(tt('cyOpts')) + '</h4>' +
      '<small>' + esc(tt('cyColor')) + '</small><div class="cy-cols" id="cyCols">' + Object.keys(PAL).map(function (k) {
        var st = PAL[k], bg = st ? 'linear-gradient(90deg,' + st.map(function (c) { return 'rgb(' + c.join(',') + ')'; }).join(',') + ')' : 'linear-gradient(90deg,#f55,#fb5,#5f8,#5af,#a5f)';
        return '<button data-v="' + k + '" class="' + (OPT.color === k ? 'sel' : '') + '" title="' + esc(nm(PALN[k])) + '" style="background:' + bg + '"></button>'; }).join('') + '</div>' +
      '<small>' + esc(tt('cyFreq')) + '</small>' + seg('cyLiveS', [[1, tt('cyLive')], [0, tt('cyFix')]], OPT.live ? 1 : 0) +
      '<div class="cy-hzrow"' + (OPT.live ? ' hidden' : '') + '><input type="number" id="cyHzI" min="20" max="2000" step="0.1" value="' + OPT.hz + '"><span>Hz</span>' +
      [174, 285, 396, 432, 528, 639, 741, 852, 963].map(function (h) { return '<button class="cy-hzc' + (Math.abs(OPT.hz - h) < 0.05 ? ' sel' : '') + '" data-h="' + h + '">' + h + '</button>'; }).join('') + '</div>' +
      '<small>' + esc(tt('cyQual')) + '</small>' + seg('cyQS', [['low', tt('cyLow')], ['mid', tt('cyMid')], ['high', tt('cyHigh')]], OPT.q) +
      tg('cyRotC', OPT.rot, tt('cyRot')) +
      '<div class="cy-sl"><small>' + esc(tt('cySpeed')) + '</small><input type="range" id="cySpd" min="0" max="100" value="' + Math.round(OPT.speed * 100) + '"></div>' +
      tg('cyReactC', OPT.react, tt('cyReact')) + tg('cyTrailC', OPT.trail, tt('cyTrail')) + tg('cyInfoC', OPT.info, tt('cyInfo')) +
      '<button class="btn ghost cy-reset" id="cyResetB">' + esc(tt('cyReset')) + '</button>';
    p.querySelectorAll('#cyCols button').forEach(function (b) { b.onclick = function () { setO({ color: b.dataset.v }); }; });
    p.querySelectorAll('#cyLiveS button').forEach(function (b) { b.onclick = function () { setO({ live: b.dataset.v === '1', hz: b.dataset.v === '1' ? OPT.hz : Math.round(curHz().hz * 10) / 10 }); }; });
    p.querySelectorAll('#cyQS button').forEach(function (b) { b.onclick = function () { setO({ q: b.dataset.v }); }; });
    p.querySelectorAll('.cy-hzc').forEach(function (b) { b.onclick = function () { setO({ hz: +b.dataset.h }); }; });
    $('cyHzI').onchange = function (e) { var v = Math.max(20, Math.min(2000, +e.target.value || 432)); setO({ hz: v }); };
    $('cyRotC').onchange = function (e) { setO({ rot: e.target.checked }); };
    $('cyReactC').onchange = function (e) { setO({ react: e.target.checked }); };
    $('cyTrailC').onchange = function (e) { setO({ trail: e.target.checked }); };
    $('cyInfoC').onchange = function (e) { setO({ info: e.target.checked }); };
    $('cySpd').oninput = function (e) { OPT.speed = e.target.value / 100; saveO(); };
    $('cyResetB').onclick = resetView;
  }
  function reinit() {
    if (!CY) return;
    var q = QN[OPT.q] || 1, v = OPT.view;
    CY.P = null; CY.off = null; CY.sph = null;
    if (v === 'plate' || v === 'sand') {
      var N = Math.round((v === 'sand' ? 12000 : 9000) * q); CY.N = N; CY.P = new Float32Array(N * 2);
      for (var i = 0; i < N * 2; i++) CY.P[i] = Math.random() * 2 - 1;
    } else if (v === 'sphere') {
      var M = Math.round(5200 * q), a = new Float32Array(M * 3), ga = Math.PI * (3 - Math.sqrt(5));
      for (i = 0; i < M; i++) { var y = 1 - (i + 0.5) / M * 2, r = Math.sqrt(1 - y * y), th = ga * i; a[3 * i] = Math.cos(th) * r; a[3 * i + 1] = y; a[3 * i + 2] = Math.sin(th) * r; }
      CY.sph = a; CY.N = M;
    } else if (v === 'mandala') {
      var R = Math.round(340 * Math.sqrt(q)); CY.off = document.createElement('canvas'); CY.off.width = CY.off.height = R; CY.img = CY.off.getContext('2d').createImageData(R, R);
    } else if (v === 'water') { CY.G = Math.round(120 * Math.sqrt(q)); }
    CY.cur = null;
  }
  // camera: yaw around the vertical axis, pitch = tilt; returns [sx, sy, depth scale]
  function proj(x, y, z, cx, cy, R) {
    var cs = Math.cos(CY.yaw), sn = Math.sin(CY.yaw), X = x * cs - y * sn, Y = x * sn + y * cs;
    var cp = Math.cos(CY.pitch), sp = Math.sin(CY.pitch), yy = Y * cp - z * sp, zz = Y * sp + z * cp, s = 3 / (3 + zz);
    return [cx + X * R * s, cy + yy * R * s, s];
  }
  function frame(now) {
    if (!CY || !CY.run) return;
    var dt = Math.min(0.05, (now - CY.last) / 1000); CY.last = now;
    var c = CY.c, W = c.clientWidth, H = c.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    var g = CY.g; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var hz = curHz(), md = modes(hz.hz), st = ST();
    if (!CY.cur) CY.cur = { n: md.n, m: md.m, fold: md.fold, k: md.k, l: md.l, mm: md.mm };
    var cu = CY.cur, a = Math.min(1, dt * 1.2);
    ['n', 'm', 'fold', 'k', 'l', 'mm'].forEach(function (k) { cu[k] += (md[k] - cu[k]) * a; });
    var lv = st.running ? Math.min(1, (st.level_out || 0) * 2.5) : 0.3;
    CY.en += ((OPT.react ? lv : 0.35) - CY.en) * Math.min(1, dt * 4);
    if (!CY.paused) {
      CY.t += dt;
      if (OPT.rot && !CY.drag) CY.yaw += dt * (0.05 + 0.5 * OPT.speed) * (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.3 : 1);
    }
    if (performance.now() - CY.idle > 3500 && $('cyPanel').hidden) CY.d.classList.add('calm');
    var br = S().breath_on ? 0.5 + 0.5 * Math.sin(Date.now() / 1000 * 2 * Math.PI * (+S().breath_bpm || 6) / 60) : 0.5;
    var R = Math.min(W, H) * (OPT.view === 'plate' ? 0.31 : 0.36) * CY.zoom * (0.97 + 0.06 * br), cx = W / 2, cy = H / 2 + (OPT.view === 'plate' || OPT.view === 'water' ? R * 0.1 : 0);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = OPT.trail && OPT.view !== 'mandala' ? (OPT.view === 'plate' || OPT.view === 'water' ? 'rgba(6,5,12,0.5)' : 'rgba(6,5,12,0.3)') : '#06050c'; g.fillRect(0, 0, W, H);
    var v = OPT.view;
    if (v === 'plate' || v === 'sand') drawPlate(g, cu, cx, cy, R, v === 'sand');
    else if (v === 'water') drawWater(g, cu, cx, cy, R);
    else if (v === 'sphere') drawSphere(g, cu, cx, cy, R);
    else drawMandala(g, cu, cx, cy, R);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // HUD
    $('cyHud').hidden = !OPT.info;
    if (OPT.info) {
      $('cyHz').textContent = num(hz.hz, hz.live ? 1 : (hz.hz % 1 ? 1 : 0)) + ' Hz';
      $('cyTag').textContent = CY.paused ? tt('cyPaused') : hz.live ? '● ' + tt('cyLiveT') : tt('cyFixT');
      $('cyTag').className = hz.live && !CY.paused ? 'live' : '';
      var nk = { plate: 'cyNoteP', water: 'cyNoteW', sphere: 'cyNoteS', mandala: 'cyNoteM', sand: 'cyNoteD' }[v];
      $('cyNote').textContent = tt(nk, { n: v === 'sphere' ? md.l : md.n, m: v === 'sphere' ? md.mm : md.m, f: md.fold });
    }
    requestAnimationFrame(frame);
  }
  function chl(n, m, x, y) { var P = Math.PI; return Math.cos(n * P * x) * Math.cos(m * P * y) - Math.cos(m * P * x) * Math.cos(n * P * y); }
  function drawPlate(g, cu, cx, cy, R, flat) {
    var P = CY.P, N = CY.N, n = cu.n, m = cu.m, PI = Math.PI, en = CY.en, frozen = CY.paused;
    if (!frozen) for (var i = 0; i < N; i++) {   // particles wander to the still lines (nodes) of the plate
      var x = P[2 * i], y = P[2 * i + 1];
      var f = chl(n, m, x, y);
      var fx = -n * PI * Math.sin(n * PI * x) * Math.cos(m * PI * y) + m * PI * Math.sin(m * PI * x) * Math.cos(n * PI * y);
      var fy = -m * PI * Math.cos(n * PI * x) * Math.sin(m * PI * y) + n * PI * Math.cos(m * PI * x) * Math.sin(n * PI * y);
      var k = 0.0018, j = Math.abs(f) * (0.01 + 0.035 * en);
      x += -f * fx * k + (Math.random() - 0.5) * j; y += -f * fy * k + (Math.random() - 0.5) * j;
      if (x < -1 || x > 1 || y < -1 || y > 1) { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; }
      P[2 * i] = x; P[2 * i + 1] = y;
    }
    var ph = Math.sin(CY.t * 6), amp = 0.1 * (0.35 + en);
    if (flat) {   // top view
      var Rf = R * 1.15;
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; g.strokeRect(cx - Rf, cy - Rf, Rf * 2, Rf * 2);
      g.globalCompositeOperation = 'lighter';
      bucket(N, function (i) { return Math.abs(chl(n, m, P[2 * i], P[2 * i + 1])); }, function (bk) { g.fillStyle = col(0.95 - bk * 0.6); g.globalAlpha = 0.55; },
        function (i) { g.fillRect(cx + P[2 * i] * Rf, cy + P[2 * i + 1] * Rf, 1.5, 1.5); });
      return;
    }
    // plate rim + soft glow of the vibrating surface
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.beginPath();
    [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].forEach(function (q, k) { var p = proj(q[0], q[1], 0, cx, cy, R); if (k) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke();
    var G = 22; g.globalCompositeOperation = 'lighter';
    for (var a = 0; a <= G; a++) for (var b = 0; b <= G; b++) {
      var u = a / G * 2 - 1, w = b / G * 2 - 1, ff = chl(n, m, u, w), p2 = proj(u, w, ff * amp * ph, cx, cy, R);
      g.globalAlpha = 0.05 + 0.06 * Math.abs(ff); g.fillStyle = col(0.35 + 0.3 * Math.abs(ff)); g.fillRect(p2[0] - 1.2, p2[1] - 1.2, 2.4, 2.4);
    }
    var F = CY.F && CY.F.length === N ? CY.F : (CY.F = new Float32Array(N));
    bucket(N, function (i) { var f = chl(n, m, P[2 * i], P[2 * i + 1]); F[i] = f; return Math.abs(f); },
      function (bk) { g.globalAlpha = 0.25 + 0.55 * (1 - bk); g.fillStyle = col(0.98 - bk * 0.55); },
      function (i) { var p = proj(P[2 * i], P[2 * i + 1], F[i] * amp * ph, cx, cy, R), s = p[2]; g.fillRect(p[0], p[1], 1.7 * s, 1.7 * s); });
  }
  // draw particles grouped into 8 brightness buckets (far fewer canvas state changes = smooth on big counts)
  var BK = null;
  function bucket(N, val, style, draw) {
    if (!BK || BK.length < N) BK = new Uint8Array(N);
    for (var i = 0; i < N; i++) BK[i] = Math.min(7, (Math.min(1, val(i)) * 8) | 0);
    for (var b = 0; b < 8; b++) { style((b + 0.5) / 8); for (i = 0; i < N; i++) if (BK[i] === b) draw(i); }
  }
  // quasi-crystal: sum of standing plane waves in n directions = exact n-fold rotational symmetry
  var QC = { n: 0, c: [], s: [] };
  function qcPrep(fold) {
    var n = Math.max(3, Math.round(fold));
    if (QC.n !== n) { QC.n = n; QC.c = []; QC.s = []; for (var j = 0; j < n; j++) { QC.c.push(Math.cos(Math.PI * j / n)); QC.s.push(Math.sin(Math.PI * j / n)); } }
    return QC;
  }
  function qc(x, y, k, fold, ph) {
    var q = QC, v = 0; ph = ph || 0;
    for (var j = 0; j < q.n; j++) v += Math.cos(k * (x * q.c[j] + y * q.s[j]) + ph);
    return v / q.n;
  }
  function drawWater(g, cu, cx, cy, R) {
    var G = CY.G, t = CY.t, k = cu.k, fold = cu.fold, en = CY.en, amp = 0.07 + 0.1 * en, w = 2 * Math.PI * 0.6;
    var H = new Float32Array((G + 1) * (G + 1)), qcInit = qcPrep(fold), pts = new Float32Array((G + 1) * (G + 1) * 3);
    for (var a = 0; a <= G; a++) for (var b = 0; b <= G; b++) {
      var x = a / G * 2 - 1, y = b / G * 2 - 1, r = Math.sqrt(x * x + y * y), idx = a * (G + 1) + b;
      if (r > 1) { H[idx] = NaN; continue; }
      // Faraday waves: standing plane waves in `fold` directions (n-fold symmetric pattern), damped at the rim
      var h = Math.max(-1, Math.min(1, qc(x, y, k * 2.1, fold) * 1.6 * Math.cos(w * t) * (1 - 0.35 * r * r)));
      H[idx] = h;
      var p = proj(x, y, h * amp, cx, cy, R); pts[idx * 3] = p[0]; pts[idx * 3 + 1] = p[1]; pts[idx * 3 + 2] = p[2];
    }
    g.globalCompositeOperation = 'lighter';
    // rim of the dish
    g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1; g.beginPath();
    for (var q = 0; q <= 64; q++) { var pr = proj(Math.cos(q / 32 * Math.PI), Math.sin(q / 32 * Math.PI), 0, cx, cy, R); if (q) g.lineTo(pr[0], pr[1]); else g.moveTo(pr[0], pr[1]); } g.stroke();
    // surface as glowing points: crests bright, troughs dark (8 buckets = few state changes)
    for (var bk = 0; bk < 8; bk++) {
      var lo = bk / 8 * 2 - 1, hi = lo + 0.25, m = (lo + hi) / 2 * 0.5 + 0.5;
      g.fillStyle = col(0.15 + 0.85 * m); g.globalAlpha = 0.12 + 0.8 * m * m;
      var sz = 1.2 + 2.2 * m;
      for (var i = 0; i < H.length; i++) { var hv = H[i]; if (!(hv >= lo && (hv < hi || bk === 7))) continue; var sc = pts[i * 3 + 2]; g.fillRect(pts[i * 3] - sz * sc / 2, pts[i * 3 + 1] - sz * sc / 2, sz * sc, sz * sc); }
    }
  }
  function drawSphere(g, cu, cx, cy, R) {
    var A = CY.sph, M = CY.N, l = cu.l, mm = cu.mm, t = CY.t, en = CY.en, amp = 0.07 + 0.12 * en, osc = Math.cos(t * 2 * Math.PI * 0.5);
    var cs = Math.cos(CY.yaw), sn = Math.sin(CY.yaw), cp = Math.cos(CY.pitch - 0.95 + 0.3), sp = Math.sin(CY.pitch - 0.95 + 0.3);
    g.globalCompositeOperation = 'lighter'; var Rs = R * 0.85;
    for (var i = 0; i < M; i++) {
      var x = A[3 * i], y = A[3 * i + 1], z = A[3 * i + 2];
      var th = Math.acos(y), ph = Math.atan2(z, x);
      var Y = Math.cos(l * th) * Math.cos(mm * ph);     // simplified spherical harmonic (nodal rings x meridians)
      var r = 1 + amp * Y * osc, X = x * r, YY = y * r, Z = z * r;
      var X2 = X * cs - Z * sn, Z2 = X * sn + Z * cs, Y2 = YY * cp - Z2 * sp, Z3 = YY * sp + Z2 * cp;
      var s = 3 / (3 + Z3), front = Z3 < 0;
      var aY = Math.abs(Y);
      g.globalAlpha = (front ? 0.85 : 0.1) * (0.04 + 0.96 * aY * aY);
      g.fillStyle = col(0.25 + 0.75 * aY); var z2 = (1.2 + 1.8 * aY) * s;
      g.fillRect(cx + X2 * Rs * s - z2 / 2, cy - Y2 * Rs * s - z2 / 2, z2, z2);
    }
  }
  function drawMandala(g, cu, cx, cy, R) {
    qcPrep(cu.fold); var o = CY.off, im = CY.img, D = im.data, S2 = o.width, h = S2 / 2, k = cu.k * 1.25, fold = cu.fold, t = CY.t, en = CY.en;
    var tw = t * 0.15, pul = Math.cos(t * 2 * Math.PI * 0.35), contrast = 0.6 + 0.6 * en;
    for (var py = 0; py < S2; py++) for (var px = 0; px < S2; px++) {
      var x = (px - h) / h, y = (py - h) / h, r = Math.sqrt(x * x + y * y), j = (py * S2 + px) * 4;
      if (r > 1) { D[j + 3] = 0; continue; }
      var v = qc(x, y, k * 1.9, fold, pul * 0.8) * 0.8 + Math.cos(k * r * 2.4 - pul) * 0.2;
      var e = Math.pow(Math.max(0, v * 0.5 + 0.5), 1.6) * contrast * (1 - Math.pow(r, 8)), ci = Math.max(0, Math.min(255, (e * 255) | 0)) * 3;
      D[j] = LUT[ci]; D[j + 1] = LUT[ci + 1]; D[j + 2] = LUT[ci + 2]; D[j + 3] = 255;
    }
    o.getContext('2d').putImageData(im, 0, 0);
    var Rm = R * 1.2;
    g.save(); g.translate(cx, cy); g.rotate(CY.yaw * 0.3); g.imageSmoothingEnabled = true; g.drawImage(o, -Rm, -Rm, Rm * 2, Rm * 2); g.restore();
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25; var gr = g.createRadialGradient(cx, cy, 0, cx, cy, Rm); gr.addColorStop(0, col(0.9)); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - Rm, cy - Rm, Rm * 2, Rm * 2);
  }

  /* ---------------- hooks ---------------- */
  function hook() {
    ['fsGo', 'fsGo2'].forEach(function (i) { if ($(i)) $(i).onclick = cymatics; });
    if (window.AureluneWellness) window.AureluneWellness.immerse = cymatics;
    var hero = document.querySelector('#view-bw .bw-hero');
    if (hero && !$('cyGoBw')) {
      var b = document.createElement('button'); b.id = 'cyGoBw'; b.className = 'btn ghost cy-go'; b.textContent = tt('cyBtn'); b.onclick = cymatics;
      var t2 = hero.querySelector('.bw-hbtns') || hero; t2.appendChild(b);
    }
    if ($('cyGoBw')) $('cyGoBw').textContent = tt('cyBtn');
    if ($('bwbMix')) $('bwbMix').querySelector('span').textContent = tt('mxBtn');
  }
  function tick() { mixBtn(); hook(); dot(); }
  var oL = window.applyLang;
  if (typeof oL === 'function') window.applyLang = function () { var r = oL.apply(this, arguments); try { hook(); if ($('mixPop')) { togglePop(false); togglePop(true); } if (CY) { panel(); viewsBar(); $('cyHelp').textContent = tt('cyHelp'); } } catch (e) {} return r; };
  setInterval(tick, 500); setTimeout(tick, 50);
  window.AureluneV317 = { mix: togglePop, optimize: optimize, cymatics: cymatics, _opt: OPT, _cy: function () { return CY; }, setView: function (v) { if (CY) setO({ view: v }); } };
})();
