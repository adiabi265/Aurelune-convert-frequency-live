/* Aurelune Studio - automatic updates from GitHub */
(function () {
  const T = {
    en: { title: '🔄 Automatic updates', hint: 'Checks GitHub every 3 minutes (also in the background while the window is closed) - new versions install themselves and Aurelune restarts automatically.',
      avail: 'Update {v} available', install: 'Install', check: 'Check now', checking: 'Checking …',
      uptodate: 'Up to date – version {v}', error: 'Update check failed (offline?)', dl: 'Downloading update … {p} %',
      launching: 'Installing – Aurelune restarts in a moment …', failed: 'Update failed: {v}', cur: 'Installed: {v}' },
    de: { title: '🔄 Automatische Updates', hint: 'Prüft alle 3 Minuten auf GitHub (auch im Hintergrund, wenn das Fenster zu ist) - neue Versionen installieren sich selbst und Aurelune startet automatisch neu.',
      avail: 'Update {v} verfügbar', install: 'Installieren', check: 'Jetzt prüfen', checking: 'Prüfe …',
      uptodate: 'Aktuell – Version {v}', error: 'Update-Prüfung fehlgeschlagen (offline?)', dl: 'Lade Update … {p} %',
      launching: 'Wird installiert – Aurelune startet gleich neu …', failed: 'Update fehlgeschlagen: {v}', cur: 'Installiert: {v}' }
  };
  const L = () => ((typeof lang !== 'undefined' && lang === 'de') ? T.de : T.en);
  const tr = (k, v, p) => (L()[k] || T.en[k]).replace('{v}', v == null ? '' : v).replace('{p}', p == null ? '' : p);
  const el = (id) => document.getElementById(id);
  let st = { state: 'idle' }, checking = false, pollH = null;

  function render() {
    if (el('updTitle')) el('updTitle').textContent = tr('title');
    if (el('updHint')) el('updHint').textContent = tr('hint');
    if (el('updCheck')) { el('updCheck').textContent = checking ? tr('checking') : tr('check'); el('updCheck').disabled = checking; }
    let info = st.current ? tr('cur', st.current) : '';
    if (st.state === 'uptodate') info = tr('uptodate', st.current);
    else if (st.state === 'available') info = tr('avail', st.latest);
    else if (st.state === 'error') info = st.error && /^E_UPDATE/.test(st.error) ? tr('failed', st.error) : tr('error');
    else if (st.state === 'downloading') info = tr('dl', null, Math.round((st.progress || 0) * 100));
    else if (st.state === 'launching') info = tr('launching');
    if (el('updInfo')) el('updInfo').textContent = info;
    const bar = el('updBar');
    if (!bar) return;
    const busy = st.state === 'downloading' || st.state === 'launching';
    const show = busy || (st.state === 'available' && localStorage.getItem('updDismiss') !== st.latest);
    bar.classList.toggle('show', !!show);
    el('updText').textContent = busy ? info : tr('avail', st.latest);
    el('updGo').textContent = tr('install');
    el('updGo').hidden = busy; el('updX').hidden = busy;
    el('updProg').style.display = busy ? 'block' : 'none';
    el('updProg').firstElementChild.style.width = Math.round((st.progress || 0) * 100) + '%';
    el('updNotes').textContent = (!busy && st.notes) ? st.notes.split(/\r?\n/).filter(Boolean).slice(0, 3).join(' · ') : '';
  }
  async function check(force) {
    checking = true; render();
    try { const r = await call('update_check', !!force); if (r && r.ok !== false) { st = r; if (el('autoUpd')) el('autoUpd').checked = r.auto !== false; } }
    finally { checking = false; render(); }
    autoInstall();
  }
  // v3.11: with automatic updates on, a new version installs itself and Aurelune restarts on its own
  // (once per version - if it fails, the normal "Install" button stays available).
  function autoInstall() {
    if (st.auto === false || !st.available || !st.latest) return;
    if (localStorage.getItem('updAutoTried') === st.latest) return;
    localStorage.setItem('updAutoTried', st.latest);
    if (typeof toast === 'function') toast(tr('avail', st.latest) + ' – ' + tr('launching'));
    setTimeout(install, 3000);
  }
  function pollInstall() {
    clearInterval(pollH);
    pollH = setInterval(async () => {
      const r = await call('update_status');
      if (r && r.ok !== false) st = r;
      render();
      if (st.state === 'error') { clearInterval(pollH); if (typeof toast === 'function') toast(el('updInfo').textContent); }
      if (st.state === 'launching') clearInterval(pollH);
    }, 400);
  }
  async function install() {
    const r = await call('update_install');
    if (r && r.ok !== false) st = r;
    render(); pollInstall();
  }
  function wireUpd() {
    if (el('updGo')) el('updGo').onclick = install;
    if (el('updX')) el('updX').onclick = () => { localStorage.setItem('updDismiss', st.latest || ''); render(); };
    if (el('updCheck')) el('updCheck').onclick = () => check(true);
    if (el('autoUpd')) el('autoUpd').onchange = async (e) => { await call('set_auto_update', e.target.checked); if (e.target.checked) check(true); };
  }
  function boot() {
    if (typeof api === 'undefined' || !api || typeof call !== 'function') return setTimeout(boot, 500);
    wireUpd(); render();
    setTimeout(() => check(false), 4000);
    // v3.13: live updates - check every 3 minutes and whenever the window comes back to the front
    let lastChk = Date.now();
    const auto = () => (!el('autoUpd') || el('autoUpd').checked);
    setInterval(() => { if (auto()) { lastChk = Date.now(); check(true); } }, 180 * 1000);
    window.addEventListener('focus', () => { if (auto() && Date.now() - lastChk > 60 * 1000) { lastChk = Date.now(); check(true); } });
    setInterval(render, 1500);  // follows language switches
  }
  boot();
})();
