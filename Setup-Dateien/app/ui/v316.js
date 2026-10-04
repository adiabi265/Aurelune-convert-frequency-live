/* Aurelune 3.16 – UI redesign (structure). Only MOVES existing elements into a clearer layout, adds page headers,
   sub-navigation for Wellness + Settings, compact Live view, collapsible details. All ids / events / API calls stay
   untouched; the logic lives in app.js and the v3xx files as before. Styling: v316.css. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var tt = function (k, v) { return typeof t === 'function' ? t(k, v) : k; };
  var ST = function () { return (typeof status !== 'undefined' && status) || {}; };
  var S = function () { return (typeof settings !== 'undefined' && settings) || {}; };
  var LG = function () { return (typeof lang !== 'undefined' && lang === 'de') ? 'de' : 'en'; };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function i18n(k) { return '<span data-i18n="' + k + '"></span>'; }
  function row(x) { return x ? (x.closest('.set-row') || x) : null; }
  try {
    Object.assign(I18N.en, {
      pLive: 'Live', pLiveSub: 'What happens to your sound right now.', stOn: 'Aurelune active', stOff: 'Aurelune off',
      powerOn: 'Start Aurelune', powerOff: 'Stop Aurelune', targetLbl: 'Target frequency', allFreq: 'All frequencies',
      proofTitle: 'Live measurement', fOrig: 'Input', fOut: 'Output', fDev: 'Deviation', details: 'Technical details',
      emptyOff: 'Aurelune is off - start it to measure.', emptySilent: 'No audio signal detected yet.', measActive: 'Measuring',
      binTitle: 'Brainwaves', binOnHint: 'Binaural beats layered under your sound', binAdjust: 'Adjust', binLayersN: '{n} layers', binPhones: 'Headphones recommended',
      chooseFreq: 'Frequencies', chooseFreqP: 'Pick the tuning your music is adjusted to.', activeHz: 'Active: {hz} Hz', fAll: 'All', fSolf: 'Solfeggio', fTune: 'Tunings',
      plIntroS: 'Music generated live - already in your target frequency.', plHow: 'How does it work?', plNatInfo: 'Mix several sounds.',
      wIntroS: 'Sessions, focus, sleep and protection - live on your own music.', wsSes: 'Sessions', wsFocus: 'Focus & breathing', wsSleep: 'Sleep & space', wsRoutine: 'Routines & protection',
      resHow: 'How the test works', earRec: 'Recommended',
      settings: 'Settings', ssAudio: 'Audio', ssProc: 'Processing', ssApp: 'App', ssDiag: 'Diagnostics',
      procT: 'Sound processing', appT: 'App', updT: 'Updates', viewT: 'Window', soundT: 'Sound', diagT: 'Diagnostics',
      dLat: 'Latency', dBuf: 'Buffer', dCpu: 'CPU', dSr: 'Sample rate', dFft: 'FFT', dDrop: 'Dropouts', dPrec: 'Precision', dPath: 'Signal path', dVer: 'Version', dState: 'State',
      diagCopy: 'Copy diagnostics', diagCopied: 'Diagnostics copied', diagOff: 'Start Aurelune to see live values.', dOn: 'on', dOff: 'off', running: 'running', stopped: 'stopped',
      langT: 'Language'
    });
    Object.assign(I18N.de, {
      pLive: 'Live', pLiveSub: 'Was gerade mit deinem Ton passiert.', stOn: 'Aurelune aktiv', stOff: 'Aurelune aus',
      powerOn: 'Aurelune starten', powerOff: 'Aurelune stoppen', targetLbl: 'Zielfrequenz', allFreq: 'Alle Frequenzen',
      proofTitle: 'Live-Messung', fOrig: 'Eingang', fOut: 'Ausgabe', fDev: 'Abweichung', details: 'Technische Details',
      emptyOff: 'Aurelune ist aus - starte es, um zu messen.', emptySilent: 'Noch kein Audiosignal erkannt.', measActive: 'Messung aktiv',
      binTitle: 'Gehirnwellen', binOnHint: 'Binaurale Beats unter deinem Sound', binAdjust: 'Anpassen', binLayersN: '{n} Schichten', binPhones: 'Kopfhörer empfohlen',
      chooseFreq: 'Frequenzen', chooseFreqP: 'Wähle die Stimmung, auf die deine Musik angepasst wird.', activeHz: 'Aktiv: {hz} Hz', fAll: 'Alle', fSolf: 'Solfeggio', fTune: 'Stimmungen',
      plIntroS: 'Live erzeugte Musik - schon in deiner Zielfrequenz.', plHow: 'Wie funktioniert das?', plNatInfo: 'Mehrere Klänge kombinierbar.',
      wIntroS: 'Sitzungen, Fokus, Schlaf und Schutz - live mit deiner eigenen Musik.', wsSes: 'Sitzungen', wsFocus: 'Fokus & Atmung', wsSleep: 'Schlaf & Raumklang', wsRoutine: 'Routinen & Schutz',
      resHow: 'So funktioniert der Test', earRec: 'Empfohlen',
      settings: 'Einstellungen', ssAudio: 'Audio', ssProc: 'Verarbeitung', ssApp: 'App', ssDiag: 'Diagnose',
      procT: 'Klangverarbeitung', appT: 'App', updT: 'Updates', viewT: 'Fenster', soundT: 'Ton', diagT: 'Diagnose',
      dLat: 'Latenz', dBuf: 'Puffer', dCpu: 'CPU', dSr: 'Samplerate', dFft: 'FFT', dDrop: 'Aussetzer', dPrec: 'Präzision', dPath: 'Signalweg', dVer: 'Version', dState: 'Zustand',
      diagCopy: 'Diagnose kopieren', diagCopied: 'Diagnose kopiert', diagOff: 'Starte Aurelune, um Live-Werte zu sehen.', dOn: 'an', dOff: 'aus', running: 'läuft', stopped: 'gestoppt',
      langT: 'Sprache'
    });
  } catch (e) {}

  function header(view, titleKey, subKey, right) {
    var v = $(view); if (!v || v.querySelector(':scope > .page-header')) return null;
    var h = el('div', 'page-header', '<div class="ph-text"><h2 data-i18n="' + titleKey + '"></h2>' + (subKey ? '<p data-i18n="' + subKey + '"></p>' : '') + '</div><div class="page-actions"></div>');
    v.querySelectorAll(':scope > h2, :scope > p.muted-p').forEach(function (x) { if (x.closest('.page-header')) return; x.hidden = true; x.classList.add('v316-old'); });
    v.insertBefore(h, v.firstChild);
    if (right) h.querySelector('.page-actions').appendChild(right);
    return h;
  }
  function subnav(id, items, store) {
    var nav = el('div', 'subnav'); nav.id = id; nav.setAttribute('role', 'tablist');
    nav.innerHTML = items.map(function (x) { return '<button role="tab" data-pane="' + x[0] + '" data-i18n="' + x[1] + '"></button>'; }).join('');
    function pick(p) {
      nav.querySelectorAll('button').forEach(function (b) { var on = b.dataset.pane === p; b.classList.toggle('sel', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      items.forEach(function (x) { var pane = $(x[0]); if (pane) pane.hidden = x[0] !== p; });
      try { localStorage.setItem(store, p); } catch (e) {}
      var m = document.querySelector('main'); if (m) m.scrollTop = 0;
    }
    nav.onclick = function (e) { var b = e.target.closest('button'); if (b) pick(b.dataset.pane); };
    nav.onkeydown = function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var bs = Array.prototype.slice.call(nav.querySelectorAll('button')), i = bs.indexOf(document.activeElement); if (i < 0) return;
      var n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; n.focus(); pick(n.dataset.pane); e.preventDefault();
    };
    nav._pick = pick;
    var saved = null; try { saved = localStorage.getItem(store); } catch (e) {}
    setTimeout(function () { pick(saved && $(saved) ? saved : items[0][0]); }, 0);
    return nav;
  }
  function pane(id, cls) { var p = el('div', 'pane ' + (cls || '')); p.id = id; p.setAttribute('role', 'tabpanel'); return p; }
  function card(titleKey, extraCls) { var c = el('div', 'card panel ' + (extraCls || ''), titleKey ? '<div class="section-header"><b data-i18n="' + titleKey + '"></b></div>' : ''); return c; }
  function disclosure(sumKey, nodes, id) {
    var d = el('details', 'disclosure'); if (id) d.id = id;
    d.appendChild(el('summary', '', i18n(sumKey)));
    nodes.forEach(function (n) { if (n) d.appendChild(n); });
    return d;
  }

  // ---------- shell: sidebar foot ----------
  function shell() {
    document.body.classList.add('v316');
    var foot = document.querySelector('.side-foot'); if (!foot || $('langSeg2')) return;
    var seg = el('div', 'segmented-control lang-seg', '<button data-v="de">DE</button><button data-v="en">EN</button>'); seg.id = 'langSeg2';
    seg.setAttribute('aria-label', 'Language / Sprache');
    seg.onclick = function (e) { var b = e.target.closest('button'); if (b && typeof setLang === 'function' && b.dataset.v !== lang) setLang(b.dataset.v); };
    foot.insertBefore(seg, foot.firstChild);
    if ($('langBtn')) $('langBtn').hidden = true;
    document.querySelectorAll('.tabs button').forEach(function (b) { var s = b.querySelector('span'); if (s) { b.setAttribute('aria-label', s.textContent); b.title = s.textContent; } });
  }

  // ---------- Live ----------
  function live() {
    var home = $('view-home'), colM = home && home.querySelector('.col-main'), colS = home && home.querySelector('.col-side');
    if (!colM || $('powerBtn')) return;
    var badge = el('span', 'status-badge', '<i></i><span id="liveStT"></span>'); badge.id = 'liveSt';
    header('view-home', 'pLive', 'pLiveSub', badge);
    var pb = el('button', 'btn btn-primary power-btn'); pb.id = 'powerBtn'; pb.onclick = function () { $('orb').click(); };
    var orbw = colM.querySelector('.orb-wrap');
    orbw.parentNode.insertBefore(pb, orbw.nextSibling);
    var cym = $('cymLine'); if (cym) orbw.parentNode.insertBefore(cym, pb.nextSibling);
    var tgt = el('div', 'target-box');
    var head = el('div', 'target-head', '<small data-i18n="targetLbl"></small>');
    var all = el('button', 'btn-ghost btn-link', i18n('allFreq') + ' ›'); all.id = 'allFreqBtn'; all.onclick = function () { showView('freq'); };
    head.appendChild(all);
    tgt.appendChild(head);
    ['freqPill', 'freqChips', 'quickCustom', 'freqDescLine'].forEach(function (id) { if ($(id)) tgt.appendChild($(id)); });
    colM.insertBefore(tgt, (cym || pb).nextSibling);
    // measurement card: empty state + collapsed details
    var proof = colS.querySelector('.card.proof');
    if (proof) {
      var em = el('div', 'empty-line'); em.id = 'measEmpty'; proof.querySelector('.facts').parentNode.insertBefore(em, proof.querySelector('.facts'));
      var ma = el('span', 'meas-dot', '<i></i>' + i18n('measActive')); ma.id = 'measDot';
      var ch = proof.querySelector('.card-head'); ch.insertBefore(ma, $('verdict'));
    }
    // brainwave card: compact summary, everything else behind "Adjust"
    var bc = $('binCard');
    if (bc && !$('binAdv')) {
      var sum = el('div', 'bin-sum', '<span id="binSumT"></span><span class="status-badge subtle" data-i18n="binPhones"></span>'); sum.id = 'binSum';
      bc.querySelector('.bin-head').after(sum);
      var parts = [$('binSeg'), bc.querySelector('.bin-count'), $('binDesc'), bc.querySelector('.bin-more')];
      var d = disclosure('binAdjust', parts, 'binAdv');
      sum.after(d);
    }
    // order of the side column: measurement, brainwaves, timer
    if (proof && bc) { colS.insertBefore(proof, bc); }
  }
  function liveTick() {
    var st = ST(), on = !!st.running;
    if ($('powerBtn')) { $('powerBtn').textContent = tt(on ? 'powerOff' : 'powerOn'); $('powerBtn').classList.toggle('is-on', on); }
    if ($('liveSt')) { $('liveSt').className = 'status-badge ' + (on ? 'ok' : 'idle'); $('liveStT').textContent = tt(on ? 'stOn' : 'stOff'); }
    var em = $('measEmpty'), facts = document.querySelector('.card.proof .facts');
    if (em && facts) {
      var empty = !on ? 'emptyOff' : (st.silent ? 'emptySilent' : null);
      em.hidden = !empty; facts.hidden = !!empty; if (empty) em.textContent = tt(empty);
      if ($('measDot')) $('measDot').hidden = !on || !!st.silent;
      if ($('verdict')) $('verdict').hidden = !!empty;
    }
    var s = S();
    if ($('binSumT')) {
      var names = { delta: 'binDelta', theta: 'binTheta', alpha: 'binAlpha', gateway: 'binGateway', septa: 'binSepta' };
      var nm = tt(names[s.bin_preset] || 'binGateway').replace(/^[^\wÄÖÜäöü]+/, '').split(' · ')[0];
      $('binSumT').textContent = nm + ' · ' + tt('binLayersN', { n: s.bin_count || 4 });
    }
    // quick chips: 432 / 528 / 963 / custom + whatever is selected
    var fc = $('freqChips');
    if (fc) fc.querySelectorAll('.fchip[data-hz]').forEach(function (c) { c.classList.toggle('quick', ['432', '528', '963'].indexOf(c.dataset.hz) >= 0); });
  }

  // ---------- Frequencies ----------
  function freq() {
    if ($('freqFilter') || !$('view-freq')) return;
    var act = el('span', 'status-badge gold'); act.id = 'freqActive';
    header('view-freq', 'chooseFreq', 'chooseFreqP', act);
    var f = el('div', 'segmented-control filter', '<button data-f="all" data-i18n="fAll"></button><button data-f="solf" data-i18n="fSolf"></button><button data-f="tune" data-i18n="fTune"></button>'); f.id = 'freqFilter';
    f.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; $('freqList').dataset.filter = b.dataset.f; f.querySelectorAll('button').forEach(function (x) { x.classList.toggle('sel', x === b); }); };
    $('freqList').parentNode.insertBefore(f, $('freqList')); f.querySelector('button').classList.add('sel'); $('freqList').dataset.filter = 'all';
  }
  function freqTick() {
    var a = $('freqActive'); if (!a) return;
    var hz = (typeof ui !== 'undefined' && ui && ui.presetHz) || 432;
    a.textContent = tt('activeHz', { hz: typeof fmt === 'function' ? fmt(hz, hz % 1 ? 1 : 0) : hz });
  }

  // ---------- Playlists ----------
  function play() {
    var v = $('view-play'); if (!v || $('plLayout')) return;
    var tune = v.querySelector('.pl-tune');
    header('view-play', 'plTitle', 'plIntroS', tune);
    var lay = el('div', 'pl-layout'); lay.id = 'plLayout';
    var left = el('div', 'pl-side'), right = el('div', 'pl-main');
    left.appendChild($('plGrid')); right.appendChild($('plDetail'));
    lay.appendChild(left); lay.appendChild(right); v.appendChild(lay);
    var ico = { plPrev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM20 5.5v13L9.5 12z" fill="currentColor"/></svg>', plNext: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5.5v13L14.5 12z" fill="currentColor"/></svg>' };
    Object.keys(ico).forEach(function (k) { var b = $(k); if (b) { b.innerHTML = ico[k]; b.setAttribute('aria-label', k === 'plPrev' ? 'Previous' : 'Next'); } });
    var nat = v.querySelector('.pl-nat small'); if (nat) { nat.hidden = true; var nb = v.querySelector('.pl-nat b'); if (nb) nb.title = nat.textContent; }
    var note = v.querySelector('#plDetail > .bin-note');
    if (note) $('plDetail').appendChild(disclosure('plHow', [note]));
    var vols = el('div', 'pl-vols'); v.querySelectorAll('#plDetail > .bin-slider').forEach(function (x) { vols.appendChild(x); });
    var natBox = v.querySelector('.pl-nat'); if (natBox) natBox.after(vols);
  }

  // ---------- Wellness ----------
  function well() {
    var v = $('view-well'), grid = v && v.querySelector('.w-grid'); if (!grid || $('wellNav')) return;
    header('view-well', 'tWell', 'wIntroS');
    var by = function (k) { var t2 = grid.querySelector('.card [data-i18n="' + k + '"]'); return t2 ? t2.closest('.card') : null; };
    var P = [['wpSes', 'wsSes'], ['wpFocus', 'wsFocus'], ['wpSleep', 'wsSleep'], ['wpRoutine', 'wsRoutine']];
    var nav = subnav('wellNav', P, 'aur.wellPane');
    v.querySelector('.page-header').after(nav);
    var C = { gam: by('gamT'), mod: by('modT'), br: by('brT'), beat: by('beatT'), sl: by('slT'), sp: by('spT'), rt: by('rtT'), ear: by('earT'), bw: by('bwT') };
    by = function (k) { return C[{ gamT: 'gam', modT: 'mod', brT: 'br', beatT: 'beat', slT: 'sl', spT: 'sp', rtT: 'rt', earT: 'ear', bwT: 'bw' }[k]]; };
    var p1 = pane('wpSes'), p2 = pane('wpFocus', 'two-col'), p3 = pane('wpSleep', 'two-col'), p4 = pane('wpRoutine', 'two-col');
    [$('wSes'), by('gamT')].forEach(function (c) { if (c) p1.appendChild(c); });
    [by('modT'), by('brT'), by('beatT')].forEach(function (c) { if (c) p2.appendChild(c); });
    [by('slT'), by('spT')].forEach(function (c) { if (c) p3.appendChild(c); });
    [by('rtT'), by('earT'), by('bwT')].forEach(function (c) { if (c) p4.appendChild(c); });
    if (by('beatT')) by('beatT').classList.add('span-2');
    var bw = p4.querySelector('#bwGrid'); if (bw) bw.closest('.card').classList.add('span-2');
    [p1, p2, p3, p4].forEach(function (p) { grid.parentNode.insertBefore(p, grid); });
    grid.hidden = true;
    var res = $('resBtn'); if (res) { res.classList.remove('wide'); var h = res.nextElementSibling; if (h && h.classList.contains('bin-desc')) res.after(disclosure('resHow', [h])); }
    var ear = by('earT'); if (ear && !ear.querySelector('.rec')) { var b = ear.querySelector('.bin-head b'); if (b) b.after(el('span', 'status-badge ok subtle rec', i18n('earRec'))); }
    var sn = $('wSes') && $('wSes').querySelector(':scope > .bin-note'); if (sn) sn.classList.add('tip');
  }

  // ---------- Settings ----------
  function sett() {
    var v = $('view-settings'); if (!v || $('setNav') || !$('wSetCard')) return;
    header('view-settings', 'settings', null);
    var P = [['spAudio', 'ssAudio'], ['spProc', 'ssProc'], ['spApp', 'ssApp'], ['spDiag', 'ssDiag']];
    var nav = subnav('setNav', P, 'aur.setPane');
    v.querySelector('.page-header').after(nav);
    var pa = pane('spAudio', 'two-col'), pp = pane('spProc', 'narrow'), pap = pane('spApp', 'two-col'), pd = pane('spDiag', 'narrow');
    var cards = Array.prototype.slice.call(v.querySelectorAll(':scope > .card'));
    var sys = $('checks') && $('checks').closest('.card'), dev = $('outDev') && $('outDev').closest('.card'), info = v.querySelector('.card.info');
    var procCard = $('auto') && $('auto').closest('.card'), langCard = $('langSeg') && $('langSeg').closest('.card'), wsc = $('wSetCard');
    // Audio: system check, devices, sound actions
    if (sys) { sys.classList.add('panel'); var rc = $('recheck'); if (rc) { rc.className = 'btn btn-secondary btn-sm'; } if ($('fixBtn')) $('fixBtn').classList.remove('wide'); pa.appendChild(sys); }
    if (dev) { dev.classList.add('panel'); if ($('applyDev')) $('applyDev').classList.remove('wide'); pa.appendChild(dev); }
    var sr = langCard && langCard.querySelector('.btn-row');
    if (sr) { var sc = card('soundT'); sr.classList.add('button-group'); sc.appendChild(sr); pa.appendChild(sc); }
    // Processing: auto tuning, fixed ref, profile, 432-lock, low latency
    var pc = card('procT');
    if (procCard) {
      [row($('auto')), $('manualRow'), row($('profileSeg') && $('profileSeg').previousElementSibling), $('profileSeg'), procCard.querySelector('.lock-row'), $('lockSeg')].forEach(function (x) { if (x) pc.appendChild(x); });
    }
    var ll = row($('llOn')); if (ll) pc.appendChild(ll);
    pp.appendChild(pc);
    // App: language, autostart, updates, tray, mini player / full screen
    var ac = card('appT');
    [row($('langSeg')), row($('autostart')), row($('trayOn'))].forEach(function (x) { if (x) ac.appendChild(x); });
    pap.appendChild(ac);
    var uc = card('updT');
    [row($('autoUpd')), procCard && procCard.querySelector('.upd-row')].forEach(function (x) { if (x) uc.appendChild(x); });
    if ($('updCheck')) $('updCheck').classList.add('btn', 'btn-secondary');
    pap.appendChild(uc);
    var wc = card('viewT'); var br = wsc && wsc.querySelector('.btn-row'); if (br) { br.classList.add('button-group'); wc.appendChild(br); }
    pap.appendChild(wc);
    // Diagnostics: key-value list + log / copy
    var dc = card('diagT', 'diag');
    var kv = el('dl', 'kv-list'); kv.id = 'diagKV'; dc.appendChild(kv);
    if (info) { var ti = $('techInfo'); if (ti) ti.closest('.set-row').hidden = true; var rl = $('routeLine'); if (rl) dc.appendChild(rl); }
    var bg = el('div', 'button-group');
    var ol = $('openLog'); if (ol) { ol.className = 'btn btn-secondary'; bg.appendChild(ol); }
    var cp = el('button', 'btn btn-secondary', i18n('diagCopy')); cp.id = 'diagCopy'; cp.onclick = copyDiag; bg.appendChild(cp);
    dc.appendChild(bg);
    var vs = $('version'); if (vs) { vs.hidden = true; }
    pd.appendChild(dc);
    if (info) { info.hidden = true; pd.appendChild(info); }
    [pa, pp, pap, pd].forEach(function (p) { v.appendChild(p); });
    cards.forEach(function (c) { if (c.parentNode === v && !c.children.length) c.remove(); });
    [procCard, langCard, wsc].forEach(function (c) { if (c && c.parentNode === v) { if (!c.querySelector('input,select,button')) c.remove(); else pap.appendChild(c); } });
  }
  function diagRows() {
    var s = ST(), on = !!s.running, f = typeof fmt === 'function' ? fmt : function (x) { return String(x); };
    var r = [['dState', tt(on ? 'running' : 'stopped')], ['dVer', ($('version') && $('version').textContent) || '–']];
    if (on) {
      r.push(['dLat', Math.round(s.latency_ms) + ' ms'], ['dBuf', Math.round(s.buffer_ms) + ' ms'], ['dCpu', f((s.cpu || 0) * 100) + ' %'],
        ['dSr', s.sr ? (s.sr[0] / 1000) + ' / ' + (s.sr[1] / 1000) + ' kHz' : '–'], ['dFft', s.fft ? s.fft[0] + ' / ' + s.fft[1] + '×' : '–'],
        ['dDrop', (s.underruns || 0) + ' / ' + (s.overflows || 0)], ['dPrec', tt(s.precision ? 'dOn' : 'dOff')]);
      if (s.devices) r.push(['dPath', s.devices.join(' → ')]);
    }
    return r;
  }
  function diagTick() {
    var kv = $('diagKV'); if (!kv || kv.offsetParent === null) return;
    var rows = diagRows(), on = !!ST().running;
    kv.innerHTML = rows.map(function (x) { return '<dt>' + tt(x[0]) + '</dt><dd title="' + String(x[1]).replace(/"/g, '&quot;') + '">' + String(x[1]).replace(/</g, '&lt;') + '</dd>'; }).join('') + (on ? '' : '<dd class="kv-note">' + tt('diagOff') + '</dd>');
  }
  function copyDiag() {
    var txt = 'Aurelune Studio diagnostics\n' + diagRows().map(function (x) { return tt(x[0]) + ': ' + x[1]; }).join('\n') + '\n' + (($('routeLine') && $('routeLine').textContent) || '');
    var done = function () { if (typeof toast === 'function') toast(tt('diagCopied')); };
    try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (e) { fallback(); }
    function fallback() { var ta = el('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); }
  }

  // ---------- language + ticking ----------
  function texts() {
    document.querySelectorAll('.page-header [data-i18n], .subnav [data-i18n], .disclosure > summary [data-i18n], .panel .section-header [data-i18n], #allFreqBtn [data-i18n], .target-head [data-i18n], #freqFilter [data-i18n], #binSum [data-i18n], .rec [data-i18n], #diagCopy [data-i18n], #measDot [data-i18n]').forEach(function (x) { x.textContent = tt(x.dataset.i18n); });
    ['proofTitle', 'fOrig', 'fOut', 'fDev', 'details', 'binTitle', 'binOnHint'].forEach(function (k) { document.querySelectorAll('[data-i18n="' + k + '"]').forEach(function (x) { x.textContent = tt(k); }); });
    var ls = $('langSeg2'); if (ls) ls.querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', b.dataset.v === LG()); });
    document.querySelectorAll('.tabs button').forEach(function (b) { var s = b.querySelector('span'); if (s) { b.setAttribute('aria-label', s.textContent); b.title = s.textContent; } });
  }
  function tick() { try { liveTick(); freqTick(); diagTick(); } catch (e) {} }
  function buildAll() {
    try { shell(); } catch (e) {}
    try { live(); } catch (e) {}
    try { freq(); } catch (e) {}
    try { play(); } catch (e) {}
    try { well(); } catch (e) {}
    try { sett(); } catch (e) {}
    try { texts(); } catch (e) {}
  }
  var _al = window.applyLang;
  if (typeof _al === 'function') window.applyLang = function () { var r = _al.apply(this, arguments); try { texts(); } catch (e) {} return r; };
  var tries = 0, iv = setInterval(function () {
    tries++;
    buildAll();
    if (($('wellNav') && $('setNav') && $('plLayout') && $('powerBtn')) || tries > 40) { clearInterval(iv); texts(); setInterval(tick, 500); tick(); }
  }, 300);
})();