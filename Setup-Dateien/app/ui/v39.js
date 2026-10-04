/* Aurelune 3.9 – Gateway-style brainwaves (auto 'marginally audible' level), song tuning shown as real A4 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  try {
    Object.assign(I18N.en, {
      songTuning: 'song tuning (A4)',
      binAutoT: 'Auto volume (barely audible)', binAutoH: 'Like the Gateway tapes: beats stay just audible under your music and follow its loudness - louder does not work better.',
      binAutoNow: 'currently {v} %',
      binDesc_gateway: 'Focus 10: ≈ 7-7.5 Hz (resonance named in the CIA Gateway report) + theta 4 + delta 1.5 Hz, best with the noise bed - body asleep, mind awake',
      binHead: 'Best chance it works (Gateway report): stereo headphones · lie down, eyes closed · beats only barely audible · noise bed to mask them · 20-45 min · repeat regularly.',
    });
    Object.assign(I18N.de, {
      songTuning: 'Stimmung des Songs (A4)',
      binAutoT: 'Auto-Lautstärke (knapp hörbar)', binAutoH: 'Wie bei den Gateway-Aufnahmen: Die Beats bleiben knapp hörbar unter deiner Musik und folgen ihrer Lautstärke - lauter wirkt nicht besser.',
      binAutoNow: 'gerade {v} %',
      binDesc_gateway: 'Focus 10: ≈ 7-7,5 Hz (Resonanz laut CIA-Gateway-Bericht) + Theta 4 + Delta 1,5 Hz, am besten mit Rauschteppich - Körper schläft, Geist wach',
      binHead: 'So wirkt es am ehesten (Gateway-Bericht): Stereo-Kopfhörer · liegen, Augen zu · Beats nur knapp hörbar · Rauschteppich zum Überdecken · 20-45 Min. · regelmäßig wiederholen.',
    });
  } catch (e) {}
  function build() {
    if ($('binAuto') || !$('binLevel')) return;
    var lvRow = $('binLevel').closest('.bin-slider'); if (!lvRow) return;
    var row = document.createElement('div'); row.className = 'set-row bin-auto';
    row.innerHTML = '<div><b id="binAutoT"></b><small id="binAutoH"></small><small id="binAutoNow" class="a4sub"></small></div><label class="switch"><input type="checkbox" id="binAuto"><span></span></label>';
    lvRow.parentNode.insertBefore(row, lvRow);
    $('binAuto').onchange = function (e) { setS({ bin_auto: e.target.checked }); };
    var gw = document.querySelector('#binSeg button[data-v="gateway"]');
    if (gw) gw.addEventListener('click', function () { if (!(settings.bin_noise > 0)) setTimeout(function () { setS({ bin_noise: 0.3 }); }, 300); });
    render();
  }
  function render() {
    if (!$('binAuto')) return;
    var auto = settings.bin_auto !== false;
    $('binAuto').checked = auto;
    $('binAutoT').textContent = t('binAutoT'); $('binAutoH').textContent = t('binAutoH');
    var lvRow = $('binLevel').closest('.bin-slider'); if (lvRow) lvRow.style.display = auto ? 'none' : '';
    var eff = status && status.running && typeof status.bin_level_eff === 'number' ? status.bin_level_eff : null;
    $('binAutoNow').textContent = auto && eff != null ? t('binAutoNow', { v: fmt(eff * 100, 1) }) : '';
  }
  var oB = window.renderBinaural, oS = window.renderBinStatus;
  if (typeof oB === 'function') window.renderBinaural = function () { var r = oB.apply(this, arguments); try { build(); render(); } catch (e) {} return r; };
  if (typeof oS === 'function') window.renderBinStatus = function () { var r = oS.apply(this, arguments); try { render(); } catch (e) {} return r; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
