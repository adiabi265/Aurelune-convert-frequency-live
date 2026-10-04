/* Aurelune 3.12 – Playlists: generative music (ambient piano, meditative, sleep, celestial, focus) that is
   synthesized live and therefore already tuned exactly to the chosen target frequency (A4 = settings.target_a4),
   plus selectable nature sounds per playlist (sea, forest, rain, stream, campfire, wind, night).
   Everything runs in Web Audio inside the app window - no audio files, no extra Python. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var L = function () { return (typeof lang !== 'undefined' && lang === 'de') ? 'de' : 'en'; };
  var nm = function (o) { return typeof o === 'string' ? o : (o[L()] || o.en); };
  try {
    Object.assign(I18N.en, {
      tPlay: 'Playlists', plTitle: '🎶 Playlists',
      plIntro: 'Every piece is created live by Aurelune - so it is not shifted afterwards but played directly in your target frequency. Change the frequency and the music follows within a second.',
      plTuned: '🎯 Tuned to {hz} Hz', plTunedA4: 'A4 = {a4} Hz', plChange: 'Change frequency',
      plTracks: '{n} pieces', plNature: '🌿 Nature sounds for this playlist', plNatureH: 'Pick one or several - they are saved per playlist.',
      plMusicVol: 'Music', plNatVol: 'Nature', plPlay: 'Play', plPause: 'Pause', plNext: 'Next', plPrev: 'Previous',
      plNow: 'Now playing', plIdle: 'Pick a piece or press play.',
      plNote: 'Plays even when Aurelune is off. When Aurelune is on, the playlist runs through it too - it is already on target, so nothing gets shifted. Your brainwave layers and the sleep timer work on top.',
      plSleepDone: 'Sleep timer: playlist faded out',
      n_sea: '🌊 Ocean', n_forest: '🌲 Forest', n_rain: '🌧️ Rain', n_stream: '💧 Stream', n_fire: '🔥 Campfire', n_wind: '🍃 Wind', n_night: '🦗 Night',
    });
    Object.assign(I18N.de, {
      tPlay: 'Playlists', plTitle: '🎶 Playlists',
      plIntro: 'Jedes Stück wird von Aurelune live erzeugt - es wird also nicht nachträglich verschoben, sondern direkt in deiner Zielfrequenz gespielt. Änderst du die Frequenz, folgt die Musik innerhalb einer Sekunde.',
      plTuned: '🎯 Gestimmt auf {hz} Hz', plTunedA4: 'A4 = {a4} Hz', plChange: 'Frequenz ändern',
      plTracks: '{n} Stücke', plNature: '🌿 Naturklänge für diese Playlist', plNatureH: 'Eins oder mehrere wählen - wird pro Playlist gespeichert.',
      plMusicVol: 'Musik', plNatVol: 'Natur', plPlay: 'Abspielen', plPause: 'Pause', plNext: 'Weiter', plPrev: 'Zurück',
      plNow: 'Läuft gerade', plIdle: 'Wähle ein Stück oder drück auf Play.',
      plNote: 'Läuft auch, wenn Aurelune aus ist. Ist Aurelune an, läuft die Playlist auch hindurch - sie ist schon auf der Zielfrequenz, also wird nichts verschoben. Gehirnwellen-Schichten und Sleep-Timer funktionieren zusätzlich.',
      plSleepDone: 'Sleep-Timer: Playlist ausgeblendet',
      n_sea: '🌊 Meeresrauschen', n_forest: '🌲 Wald', n_rain: '🌧️ Regen', n_stream: '💧 Bach', n_fire: '🔥 Lagerfeuer', n_wind: '🍃 Wind', n_night: '🦗 Nacht',
    });
  } catch (e) {}

  // ---------------- catalogue ----------------
  var MODES = { ion: [0, 2, 4, 5, 7, 9, 11], aeo: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], lyd: [0, 2, 4, 6, 7, 9, 11], mix: [0, 2, 4, 5, 7, 9, 10] };
  var NATURE = ['sea', 'forest', 'rain', 'stream', 'fire', 'wind', 'night'];
  function catalogue() {   // function, not a top-level const (see HANDOUT: TDZ trap)
    var T = function (de, en, style, key, mode, bpm, prog) { return { name: { de: de, en: en }, style: style, key: key, mode: mode, bpm: bpm, prog: prog }; };
    return [
      { id: 'ambient', emoji: '🎹', name: { de: 'Ambient Piano', en: 'Ambient Piano' }, nat: ['rain'],
        desc: { de: 'Sanftes Klavier mit warmem Klangteppich', en: 'Soft piano over a warm pad' },
        tracks: [T('Morgenlicht', 'Morning Light', 'piano', 60, 'ion', 66, [0, 4, 5, 3]), T('Stille Wasser', 'Still Waters', 'piano', 57, 'aeo', 58, [0, 5, 2, 6]),
          T('Nebelwald', 'Misty Forest', 'piano', 62, 'dor', 60, [0, 3, 6, 4]), T('Sternenstaub', 'Stardust', 'piano', 65, 'lyd', 54, [0, 1, 0, 4]),
          T('Heimweg', 'Way Home', 'piano', 67, 'ion', 70, [3, 4, 0, 5])] },
      { id: 'meditate', emoji: '🧘', name: { de: 'Meditativ', en: 'Meditative' }, nat: ['forest'],
        desc: { de: 'Klangschalen, Atem-Flächen und Tanpura', en: 'Singing bowls, breathing pads and tanpura' },
        tracks: [T('Klangschalen', 'Singing Bowls', 'bowls', 57, 'aeo', 60, [0]), T('Innerer Atem', 'Inner Breath', 'breath', 62, 'dor', 60, [0, 3, 4, 0]),
          T('Tanpura-Raum', 'Tanpura Space', 'tanpura', 60, 'ion', 60, [0]), T('Om-Stille', 'Om Silence', 'om', 55, 'mix', 60, [0]),
          T('Lotus', 'Lotus', 'breath', 65, 'lyd', 60, [0, 4, 1, 0])] },
      { id: 'sleep', emoji: '🌙', name: { de: 'Tiefschlaf', en: 'Deep Sleep' }, nat: ['sea'],
        desc: { de: 'Sehr langsam, tief und leise zum Einschlafen', en: 'Very slow, deep and quiet for falling asleep' },
        tracks: [T('Mondsee', 'Moon Lake', 'sleep', 57, 'aeo', 44, [0, 5, 3, 4]), T('Wolkenbett', 'Cloud Bed', 'sleep', 60, 'ion', 40, [0, 3, 5, 4]),
          T('Nachthimmel', 'Night Sky', 'sleep', 62, 'dor', 42, [0, 6, 3, 0]), T('Traumpfad', 'Dream Path', 'sleep', 53, 'ion', 38, [0, 5, 3, 4])] },
      { id: 'celestial', emoji: '✨', name: { de: 'Himmlische Klänge', en: 'Celestial' }, nat: ['wind'],
        desc: { de: 'Schwebende Flächen und Glockenfunkeln', en: 'Floating pads and sparkling bells' },
        tracks: [T('Kristallgarten', 'Crystal Garden', 'celestial', 64, 'lyd', 60, [0, 1, 4, 0]), T('Aurora', 'Aurora', 'celestial', 65, 'lyd', 60, [0, 4, 5, 1]),
          T('Lichtfelder', 'Fields of Light', 'celestial', 60, 'ion', 60, [0, 3, 5, 4])] },
      { id: 'focus', emoji: '🎧', name: { de: 'Fokus Flow', en: 'Focus Flow' }, nat: ['stream'],
        desc: { de: 'Ruhige Arpeggios zum Arbeiten und Lernen', en: 'Calm arpeggios for work and study' },
        tracks: [T('Deep Work', 'Deep Work', 'focus', 57, 'aeo', 76, [0, 5, 2, 6]), T('Klarer Kopf', 'Clear Mind', 'focus', 60, 'ion', 80, [0, 4, 5, 3]),
          T('Flow-Zustand', 'Flow State', 'focus', 62, 'dor', 72, [0, 6, 3, 4]), T('Lernzeit', 'Study Time', 'focus', 55, 'mix', 74, [0, 6, 3, 0])] },
    ];
  }
  var TRACK_LEN = 420;   // seconds per piece, then the next one cross-fades in

  // ---------------- prefs (saved in settings.json via ui.pl) ----------------
  var prefs = null, saveH = 0, prefsReal = false;
  function P() {
    var ready = typeof state !== 'undefined' && !!state;
    if (!prefs || (!prefsReal && ready)) {
      prefsReal = ready;
      var u = (typeof ui !== 'undefined' && ui && ui.pl) || {};
      prefs = { pl: u.pl || 'ambient', mv: u.mv != null ? u.mv : 0.8, nv: u.nv != null ? u.nv : 0.5, nat: u.nat || {} };
    }
    return prefs;
  }
  function save() {
    clearTimeout(saveH);
    saveH = setTimeout(function () { try { if (typeof ui !== 'undefined') ui.pl = prefs; if (typeof call === 'function') call('set_settings', {}, { pl: prefs }); } catch (e) {} }, 600);
  }
  function natFor(id) { var p = P(), c = cat(id); return p.nat[id] || (c ? c.nat.slice() : []); }
  function cat(id) { return catalogue().filter(function (c) { return c.id === id; })[0]; }

  // ---------------- tuning ----------------
  function a4() { var v = typeof settings !== 'undefined' ? Number(settings.target_a4) : 432; return v > 300 && v < 600 ? v : 432; }
  function hzLabel() { var h = (typeof ui !== 'undefined' && ui && Number(ui.presetHz)) || a4(); return h; }

  // ---------------- audio core ----------------
  var A = null, LOOK = 1.6, voices = [], lastA4 = 0;
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function noiseBuf(kind, sec) {
    var c = A.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch), b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (var i = 0; i < n; i++) {
        var w = Math.random() * 2 - 1;
        if (kind === 'white') d[i] = w * 0.5;
        else if (kind === 'pink') { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
        else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      }
      // short crossfade so the loop point is seamless
      var f = Math.floor(c.sampleRate * 0.05);
      for (var j = 0; j < f; j++) { var k = j / f; d[n - f + j] = d[n - f + j] * (1 - k) + d[j] * k; }
    }
    return b;
  }
  function init() {
    if (A) return A;
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    var ctx = new C({ latencyHint: 'playback' });
    A = { ctx: ctx };
    A.master = ctx.createGain(); A.master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
    A.master.connect(comp); comp.connect(ctx.destination);
    A.music = ctx.createGain(); A.music.gain.value = P().mv; A.music.connect(A.master);
    A.natureG = ctx.createGain(); A.natureG.gain.value = P().nv; A.natureG.connect(A.master);
    // reverb (generated impulse, 3.8 s)
    A.rev = ctx.createConvolver();
    var len = Math.floor(ctx.sampleRate * 3.8), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 200 ? i / 200 : 1); }
    A.rev.buffer = ir;
    var rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 5200;
    A.revOut = ctx.createGain(); A.revOut.gain.value = 0.55;
    A.rev.connect(rl); rl.connect(A.revOut); A.revOut.connect(A.music);
    A.buf = { white: noiseBuf('white', 6), pink: noiseBuf('pink', 7), brown: noiseBuf('brown', 8) };
    A.nat = {};
    return A;
  }
  // ---- one oscillator voice whose frequency is (target A4) x ratio, so it retunes live ----
  function osc(type, ratio, t, end, dest) {
    var o = A.ctx.createOscillator(); o.type = type; o.frequency.value = a4() * ratio;
    o.connect(dest); o.start(t); o.stop(end);
    var v = { o: o, r: ratio, end: end }; voices.push(v);
    o.onended = function () { try { o.disconnect(); } catch (e) {} };
    return o;
  }
  function ratioOf(m) { return Math.pow(2, (m - 69) / 12); }
  function busOut(tr, send) {   // per-note gain -> track bus (+ reverb send)
    var g = A.ctx.createGain(); g.gain.value = 0; g.connect(tr.dry);
    if (send) { var s = A.ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(tr.send); }
    return g;
  }
  function pan(tr, p) { var sp = A.ctx.createStereoPanner(); sp.pan.value = Math.max(-0.8, Math.min(0.8, p)); sp.connect(tr.dry); return sp; }

  // ---------------- instruments ----------------
  function piano(tr, m, t, vel, dur) {
    if (voices.length > 260) return;
    var f = a4() * ratioOf(m), tau = 1.9 * Math.pow(262 / f, 0.45), end = t + dur + 1.6;
    var g = busOut(tr, 0.5), pn = pan(tr, (m - 64) / 30); g.disconnect(); g.connect(pn); var s = A.ctx.createGain(); s.gain.value = 0.5; g.connect(s); s.connect(tr.send);
    for (var k = 1; k <= 6; k++) {
      if (f * k > 9000) break;
      var pg = A.ctx.createGain(), amp = vel * 0.16 / Math.pow(k, 1.35) * (k === 2 ? 1.25 : 1);
      pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(amp, t + 0.006);
      pg.gain.setTargetAtTime(0, t + 0.006, tau / Math.pow(k, 0.7));
      pg.gain.setTargetAtTime(0, t + dur, 0.22);
      pg.connect(g); osc('sine', ratioOf(m) * k * Math.sqrt(1 + 0.00008 * k * k), t, end, pg);
    }
    g.gain.value = 1;
  }
  function pad(tr, ms, t, dur, vol, att, rel) {
    var g = busOut(tr, 0.7), lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.3;
    lp.connect(g); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.setValueAtTime(vol, t + Math.max(att, dur)); g.gain.linearRampToValueAtTime(0, t + Math.max(att, dur) + rel);
    var end = t + Math.max(att, dur) + rel + 0.1;
    ms.forEach(function (m) { osc('triangle', ratioOf(m), t, end, lp); var h = A.ctx.createGain(); h.gain.value = 0.35; h.connect(lp); osc('sine', ratioOf(m + 12), t, end, h); });
  }
  function bowl(tr, m, t, vel) {
    var g = busOut(tr, 0.6), pn = pan(tr, (Math.random() - 0.5) * 0.8); g.disconnect(); g.connect(pn); var s = A.ctx.createGain(); s.gain.value = 0.6; g.connect(s); s.connect(tr.send);
    g.gain.value = 1; var end = t + 16;
    // fundamental as a slowly beating pair (±1.5 cent around the exact note - average stays on target)
    [[1, 1.0, 9], [Math.pow(2, -1.5 / 1200), 0.6, 9], [Math.pow(2, 1.5 / 1200), 0.6, 9], [2, 0.32, 4], [3, 0.14, 2.2], [4, 0.06, 1.2]].forEach(function (p) {
      var pg = A.ctx.createGain(); pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(vel * 0.11 * p[1], t + 0.015); pg.gain.setTargetAtTime(0, t + 0.015, p[2]);
      pg.connect(g); osc('sine', ratioOf(m) * p[0], t, end, pg);
    });
  }
  function bell(tr, m, t, vel) {
    var g = busOut(tr, 0.8), pn = pan(tr, (Math.random() - 0.5) * 1.2); g.disconnect(); g.connect(pn); var s = A.ctx.createGain(); s.gain.value = 0.8; g.connect(s); s.connect(tr.send);
    g.gain.value = 1;
    [[1, 1, 2.2], [2, 0.3, 1.1], [3, 0.12, 0.6], [4, 0.05, 0.35]].forEach(function (p) {
      var pg = A.ctx.createGain(); pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(vel * 0.07 * p[1], t + 0.004); pg.gain.setTargetAtTime(0, t + 0.004, p[2]);
      pg.connect(g); osc('sine', ratioOf(m) * p[0], t, t + 9, pg);
    });
  }
  function pluck(tr, m, t, vel) {   // tanpura: harmonic-rich, long, slightly buzzing
    var g = busOut(tr, 0.45); g.gain.value = 1;
    for (var k = 1; k <= 9; k++) {
      var pg = A.ctx.createGain(), a = vel * 0.07 / k * (k % 2 ? 1 : 0.8) * (k > 3 ? 1.3 : 1);
      pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(a, t + 0.02 + k * 0.01); pg.gain.setTargetAtTime(0, t + 0.05, 2.6 / Math.pow(k, 0.35));
      pg.connect(g); osc('sine', ratioOf(m) * k, t, t + 9, pg);
    }
  }
  function thump(tr, m, t, vel) {
    var g = busOut(tr, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.2, t + 0.01); g.gain.setTargetAtTime(0, t + 0.01, 0.16);
    osc('sine', ratioOf(m), t, t + 1.2, g);
  }

  // ---------------- composers (one call = one bar / cycle) ----------------
  function tone(tr, deg, oct) { var md = MODES[tr.spec.mode], d = ((deg % 7) + 7) % 7; return tr.spec.key + 12 * (oct + Math.floor(deg / 7)) + md[d]; }
  function composer(tr) {
    var sp = tr.spec, R = tr.rnd, beat = 60 / sp.bpm;
    var bar = function () { return sp.prog[tr.bar % sp.prog.length]; };
    var S = {
      piano: function (t, slow) {
        var d = bar(), b = 4 * beat, dens = slow ? 0.13 : 0.3;
        pad(tr, [tone(tr, d, -1), tone(tr, d + 2, -1), tone(tr, d + 4, -1)], t, b, slow ? 0.07 : 0.05, b * 0.35, b * 0.5);
        piano(tr, tone(tr, d, slow ? -2 : -1), t, 0.55, b * 0.95);
        if (R() < 0.75) piano(tr, tone(tr, d + 4, -1), t + 2 * beat, 0.38, b * 0.5);
        for (var i = 0; i < 8; i++) {
          if (R() > dens * (i % 2 ? 0.7 : 1.2)) continue;
          tr.mel = Math.max(-1, Math.min(9, tr.mel + Math.floor(R() * 5) - 2));
          var dg = R() < 0.55 ? d + [0, 2, 4, 7][Math.floor(R() * 4)] : d + tr.mel;
          piano(tr, tone(tr, dg, slow ? 0 : 0) + (dg - d > 6 ? -12 : 0), t + i * beat / 2 + R() * 0.03, 0.26 + R() * 0.24, beat * 1.6);
        }
        return b;
      },
      sleep: function (t) { return S.piano(t, true); },
      focus: function (t) {
        var d = bar(), b = 4 * beat, pat = [0, 2, 4, 7, 9, 7, 4, 2];
        pad(tr, [tone(tr, d, -1), tone(tr, d + 4, -1)], t, b, 0.04, 0.6, 0.9);
        for (var i = 0; i < 8; i++) piano(tr, tone(tr, d + pat[i], 0), t + i * beat / 2, (i === 0 ? 0.34 : 0.22) + R() * 0.06, beat * 0.9);
        for (var j = 0; j < 4; j++) thump(tr, tone(tr, d, -2), t + j * beat, j === 0 ? 0.5 : 0.3);
        if (R() < 0.3) piano(tr, tone(tr, d + [4, 7, 9][Math.floor(R() * 3)], 1), t + 3 * beat, 0.25, beat * 2);
        return b;
      },
      bowls: function (t, deep) {
        var dt = (deep ? 9 : 6) + R() * 5;
        if (t >= tr.drone) { pad(tr, deep ? [tone(tr, 0, -3), tone(tr, 0, -2), tone(tr, 4, -2)] : [tone(tr, 0, -2), tone(tr, 4, -2)], t, 16, deep ? 0.1 : 0.06, 5, 7); tr.drone = t + 18; }
        var pent = [0, 1, 2, 4, 5];
        bowl(tr, tone(tr, pent[Math.floor(R() * 5)], deep ? -2 : (R() < 0.5 ? -1 : 0)), t + 0.2, 0.55 + R() * 0.35);
        if (!deep && R() < 0.25) bell(tr, tone(tr, pent[Math.floor(R() * 5)], 1), t + dt * 0.5, 0.3);
        return dt;
      },
      om: function (t) { return S.bowls(t, true); },
      breath: function (t) {   // inhale 4 s, exhale 6 s
        var d = bar();
        if (t >= tr.drone) { pad(tr, [tone(tr, 0, -2)], t, 20, 0.07, 4, 6); tr.drone = t + 20; }
        pad(tr, [tone(tr, d, -1), tone(tr, d + 2, -1), tone(tr, d + 4, -1), tone(tr, d + 2, 0)], t, 4, 0.075, 4, 6);
        if (R() < 0.45) bell(tr, tone(tr, d + [0, 2, 4][Math.floor(R() * 3)], 1), t + 4, 0.28);
        return 10;
      },
      tanpura: function (t) {
        var c = [tone(tr, 4, -1), tone(tr, 0, 0), tone(tr, 0, 0), tone(tr, 0, -1)];
        c.forEach(function (m, i) { pluck(tr, m, t + i * 1.2 + R() * 0.03, i === 3 ? 0.7 : 0.55); });
        if (tr.bar % 3 === 2) bowl(tr, tone(tr, [0, 2, 4][Math.floor(R() * 3)], 0), t + 2.4, 0.4);
        if (R() < 0.2) bell(tr, tone(tr, [0, 4, 7][Math.floor(R() * 3)], 1), t + 3.6, 0.22);
        return 4.8;
      },
      celestial: function (t) {
        var d = bar(), b = 8;
        pad(tr, [tone(tr, d, -1), tone(tr, d + 2, -1), tone(tr, d + 4, -1), tone(tr, d + 4, 0)], t, b, 0.06, 3, 5);
        var n = 3 + Math.floor(R() * 4), pent = [0, 1, 2, 4, 5];
        for (var i = 0; i < n; i++) bell(tr, tone(tr, d + pent[Math.floor(R() * 5)], 1 + (R() < 0.35 ? 1 : 0)), t + R() * b, 0.18 + R() * 0.2);
        if (tr.bar % 4 === 0) bowl(tr, tone(tr, d, -1), t + 0.5, 0.35);
        return b;
      },
    };
    return function (t) { var r = (S[sp.style] || S.piano)(t); tr.bar++; return r; };
  }

  // ---------------- nature generators ----------------
  function loop(kind, dest, rate) { var s = A.ctx.createBufferSource(); s.buffer = A.buf[kind]; s.loop = true; s.playbackRate.value = rate || 1; s.loopStart = Math.random() * 2; s.connect(dest); s.start(A.ctx.currentTime, Math.random() * 3); return s; }
  function filt(type, f, q, dest) { var b = A.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; b.connect(dest); return b; }
  function gainN(v, dest) { var g = A.ctx.createGain(); g.gain.value = v; g.connect(dest); return g; }
  function burst(dest, t, len, gain, f, q, type) {
    var s = A.ctx.createBufferSource(); s.buffer = A.buf.white; var g = A.ctx.createGain();
    var b = A.ctx.createBiquadFilter(); b.type = type || 'bandpass'; b.frequency.value = f; b.Q.value = q || 1;
    g.gain.setValueAtTime(gain, t); g.gain.setTargetAtTime(0, t, len / 3);
    s.connect(b); b.connect(g); g.connect(dest); s.start(t, Math.random() * 5); s.stop(t + len * 2 + 0.05);
    s.onended = function () { try { g.disconnect(); } catch (e) {} };
  }
  function chirp(dest, t, f0, f1, len, gain) {
    var o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + len * 0.2); g.gain.linearRampToValueAtTime(0, t + len);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + len + 0.02); o.onended = function () { try { g.disconnect(); } catch (e) {} };
  }
  var NAT = {
    sea: function (out) {
      var body = gainN(0.2, out), foam = gainN(0.05, out);
      loop('brown', filt('lowpass', 650, 0.5, body)); loop('white', filt('bandpass', 2400, 0.4, foam));
      return { next: 0, tick: function (t) {
        if (this.next > t + LOOK) return; var s = Math.max(t, this.next), p = 6.5 + Math.random() * 5, pk = 0.55 + Math.random() * 0.45;
        body.gain.setValueAtTime(body.gain.value, s); body.gain.linearRampToValueAtTime(pk, s + p * 0.42); body.gain.linearRampToValueAtTime(0.14, s + p);
        foam.gain.setValueAtTime(0.04, s + p * 0.3); foam.gain.linearRampToValueAtTime(pk * 0.32, s + p * 0.5); foam.gain.linearRampToValueAtTime(0.03, s + p);
        this.next = s + p;
      } };
    },
    rain: function (out) {
      loop('pink', filt('highpass', 450, 0.5, filt('lowpass', 7500, 0.5, gainN(0.55, out))));
      var drops = gainN(1, out);
      return { next: 0, tick: function (t) { while (this.next < t + LOOK) { var s = Math.max(t, this.next); burst(drops, s, 0.012 + Math.random() * 0.02, 0.05 + Math.random() * 0.18, 1500 + Math.random() * 4000, 2.5); this.next = s + 0.02 + Math.random() * 0.12; } } };
    },
    forest: function (out) {
      var leaves = gainN(0.25, out); loop('pink', filt('bandpass', 950, 0.6, leaves));
      var birds = gainN(1, out), bp = A.ctx.createStereoPanner(); bp.connect(birds);
      return { next: 0, wind: 0, tick: function (t) {
        if (this.wind < t + LOOK) { var w = Math.max(t, this.wind), d = 3 + Math.random() * 4; leaves.gain.linearRampToValueAtTime(0.12 + Math.random() * 0.35, w + d); this.wind = w + d; }
        while (this.next < t + LOOK) {
          var s = Math.max(t, this.next), sp = Math.floor(Math.random() * 4), g = 0.03 + Math.random() * 0.05, i;
          bp.pan.setValueAtTime(Math.random() * 1.6 - 0.8, s);
          if (sp === 0) for (i = 0; i < 3 + Math.floor(Math.random() * 4); i++) chirp(bp, s + i * 0.11, 4300, 2900, 0.07, g);
          else if (sp === 1) { chirp(bp, s, 2500, 2700, 0.22, g); chirp(bp, s + 0.3, 2100, 1900, 0.3, g); }
          else if (sp === 2) for (i = 0; i < 10; i++) chirp(bp, s + i * 0.035, 5200, 4800, 0.028, g * 0.7);
          else { chirp(bp, s, 1500, 1500 * 1.002, 0.35, g * 0.9); chirp(bp, s + 0.5, 1260, 1260, 0.45, g * 0.9); }   // cuckoo-like
          this.next = s + 1.4 + Math.random() * 5;
        }
      } };
    },
    stream: function (out) {
      loop('brown', filt('lowpass', 500, 0.5, gainN(0.3, out)));
      var fs = [0, 1, 2].map(function (i) { return filt('bandpass', 800 + i * 900, 3, gainN(0.35, out)); });
      fs.forEach(function (f, i) { loop('white', f, 1 - i * 0.05); });
      return { next: 0, tick: function (t) { while (this.next < t + LOOK) { var s = Math.max(t, this.next); fs.forEach(function (f, i) { f.frequency.setTargetAtTime(500 + i * 700 + Math.random() * 1400, s, 0.05); }); this.next = s + 0.09 + Math.random() * 0.1; } } };
    },
    fire: function (out) {
      loop('brown', filt('lowpass', 280, 0.7, gainN(0.5, out)));
      var cr = gainN(1, out);
      return { next: 0, tick: function (t) { while (this.next < t + LOOK) { var s = Math.max(t, this.next), big = Math.random() < 0.08; burst(cr, s, big ? 0.03 : 0.004 + Math.random() * 0.006, big ? 0.5 : 0.1 + Math.random() * 0.3, big ? 900 : 1800 + Math.random() * 3500, big ? 0.8 : 1.5); this.next = s + 0.03 + Math.random() * (Math.random() < 0.3 ? 0.6 : 0.15); } } };
    },
    wind: function (out) {
      var g = gainN(0.3, out), f = filt('bandpass', 600, 0.9, g); loop('pink', f);
      return { next: 0, tick: function (t) { if (this.next > t + LOOK) return; var s = Math.max(t, this.next), d = 4 + Math.random() * 5; f.frequency.linearRampToValueAtTime(280 + Math.random() * 900, s + d); g.gain.linearRampToValueAtTime(0.15 + Math.random() * 0.5, s + d); this.next = s + d; } };
    },
    night: function (out) {
      loop('brown', filt('lowpass', 400, 0.5, gainN(0.08, out)));
      var cg = gainN(1, out), cp = A.ctx.createStereoPanner(); cp.connect(cg);
      return { next: 0, tick: function (t) { while (this.next < t + LOOK) { var s = Math.max(t, this.next); cp.pan.setValueAtTime(Math.random() * 1.2 - 0.6, s); for (var i = 0; i < 3; i++) chirp(cp, s + i * 0.045, 4400, 4380, 0.03, 0.025); this.next = s + 0.55 + Math.random() * 0.25; } } };
    },
  };
  function natSync() {
    if (!A) return;
    var want = playing ? natFor(cur.pl) : [], t = A.ctx.currentTime;
    NATURE.forEach(function (k) {
      var on = want.indexOf(k) >= 0, n = A.nat[k];
      if (on && !n) {
        var g = A.ctx.createGain(); g.gain.value = 0; g.connect(A.natureG); g.gain.linearRampToValueAtTime(1, t + 2.5);
        A.nat[k] = n = { g: g, gen: NAT[k](g) };
      } else if (!on && n) {
        n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(n.g.gain.value, t); n.g.gain.linearRampToValueAtTime(0, t + 2);
        var old = n.g; setTimeout(function () { try { old.disconnect(); } catch (e) {} }, 2600); delete A.nat[k];
      }
    });
  }

  // ---------------- player ----------------
  var cur = { pl: null, ti: 0 }, playing = false, tracks = [], started = 0, timer = null;
  function newTrack(pl, ti) {
    var c = cat(pl), spec = c.tracks[ti % c.tracks.length];
    var tr = { spec: spec, rnd: rng(ti * 7919 + pl.length * 104729 + Math.floor(Math.random() * 1e6)), bar: 0, mel: 4, drone: 0 };
    tr.bus = A.ctx.createGain(); tr.bus.gain.value = 0; tr.bus.connect(A.music);
    tr.dry = A.ctx.createGain(); tr.dry.connect(tr.bus);
    tr.send = A.ctx.createGain(); tr.send.connect(A.rev);
    var t = A.ctx.currentTime + 0.15; tr.bus.gain.setValueAtTime(0, t); tr.bus.gain.linearRampToValueAtTime(1, t + 3);
    tr.next = t; tr.step = composer(tr); tr.alive = true;
    return tr;
  }
  function fadeTrack(tr, sec) {
    tr.alive = false; var t = A.ctx.currentTime;
    tr.bus.gain.cancelScheduledValues(t); tr.bus.gain.setValueAtTime(tr.bus.gain.value, t); tr.bus.gain.linearRampToValueAtTime(0, t + sec);
    tr.send.gain.setValueAtTime(1, t); tr.send.gain.linearRampToValueAtTime(0, t + sec);
    setTimeout(function () { try { tr.bus.disconnect(); tr.send.disconnect(); } catch (e) {} }, (sec + 9) * 1000);
  }
  function tick() {
    if (!A) return;
    var now = A.ctx.currentTime, f = a4();
    if (Math.abs(f - lastA4) > 1e-6) {   // target changed -> glide every sounding voice to the new tuning
      if (lastA4) voices.forEach(function (v) { if (v.end > now) v.o.frequency.setTargetAtTime(f * v.r, now, 0.25); });
      lastA4 = f; render();
    }
    voices = voices.filter(function (v) { return v.end > now; });
    tracks = tracks.filter(function (tr) { return tr.alive; });
    tracks.forEach(function (tr) { if (!tr.alive) return; var guard = 0; while (tr.next < now + LOOK && guard++ < 8) { if (tr.next < now) tr.next = now + 0.05; tr.next += tr.step(tr.next); } });
    Object.keys(A.nat).forEach(function (k) { try { A.nat[k].gen.tick(now); } catch (e) {} });
    if (playing && Date.now() - started > TRACK_LEN * 1000) go(cur.pl, cur.ti + 1);
    renderTime();
  }
  function clock() {
    if (timer) return;
    try {
      var w = new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},150)'], { type: 'text/javascript' })));
      w.onmessage = tick; timer = w;   // worker timers keep running when the window is hidden
    } catch (e) { timer = setInterval(tick, 150); }
  }
  function go(pl, ti) {
    if (!init()) return;
    A.ctx.resume();
    var c = cat(pl); ti = ((ti % c.tracks.length) + c.tracks.length) % c.tracks.length;
    tracks.forEach(function (tr) { if (tr.alive) fadeTrack(tr, 3.5); });
    cur = { pl: pl, ti: ti }; P().pl = pl; save();
    tracks.push(newTrack(pl, ti)); started = Date.now();
    if (!playing) { var t = A.ctx.currentTime; A.master.gain.cancelScheduledValues(t); A.master.gain.setValueAtTime(A.master.gain.value, t); A.master.gain.linearRampToValueAtTime(1, t + 1.5); }
    playing = true; clock(); natSync(); tick(); render();
  }
  function pause(sec) {
    if (!A || !playing) return;
    playing = false; var t = A.ctx.currentTime; sec = sec || 1.2;
    A.master.gain.cancelScheduledValues(t); A.master.gain.setValueAtTime(A.master.gain.value, t); A.master.gain.linearRampToValueAtTime(0, t + sec);
    tracks.forEach(function (tr) { if (tr.alive) fadeTrack(tr, sec); });
    setTimeout(function () { if (!playing) { natSync(); } }, sec * 1000 + 100);
    render();
  }
  function toggle() { if (playing) pause(); else go(cur.pl || P().pl, cur.ti); }

  // ---------------- UI ----------------
  var sel = null;
  function build() {
    if ($('view-play')) return true;
    var main = document.querySelector('main'), tabs = document.querySelector('.tabs'); if (!main || !tabs) return false;
    var b = document.createElement('button'); b.dataset.view = 'play';
    b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg><span data-i18n="tPlay">Playlists</span>';
    b.onclick = function () { showView('play'); };
    var setB = tabs.querySelector('[data-view="settings"]'); tabs.insertBefore(b, setB || null);
    if (!document.body.classList.contains('desk')) tabs.style.gridTemplateColumns = 'repeat(4,1fr)';
    var s = document.createElement('section'); s.className = 'view'; s.id = 'view-play';
    s.innerHTML = '<h2 data-i18n="plTitle">Playlists</h2><p class="muted-p" data-i18n="plIntro"></p>' +
      '<div class="card slim pl-tune"><div><b id="plTuned"></b><small id="plTunedA4"></small></div><button id="plChange" class="btn ghost" data-i18n="plChange">Change</button></div>' +
      '<div id="plGrid" class="pl-grid"></div>' +
      '<div class="card pl-detail" id="plDetail"><div class="pl-head"><span id="plEmoji" class="pl-emoji"></span><div><b id="plName"></b><small id="plDesc"></small></div></div>' +
      '<div class="pl-player"><button id="plPrev" class="pl-ctl">⏮</button><button id="plPlay" class="pl-ctl big">▶</button><button id="plNext" class="pl-ctl">⏭</button>' +
      '<div class="pl-now"><small id="plNowCap"></small><b id="plNowName"></b><div class="pl-prog"><i id="plProg"></i></div></div><span id="plTime" class="pl-time"></span></div>' +
      '<ol id="plList" class="pl-list"></ol>' +
      '<div class="pl-nat"><b data-i18n="plNature"></b><small data-i18n="plNatureH"></small><div id="plNatChips" class="pl-chips"></div></div>' +
      '<div class="bin-slider"><label data-i18n="plMusicVol">Music</label><input type="range" id="plMv" min="0" max="100" step="1"><span id="plMvV"></span></div>' +
      '<div class="bin-slider"><label data-i18n="plNatVol">Nature</label><input type="range" id="plNv" min="0" max="100" step="1"><span id="plNvV"></span></div>' +
      '<p class="bin-note" data-i18n="plNote"></p></div>';
    main.appendChild(s);
    var mini = document.createElement('button'); mini.id = 'plMini'; mini.className = 'pl-mini'; mini.hidden = true;
    mini.onclick = function () { showView('play'); }; document.body.appendChild(mini);
    $('plChange').onclick = function () { showView('freq'); };
    $('plPlay').onclick = function () { if (cur.pl !== sel && sel) go(sel, 0); else toggle(); };
    $('plNext').onclick = function () { go(cur.pl || sel, (cur.pl === sel ? cur.ti : -1) + 1); };
    $('plPrev').onclick = function () { go(cur.pl || sel, (cur.pl === sel ? cur.ti : 1) - 1); };
    $('plMv').oninput = function (e) { P().mv = e.target.value / 100; if (A) A.music.gain.setTargetAtTime(P().mv, A.ctx.currentTime, 0.05); save(); render(); };
    $('plNv').oninput = function (e) { P().nv = e.target.value / 100; if (A) A.natureG.gain.setTargetAtTime(P().nv, A.ctx.currentTime, 0.05); save(); render(); };
    return true;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render() {
    if (!build()) return;
    var p = P(); if (!sel) sel = p.pl; var c = cat(sel) || catalogue()[0]; sel = c.id;
    document.querySelectorAll('#view-play [data-i18n], .tabs [data-i18n="tPlay"]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $('plTuned').textContent = t('plTuned', { hz: fmt(hzLabel(), hzLabel() % 1 ? 1 : 0) });
    $('plTunedA4').textContent = t('plTunedA4', { a4: fmt(a4(), 1) });
    $('plGrid').innerHTML = catalogue().map(function (x) {
      return '<button class="pl-card' + (x.id === sel ? ' sel' : '') + (playing && x.id === cur.pl ? ' on' : '') + '" data-id="' + x.id + '"><span class="pl-emoji">' + x.emoji + '</span><b>' + esc(nm(x.name)) + '</b><small>' + esc(nm(x.desc)) + '</small><i>' + t('plTracks', { n: x.tracks.length }) + '</i></button>';
    }).join('');
    $('plGrid').querySelectorAll('.pl-card').forEach(function (el) { el.onclick = function () { sel = el.dataset.id; render(); }; });
    $('plEmoji').textContent = c.emoji; $('plName').textContent = nm(c.name); $('plDesc').textContent = nm(c.desc);
    var mine = cur.pl === sel;
    $('plList').innerHTML = c.tracks.map(function (tr, i) { return '<li class="' + (mine && i === cur.ti ? (playing ? 'on' : 'cur') : '') + '" data-i="' + i + '"><span>' + esc(nm(tr.name)) + '</span><small>' + MODE_NAME(tr) + '</small></li>'; }).join('');
    $('plList').querySelectorAll('li').forEach(function (li) { li.onclick = function () { go(sel, Number(li.dataset.i)); }; });
    var nat = natFor(sel);
    $('plNatChips').innerHTML = NATURE.map(function (k) { return '<button class="' + (nat.indexOf(k) >= 0 ? 'sel' : '') + '" data-k="' + k + '">' + t('n_' + k) + '</button>'; }).join('');
    $('plNatChips').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { var l = natFor(sel).slice(), i = l.indexOf(b.dataset.k); if (i >= 0) l.splice(i, 1); else l.push(b.dataset.k); P().nat[sel] = l; save(); natSync(); render(); };
    });
    $('plMv').value = Math.round(p.mv * 100); $('plMvV').textContent = Math.round(p.mv * 100) + ' %';
    $('plNv').value = Math.round(p.nv * 100); $('plNvV').textContent = Math.round(p.nv * 100) + ' %';
    $('plPlay').textContent = playing && mine ? '⏸' : '▶'; $('plPlay').title = t(playing && mine ? 'plPause' : 'plPlay');
    $('plNext').title = t('plNext'); $('plPrev').title = t('plPrev');
    var pc = cur.pl ? cat(cur.pl) : null;
    $('plNowCap').textContent = pc ? t('plNow') + ' · ' + pc.emoji + ' ' + nm(pc.name) : '';
    $('plNowName').textContent = pc ? nm(pc.tracks[cur.ti].name) : t('plIdle');
    var mini = $('plMini'), inView = $('view-play').classList.contains('active');
    mini.hidden = !playing || inView; if (pc) mini.textContent = '🎶 ' + nm(pc.tracks[cur.ti].name) + ' · ' + fmt(a4(), 1) + ' Hz';
    renderTime();
  }
  function MODE_NAME(tr) { return (L() === 'de' ? { ion: 'Dur', aeo: 'Moll', dor: 'Dorisch', lyd: 'Lydisch', mix: 'Mixolydisch' } : { ion: 'major', aeo: 'minor', dor: 'dorian', lyd: 'lydian', mix: 'mixolydian' })[tr.mode] || ''; }
  function renderTime() {
    if (!$('plTime')) return;
    var s = playing ? Math.min(TRACK_LEN, Math.floor((Date.now() - started) / 1000)) : 0;
    $('plTime').textContent = playing ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' / ' + Math.floor(TRACK_LEN / 60) + ':' + String(TRACK_LEN % 60).padStart(2, '0') : '';
    $('plProg').style.width = (playing ? s / TRACK_LEN * 100 : 0) + '%';
  }

  // hooks into the existing app
  var oL = window.applyLang;
  if (typeof oL === 'function') window.applyLang = function () { var r = oL.apply(this, arguments); render(); return r; };
  var oV = window.showView;
  if (typeof oV === 'function') window.showView = function (v) { var r = oV.apply(this, arguments); render(); return r; };
  var oR = window.renderSettings;
  if (typeof oR === 'function') window.renderSettings = function () { var r = oR.apply(this, arguments); try { if ($('view-play')) { $('plTuned').textContent = t('plTuned', { hz: fmt(hzLabel(), hzLabel() % 1 ? 1 : 0) }); $('plTunedA4').textContent = t('plTunedA4', { a4: fmt(a4(), 1) }); } } catch (e) {} return r; };
  var oT = window.finishTimer;
  if (typeof oT === 'function') window.finishTimer = function () { if (playing) { pause(8); setTimeout(function () { toast(t('plSleepDone')); }, 3000); } return oT.apply(this, arguments); };
  window.AurelunePlaylists = { play: go, pause: pause, toggle: toggle, catalogue: catalogue, _state: function () { return { playing: playing, cur: cur, voices: voices.length, a4: a4(), ctx: A && A.ctx, A: A }; } };
  var n = 0, iv = setInterval(function () { try { render(); } catch (e) {} if (++n > 8) clearInterval(iv); }, 500);
})();
