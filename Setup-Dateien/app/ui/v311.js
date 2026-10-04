/* Aurelune 3.11 – stackable brainwave layers (2-32, SeptaSync-style "Septa" preset), 432-Lock only Off / 0.75 s */
(function () {
  try {
    Object.assign(I18N.en, {
      binSepta: '🌈 Septa · 7 waves',
      binDesc_septa: '7 beats at once - delta 1.5 · theta 4 · alpha 8 · beta 13 · gamma 25 / 40 / 60 Hz on 14 carrier tones (the SeptaSync principle). Best with 7 or more layers.',
      binCountT: 'Stacked frequencies',
      binCountH: 'Each layer = 2 tones (left/right ear) → 1 beat. 4 ≈ Gateway tapes, 7 = Septa (14 tones), 16 / 32 = denser, softer field. Total volume stays the same.',
      binOnHint: 'Binaural beats layered on top of your sound - headphones required.',
      cymLive: 'Loudest tone: {f} Hz · {note}',
      cymLive2: 'Loudest tone: input {fin} Hz → you hear {f} Hz · {note}',
      peakIn: 'loudest tone: {f} Hz',
      tuneTip: 'The big Hz values are the TUNING (concert pitch A4), not the pitch of a single tone. A 182 Hz test tone corresponds to a tuning of A4 = 432.9 Hz - Aurelune moves it to 181.6 Hz so it fits exactly into A4 = 432 Hz.',
      lockT: '🎯 432-Lock',
      lockHint_075: '~0.9 s delay · most accurate with real music (about 1 cent).',
      lockHint_0: 'No delay (for videos & games). Tuning is held per song - may drift by a few cents.',
    });
    Object.assign(I18N.de, {
      binSepta: '🌈 Septa · 7 Wellen',
      binDesc_septa: '7 Beats gleichzeitig - Delta 1,5 · Theta 4 · Alpha 8 · Beta 13 · Gamma 25 / 40 / 60 Hz auf 14 Trägertönen (Prinzip von SeptaSync). Am besten mit 7 oder mehr Schichten.',
      binCountT: 'Gestapelte Frequenzen',
      binCountH: 'Jede Schicht = 2 Töne (linkes/rechtes Ohr) → 1 Beat. 4 ≈ Gateway-Tapes, 7 = Septa (14 Töne), 16 / 32 = dichteres, weicheres Klangfeld. Die Gesamtlautstärke bleibt gleich.',
      binOnHint: 'Binaurale Beats über deinem Sound geschichtet - Kopfhörer nötig.',
      cymLive: 'Lautester Ton: {f} Hz · {note}',
      cymLive2: 'Lautester Ton: Eingang {fin} Hz → du hörst {f} Hz · {note}',
      peakIn: 'lautester Ton: {f} Hz',
      tuneTip: 'Die großen Hz-Werte sind die STIMMUNG (Kammerton A4), nicht die Tonhöhe eines einzelnen Tons. Ein 182-Hz-Testton entspricht einer Stimmung von A4 = 432,9 Hz - Aurelune verschiebt ihn auf 181,6 Hz, damit er exakt ins A4 = 432-Hz-Raster passt.',
      lockT: '🎯 432-Lock',
      lockHint_075: '~0,9 s Verzögerung · mit echter Musik am genauesten (ca. 1 Cent).',
      lockHint_0: 'Keine Verzögerung (für Videos & Games). Stimmung wird pro Song gehalten - kann ein paar Cent abweichen.',
    });
  } catch (e) {}
  function apply() {
    try {
      document.querySelectorAll('[data-i18n="binSepta"],[data-i18n="binCountT"],[data-i18n="binCountH"],[data-i18n="binOnHint"]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
      if (typeof settings !== 'undefined' && settings.precision && Number(settings.lock_s) !== 0.75) setS({ lock_s: 0.75 });
      if (typeof renderBinaural === 'function') renderBinaural();
      ['fIn', 'fOut'].forEach(function (id) { var b = document.getElementById(id); if (b && b.parentNode) b.parentNode.title = t('tuneTip'); });
    } catch (e) {}
  }
  var oL = window.applyLang;
  if (typeof oL === 'function') window.applyLang = function () { var r = oL.apply(this, arguments); apply(); return r; };
  var n = 0, iv = setInterval(function () { apply(); if (++n > 6) clearInterval(iv); }, 500);
})();
