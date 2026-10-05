/* Aurelune 3.21 – unified bottom player + full Live frequency preview */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var saved = null;
  var playlistMode = false;
  function de() { return typeof lang !== 'undefined' && lang === 'de'; }
  function name(v) { return typeof v === 'string' ? v : ((v && (v[de() ? 'de' : 'en'] || v.en || v.de)) || ''); }
  function mmss(n) { n = Math.max(0, Math.floor(Number(n) || 0)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); }
  function capture() {
    if (saved || !$('bwBar')) return false;
    saved = {
      play: $('bwbPlay').onclick, next: $('bwbNext').onclick, prev: $('bwbPrev').onclick,
      list: $('bwbList').onclick, cover: $('bwbCover').onclick, vol: $('bwbVol').oninput,
      seekIn: $('bwbSeek').oninput, seekChange: $('bwbSeek').onchange
    };
    return true;
  }
  function restore() {
    if (!saved || !playlistMode) return;
    $('bwbPlay').onclick = saved.play; $('bwbNext').onclick = saved.next; $('bwbPrev').onclick = saved.prev;
    $('bwbList').onclick = saved.list; $('bwbCover').onclick = saved.cover; $('bwbVol').oninput = saved.vol;
    $('bwbSeek').oninput = saved.seekIn; $('bwbSeek').onchange = saved.seekChange;
    playlistMode = false;
  }
  function playlistTick() {
    var api = window.AurelunePlaylists;
    if (!api || !api._state || !$('bwBar')) return;
    var s = api._state(), bn = window.AureluneBrainwave && window.AureluneBrainwave.now ? window.AureluneBrainwave.now() : null;
    var use = !!(s.cur && s.cur.pl && (s.playing || !bn || bn.src === 'idle'));
    var local = document.querySelector('#view-play .pl-player');
    if (local) local.hidden = true;
    $('bwBar').hidden = false;
    if (!use) { restore(); return; }
    capture(); playlistMode = true;
    var cat = (api.catalogue ? api.catalogue() : []).filter(function (x) { return x.id === s.cur.pl; })[0];
    if (!cat) return;
    var tr = cat.tracks[((s.cur.ti || 0) % cat.tracks.length + cat.tracks.length) % cat.tracks.length];
    var pos = Math.min(s.duration || 420, s.elapsed || 0), dur = s.duration || 420, pct = dur ? Math.round(pos / dur * 1000) : 0;
    $('bwbEmo').textContent = cat.emoji || '🎵';
    $('bwbTitle').textContent = name(tr.name);
    $('bwbSub').textContent = name(cat.name) + (s.playing ? '' : ' · ' + (de() ? 'Pausiert' : 'Paused'));
    $('bwbHz').textContent = Math.round((s.presetHz || s.a4 || 528) * 10) / 10 + ' Hz';
    $('bwbPlay').textContent = s.playing ? 'Ⅱ' : '▶';
    $('bwbPlay').title = s.playing ? (de() ? 'Pause' : 'Pause') : (de() ? 'Abspielen' : 'Play');
    $('bwbPos').textContent = mmss(pos); $('bwbDur').textContent = mmss(dur);
    $('bwbSeek').value = pct; $('bwbSeek').disabled = true; $('bwbSeek').style.setProperty('--p', (pct / 10) + '%');
    var vol = Math.round((s.volume == null ? .8 : s.volume) * 100);
    if (document.activeElement !== $('bwbVol')) $('bwbVol').value = vol;
    $('bwbVol').style.setProperty('--p', vol + '%');
    $('bwBar').classList.toggle('playing', !!s.playing);
    $('bwbPlay').onclick = function () { api.toggle(); };
    $('bwbNext').onclick = function () { api.play(s.cur.pl, s.cur.ti + 1); };
    $('bwbPrev').onclick = function () { api.play(s.cur.pl, s.cur.ti - 1); };
    $('bwbList').onclick = $('bwbCover').onclick = function () { if (typeof showView === 'function') showView('play'); };
    $('bwbVol').oninput = function (e) { if (api.setVolume) api.setVolume(Number(e.target.value) / 100); };
    $('bwbSeek').oninput = function () {}; $('bwbSeek').onchange = function () {};
  }
  var n = 0, boot = setInterval(function () {
    capture(); playlistTick();
    if (++n > 40) { clearInterval(boot); setInterval(playlistTick, 120); }
  }, 250);
})();
