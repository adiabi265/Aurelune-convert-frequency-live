/* Aurelune 3.19 – choose which Windows app is processed; every other app stays on normal speakers. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var isDe = function () { return typeof lang !== 'undefined' && lang === 'de'; };
  var busy = false;
  function C() { return isDe() ? {
    title:'Aurelune anwenden auf', hint:'Nur die gewählte App läuft durch Aurelune. Alle anderen Programme bleiben direkt auf deinen normalen Lautsprechern.', all:'Alle PC-Töne', running:'Geöffnete Apps', saved:'Wird automatisch verbunden, sobald die App geöffnet ist.', changed:'Audio-Quelle geändert', spotify:'Spotify'
  } : {
    title:'Use Aurelune for', hint:'Only the selected app runs through Aurelune. Every other program stays directly on your normal speakers.', all:'All PC audio', running:'Open apps', saved:'It will connect automatically as soon as the app opens.', changed:'Audio source changed', spotify:'Spotify'
  }; }
  function cleanName(n) { return String(n || '').toLowerCase().replace(/\.exe$/,''); }
  function choices() {
    var c=C(), out=[{v:'all',n:c.all},{v:'spotify',n:c.spotify}], seen={all:1,spotify:1};
    var apps=(typeof state!=='undefined' && state && state.audio_apps)||[];
    apps.forEach(function(a){var n=cleanName(a.name);if(!n||seen[n]||n==='python'||n==='pythonw'||n==='audioswitch318')return;seen[n]=1;var label=a.title&&a.title.length<70?a.title:a.name;out.push({v:n,n:label});});
    return out;
  }
  function build(){
    if($('routeCard'))return true;var home=$('view-home'),bin=$('binCard');if(!home||!bin)return false;
    var card=document.createElement('div');card.id='routeCard';card.className='card route-card';
    card.innerHTML='<div class="route-copy"><b id="routeTitle"></b><small id="routeHint"></small></div><div class="route-pick"><select id="routeApp"></select><span id="routeState"></span></div>';
    bin.parentNode.insertBefore(card,bin);$('routeApp').onchange=async function(){if(busy)return;busy=true;var v=this.value;this.disabled=true;try{var r=await call('set_route_app',v);if(r&&r.ok!==false){if(typeof state!=='undefined'&&state){state.route_app=v;state.audio_apps=r.audio_apps||state.audio_apps;}if(typeof toast==='function')toast(C().changed);render();}}finally{busy=false;this.disabled=false;}};return true;
  }
  function render(){if(!build())return;var c=C(),sel=$('routeApp'),cur=(typeof state!=='undefined'&&state&&state.route_app)||'all', opts=choices();if(!opts.some(function(x){return x.v===cur;}))opts.push({v:cur,n:cur});var sig=opts.map(function(x){return x.v+'|'+x.n;}).join(';');if(sel.dataset.sig!==sig){sel.innerHTML=opts.map(function(x){return '<option value="'+x.v.replace(/"/g,'&quot;')+'">'+x.n.replace(/[&<>]/g,function(k){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[k];})+'</option>';}).join('');sel.dataset.sig=sig;}sel.value=cur;$('routeTitle').textContent=c.title;$('routeHint').textContent=c.hint;$('routeState').textContent=cur==='all'?'':c.saved;}
  var oldLang=window.applyLang;if(typeof oldLang==='function')window.applyLang=function(){var r=oldLang.apply(this,arguments);render();return r;};
  var oldSettings=window.renderSettings;if(typeof oldSettings==='function')window.renderSettings=function(){var r=oldSettings.apply(this,arguments);render();return r;};
  setInterval(function(){try{render();}catch(e){}},700);
})();
