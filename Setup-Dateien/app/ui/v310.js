/* Aurelune 3.10 – lock default 0.75 s (best with real music), proof shows song average + momentary value */
(function () {
  try {
    Object.assign(I18N.en, {
      devAvg: 'song average', devNow: 'now',
      lockHint_075: '~0.9 s delay · recommended - most accurate with real music (about 1 cent).',
      lockHint_15: '~1.6 s delay · also very accurate (1-2 cents).',
      lockHint_3: '~3.1 s delay · steadiest for even music, but NOT more accurate with vocals/vibrato.',
      devTip: 'The "now" value wobbles ±1-3 cents because singers and instruments naturally move in pitch from note to note. That is the music itself, not a tuning error - and inaudible (hearing threshold ≈ 5 cents).',
    });
    Object.assign(I18N.de, {
      devAvg: 'Song-Durchschnitt', devNow: 'jetzt',
      lockHint_075: '~0,9 s Verzögerung · empfohlen - mit echter Musik am genauesten (ca. 1 Cent).',
      lockHint_15: '~1,6 s Verzögerung · ebenfalls sehr genau (1-2 Cent).',
      lockHint_3: '~3,1 s Verzögerung · am ruhigsten bei gleichmäßiger Musik, aber bei Gesang/Vibrato NICHT genauer.',
      devTip: 'Der „jetzt“-Wert schwankt um ±1-3 Cent, weil Sänger und Instrumente von Ton zu Ton natürlich leicht in der Tonhöhe wandern. Das ist die Musik selbst, kein Stimmungsfehler - und unhörbar (Hörschwelle ≈ 5 Cent).',
    });
  } catch (e) {}
  try { var st = document.createElement('style'); st.textContent = '.facts{grid-template-columns:repeat(3,minmax(0,1fr))}.facts .a4sub{white-space:normal}'; document.head.appendChild(st); } catch (e) {}
  function tip() { var b = document.getElementById('fDev'); if (b && b.parentNode) b.parentNode.title = t('devTip'); }
  function migrate() {   // one time: users on the old 3 s step move to the new recommended 0.75 s
    try {
      if (localStorage.getItem('v310lock')) return;
      if (typeof settings === 'undefined' || settings.lock_s == null) return;
      localStorage.setItem('v310lock', '1');
      if (Number(settings.lock_s) === 3 || Number(settings.lock_s) === 1.5) setS({ lock_s: 0.75 });
    } catch (e) {}
  }
  var n = 0, iv = setInterval(function () { tip(); migrate(); if (++n > 20 || localStorage.getItem('v310lock')) clearInterval(iv); }, 500);
})();
