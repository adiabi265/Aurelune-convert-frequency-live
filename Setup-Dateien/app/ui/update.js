/* Aurelune Studio - automatic updates from GitHub */
(function () {
  const T = {
    en: { title: '🔄 Automatic updates', hint: 'Checks GitHub for new versions on start and every 6 hours.',
      avail: 'Update {v} available', install: 'Install', check: 'Check now', checking: 'Checking …',
      uptodate: 'Up to date – version {v}', error: 'Update check failed (offline?)', dl: 'Downloading update … {p} %',
      launching: 'Installing – Aurelune restarts in a moment …', failed: 'Update failed: {v}', cur: 'Installed: {v}' },
    de: { title: '🔄 Automatische Updates', hint: 'Prüft beim Start und alle 6 Stunden auf GitHub, ob es eine neue Version gibt.',
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
    setInterval(() => { if (!el('autoUpd') || el('autoUpd').checked) check(true); }, 6 * 3600 * 1000);
    setInterval(render, 1500);  // follows language switches
  }
  boot();
})();
