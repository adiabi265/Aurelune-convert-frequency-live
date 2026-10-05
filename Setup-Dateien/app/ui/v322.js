/* Aurelune 3.22 – provider-neutral playlist import */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var providers = {
    youtube: { name: 'YouTube Music', icon: '▶', host: /(^|\.)((music\.)?youtube\.com|youtu\.be)$/i, color: '#ff4e45' },
    spotify: { name: 'Spotify', icon: '●', host: /(^|\.)open\.spotify\.com$/i, color: '#1ed760' },
    deezer: { name: 'Deezer', icon: '▥', host: /(^|\.)deezer\.com$/i, color: '#a96cff' },
    soundcloud: { name: 'SoundCloud', icon: '☁', host: /(^|\.)soundcloud\.com$/i, color: '#ff7139' }
  };
  var selected = 'spotify', imports = [], built = false;
  function isDe() { return typeof lang !== 'undefined' && lang === 'de'; }
  function c() { return isDe() ? {
    choose: 'Quelle wählen', chooseSub: 'YouTube Music, Spotify, Deezer oder SoundCloud', importBtn: 'Playlist importieren',
    dialog: 'Playlist-Quelle wählen', link: 'Playlist-Link', linkHint: 'Füge den öffentlichen Playlist-Link des gewählten Dienstes ein.',
    add: 'Import starten', cancel: 'Schließen', invalid: 'Dieser Link passt nicht zur ausgewählten Quelle.',
    saved: 'Importierte Playlists', empty: 'Noch keine Playlist importiert.', open: 'Öffnen', remove: 'Entfernen',
    queued: 'Vorbereitung angefragt', target: 'Ziel', pending: 'Provider-Verbindung für Trackliste und Vorab-Analyse erforderlich',
    note: 'Der Link und die Ziel-Frequenz werden gespeichert. Vollständige geschützte Streams benötigen anschließend eine offizielle Provider-Verbindung; Aurelune täuscht keine fertige Offline-Umwandlung vor.'
  } : {
    choose: 'Choose source', chooseSub: 'YouTube Music, Spotify, Deezer or SoundCloud', importBtn: 'Import playlist',
    dialog: 'Choose playlist source', link: 'Playlist link', linkHint: 'Paste the public playlist link from the selected service.',
    add: 'Start import', cancel: 'Close', invalid: 'This link does not match the selected source.',
    saved: 'Imported playlists', empty: 'No playlist imported yet.', open: 'Open', remove: 'Remove',
    queued: 'Preparation requested', target: 'Target', pending: 'Provider connection required for track list and pre-analysis',
    note: 'The link and target frequency are saved. Full protected streams still require an official provider connection; Aurelune never pretends an offline conversion is already finished.'
  }; }
  function read() {
    try {
      var u = (typeof ui !== 'undefined' && ui) || {};
      selected = providers[u.playlistSource] ? u.playlistSource : 'spotify';
      imports = Array.isArray(u.playlistImports) ? u.playlistImports : [];
    } catch (e) { imports = []; }
  }
  function save() {
    try {
      if (typeof ui !== 'undefined') { ui.playlistSource = selected; ui.playlistImports = imports; }
      if (typeof call === 'function') call('set_settings', {}, { playlistSource: selected, playlistImports: imports });
    } catch (e) {}
  }
  function esc(v) { var d = document.createElement('div'); d.textContent = String(v == null ? '' : v); return d.innerHTML; }
  function valid(source, value) {
    try { var u = new URL(value); return /^https?:$/.test(u.protocol) && providers[source].host.test(u.hostname); } catch (e) { return false; }
  }
  function updateChoice() {
    var p = providers[selected], x = c();
    if ($('chosenLogo')) { $('chosenLogo').textContent = p.icon; $('chosenLogo').style.setProperty('--provider', p.color); }
    if ($('chosenName')) $('chosenName').textContent = p.name;
    if ($('chosenSub')) $('chosenSub').textContent = x.chooseSub;
  }
  function renderImports() {
    var x = c(), list = $('importedList'); if (!list) return;
    if ($('importedTitle')) $('importedTitle').textContent = x.saved;
    if (!imports.length) { list.innerHTML = '<p class="import-empty">' + esc(x.empty) + '</p>'; return; }
    list.innerHTML = imports.map(function (it) {
      var p = providers[it.source] || providers.spotify;
      return '<article class="import-row" data-id="' + esc(it.id) + '"><span class="import-logo" style="--provider:' + p.color + '">' + p.icon + '</span>' +
        '<div><b>' + esc(it.title || p.name + ' Playlist') + '</b><small>' + esc(p.name) + ' · ' + esc(x.target) + ' ' + esc(it.target || 528) + ' Hz</small>' +
        '<em>' + esc(x.queued) + ' · ' + esc(x.pending) + '</em></div>' +
        '<button data-open title="' + esc(x.open) + '">↗</button><button data-remove title="' + esc(x.remove) + '">×</button></article>';
    }).join('');
    list.querySelectorAll('.import-row').forEach(function (row) {
      var it = imports.filter(function (v) { return v.id === row.dataset.id; })[0];
      row.querySelector('[data-open]').onclick = function () { if (typeof call === 'function') call('open_url', it.url); else window.open(it.url, '_blank'); };
      row.querySelector('[data-remove]').onclick = function () { imports = imports.filter(function (v) { return v.id !== it.id; }); save(); renderImports(); };
    });
  }
  function modal() {
    var m = $('sourceImportModal'); if (m) return m;
    m = document.createElement('div'); m.id = 'sourceImportModal'; m.className = 'source-modal'; m.hidden = true;
    m.innerHTML = '<div class="source-dialog"><div class="source-dialog-head"><h3 id="sourceDialogTitle"></h3><button id="sourceClose">×</button></div>' +
      '<div class="provider-grid" id="providerGrid"></div><label class="import-link"><b id="sourceLinkLabel"></b><input id="sourceUrl" type="url" spellcheck="false" placeholder="https://"><small id="sourceLinkHint"></small></label>' +
      '<p class="source-error" id="sourceError"></p><p class="source-note" id="sourceNote"></p><div class="source-actions"><button class="btn ghost" id="sourceCancel"></button><button class="btn" id="sourceAdd"></button></div></div>';
    document.body.appendChild(m);
    $('providerGrid').innerHTML = Object.keys(providers).map(function (k) { var p = providers[k]; return '<button class="provider-card" data-provider="' + k + '"><span style="--provider:' + p.color + '">' + p.icon + '</span><b>' + p.name + '</b><i>✓</i></button>'; }).join('');
    $('providerGrid').querySelectorAll('[data-provider]').forEach(function (b) { b.onclick = function () { selected = b.dataset.provider; save(); paintModal(); updateChoice(); }; });
    $('sourceClose').onclick = $('sourceCancel').onclick = close;
    m.onclick = function (e) { if (e.target === m) close(); };
    $('sourceAdd').onclick = addImport;
    return m;
  }
  function paintModal() {
    var x = c(), m = modal();
    $('sourceDialogTitle').textContent = x.dialog; $('sourceLinkLabel').textContent = x.link; $('sourceLinkHint').textContent = x.linkHint;
    $('sourceNote').textContent = x.note; $('sourceCancel').textContent = x.cancel; $('sourceAdd').textContent = x.add;
    m.querySelectorAll('[data-provider]').forEach(function (b) { b.classList.toggle('sel', b.dataset.provider === selected); });
    $('sourceError').textContent = '';
  }
  function open() { var m = modal(); paintModal(); m.hidden = false; setTimeout(function () { $('sourceUrl').focus(); }, 60); }
  function close() { var m = $('sourceImportModal'); if (m) m.hidden = true; }
  function addImport() {
    var x = c(), value = $('sourceUrl').value.trim();
    if (!valid(selected, value)) { $('sourceError').textContent = x.invalid; return; }
    var p = providers[selected], target = (typeof ui !== 'undefined' && Number(ui.presetHz)) || 528;
    imports.unshift({ id: 'pl-' + Date.now().toString(36), source: selected, url: value, title: p.name + ' Playlist', target: target, status: 'needs_connection', created: new Date().toISOString() });
    imports = imports.slice(0, 50); save(); renderImports(); $('sourceUrl').value = ''; close();
  }
  function build() {
    var h = $('audioSources'); if (!h || built) return false;
    built = true; read(); var x = c(); h.classList.add('v322-sources');
    h.innerHTML = '<div class="source-top"><div><h3 id="srcTitle"></h3><p id="chosenSub"></p></div><button class="btn" id="importPlaylist"></button></div>' +
      '<button class="choose-source" id="chooseSource"><span class="chosen-logo" id="chosenLogo"></span><span><small id="chooseLabel"></small><b id="chosenName"></b></span><i>›</i></button>' +
      '<div class="imported-wrap"><h3 id="importedTitle"></h3><div id="importedList"></div></div>' +
      '<span id="spotifySub" hidden></span><span id="spotifyCta" hidden></span><span id="spotifyHint" hidden></span><span id="madeSub" hidden></span>';
    $('srcTitle').textContent = x.choose; $('chooseLabel').textContent = x.choose; $('chosenSub').textContent = x.chooseSub; $('importPlaylist').textContent = '+ ' + x.importBtn;
    $('chooseSource').onclick = open; $('importPlaylist').onclick = open;
    updateChoice(); renderImports(); return true;
  }
  function language() {
    if (!built) return; var x = c(); $('srcTitle').textContent = x.choose; $('chooseLabel').textContent = x.choose; $('chosenSub').textContent = x.chooseSub; $('importPlaylist').textContent = '+ ' + x.importBtn; updateChoice(); renderImports(); if ($('sourceImportModal') && !$('sourceImportModal').hidden) paintModal();
  }
  var oldLang = window.applyLang; if (typeof oldLang === 'function') window.applyLang = function () { var r = oldLang.apply(this, arguments); setTimeout(language, 0); return r; };
  var n = 0, iv = setInterval(function () { if (build() || ++n > 40) clearInterval(iv); }, 250);
})();
