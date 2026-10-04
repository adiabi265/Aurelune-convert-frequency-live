/* Aurelune 3.6 – desktop layout: sidebar + two-column dashboard. Only moves existing elements (ids stay the same). */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  try {
    Object.assign(I18N.en, { binMore: 'Layers & notes' });
    Object.assign(I18N.de, { binMore: 'Schichten & Hinweise' });
  } catch (e) {}
  function build() {
    if (document.body.classList.contains('desk')) return;
    document.body.classList.add('desk');
    var top = document.querySelector('header.top'), tabs = document.querySelector('nav.tabs'), main = document.querySelector('main');
    var side = el('aside', 'side');
    side.appendChild(top.querySelector('.brand'));
    side.appendChild(tabs);
    var foot = el('div', 'side-foot');
    var tr = top.querySelector('.top-r'); if (tr) foot.appendChild(tr);
    side.appendChild(foot);
    top.remove();
    document.body.insertBefore(side, main);
    // home: two columns
    var home = $('view-home'), grid = el('div', 'home-grid'), a = el('div', 'col-main'), b = el('div', 'col-side');
    ['orb-wrap'].forEach(function (c) { var x = home.querySelector('.' + c); if (x) a.appendChild(x); });
    ['cymLine', 'freqPill', 'freqChips', 'quickCustom', 'freqDescLine', 'ab'].forEach(function (id) { if ($(id)) a.appendChild($(id)); });
    var proof = home.querySelector('.card.proof'), timer = home.querySelector('.card.slim');
    [$('alert'), proof, $('binCard'), timer].forEach(function (x) { if (x) b.appendChild(x); });
    grid.appendChild(a); grid.appendChild(b); home.insertBefore(grid, home.firstChild);
    // sound path -> settings "Technical" card
    var info = document.querySelector('#view-settings .card.info'), route = $('routeLine');
    if (info && route) info.appendChild(route);
    // brainwaves: the 8 layer chips + notes behind a small "Details" toggle
    var more = document.querySelector('#binCard .bin-more');
    if (more && $('binLayers')) {
      var d = el('details', 'more bin-det'), s = el('summary'); s.setAttribute('data-i18n', 'binMore'); s.textContent = 'Details';
      d.appendChild(s); d.appendChild($('binLayers'));
      more.querySelectorAll('.bin-note, .disclaimer').forEach(function (p) { d.appendChild(p); });
      more.appendChild(d);
    }
    // status badge of the brainwave card on its own line (head stays clean)
    var bs = $('binState'), bd = $('binDesc');
    if (bs && bd) bd.parentNode.insertBefore(bs, bd);
    // page titles for the other views live in the sidebar already
    try { if (typeof applyLang === 'function') applyLang(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
