/* Aurelune 3.8 – 432-Lock delay choice, clearer proof for non-432 presets, new brainwave texts */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  try {
    Object.assign(I18N.en, {
      lockT: '🎯 432-Lock – accuracy vs. delay',
      lockOff: 'Off', lockHint_0: 'No delay (for videos & games). Tuning is held per song - may drift by a few cents.',
      lockHint_075: '~0.9 s delay · very accurate (about 1 cent).', lockHint_15: '~1.6 s delay · recommended for music (under 1 cent).',
      lockHint_3: '~3.1 s delay · most accurate - measures 3 s before and after every moment.',
      binOnHint: '4 binaural beats around ONE target rhythm - stereo headphones required.',
      binDesc_delta: '≈ 2 Hz on deep carriers (108-216 Hz) - deep sleep range',
      binDesc_theta: '≈ 6 Hz (144-257 Hz carriers) - deep relaxation, meditation, drifting off',
      binDesc_alpha: '≈ 10 Hz on bright carriers (216-432 Hz) - calm, relaxed awareness',
      binDesc_gateway: 'Delta 1.5 + theta 4 + Schumann 7.83 + alpha 10 Hz layered - inspired by the Gateway "Focus 10" idea (mind awake, body asleep)',
      cymLive: 'Loudest tone now: {f} Hz · {note}',
    });
    Object.assign(I18N.de, {
      lockT: '🎯 432-Lock – Genauigkeit vs. Verzögerung',
      lockOff: 'Aus', lockHint_0: 'Keine Verzögerung (für Videos & Games). Stimmung wird pro Song gehalten - kann ein paar Cent abweichen.',
      lockHint_075: '~0,9 s Verzögerung · sehr genau (ca. 1 Cent).', lockHint_15: '~1,6 s Verzögerung · empfohlen für Musik (unter 1 Cent).',
      lockHint_3: '~3,1 s Verzögerung · am genauesten - misst 3 s vor und nach jedem Moment.',
      binOnHint: '4 binaurale Beats rund um EINEN Ziel-Rhythmus - Stereo-Kopfhörer nötig.',
      binDesc_delta: '≈ 2 Hz auf tiefen Trägertönen (108-216 Hz) - Tiefschlaf-Bereich',
      binDesc_theta: '≈ 6 Hz (Trägertöne 144-257 Hz) - tiefe Entspannung, Meditation, Wegdämmern',
      binDesc_alpha: '≈ 10 Hz auf hellen Trägertönen (216-432 Hz) - ruhige, entspannte Wachheit',
      binDesc_gateway: 'Delta 1,5 + Theta 4 + Schumann 7,83 + Alpha 10 Hz übereinander - angelehnt an die Gateway-Idee "Focus 10" (Geist wach, Körper schläft)',
      cymLive: 'Lautester Ton gerade: {f} Hz · {note}',
    });
  } catch (e) {}
  var STEPS = [0, 0.75, 1.5, 3];
  function key(v) { return v === 0 ? '0' : v === 0.75 ? '075' : v === 1.5 ? '15' : '3'; }
  function cur() { return settings.precision ? (STEPS.indexOf(Number(settings.lock_s)) > 0 ? Number(settings.lock_s) : 0.75) : 0; }
  function build() {
    var sw = $('precise'); if (!sw || $('lockSeg')) return;
    var row = sw.closest('.set-row'); if (!row) return;
    row.classList.add('lock-row');
    var lbl = sw.closest('label'); if (lbl) lbl.style.display = 'none';
    var b = row.querySelector('b'), sm = row.querySelector('small');
    if (b) { b.removeAttribute('data-i18n'); b.id = 'lockTitle'; }
    if (sm) { sm.removeAttribute('data-i18n'); sm.id = 'lockHint'; }
    var seg = document.createElement('div'); seg.className = 'seg lock-seg'; seg.id = 'lockSeg';
    STEPS.forEach(function (v) {
      var x = document.createElement('button'); x.type = 'button'; x.dataset.v = String(v);
      x.onclick = function () { var p = { precision: v > 0 }; if (v > 0) p.lock_s = v; setS(p); };
      seg.appendChild(x);
    });
    row.parentNode.insertBefore(seg, row.nextSibling);
    render();
  }
  function render() {
    if (!$('lockSeg')) return;
    var c = cur();
    $('lockTitle').textContent = t('lockT'); $('lockHint').textContent = t('lockHint_' + key(c));
    $('lockSeg').querySelectorAll('button').forEach(function (x) {
      var v = Number(x.dataset.v);
      x.textContent = v === 0 ? t('lockOff') : fmt(v, v === 0.75 ? 2 : 1) + ' s';
      x.classList.toggle('sel', v === c);
    });
  }
  var orig = window.renderSettings;
  if (typeof orig === 'function') window.renderSettings = function () { var r = orig.apply(this, arguments); try { build(); render(); } catch (e) {} return r; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
