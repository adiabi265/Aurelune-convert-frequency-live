/* Aurelune 3.15 – Brainwave player (Spotify-like): a fixed player bar (⏮ ▶/⏸ ⏭, progress, volume) that pauses /
   resumes whatever brainwave sound runs right now (Gateway journey, session, brainwave layers, beat), and a
   "Meditation" view with the Gateway / SeptaSync journeys (7 layers: isochronic + binaural on the same target)
   and a live table of the real frequencies. Audio runs in the engine (gateway.py); this file is only the UI. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var L = function () { return (typeof lang !== 'undefined' && lang === 'de') ? 'de' : 'en'; };
  var tt = function (k, v) { return typeof t === 'function' ? t(k, v) : k; };
  var S = function () { return (typeof settings !== 'undefined' && settings) || {}; };
  var ST = function () { return (typeof status !== 'undefined' && status) || {}; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var N = function (o) { return o ? (o[L()] || o.en || '') : ''; };
  var hz = function (v, d) { var s = Number(v).toFixed(d == null ? 2 : d); if (L() === 'de') s = s.replace('.', ','); return s; };
  var mmss = function (s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
  var info = null, wellSes = null, sel = 'gateway', seeking = false, busy = false, lastAct = 0;
  try {
    Object.assign(I18N.en, {
      tBw: 'Meditation', bwTitle: '🌀 Gateway meditation', bwIntro: 'Seven tone layers at once (SeptaSync principle, like the Gateway tapes): the target frequency runs as an isochronic pulse AND as a binaural beat, underneath slow ocean surf. Every frequency is real and shown live below.',
      bwPlay: 'Play', bwPause: 'Pause', bwPrev: 'Back', bwNext: 'Next', bwStop: 'Stop', bwQueue: 'Track list',
      bwPhones: '🎧 Headphones · binaural', bwSpk: '🔊 Speakers · monaural', bwLvl: 'Volume', bwSurf: 'Surf',
      bwTracks: 'Journey', bwNum: '#', bwTitleCol: 'Stage', bwTarget: 'Target', bwDur: 'Time',
      bwLive: '📡 Live frequencies (7 layers)', bwLiveH: 'Left ear / right ear / beat - exactly what plays right now.',
      bwKind: 'Type', bwLeft: 'Left', bwRight: 'Right', bwBeat: 'Beat', bwShare: 'Share', kBin: 'binaural', kMon: 'monaural', kIso: 'isochronic',
      bwIdle: 'Nothing playing', bwIdleSub: 'Press ▶ for the Gateway meditation', bwPaused: 'paused',
      bwSes: 'Session', bwLayers: 'Brainwave layers', bwBeatSrc: 'Beat', bwOff: 'Turn Aurelune on - the player starts it for you.',
      bwNote: 'Honest note: the Monroe Institute does not publish its exact Hemi-Sync mixes. These stages follow the published ranges (Focus 10 = theta + delta, deeper Focus levels = more delta with some gamma) - the frequencies are real and exact, the effect differs from person to person and is not a medical treatment. Binaural only works with headphones; isochronic works on speakers too. Do not use while driving.',
      bwDone: 'Journey finished', bwTip: 'Tip: lie down, eyes closed, headphones on, volume just above audible.'
    });
    Object.assign(I18N.de, {
      tBw: 'Meditation', bwTitle: '🌀 Gateway-Meditation', bwIntro: 'Sieben Ton-Schichten gleichzeitig (SeptaSync-Prinzip, wie die Gateway-Tapes): Die Zielfrequenz läuft als isochroner Puls UND als binauraler Beat, darunter langsame Meeresbrandung. Jede Frequenz ist echt und wird unten live angezeigt.',
      bwPlay: 'Abspielen', bwPause: 'Pause', bwPrev: 'Zurück', bwNext: 'Weiter', bwStop: 'Stopp', bwQueue: 'Titelliste',
      bwPhones: '🎧 Kopfhörer · binaural', bwSpk: '🔊 Lautsprecher · monaural', bwLvl: 'Lautstärke', bwSurf: 'Brandung',
      bwTracks: 'Reise', bwNum: '#', bwTitleCol: 'Abschnitt', bwTarget: 'Ziel', bwDur: 'Zeit',
      bwLive: '📡 Live-Frequenzen (7 Schichten)', bwLiveH: 'Linkes Ohr / rechtes Ohr / Beat - genau das, was gerade spielt.',
      bwKind: 'Art', bwLeft: 'Links', bwRight: 'Rechts', bwBeat: 'Beat', bwShare: 'Anteil', kBin: 'binaural', kMon: 'monaural', kIso: 'isochron',
      bwIdle: 'Gerade läuft nichts', bwIdleSub: '▶ drücken für die Gateway-Meditation', bwPaused: 'pausiert',
      bwSes: 'Sitzung', bwLayers: 'Brainwave-Schichten', bwBeatSrc: 'Takt', bwOff: 'Aurelune ist aus - der Player schaltet es selbst ein.',
      bwNote: 'Ehrlich gesagt: Das Monroe Institute veröffentlicht seine genauen Hemi-Sync-Mischungen nicht. Die Abschnitte folgen den veröffentlichten Bereichen (Focus 10 = Theta + Delta, tiefere Focus-Stufen = mehr Delta mit etwas Gamma) - die Frequenzen sind echt und exakt, die Wirkung ist von Mensch zu Mensch verschieden und keine medizinische Behandlung. Binaural wirkt nur mit Kopfhörern, isochron auch über Lautsprecher. Nicht beim Autofahren nutzen.',
      bwDone: 'Reise beendet', bwTip: 'Tipp: hinlegen, Augen zu, Kopfhörer auf, Lautstärke knapp über hörbar.'
    });
  } catch (e) {}

  var ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5.5v13L9.5 12z" fill="currentColor" stroke="none"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5.5v13L14.5 12z" fill="currentColor" stroke="none"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M4 6h12M4 12h12M4 18h8M18 15v6l4-3z"/></svg>',
    vol: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>'
  };

  function jById(id) { return info && info.journeys.filter(function (j) { return j.id === id; })[0]; }
  function wsById(id) { return wellSes && wellSes.filter(function (x) { return x.id === id; })[0]; }

  // what plays right now (one model for the bar, the view and the media keys)
  function now() {
    var st = ST(), s = S(), g = st.gw && st.gw.now, w = st.well || {}, ses = w.session || {};
    if (s.gw && g && jById(g.id)) {
      var j = jById(g.id), tr = j.tracks[g.track] || j.tracks[0], tgt = (st.gw.layers || []).filter(function (x) { return x.key === 'target'; })[0];
      return { src: 'gw', id: g.id, track: g.track, title: N(tr.name), sub: N(j.name) + ' · ' + (g.track + 1) + '/' + j.tracks.length, emoji: j.emoji,
        hz: tgt ? tgt.beat : tr.target[0], pos: g.pos, dur: g.dur, playing: !g.paused, seek: true };
    }
    if (s.gw && !g) {   // just started, engine has not reported yet
      var j2 = jById(s.gw.id); if (j2) { var t2 = j2.tracks[s.gw.track || 0]; return { src: 'gw', id: j2.id, track: s.gw.track || 0, title: N(t2.name), sub: N(j2.name), emoji: j2.emoji, hz: t2.target[0], pos: s.gw.pos0 || 0, dur: t2.dur, playing: !s.gw.paused, seek: true }; }
    }
    if (s.session && s.session.id) {
      var ws = wsById(s.session.id);
      return { src: 'ses', title: ws ? N(ws.name) : s.session.id, sub: tt('bwSes'), emoji: ws ? ws.emoji : '⏳', hz: ses.beat, pos: ses.elapsed, dur: ses.total || (ws && ws.total), playing: !s.session.paused_at };
    }
    if (s.binaural) {
      var bl = (st.binaural && st.binaural.layers) || [];
      return { src: 'layers', title: tt('bwLayers') + ' · ' + String(s.bin_preset || 'gateway'), sub: bl.map(function (x) { return hz(x[2], 1); }).join(' · ') + ' Hz', emoji: '🧠', hz: bl.length ? bl[0][2] : null, playing: true };
    }
    if (s.beat_on) return { src: 'beat', title: tt('bwBeatSrc') + ' ' + hz(s.beat_hz, 1) + ' Hz', sub: String(s.beat_mode || ''), emoji: '〰️', hz: s.beat_hz, playing: true };
    var j0 = jById(sel) || jById('gateway');
    return { src: 'idle', title: j0 ? N(j0.name) : tt('bwIdle'), sub: tt('bwIdleSub'), emoji: j0 ? j0.emoji : '🌀', playing: false };
  }

  async function act(name) {
    if (busy) return; busy = true; lastAct = Date.now();
    try {
      var args = Array.prototype.slice.call(arguments, 1);
      var r = await call.apply(null, [name].concat(args));
      if (r && r.settings && typeof settings !== 'undefined') { Object.assign(settings, r.settings); try { renderSettings(); } catch (e) {} }
      else if (r && r.ok === false && r.code && typeof showAlert === 'function') showAlert(r.code, r.error);
    } finally { busy = false; render(); }
  }

  function bar() {
    if ($('bwBar')) return;
    var b = document.createElement('div'); b.id = 'bwBar'; b.className = 'bw-bar';
    b.innerHTML = '<div class="bwb-l"><div class="bwb-cover" id="bwbCover"><span id="bwbEmo">🌀</span><i class="eq"><b></b><b></b><b></b></i></div>' +
      '<div class="bwb-t"><b id="bwbTitle"></b><small id="bwbSub"></small></div><span class="bwb-hz" id="bwbHz"></span></div>' +
      '<div class="bwb-c"><div class="bwb-btns"><button id="bwbPrev" class="bwb-ic">' + ICON.prev + '</button><button id="bwbPlay" class="bwb-play">' + ICON.play + '</button><button id="bwbNext" class="bwb-ic">' + ICON.next + '</button></div>' +
      '<div class="bwb-prog"><small id="bwbPos">0:00</small><input type="range" id="bwbSeek" min="0" max="1000" value="0"><small id="bwbDur">0:00</small></div></div>' +
      '<div class="bwb-r"><button id="bwbList" class="bwb-ic small">' + ICON.list + '</button><span class="bwb-vic">' + ICON.vol + '</span><input type="range" id="bwbVol" min="0" max="100"></div>';
    document.body.appendChild(b);
    $('bwbPlay').onclick = function () { act('bw_toggle'); };
    $('bwbNext').onclick = function () { act('bw_skip', 1); };
    $('bwbPrev').onclick = function () { act('bw_skip', -1); };
    $('bwbList').onclick = function () { showView('bw'); };
    $('bwbCover').onclick = function () { showView('bw'); };
    $('bwbVol').oninput = function (e) { if (typeof setS === 'function') setS({ gw_level: e.target.value / 100 }); };
    var sk = $('bwbSeek');
    sk.oninput = function () { seeking = true; var n = now(); if (n.dur) $('bwbPos').textContent = mmss(sk.value / 1000 * n.dur); };
    sk.onchange = function () { var n = now(); seeking = false; if (n.src === 'gw' && n.dur) act('bw_seek', sk.value / 1000 * n.dur); };
    document.body.classList.add('has-bwbar');
    place(); window.addEventListener('resize', place);
  }
  function place() {
    var b = $('bwBar'); if (!b) return;
    if (document.body.classList.contains('desk')) {
      var sd = document.querySelector('.side'); b.style.left = (sd ? sd.getBoundingClientRect().right : 0) + 'px'; b.style.bottom = '0px';
    } else {
      var tb = document.querySelector('nav.tabs'); b.style.left = '0px'; b.style.bottom = (tb ? tb.getBoundingClientRect().height : 0) + 'px';
    }
  }

  function view() {
    if ($('view-bw')) return true;
    var main = document.querySelector('main'), tabs = document.querySelector('.tabs'); if (!main || !tabs) return false;
    var b = document.createElement('button'); b.dataset.view = 'bw';
    b.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3a9 9 0 1 1-9 9M12 7a5 5 0 1 1-5 5"/></svg><span data-i18n="tBw">Meditation</span>';
    b.onclick = function () { showView('bw'); };
    var wb = tabs.querySelector('[data-view="well"]') || tabs.querySelector('[data-view="settings"]'); tabs.insertBefore(b, wb || null);
    if (!document.body.classList.contains('desk')) tabs.style.gridTemplateColumns = 'repeat(' + tabs.querySelectorAll('button').length + ',1fr)';
    var s = document.createElement('section'); s.className = 'view'; s.id = 'view-bw';
    s.innerHTML = '<div class="bw-hero"><div class="bw-art" id="bwArt"><span id="bwArtEmo">🌀</span><div class="bw-rings"><i></i><i></i><i></i></div></div>' +
      '<div class="bw-hinfo"><small class="bw-kick">PLAYLIST · 7 LAYERS · SEPTASYNC</small><h2 id="bwJName" data-i18n="bwTitle"></h2><p class="muted-p" id="bwJSub"></p>' +
      '<div class="bw-hbtns"><button id="bwBig" class="bw-big">' + ICON.play + '</button><div class="seg small" id="bwOut"><button data-v="1" data-i18n="bwPhones"></button><button data-v="0" data-i18n="bwSpk"></button></div></div>' +
      '<div class="bw-sl"><label><small data-i18n="bwLvl"></small><input type="range" id="bwLvl" min="0" max="100"></label><label><small data-i18n="bwSurf"></small><input type="range" id="bwSurf" min="0" max="100"></label></div></div></div>' +
      '<p class="muted-p" data-i18n="bwIntro"></p><div class="bw-jrn" id="bwJrn"></div>' +
      '<div class="card bw-list"><div class="bw-row bw-hd"><span data-i18n="bwNum"></span><span data-i18n="bwTitleCol"></span><span data-i18n="bwTarget"></span><span data-i18n="bwDur"></span></div><div id="bwTracks"></div></div>' +
      '<div class="card"><div class="card-head"><div><b data-i18n="bwLive"></b><small class="bin-desc" data-i18n="bwLiveH"></small></div><span class="verdict ok" id="bwLiveSt"></span></div>' +
      '<div class="bw-lay bw-lhd"><span></span><span data-i18n="bwKind"></span><span data-i18n="bwLeft"></span><span data-i18n="bwRight"></span><span data-i18n="bwBeat"></span><span data-i18n="bwShare"></span></div><div id="bwLayers"></div>' +
      '<p class="bin-note" data-i18n="bwTip"></p><p class="bin-note" data-i18n="bwNote"></p></div>';
    main.appendChild(s);
    $('bwBig').onclick = function () { var n = now(); if (n.src === 'gw' && n.id === sel) act('bw_toggle'); else if (n.src !== 'idle' && n.src !== 'gw') act('bw_toggle'); else act('bw_play', sel, 0, 0); };
    $('bwOut').onclick = function (e) { var v = e.target.closest('button'); if (v && typeof setS === 'function') { setS({ gw_phones: v.dataset.v === '1' }); render(); } };
    $('bwLvl').oninput = function (e) { if (typeof setS === 'function') setS({ gw_level: e.target.value / 100 }); };
    $('bwSurf').oninput = function (e) { if (typeof setS === 'function') setS({ gw_surf: e.target.value / 100 }); };
    applyI18n();
    return true;
  }
  function applyI18n() {
    document.querySelectorAll('#view-bw [data-i18n], .tabs [data-i18n="tBw"]').forEach(function (el) { el.textContent = tt(el.dataset.i18n); });
    ['bwbPrev', 'bwbNext', 'bwbList'].forEach(function (id, i) { if ($(id)) $(id).title = tt(['bwPrev', 'bwNext', 'bwQueue'][i]); });
  }

  function list() {
    var j = jById(sel); if (!j) return;
    $('bwJName').textContent = j.emoji + ' ' + N(j.name); $('bwJSub').textContent = N(j.sub); $('bwArtEmo').textContent = j.emoji;
    $('bwJrn').innerHTML = info.journeys.map(function (x) { return '<button class="bw-jb' + (x.id === sel ? ' on' : '') + '" data-id="' + x.id + '"><b>' + x.emoji + ' ' + esc(N(x.name)) + '</b><small>' + Math.round(x.total / 60) + ' min</small></button>'; }).join('');
    $('bwJrn').querySelectorAll('.bw-jb').forEach(function (b) { b.onclick = function () { sel = b.dataset.id; list(); render(); }; });
    $('bwTracks').innerHTML = j.tracks.map(function (t, i) {
      var a = t.target[0], z = t.target[1];
      return '<div class="bw-row bw-tr" data-i="' + i + '"><span class="bw-n"><em>' + (i + 1) + '</em><i class="eq"><b></b><b></b><b></b></i><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>' +
        '<span class="bw-tt"><b>' + esc(N(t.name)) + '</b><small>' + esc(N(t.sub)) + '</small></span><span class="bw-hzc">' + (a === z ? hz(a) : hz(a) + ' → ' + hz(z)) + ' Hz</span><span class="bw-d">' + mmss(t.dur) + '</span></div>';
    }).join('');
    $('bwTracks').querySelectorAll('.bw-tr').forEach(function (r) {
      r.ondblclick = r.onclick = function () { var n = now(), i = +r.dataset.i; if (n.src === 'gw' && n.id === sel && n.track === i) act('bw_toggle'); else act('bw_play', sel, i, 0); };
    });
  }

  function render() {
    if (!info) return;
    var n = now(), s = S(), st = ST(), playing = n.playing;
    // bar
    if ($('bwBar')) {
      $('bwbEmo').textContent = n.emoji; $('bwbTitle').textContent = n.title;
      $('bwbSub').textContent = n.sub + (n.src !== 'idle' && !playing ? ' · ' + tt('bwPaused') : '');
      $('bwbHz').textContent = n.hz != null ? hz(n.hz) + ' Hz' : '';
      $('bwbPlay').innerHTML = playing ? ICON.pause : ICON.play; $('bwbPlay').title = tt(playing ? 'bwPause' : 'bwPlay');
      $('bwBar').classList.toggle('playing', !!playing);
      var has = n.dur > 0;
      $('bwbPos').textContent = has ? mmss(n.pos) : '–'; $('bwbDur').textContent = has ? mmss(n.dur) : '–';
      if (!seeking) $('bwbSeek').value = has ? Math.min(1000, Math.round(n.pos / n.dur * 1000)) : 0;
      $('bwbSeek').disabled = !n.seek; $('bwbSeek').style.setProperty('--p', (has ? Math.min(100, n.pos / n.dur * 100) : 0) + '%');
      var lv = Math.round((s.gw_level != null ? s.gw_level : 0.5) * 100); if (document.activeElement !== $('bwbVol')) $('bwbVol').value = lv;
      $('bwbVol').style.setProperty('--p', lv + '%');
    }
    if (!$('view-bw')) return;
    var mine = n.src === 'gw' && n.id === sel;
    $('bwBig').innerHTML = (mine || (n.src !== 'idle' && n.src !== 'gw')) && playing ? ICON.pause : ICON.play;
    $('view-bw').classList.toggle('playing', mine && playing);
    $('bwOut').querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', (b.dataset.v === '1') === (s.gw_phones !== false)); });
    if (document.activeElement !== $('bwLvl')) $('bwLvl').value = Math.round((s.gw_level != null ? s.gw_level : 0.5) * 100);
    if (document.activeElement !== $('bwSurf')) $('bwSurf').value = Math.round((s.gw_surf != null ? s.gw_surf : 0.5) * 100);
    $('bwTracks').querySelectorAll('.bw-tr').forEach(function (r) { var on = mine && +r.dataset.i === n.track; r.classList.toggle('cur', on); r.classList.toggle('playing', on && playing); });
    var lay = (st.gw && st.gw.layers) || [], m = (st.gw && st.gw.master) || 0;
    var live = n.src === 'gw' && st.running;
    $('bwLiveSt').textContent = !st.running ? tt('bwOff') : live ? (playing ? '● LIVE' : tt('bwPaused')) : '';
    $('bwLiveSt').className = 'verdict ' + (live && playing ? 'ok' : 'warn'); $('bwLiveSt').hidden = !$('bwLiveSt').textContent;
    var slots = info.slots;
    $('bwLayers').innerHTML = slots.map(function (sl, i) {
      var x = lay[i] || { kind: sl.kind, left: sl.carrier, right: sl.carrier, beat: 0, share: 0 }, on = live && x.share > 0.001;
      var kd = x.kind === 'iso' ? tt('kIso') : x.kind === 'mon' ? tt('kMon') : tt('kBin');
      return '<div class="bw-lay' + (on ? ' on' : '') + '"><span><b>' + esc(N(sl.name)) + '</b></span><span class="bw-k ' + x.kind + '">' + kd + '</span>' +
        '<span>' + (on ? hz(x.left, 2) : '–') + '</span><span>' + (on ? hz(x.right, 2) : '–') + '</span><span class="bw-bt">' + (on ? hz(x.beat, 2) + ' Hz' : '–') + '</span>' +
        '<span class="bw-sh"><i style="width:' + Math.round((on ? x.share * m : 0) * 100) + '%"></i></span></div>';
    }).join('');
  }

  // media keys + mini window: route play/pause/next/prev to the brainwave player when the frequency playlists are idle
  var silent = null;
  function media() {
    if (!('mediaSession' in navigator)) return;
    var PL = window.AurelunePlaylists, plOn = PL && PL._state && PL._state().playing, n = now(), ms = navigator.mediaSession;
    if (plOn || !info) return;
    if (n.src !== 'idle' && !silent) {
      var sr = 8000, len = sr, buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf), w = function (o, str) { for (var i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * 2, true);
      silent = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))); silent.loop = true; silent.volume = 0.01;
    }
    if (!silent) return;
    try {
      var bwKey = function (fn) { return function () { var P = window.AurelunePlaylists; if (P && P._state && P._state().playing) return; fn(); }; };
      if (!silent._h) {
        silent._h = 1;
        ms.setActionHandler('play', bwKey(function () { if (!now().playing) act('bw_toggle'); }));
        ms.setActionHandler('pause', bwKey(function () { if (now().playing) act('bw_toggle'); }));
        ms.setActionHandler('nexttrack', bwKey(function () { act('bw_skip', 1); }));
        ms.setActionHandler('previoustrack', bwKey(function () { act('bw_skip', -1); }));
      }
      if (n.playing && silent.paused) silent.play().catch(function () {});
      ms.metadata = new MediaMetadata({ title: n.title, artist: 'Aurelune' + (n.hz != null ? ' · ' + hz(n.hz) + ' Hz' : ''), album: n.sub });
      ms.playbackState = n.playing ? 'playing' : 'paused';
    } catch (e) {}
  }
  function miniBtn() {
    var mb = $('miniBar'); if (!mb || $('miniBw')) return;
    var b = document.createElement('button'); b.id = 'miniBw'; b.className = 'mini-bw'; b.onclick = function () { act('bw_toggle'); }; mb.appendChild(b);
  }

  var lastDone = null;
  function tick() {
    try {
      miniBtn();
      if ($('miniBw')) { var n = now(); $('miniBw').innerHTML = (n.playing ? ICON.pause : ICON.play); $('miniBw').title = n.title; }
      var s = S(), st = ST();
      // engine finished the journey -> settings.gw was cleared there; mirror it
      if (s.gw && st.running && st.gw && !st.gw.now && st.gw.master === 0 && Date.now() - lastAct > 3000) { lastDone = s.gw.id; s.gw = null; toast(tt('bwDone')); }
      render(); media(); place();
    } catch (e) {}
  }

  async function load() {
    var r = await call('bw_info'); if (!r || r.ok === false || !r.journeys) return;
    info = r; if (r.last && r.last.id && jById(r.last.id)) sel = r.last.id;
    var w = await call('well_info'); if (w && w.sessions) wellSes = w.sessions;
    if (S().gw && S().gw.id) sel = S().gw.id;
    list(); render();
  }
  window.AureluneBrainwave = { now: now, toggle: function () { return act('bw_toggle'); }, skip: function (d) { return act('bw_skip', d); }, play: function (j, i) { return act('bw_play', j || sel, i || 0, 0); } };

  var tries = 0, iv = setInterval(function () {
    tries++;
    try {
      if (view()) { bar(); applyI18n(); if (typeof api !== 'undefined' && api && !info) load(); }
    } catch (e) {}
    if ((info && tries > 4) || tries > 60) { clearInterval(iv); setInterval(tick, 500); }
  }, 500);
  var _al = window.applyLang; if (typeof _al === 'function') window.applyLang = function () { _al.apply(this, arguments); try { applyI18n(); if (info) { list(); render(); } } catch (e) {} };
})();