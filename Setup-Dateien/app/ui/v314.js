/* Aurelune 3.14 – Wellness tab: sessions, focus modulation, breath coach (+ resonance test), isochronic / monaural /
   binaural beat, 40 Hz gamma (+ optional light flicker), deep sleep noise, 8D sound, singing bowls & gongs, daily
   routines, hearing protection. Plus: 3D cymatics full screen, mini player, media keys, "song in 440 -> now 432" line,
   low-latency switch, tray switch. Audio runs in the engine (wellness.py); this file is only the UI. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var L = function () { return (typeof lang !== 'undefined' && lang === 'de') ? 'de' : 'en'; };
  var tt = function (k, v) { return typeof t === 'function' ? t(k, v) : k; };
  var S = function () { return (typeof settings !== 'undefined' && settings) || {}; };
  var ST = function () { return (typeof status !== 'undefined' && status) || {}; };
  var W = function () { return ST().well || {}; };
  var nf = function (v, d) { return typeof fmt === 'function' ? fmt(v, d) : String(v); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  try {
    Object.assign(I18N.en, {
      tWell: 'Wellness', wTitle: '🧘 Wellness', wIntro: 'Sessions, focus and sleep - all running live on your own music, already in your target frequency.',
      sesT: '⏳ Sessions', sesH: 'Lead-in first, then a slow course, then fade-out. Starts Aurelune if needed.', sesMode: 'Beat type',
      mIso: 'Isochronic · speakers ok', mBin: 'Binaural · headphones', mMon: 'Monaural · speakers ok',
      sesStop: 'Stop session', sesLead: 'Lead-in', sesCourse: 'Course', sesOut: 'Fade-out', sesLeft: '{m} min left', sesMin: '{m} min',
      sesDone: 'Session finished', sesNote: 'Tip: put the session on early and listen through to the end - in studies, listening before and longer worked best.',
      modT: '🎯 Focus modulation', modH: 'Aurelune gently modulates your music itself - like Brain.fm, but with your music.',
      modFocus: 'Focus · β 16 Hz', modCalm: 'Calm · α 10 Hz', modDeep: 'Deep · θ 6 Hz', modDepth: 'Strength',
      brT: '🌬️ Breathing coach', brH: 'The orb breathes 6 times a minute (4 s in, 6 s out) - your music swells with it.',
      brRate: 'Breaths/min', brDepth: 'Swell', brTone: 'Soft breath tone', brIn: 'Breathe in', brOut: 'Breathe out',
      resT: 'Find my resonance', resH: 'Tries 6.5 → 4.5 breaths/min for 1 minute each. Rate how calm you feel - the best rate is saved. (Subjective: an exact measurement needs a heart-rate sensor.)',
      resStep: 'Step {i}/{n} · {bpm} breaths/min', resRate: 'How calm do you feel?', resDone: 'Your rate: {bpm} breaths/min (saved)', resCancel: 'Cancel',
      beatT: '〰️ Beat (isochronic)', beatH: 'A rhythmic tone under your music. Isochronic and monaural work without headphones.',
      bDelta: 'Delta 2', bTheta: 'Theta 6', bAlpha: 'Alpha 10', bBeta: 'Beta 16', bGamma: 'Gamma 40', beatLvl: 'Volume',
      gamT: '✨ 40 Hz gamma', gamH: 'Inspired by MIT research (40 Hz sound + light). Research, not therapy.', gamStart: 'Start 40 Hz', gamLight: 'Light flicker…',
      flWarn: '⚠️ Flickering light can trigger seizures in people with photosensitive epilepsy. Do not use it if you or your family have epilepsy or have ever had a seizure. Stop at once if you feel unwell. Not while driving.',
      flOk: 'I have read this and have no epilepsy', flGo: 'Start flicker', flRate: 'Your screen: {hz} Hz → flicker {f} Hz{x}', flRateX: ' (exactly 40 Hz needs 80 Hz+, e.g. a 120/144 Hz monitor)', flStop: 'Click or Esc to stop',
      slT: '🌙 Deep sleep', slBadge: 'Experiment', slH: 'Pink or brown noise all night. Optional: gentle pulses from ~30 min on, after the slow-wave sleep studies.',
      slPink: 'Pink', slBrown: 'Brown', slLvl: 'Volume', slPulses: 'Gentle pulses', slDelay: 'from minute', slAt: 'Pulses from {t}', slNow: 'Pulses active',
      spT: '🎧 8D sound', spH: 'Your sound slowly travels around your head (best with headphones).', spSpeed: 'Round trip', spDepth: 'Amount',
      bwT: '🔔 Singing bowls & gongs', bwH: 'Tuned exactly to the Solfeggio frequencies. Click to strike.', bwBowl: 'Singing bowl', bwGong: 'Gong',
      rtT: '📅 Daily routines', rtH: 'Like Endel: e.g. focus in the morning, sleep in the evening - Aurelune starts it by itself (app must be running).',
      rtAdd: '+ Add', rtFocus: '🎯 Focus', rtRelax: '🌿 Relax', rtMed: '🧘 Meditation', rtNap: '⚡ Power nap', rtSleep: '🌙 Fall asleep', rtGamma: '✨ 40 Hz', rtOff: '⏹ All off', rtRan: 'Routine started: {a}',
      earT: '🛡️ Hearing protection', earH: 'Tames sudden loud jumps (e.g. ads) and caps the loudness.', earMax: 'Max. loudness', earTame: 'Tame sudden jumps',
      earNow: 'Reducing {db} dB right now', earIdle: 'Nothing to reduce', earLoud: 'Loud listening today: {m} min',
      songLine: '🎵 Song plays in {in} Hz → you hear {out} Hz', songSame: '🎵 Song is already in {in} Hz',
      fsBtn: 'Full screen', miniBtn: 'Mini player', miniBack: 'Back to the big window',
      llT: '⚡ Low latency', llH: 'Smaller safety buffer (15 instead of 40 ms). Turn off if it crackles. 432-Lock adds 0.75 s on purpose.',
      latLine: 'Delay now: {ms} ms (lock {l} · FFT {f} · buffer {b})', trayT: '🔔 Taskbar icon', trayH: 'Quick menu next to the clock: on/off, frequency, sessions, mini player.',
      needOn: 'Turn Aurelune on first', expBadge: 'beta'
    });
    Object.assign(I18N.de, {
      tWell: 'Wellness', wTitle: '🧘 Wellness', wIntro: 'Sitzungen, Fokus und Schlaf - alles läuft live mit deiner eigenen Musik, schon in deiner Zielfrequenz.',
      sesT: '⏳ Sitzungen', sesH: 'Erst Vorlauf, dann ein langsamer Verlauf, dann Ausblenden. Schaltet Aurelune bei Bedarf ein.', sesMode: 'Takt-Art',
      mIso: 'Isochron · Lautsprecher ok', mBin: 'Binaural · Kopfhörer', mMon: 'Monaural · Lautsprecher ok',
      sesStop: 'Sitzung beenden', sesLead: 'Vorlauf', sesCourse: 'Verlauf', sesOut: 'Ausklang', sesLeft: 'noch {m} min', sesMin: '{m} min',
      sesDone: 'Sitzung beendet', sesNote: 'Tipp: Sitzung rechtzeitig starten und bis zum Ende hören - in Studien wirkte vorher und länger hören am besten.',
      modT: '🎯 Fokus-Modulation', modH: 'Aurelune moduliert deine Musik selbst ganz sanft - wie Brain.fm, nur mit deiner Musik.',
      modFocus: 'Fokus · β 16 Hz', modCalm: 'Ruhe · α 10 Hz', modDeep: 'Tief · θ 6 Hz', modDepth: 'Stärke',
      brT: '🌬️ Atem-Coach', brH: 'Der Orb atmet 6-mal pro Minute (4 s ein, 6 s aus) - deine Musik schwillt mit.',
      brRate: 'Atemzüge/min', brDepth: 'Schwellen', brTone: 'Sanfter Atem-Ton', brIn: 'Einatmen', brOut: 'Ausatmen',
      resT: 'Meine Resonanz finden', resH: 'Probiert 6,5 → 4,5 Atemzüge/min je 1 Minute. Du bewertest, wie ruhig du dich fühlst - der beste Wert wird gespeichert. (Subjektiv: genau messen geht nur mit Herzfrequenz-Sensor.)',
      resStep: 'Schritt {i}/{n} · {bpm} Atemzüge/min', resRate: 'Wie ruhig fühlst du dich?', resDone: 'Dein Wert: {bpm} Atemzüge/min (gespeichert)', resCancel: 'Abbrechen',
      beatT: '〰️ Takt (Isochron)', beatH: 'Ein rhythmischer Ton unter deiner Musik. Isochron und monaural funktionieren ohne Kopfhörer.',
      bDelta: 'Delta 2', bTheta: 'Theta 6', bAlpha: 'Alpha 10', bBeta: 'Beta 16', bGamma: 'Gamma 40', beatLvl: 'Lautstärke',
      gamT: '✨ 40 Hz Gamma', gamH: 'Nach der MIT-Forschung (40 Hz Ton + Licht). Forschung, keine Therapie.', gamStart: '40 Hz starten', gamLight: 'Licht-Flackern…',
      flWarn: '⚠️ Flackerndes Licht kann bei fotosensitiver Epilepsie Anfälle auslösen. Nicht benutzen, wenn du oder deine Familie Epilepsie habt oder du je einen Anfall hattest. Bei Unwohlsein sofort stoppen. Nicht beim Autofahren.',
      flOk: 'Gelesen - ich habe keine Epilepsie', flGo: 'Flackern starten', flRate: 'Dein Bildschirm: {hz} Hz → Flackern {f} Hz{x}', flRateX: ' (genau 40 Hz braucht 80 Hz+, z. B. 120/144-Hz-Monitor)', flStop: 'Klick oder Esc zum Stoppen',
      slT: '🌙 Tiefschlaf', slBadge: 'Experiment', slH: 'Rosa oder braunes Rauschen die ganze Nacht. Optional: sanfte Impulse ab ~30 min, nach den Tiefschlaf-Studien.',
      slPink: 'Rosa', slBrown: 'Braun', slLvl: 'Lautstärke', slPulses: 'Sanfte Impulse', slDelay: 'ab Minute', slAt: 'Impulse ab {t}', slNow: 'Impulse aktiv',
      spT: '🎧 8D-Raumklang', spH: 'Dein Klang wandert langsam um deinen Kopf (am besten mit Kopfhörern).', spSpeed: 'Eine Runde', spDepth: 'Stärke',
      bwT: '🔔 Klangschalen & Gongs', bwH: 'Exakt auf die Solfeggio-Frequenzen gestimmt. Klicken zum Anschlagen.', bwBowl: 'Klangschale', bwGong: 'Gong',
      rtT: '📅 Tagesroutinen', rtH: 'Wie bei Endel: z. B. morgens Fokus, abends Schlaf - Aurelune startet es selbst (App muss laufen).',
      rtAdd: '+ Hinzufügen', rtFocus: '🎯 Fokus', rtRelax: '🌿 Entspannen', rtMed: '🧘 Meditation', rtNap: '⚡ Power-Nap', rtSleep: '🌙 Einschlafen', rtGamma: '✨ 40 Hz', rtOff: '⏹ Alles aus', rtRan: 'Routine gestartet: {a}',
      earT: '🛡️ Gehörschutz', earH: 'Dämpft plötzliche laute Sprünge (z. B. Werbung) und begrenzt die Lautstärke.', earMax: 'Max. Lautstärke', earTame: 'Plötzliche Sprünge dämpfen',
      earNow: 'Dämpft gerade {db} dB', earIdle: 'Nichts zu dämpfen', earLoud: 'Heute laut gehört: {m} min',
      songLine: '🎵 Song läuft in {in} Hz → du hörst {out} Hz', songSame: '🎵 Song ist schon in {in} Hz',
      fsBtn: 'Vollbild', miniBtn: 'Mini-Player', miniBack: 'Zurück zum großen Fenster',
      llT: '⚡ Niedrige Verzögerung', llH: 'Kleinerer Sicherheitspuffer (15 statt 40 ms). Ausschalten, falls es knackt. Der 432-Lock verzögert absichtlich um 0,75 s.',
      latLine: 'Verzögerung jetzt: {ms} ms (Lock {l} · FFT {f} · Puffer {b})', trayT: '🔔 Symbol in der Taskleiste', trayH: 'Schnellmenü neben der Uhr: Ein/Aus, Frequenz, Sitzungen, Mini-Player.',
      needOn: 'Bitte zuerst Aurelune einschalten', expBadge: 'Beta'
    });
  } catch (e) {}

  var info = null, routines = null, lastRev = null;
  function sessions() { return (info && info.sessions) || []; }
  function ses(id) { return sessions().filter(function (x) { return x.id === id; })[0]; }
  function band(b) { return b < 4 ? 'Delta' : b < 8 ? 'Theta' : b < 13 ? 'Alpha' : b < 30 ? 'Beta' : 'Gamma'; }
  function set(p) { if (typeof setS === 'function') return setS(p); }
  function sw(id) { return '<label class="switch"><input type="checkbox" id="' + id + '"><span></span></label>'; }
  function head(title, hint, id, extra) { return '<div class="bin-head"><div><b data-i18n="' + title + '"></b><small data-i18n="' + hint + '"></small></div>' + (extra || '') + (id ? sw(id) : '') + '</div>'; }
  function slider(id, lab, lo, hi, step) { return '<div class="bin-slider"><label data-i18n="' + lab + '"></label><input type="range" id="' + id + '" min="' + lo + '" max="' + hi + '" step="' + step + '"><span id="' + id + 'V"></span></div>'; }
  function seg(id, items, cls) { return '<div class="seg ' + (cls || '') + '" id="' + id + '">' + items.map(function (x) { return '<button data-v="' + x[0] + '" data-i18n="' + x[1] + '"></button>'; }).join('') + '</div>'; }
  function SOLF() { return [174, 285, 396, 417, 432, 528, 639, 741, 852, 963]; }
  function ACTIONS() { return [['focus', 'rtFocus'], ['relax', 'rtRelax'], ['meditate', 'rtMed'], ['nap', 'rtNap'], ['sleep', 'rtSleep'], ['gamma', 'rtGamma'], ['off', 'rtOff']]; }

  // ---------------- build ----------------
  function build() {
    if ($('view-well')) return true;
    var main = document.querySelector('main'), tabs = document.querySelector('.tabs'); if (!main || !tabs) return false;
    var b = document.createElement('button'); b.dataset.view = 'well';
    b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21c-4-3-8-6-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-4 8-8 11z"/></svg><span data-i18n="tWell">Wellness</span>';
    b.onclick = function () { showView('well'); };
    var setB = tabs.querySelector('[data-view="settings"]'); tabs.insertBefore(b, setB || null);
    if (!document.body.classList.contains('desk')) tabs.style.gridTemplateColumns = 'repeat(5,1fr)';
    var s = document.createElement('section'); s.className = 'view'; s.id = 'view-well';
    var H = '<h2 data-i18n="wTitle"></h2><p class="muted-p" data-i18n="wIntro"></p><div class="w-grid">';
    H += '<div class="card w-wide" id="wSes">' + head('sesT', 'sesH') + '<div id="sesGrid" class="ses-grid"></div>' +
      '<div class="w-row"><small data-i18n="sesMode"></small>' + seg('sesMode', [['isochronic', 'mIso'], ['binaural', 'mBin'], ['monaural', 'mMon']], 'three') + '</div>' +
      '<div id="sesRun" class="ses-run" hidden><div class="ses-top"><b id="sesName"></b><span id="sesPhase" class="verdict ok"></span><span id="sesBeat" class="ses-beat"></span><span id="sesLeft" class="ses-left"></span><button id="sesStop" class="btn ghost" data-i18n="sesStop"></button></div>' +
      '<canvas id="sesPlot" width="900" height="110"></canvas></div><p class="bin-note" data-i18n="sesNote"></p></div>';
    H += '<div class="card">' + head('modT', 'modH', 'modOn') + seg('modSeg', [['focus', 'modFocus'], ['calm', 'modCalm'], ['deep', 'modDeep']], 'three') + slider('modDepth', 'modDepth', 0, 100, 1) + '</div>';
    H += '<div class="card">' + head('brT', 'brH', 'brOn') + slider('brRate', 'brRate', 4.5, 7, 0.5) + slider('brDepth', 'brDepth', 0, 60, 1) +
      '<div class="set-row w-mini"><small data-i18n="brTone"></small>' + sw('brTone') + '</div>' +
      '<button id="resBtn" class="btn ghost wide" data-i18n="resT"></button><small class="bin-desc" data-i18n="resH"></small><div id="resBox" class="res-box" hidden></div></div>';
    H += '<div class="card">' + head('beatT', 'beatH', 'beatOn') + '<div class="seg five" id="beatSeg"><button data-v="2" data-i18n="bDelta"></button><button data-v="6" data-i18n="bTheta"></button><button data-v="10" data-i18n="bAlpha"></button><button data-v="16" data-i18n="bBeta"></button><button data-v="40" data-i18n="bGamma"></button></div>' +
      seg('beatMode', [['isochronic', 'mIso'], ['binaural', 'mBin'], ['monaural', 'mMon']], 'three') + slider('beatLvl', 'beatLvl', 0, 100, 1) + '</div>';
    H += '<div class="card">' + head('gamT', 'gamH') + '<div class="btn-row"><button id="gamGo" class="btn" data-i18n="gamStart"></button><button id="gamLight" class="btn ghost" data-i18n="gamLight"></button></div></div>';
    H += '<div class="card">' + head('slT', 'slH', 'slOn', '<span class="verdict warn" data-i18n="slBadge"></span>') + seg('slColor', [['pink', 'slPink'], ['brown', 'slBrown']]) + slider('slLvl', 'slLvl', 0, 100, 1) +
      '<div class="set-row w-mini"><small data-i18n="slPulses"></small><select id="slDelay"><option value="20">20</option><option value="30">30</option><option value="45">45</option><option value="60">60</option></select><small data-i18n="slDelay"></small>' + sw('slPulses') + '</div><small id="slInfo" class="bin-desc"></small></div>';
    H += '<div class="card">' + head('spT', 'spH', 'spOn') + slider('spSpeed', 'spSpeed', 6, 30, 1) + slider('spDepth', 'spDepth', 0, 100, 1) + '</div>';
    H += '<div class="card">' + head('bwT', 'bwH') + seg('bwKind', [['bowl', 'bwBowl'], ['gong', 'bwGong']]) + '<div id="bwGrid" class="bw-grid"></div></div>';
    H += '<div class="card">' + head('rtT', 'rtH', 'rtOn') + '<div id="rtList" class="rt-list"></div><button id="rtAdd" class="btn ghost" data-i18n="rtAdd"></button></div>';
    H += '<div class="card">' + head('earT', 'earH', 'earOn') + slider('earMax', 'earMax', -24, -3, 1) + '<div class="set-row w-mini"><small data-i18n="earTame"></small>' + sw('earTame') + '</div><small id="earInfo" class="bin-desc"></small></div>';
    H += '</div>';
    s.innerHTML = H;
    main.appendChild(s);
    // settings: low latency + tray
    var setv = $('view-settings');
    if (setv) {
      var c = document.createElement('div'); c.className = 'card'; c.id = 'wSetCard';
      c.innerHTML = '<div class="set-row"><div><b data-i18n="llT"></b><small data-i18n="llH"></small><small id="latLine" class="upd-info"></small></div>' + sw('llOn') + '</div>' +
        '<div class="set-row"><div><b data-i18n="trayT"></b><small data-i18n="trayH"></small></div>' + sw('trayOn') + '</div>' +
        '<div class="btn-row"><button id="miniGo2" class="btn ghost" data-i18n="miniBtn"></button><button id="fsGo2" class="btn ghost" data-i18n="fsBtn"></button></div>';
      var info2 = setv.querySelector('.card.info'); setv.insertBefore(c, info2 || null);
    }
    // home: song line + full screen / mini buttons
    var orbW = document.querySelector('.orb-wrap');
    if (orbW && !$('fsGo')) {
      var tb = document.createElement('div'); tb.className = 'orb-tools';
      tb.innerHTML = '<button id="fsGo" title=""><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button><button id="miniGo" title=""><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16v12H4zM12 12h6v4h-6z"/></svg></button>'; orbW.appendChild(tb);
      var bt = document.createElement('div'); bt.id = 'breathTxt'; bt.className = 'breath-txt'; orbW.appendChild(bt);
    }
    var dl = $('freqDescLine');
    if (dl && !$('songLine')) { var sl = document.createElement('div'); sl.id = 'songLine'; sl.className = 'song-line'; sl.hidden = true; dl.parentNode.insertBefore(sl, dl.nextSibling); }
    wire();
    return true;
  }
  // ---------------- wiring ----------------
  function chk(id, key, extra) { var e = $(id); if (e) e.onchange = function () { var p = {}; p[key] = e.checked; if (extra) Object.assign(p, extra(e.checked)); set(p); }; }
  function rng(id, key, scale) { var e = $(id); if (!e) return; e.oninput = function () { label(); }; e.onchange = function () { var p = {}; p[key] = Number(e.value) / (scale || 1); set(p); }; }
  function segw(id, key, num) { var e = $(id); if (!e) return; e.querySelectorAll('button').forEach(function (b) { b.onclick = function () { var p = {}; p[key] = num ? Number(b.dataset.v) : b.dataset.v; set(p); }; }); }
  function wire() {
    chk('modOn', 'mod_on'); segw('modSeg', 'mod_mode'); rng('modDepth', 'mod_depth', 100);
    chk('brOn', 'breath_on', function (on) { return on ? { breath_t0: Date.now() / 1000 } : {}; }); rng('brRate', 'breath_bpm'); rng('brDepth', 'breath_depth', 100); chk('brTone', 'breath_tone');
    chk('beatOn', 'beat_on'); segw('beatSeg', 'beat_hz', true); segw('beatMode', 'beat_mode'); rng('beatLvl', 'beat_level', 100);
    chk('slOn', 'sleep_on', function (on) { return { sleep_t0: on ? Date.now() / 1000 : 0 }; }); segw('slColor', 'sleep_color'); rng('slLvl', 'sleep_level', 100); chk('slPulses', 'sleep_pulses');
    if ($('slDelay')) $('slDelay').onchange = function () { set({ sleep_delay: Number($('slDelay').value) }); };
    chk('spOn', 'space_on'); rng('spSpeed', 'space_period'); rng('spDepth', 'space_depth', 100);
    chk('earOn', 'ear_on'); rng('earMax', 'ear_max_db'); chk('earTame', 'ear_tame');
    chk('llOn', 'low_latency');
    segw('sesMode', 'beat_mode');
    if ($('trayOn')) $('trayOn').onchange = function () { call('set_tray', $('trayOn').checked); if (info) info.tray = $('trayOn').checked; };
    if ($('sesStop')) $('sesStop').onclick = function () { call('stop_session').then(refresh); };
    if ($('gamGo')) $('gamGo').onclick = function () { startSession('gamma'); };
    if ($('gamLight')) $('gamLight').onclick = flickerDialog;
    if ($('resBtn')) $('resBtn').onclick = resonanceTest;
    if ($('rtOn')) $('rtOn').onchange = function () { routines.on = $('rtOn').checked; saveRt(); };
    if ($('rtAdd')) $('rtAdd').onclick = function () { routines.items.push({ t: '07:30', a: 'focus' }); saveRt(); renderRt(); };
    ['fsGo', 'fsGo2'].forEach(function (i) { if ($(i)) $(i).onclick = immerse; });
    ['miniGo', 'miniGo2'].forEach(function (i) { if ($(i)) $(i).onclick = function () { mini(true); }; });
    if ($('bwKind')) $('bwKind').querySelectorAll('button').forEach(function (b) { b.onclick = function () { bwKind = b.dataset.v; renderBowls(); }; });
  }
  async function refresh() { if (typeof refreshState === 'function') await refreshState(); render(); }
  async function startSession(id) {
    var r = await call('start_session', id, S().beat_mode || 'isochronic');
    if (r && r.ok === false) { if (typeof showAlert === 'function') showAlert(r.code || 'E_GENERIC', r.error); return; }
    await refresh(); if (typeof pollOnce === 'function') pollOnce();
  }

  // ---------------- render ----------------
  function val(id, v) { var e = $(id); if (e && document.activeElement !== e) e.value = v; }
  function on(id, v) { var e = $(id); if (e) e.checked = !!v; }
  function selSeg(id, v) { var e = $(id); if (e) e.querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', String(b.dataset.v) === String(v)); }); }
  function label() {
    var T = function (id, s) { if ($(id + 'V')) $(id + 'V').textContent = s; };
    var g = function (id) { return $(id) ? Number($(id).value) : 0; };
    T('modDepth', g('modDepth') + ' %'); T('brRate', nf(g('brRate'), 1)); T('brDepth', g('brDepth') + ' %'); T('beatLvl', g('beatLvl') + ' %');
    T('slLvl', g('slLvl') + ' %'); T('spSpeed', g('spSpeed') + ' s'); T('spDepth', g('spDepth') + ' %'); T('earMax', g('earMax') + ' dB');
  }
  function render() {
    if (!build()) return;
    var s = S();
    document.querySelectorAll('#view-well [data-i18n], #wSetCard [data-i18n], .tabs [data-i18n="tWell"]').forEach(function (el) { el.textContent = tt(el.dataset.i18n); });
    if ($('fsGo')) { $('fsGo').title = tt('fsBtn'); $('miniGo').title = tt('miniBtn'); }
    on('modOn', s.mod_on); selSeg('modSeg', s.mod_mode || 'focus'); val('modDepth', Math.round((s.mod_depth != null ? s.mod_depth : 0.5) * 100));
    on('brOn', s.breath_on); val('brRate', s.breath_bpm || 6); val('brDepth', Math.round((s.breath_depth != null ? s.breath_depth : 0.35) * 100)); on('brTone', s.breath_tone);
    on('beatOn', s.beat_on); selSeg('beatSeg', s.beat_hz != null ? s.beat_hz : 10); selSeg('beatMode', s.beat_mode || 'isochronic'); val('beatLvl', Math.round((s.beat_level != null ? s.beat_level : 0.5) * 100));
    selSeg('sesMode', s.beat_mode || 'isochronic');
    on('slOn', s.sleep_on); selSeg('slColor', s.sleep_color || 'pink'); val('slLvl', Math.round((s.sleep_level != null ? s.sleep_level : 0.3) * 100)); on('slPulses', s.sleep_pulses !== false); val('slDelay', s.sleep_delay || 30);
    on('spOn', s.space_on); val('spSpeed', s.space_period || 12); val('spDepth', Math.round((s.space_depth != null ? s.space_depth : 0.8) * 100));
    on('earOn', s.ear_on !== false); val('earMax', s.ear_max_db != null ? s.ear_max_db : -10); on('earTame', s.ear_tame !== false);
    on('llOn', s.low_latency); on('trayOn', !info || info.tray !== false);
    label(); renderSessions(); renderBowls(); renderRt(); live();
  }
  function renderSessions() {
    var g = $('sesGrid'); if (!g) return;
    var cur = S().session && S().session.id;
    g.innerHTML = sessions().map(function (x) {
      return '<button class="ses-card' + (x.id === cur ? ' on' : '') + '" data-id="' + x.id + '"><span class="pl-emoji">' + x.emoji + '</span><b>' + esc(x.name[L()] || x.name.en) + '</b><small>' + tt('sesMin', { m: Math.round(x.total / 60) }) +
        ' · ' + x.steps.map(function (st) { return st[2]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).map(function (v) { return nf(v, v % 1 ? 1 : 0); }).join('→') + ' Hz</small></button>';
    }).join('');
    g.querySelectorAll('.ses-card').forEach(function (b) { b.onclick = function () { startSession(b.dataset.id); }; });
  }
  var bwKind = 'bowl';
  function renderBowls() {
    selSeg('bwKind', bwKind);
    var g = $('bwGrid'); if (!g || g.dataset.k === bwKind) return; g.dataset.k = bwKind;
    g.innerHTML = SOLF().map(function (hz) { return '<button class="bw" data-hz="' + hz + '"><i></i><b>' + hz + '</b><small>Hz</small></button>'; }).join('');
    g.querySelectorAll('.bw').forEach(function (b) {
      b.onclick = function () { strike(Number(b.dataset.hz), bwKind); b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring'); };
    });
  }
  function renderRt() {
    var l = $('rtList'); if (!l || !routines) return;
    on('rtOn', routines.on);
    l.innerHTML = routines.items.map(function (it, i) {
      return '<div class="rt-row" data-i="' + i + '"><input type="time" value="' + esc(it.t) + '"><select>' + ACTIONS().map(function (a) { return '<option value="' + a[0] + '"' + (a[0] === it.a ? ' selected' : '') + '>' + tt(a[1]) + '</option>'; }).join('') + '</select><button class="link">✕</button></div>';
    }).join('');
    l.querySelectorAll('.rt-row').forEach(function (r) {
      var i = Number(r.dataset.i);
      r.querySelector('input').onchange = function (e) { routines.items[i].t = e.target.value; saveRt(); };
      r.querySelector('select').onchange = function (e) { routines.items[i].a = e.target.value; saveRt(); };
      r.querySelector('button').onclick = function () { routines.items.splice(i, 1); saveRt(); renderRt(); };
    });
  }
  function saveRt() { call('set_routines', routines); }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function live() {   // values that change with the engine status
    var st = ST(), w = W(), s = S();
    var ss = w.session || {}, run = st.running && ss.id;
    if ($('sesRun')) {
      $('sesRun').hidden = !run;
      if (run) {
        var x = ses(ss.id), last = x ? x.steps.length - 1 : 0;
        $('sesName').textContent = x ? x.emoji + ' ' + (x.name[L()] || x.name.en) : ss.id;
        $('sesPhase').textContent = ss.step === 0 ? tt('sesLead') : (x && ss.elapsed > x.total - 120 && ss.step === last) ? tt('sesOut') : tt('sesCourse');
        $('sesBeat').textContent = nf(ss.beat || 0, 1) + ' Hz · ' + band(ss.beat || 0);
        $('sesLeft').textContent = tt('sesLeft', { m: Math.ceil(Math.max(0, ss.total - ss.elapsed) / 60) }) + ' · ' + mmss(ss.elapsed) + ' / ' + mmss(ss.total);
        plot(x, ss.elapsed);
      }
    }
    if ($('slInfo')) {
      var t0 = s.sleep_t0, d = s.sleep_delay || 30;
      $('slInfo').textContent = !s.sleep_on || s.sleep_pulses === false ? '' : w.pulses ? tt('slNow') : t0 ? tt('slAt', { t: new Date((t0 + d * 60) * 1000).toLocaleTimeString(L(), { hour: '2-digit', minute: '2-digit' }) }) : '';
    }
    if ($('earInfo')) $('earInfo').textContent = st.running ? ((w.ear_red_db > 0.3 ? tt('earNow', { db: nf(w.ear_red_db, 1) }) : tt('earIdle')) + ' · ' + tt('earLoud', { m: Math.round(w.loud_min || 0) })) : '';
    if ($('latLine')) { var lp = st.lat_parts; $('latLine').textContent = st.running && lp ? tt('latLine', { ms: Math.round(st.latency_ms), l: Math.round(lp.lock), f: Math.round(lp.fft), b: Math.round(lp.buffer) }) : ''; }
    var sl = $('songLine');   // "song in 440 Hz -> you hear 432 Hz"
    if (sl) {
      var ok = st.running && !st.silent && st.in_conf > 0.5 && st.out_conf > 0.5;
      sl.hidden = !ok;
      if (ok) {
        var a = Math.round(st.in_a4 * 10) / 10, b = Math.round((st.out_conf_avg > 0.5 ? st.expected_a4 * Math.pow(2, (st.out_dev_avg || 0) / 1200) : st.out_a4) * 10) / 10;
        sl.textContent = Math.abs(a - b) < 0.6 ? tt('songSame', { in: nf(a, 1) }) : tt('songLine', { in: nf(a, 1), out: nf(b, 1) });
      }
    }
    if (w.done && w.done !== live.done) { live.done = w.done; if (typeof toast === 'function') toast(tt('sesDone')); refresh(); }
    if (st.rev != null) { if (lastRev != null && st.rev !== lastRev) refresh(); lastRev = st.rev; }
    miniRender();
  }
  function plot(x, el) {
    var c = $('sesPlot'); if (!c || !x) return;
    var g = c.getContext('2d'), Wd = c.width, Hd = c.height, ac = (typeof accent === 'function' ? accent() : '#f5b971');
    g.clearRect(0, 0, Wd, Hd);
    var y = function (b) { return Hd - 12 - (Math.log(b) / Math.log(45)) * (Hd - 24); };
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '11px Segoe UI';
    [2, 6, 10, 16, 40].forEach(function (b) { g.beginPath(); g.moveTo(0, y(b)); g.lineTo(Wd, y(b)); g.stroke(); g.fillText(b + ' Hz', 4, y(b) - 2); });
    g.strokeStyle = ac; g.lineWidth = 2.5; g.beginPath();
    var t = 0; g.moveTo(0, y(x.steps[0][1]));
    x.steps.forEach(function (st) { g.lineTo((t + st[0]) / x.total * Wd, y(st[2])); t += st[0]; });
    g.stroke();
    var px = Math.min(1, el / x.total) * Wd;
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, px, Hd);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(px, y(Math.max(1, (W().session || {}).beat || 10)), 5, 0, 7); g.fill();
  }
  // ---------------- breathing coach (orb) ----------------
  function breathV(now) {   // same curve as wellness.breath_shape: 40 % in, 60 % out
    var s = S(), p = (((now - (s.breath_t0 || 0)) * (s.breath_bpm || 6) / 60) % 1 + 1) % 1;
    var inh = p < 0.4, v = inh ? 0.5 - 0.5 * Math.cos(Math.PI * p / 0.4) : 0.5 + 0.5 * Math.cos(Math.PI * (p - 0.4) / 0.6);
    var per = 60 / (s.breath_bpm || 6), left = inh ? (0.4 - p) * per : (1 - p) * per;
    return { v: v, inh: inh, left: Math.ceil(left) };
  }
  function breathFrame() {
    var s = S(), orb = $('orb'), txt = $('breathTxt'), b = null;
    if (s.breath_on || resState) b = breathV(Date.now() / 1000);
    if (orb) orb.style.transform = b ? 'scale(' + (0.9 + 0.16 * b.v) + ')' : '';
    if (txt) { txt.hidden = !b; if (b) txt.textContent = (b.inh ? tt('brIn') : tt('brOut')) + ' · ' + b.left; }
    var ib = $('imBreath'); if (ib) { ib.hidden = !b; if (b) ib.textContent = (b.inh ? tt('brIn') : tt('brOut')) + ' · ' + b.left; }
    var mb = $('miniBreath'); if (mb) { mb.hidden = !b; if (b) mb.textContent = (b.inh ? '↑ ' : '↓ ') + b.left; }
    requestAnimationFrame(breathFrame);
  }

  // resonance test: 6.5 -> 4.5 breaths/min, 1 min each, subjective rating
  var resState = null;
  function resonanceTest() {
    var box = $('resBox'); if (!box) return;
    if (resState) { stopRes(); return; }
    var steps = [6.5, 6, 5.5, 5, 4.5];
    resState = { steps: steps, i: 0, scores: [], old: { breath_on: S().breath_on, breath_bpm: S().breath_bpm } };
    set({ breath_on: true, breath_bpm: steps[0], breath_t0: Date.now() / 1000 });
    resStep();
  }
  function resStep() {
    var r = resState, box = $('resBox'); if (!r) return;
    box.hidden = false;
    var bpm = r.steps[r.i], t0 = Date.now();
    box.innerHTML = '<b>' + tt('resStep', { i: r.i + 1, n: r.steps.length, bpm: nf(bpm, 1) }) + '</b><div class="pl-prog"><i id="resProg"></i></div><div id="resAsk"></div><button class="link" id="resX">' + tt('resCancel') + '</button>';
    $('resX').onclick = stopRes;
    clearInterval(r.iv);
    r.iv = setInterval(function () {
      var f = (Date.now() - t0) / 60000; if ($('resProg')) $('resProg').style.width = Math.min(100, f * 100) + '%';
      if (f >= 1) {
        clearInterval(r.iv);
        $('resAsk').innerHTML = '<small>' + tt('resRate') + '</small><div class="res-rate">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-n="' + n + '">' + n + '</button>'; }).join('') + '</div>';
        $('resAsk').querySelectorAll('button').forEach(function (b) {
          b.onclick = function () {
            r.scores.push(Number(b.dataset.n)); r.i++;
            if (r.i < r.steps.length) { set({ breath_bpm: r.steps[r.i], breath_t0: Date.now() / 1000 }); resStep(); }
            else {
              var best = 0; r.scores.forEach(function (x, i) { if (x > r.scores[best]) best = i; });
              var bb = r.steps[best]; resState = null;
              set({ breath_bpm: bb, breath_on: true }); box.innerHTML = '<b>' + tt('resDone', { bpm: nf(bb, 1) }) + '</b>';
            }
          };
        });
      }
    }, 500);
  }
  function stopRes() { var r = resState; if (!r) return; clearInterval(r.iv); resState = null; set({ breath_on: !!r.old.breath_on, breath_bpm: r.old.breath_bpm || 6 }); if ($('resBox')) $('resBox').hidden = true; }

  // ---------------- singing bowls ----------------
  var AC = null;
  async function strike(hz, kind) {
    var r = await call('strike', hz, kind, 0.6);
    if (r && r.ok) return;
    try {   // Aurelune off: play it here (goes straight to the speakers, so it stays exact)
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      var now = AC.currentTime, out = AC.createGain(); out.gain.value = 0.18; out.connect(AC.destination);
      var gong = kind === 'gong';
      var R = gong ? [1, 1.52, 2.03, 2.48, 2.96, 3.55, 4.13, 4.79] : [1, 2.71, 5.15, 8.17, 11.7];
      var D = gong ? [18, 15, 13, 11, 9.5, 8, 7, 6] : [9, 6, 3.5, 2.2, 1.4];
      var A = gong ? R.map(function (_, i) { return 1 / (1 + 0.35 * i); }) : [1, 0.55, 0.3, 0.16, 0.08];
      R.forEach(function (r, i) {
        [-1, 1].forEach(function (sgn) {
          var f = hz * r + sgn * (gong ? 0.15 + 0.12 * i : [0.3, 0.55, 0.9, 1.25, 1.5][i]);
          if (f > 16000) return;
          var o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f;
          g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(A[i] * 0.5, now + (gong ? 0.02 + 0.03 * i : 0.005));
          g.gain.exponentialRampToValueAtTime(0.0001, now + D[i] * 3);
          o.connect(g); g.connect(out); o.start(now); o.stop(now + D[i] * 3 + 0.1);
        });
      });
    } catch (e) {}
  }

  // ---------------- 40 Hz light flicker (with epilepsy warning) ----------------
  function refreshRate() {
    return new Promise(function (res) { var n = 0, t0 = 0; function f(t) { if (!t0) t0 = t; if (++n < 61) requestAnimationFrame(f); else res(Math.round(60000 / (t - t0))); } requestAnimationFrame(f); });
  }
  async function flickerDialog() {
    var hz = await refreshRate(), k = Math.max(1, Math.round(hz / 80)), f = hz / (2 * k);
    var d = document.createElement('div'); d.className = 'w-modal';
    d.innerHTML = '<div class="card"><p>' + esc(tt('flWarn')) + '</p><p class="muted">' + esc(tt('flRate', { hz: hz, f: nf(f, 1), x: Math.abs(f - 40) > 1 ? tt('flRateX') : '' })) + '</p>' +
      '<label class="w-ok"><input type="checkbox" id="flOk"> ' + esc(tt('flOk')) + '</label><div class="btn-row"><button class="btn ghost" id="flNo">' + esc(tt('resCancel')) + '</button><button class="btn" id="flGo" disabled>' + esc(tt('flGo')) + '</button></div></div>';
    document.body.appendChild(d);
    $('flOk').onchange = function () { $('flGo').disabled = !$('flOk').checked; };
    $('flNo').onclick = function () { d.remove(); };
    $('flGo').onclick = function () { d.remove(); flicker(k); if (!(W().session || {}).id) startSession('gamma'); };
  }
  function flicker(k) {
    var o = document.createElement('div'); o.className = 'w-flicker'; o.innerHTML = '<small>' + esc(tt('flStop')) + '</small>'; document.body.appendChild(o);
    var n = 0, stop = false, t0 = Date.now();
    function f() { if (stop) return; n++; o.classList.toggle('lit', Math.floor(n / k) % 2 === 0); if (Date.now() - t0 > 30 * 60000) end(); else requestAnimationFrame(f); }
    function end() { stop = true; o.remove(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') end(); }
    o.onclick = end; document.addEventListener('keydown', key); requestAnimationFrame(f);
  }

  // ---------------- 3D cymatics full screen (Chladni figures from particles) ----------------
  var IM = null;
  function chladniMode(hz) { var i = Math.max(0, Math.round(12 * Math.log2(Math.max(20, hz) / 27))); return { n: 2 + (i % 5), m: 3 + (i % 5) + (Math.floor(i / 5) % 3) + 1 }; }
  function immerse() {
    if (IM) return;
    var d = document.createElement('div'); d.className = 'w-immerse';
    d.innerHTML = '<canvas id="imC"></canvas><div class="im-hud"><b id="imHz"></b><small id="imCap"></small><div id="imBreath" class="im-breath" hidden></div></div><button id="imX" class="im-x">✕</button>';
    document.body.appendChild(d);
    var c = $('imC'), N = 7000, P = new Float32Array(N * 2);
    for (var i = 0; i < N * 2; i++) P[i] = Math.random() * 2 - 1;
    IM = { d: d, c: c, P: P, N: N, rot: 0, mode: { n: 3, m: 5 }, cur: { n: 3, m: 5 }, run: true };
    var close = function () { if (!IM) return; IM.run = false; d.remove(); IM = null; document.removeEventListener('keydown', key); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} };
    var key = function (e) { if (e.key === 'Escape') close(); };
    $('imX').onclick = close; document.addEventListener('keydown', key);
    try { d.requestFullscreen && d.requestFullscreen().catch(function () {}); } catch (e) {}
    requestAnimationFrame(imFrame);
  }
  function imHz() {
    var st = ST(), p = typeof presetFor === 'function' ? presetFor((typeof ui !== 'undefined' && ui.presetHz) || 432) : { hz: 432 };
    if (st.running && st.peak_out > 30 && !st.silent) return { hz: st.peak_out, live: true, preset: p.hz };
    return { hz: p.hz, live: false, preset: p.hz };
  }
  function imFrame() {
    if (!IM || !IM.run) return;
    var c = IM.c, W2 = c.clientWidth, H2 = c.clientHeight;
    if (c.width !== W2 || c.height !== H2) { c.width = W2; c.height = H2; }
    var g = c.getContext('2d'), info2 = imHz(), md = chladniMode(info2.hz), cur = IM.cur;
    cur.n += (md.n - cur.n) * 0.02; cur.m += (md.m - cur.m) * 0.02;
    var n = cur.n, m = cur.m, PI = Math.PI, P = IM.P, N = IM.N, st = ST();
    var energy = st.running ? Math.min(1, (st.level_out || 0) * 2.5) : 0.25;
    var br = S().breath_on ? breathV(Date.now() / 1000).v : 0.5;
    for (var i = 0; i < N; i++) {   // particles wander to the still lines (nodes) of the plate
      var x = P[2 * i], y = P[2 * i + 1];
      var f = Math.cos(n * PI * x) * Math.cos(m * PI * y) - Math.cos(m * PI * x) * Math.cos(n * PI * y);
      var fx = -n * PI * Math.sin(n * PI * x) * Math.cos(m * PI * y) + m * PI * Math.sin(m * PI * x) * Math.cos(n * PI * y);
      var fy = -m * PI * Math.cos(n * PI * x) * Math.sin(m * PI * y) + n * PI * Math.cos(m * PI * x) * Math.sin(n * PI * y);
      var k = 0.0016, j = Math.abs(f) * (0.012 + 0.03 * energy);
      x += -f * fx * k + (Math.random() - 0.5) * j; y += -f * fy * k + (Math.random() - 0.5) * j;
      if (x < -1 || x > 1 || y < -1 || y > 1) { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; }
      P[2 * i] = x; P[2 * i + 1] = y;
    }
    IM.rot += 0.0016;
    g.fillStyle = 'rgba(8,6,14,0.35)'; g.fillRect(0, 0, W2, H2);
    var ac = (typeof accent === 'function' ? accent() : '#f5b971'), cs = Math.cos(IM.rot), sn = Math.sin(IM.rot), tilt = 0.95, ct = Math.cos(tilt), stt = Math.sin(tilt);
    var R = Math.min(W2, H2) * (0.36 + 0.03 * br), cx = W2 / 2, cy = H2 / 2 + R * 0.12;
    g.fillStyle = ac;
    for (i = 0; i < N; i++) {
      x = P[2 * i]; y = P[2 * i + 1];
      f = Math.cos(n * PI * x) * Math.cos(m * PI * y) - Math.cos(m * PI * x) * Math.cos(n * PI * y);
      var X = x * cs - y * sn, Y = x * sn + y * cs, Z = f * 0.12 * (0.4 + energy);
      var yy = Y * ct - Z * stt, zz = Y * stt + Z * ct, s = 2.6 / (2.6 + zz);
      g.globalAlpha = 0.35 + 0.5 * (1 - Math.min(1, Math.abs(f)));
      g.fillRect(cx + X * R * s, cy + yy * R * s, 1.6 * s, 1.6 * s);
    }
    g.globalAlpha = 1;
    if ($('imHz')) { $('imHz').textContent = nf(info2.live ? info2.hz : info2.preset, info2.live ? 1 : 0) + ' Hz'; $('imCap').textContent = 'Chladni ' + Math.round(n) + ' · ' + Math.round(m); }
    requestAnimationFrame(imFrame);
  }

  // ---------------- mini player ----------------
  var isMini = false;
  function mini(onv) {
    isMini = !!onv; document.body.classList.toggle('mini', isMini);
    var bar = $('miniBar');
    if (isMini && !bar) {
      bar = document.createElement('div'); bar.id = 'miniBar';
      bar.innerHTML = '<button id="miniPow" class="mini-pow"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v8M6.3 6.3a8 8 0 1 0 11.4 0"/></svg></button><div class="mini-mid"><b id="miniHz"></b><small id="miniSong"></small><small id="miniSes"></small></div><span id="miniBreath" class="mini-breath" hidden></span>' +
        '<div class="mini-chips">' + [432, 528, 639, 963].map(function (h) { return '<button data-hz="' + h + '">' + h + '</button>'; }).join('') + '</div><button id="miniX" class="mini-x" title=""><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>';
      document.body.appendChild(bar);
      $('miniPow').onclick = function () { if (typeof togglePower === 'function') togglePower(); };
      $('miniX').onclick = function () { mini(false); };
      bar.querySelectorAll('.mini-chips button').forEach(function (b) { b.onclick = function () { if (typeof choose === 'function') choose(Number(b.dataset.hz)); }; });
    }
    if (bar) bar.hidden = !isMini;
    call('mini', isMini);
    miniRender();
  }
  function miniRender() {
    if (!isMini || !$('miniBar')) return;
    var st = ST(), w = W(), hz = (typeof ui !== 'undefined' && ui.presetHz) || 432;
    $('miniPow').classList.toggle('on', !!st.running);
    $('miniHz').textContent = (st.running && $('orbHz') ? $('orbHz').textContent : hz) + ' Hz';
    $('miniSong').textContent = $('songLine') && !$('songLine').hidden ? $('songLine').textContent : '';
    var ss = w.session || {}; $('miniSes').textContent = ss.id && ses(ss.id) ? ses(ss.id).emoji + ' ' + nf(ss.beat || 0, 1) + ' Hz · ' + Math.ceil(Math.max(0, ss.total - ss.elapsed) / 60) + ' min' : '';
    $('miniX').title = tt('miniBack');
    $('miniBar').querySelectorAll('.mini-chips button').forEach(function (b) { b.classList.toggle('sel', Number(b.dataset.hz) === Number(hz)); });
  }

  // ---------------- media keys for the playlists ----------------
  var silent = null;
  function mediaKeys() {
    var PL = window.AurelunePlaylists; if (!PL || !('mediaSession' in navigator)) return;
    var s = PL._state(), cat = PL.catalogue && PL.catalogue();
    if (s.playing && !silent) {   // a (silent) media element is needed so Windows routes the media keys to us
      var sr = 8000, n = sr, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = function (o, str) { for (var i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      silent = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))); silent.loop = true; silent.volume = 0.01;
      silent.play().catch(function () {});
      var ms = navigator.mediaSession;
      ms.setActionHandler('play', function () { if (!PL._state().playing) PL.toggle(); });
      ms.setActionHandler('pause', function () { if (PL._state().playing) PL.pause(); });
      ms.setActionHandler('nexttrack', function () { var c = PL._state().cur; PL.play(c.pl, c.ti + 1); });
      ms.setActionHandler('previoustrack', function () { var c = PL._state().cur; PL.play(c.pl, c.ti - 1); });
    }
    if (silent) {
      if (s.playing && silent.paused) silent.play().catch(function () {});
      if (!s.playing && !silent.paused) silent.pause();
      try {
        var p = cat && s.cur && cat.filter(function (x) { return x.id === s.cur.pl; })[0], tr = p && p.tracks[s.cur.ti];
        if (tr) navigator.mediaSession.metadata = new MediaMetadata({ title: tr.name[L()] || tr.name.en, artist: 'Aurelune · ' + nf(s.a4, 1) + ' Hz', album: p.name[L()] || p.name.en });
        navigator.mediaSession.playbackState = s.playing ? 'playing' : 'paused';
      } catch (e) {}
    }
  }

  // ---------------- hooks into the existing app ----------------
  async function loadInfo() {
    var r = await call('well_info');
    if (r && r.ok) { info = r; routines = r.routines || { on: false, items: [] }; render(); return true; }
    return false;
  }
  var oL = window.applyLang; if (typeof oL === 'function') window.applyLang = function () { var r = oL.apply(this, arguments); try { render(); } catch (e) {} return r; };
  var oV = window.showView; if (typeof oV === 'function') window.showView = function (v) { var r = oV.apply(this, arguments); try { render(); } catch (e) {} return r; };
  var oR = window.renderSettings; if (typeof oR === 'function') window.renderSettings = function () { var r = oR.apply(this, arguments); try { if ($('view-well')) render(); } catch (e) {} return r; };
  var oS = window.renderStatus; if (typeof oS === 'function') window.renderStatus = function () { var r = oS.apply(this, arguments); try { live(); } catch (e) {} return r; };
  window.AureluneWellness = { render: render, mini: mini, immerse: immerse, strike: strike, startSession: startSession, _info: function () { return info; } };
  var tries = 0, iv = setInterval(function () { tries++; try { build(); if (typeof api !== 'undefined' && api && !info) loadInfo(); else if (info) render(); } catch (e) {} if ((info && tries > 4) || tries > 60) clearInterval(iv); }, 500);
  setInterval(function () { try { mediaKeys(); } catch (e) {} }, 1000);
  requestAnimationFrame(breathFrame);
})();