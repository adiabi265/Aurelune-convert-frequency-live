/* Aurelune 3.18 – unified playlist hub and Home isochronic beats. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var isDe = function () { return typeof lang !== 'undefined' && lang === 'de'; };
  function copy() { return isDe() ? {
    title:'🎶 Alle Playlists', intro:'Wähle deine Quelle: Spotify, Aurelune-Klänge oder Brainwave-Reisen. Alles bleibt an einem Ort.', source:'Quelle wählen', spotifySub:'Deine Spotify-Playlists durch Aurelune hören', open:'Spotify öffnen', hint:'Starte Aurelune auf „Live“, öffne Spotify und spiele deine Playlist ab. Der gesamte PC-Ton wird in Echtzeit auf deine Zielfrequenz gestimmt.', made:'Vorgefertigte Aurelune-Playlists', madeSub:'Live erzeugt und direkt auf deine Zielfrequenz gestimmt.', journeys:'Brainwave-Playlists', journeysSub:'Gateway- und SeptaSync-Reisen – ohne zusätzlichen Meditation-Tab.', iso:'Isochrone Beats', isoSub:'Direkt zu deinen Brainwaves hinzufügen – funktioniert auch über Lautsprecher.'
  } : {
    title:'🎶 All playlists', intro:'Choose your source: Spotify, Aurelune sounds or brainwave journeys. Everything stays in one place.', source:'Choose source', spotifySub:'Listen to your Spotify playlists through Aurelune', open:'Open Spotify', hint:'Turn on Aurelune in Live, open Spotify and play a playlist. All PC audio is tuned to your target frequency in real time.', made:'Ready-made Aurelune playlists', madeSub:'Generated live and tuned directly to your target frequency.', journeys:'Brainwave playlists', journeysSub:'Gateway and SeptaSync journeys – without a separate Meditation tab.', iso:'Isochronic beats', isoSub:'Add them directly to your brainwaves – speakers work too.'
  }; }
  function openSpotify() { try { var a=(typeof state!=='undefined'&&state&&state.route_apps)||[]; if(a.indexOf('*')<0&&a.indexOf('spotify')<0)a=a.concat(['spotify']); call('set_route_apps',a); call('open_url','https://open.spotify.com'); } catch(e) { window.open('https://open.spotify.com','_blank'); } }
  function sourceHub(play) {
    var x=copy(), h=$('audioSources');
    if(!h){ h=document.createElement('div'); h.id='audioSources'; h.className='audio-sources'; var intro=play.querySelector(':scope > .muted-p'); (intro||play.firstChild).insertAdjacentElement('afterend',h);
      h.innerHTML='<h3 id="srcTitle"></h3><div class="source-grid"><button class="source-card spotify" id="spotifyOpen"><span class="source-logo">●</span><span><b>Spotify</b><small id="spotifySub"></small></span><i id="spotifyCta"></i></button><button class="source-card active" id="aureluneSource"><span class="source-logo">✦</span><span><b>Aurelune</b><small id="madeSub"></small></span><i>↓</i></button></div><p class="spotify-hint" id="spotifyHint"></p>';
      $('spotifyOpen').onclick=openSpotify; $('aureluneSource').onclick=function(){var g=$('plGrid');if(g)g.scrollIntoView({behavior:'smooth',block:'start'});};
      var grid=$('plGrid'); if(grid){var hd=document.createElement('div');hd.className='hub-heading';hd.innerHTML='<h3 id="madeTitle"></h3><p id="madeDesc"></p>';grid.parentNode.insertBefore(hd,grid);}
    }
    var title=play.querySelector(':scope > h2'), intro2=play.querySelector(':scope > .muted-p'); if(title)title.textContent=x.title;if(intro2)intro2.textContent=x.intro;
    $('srcTitle').textContent=x.source;$('spotifySub').textContent=x.spotifySub;$('spotifyCta').textContent=x.open;$('spotifyHint').textContent=x.hint;$('madeSub').textContent=x.madeSub;if($('madeTitle'))$('madeTitle').textContent=x.made;if($('madeDesc'))$('madeDesc').textContent=x.madeSub;
  }
  function mergeBrainwaves(play){var bw=$('view-bw');if(!bw||bw.parentNode===play||bw.closest('.hub-brainwaves'))return;var x=copy(),w=document.createElement('div');w.className='hub-brainwaves';w.innerHTML='<div class="hub-heading"><h3 id="journeyTitle"></h3><p id="journeyDesc"></p></div>';play.appendChild(w);bw.classList.remove('view','active');bw.classList.add('embedded-bw');w.appendChild(bw);$('journeyTitle').textContent=x.journeys;$('journeyDesc').textContent=x.journeysSub;}
  function moveIso(){var beat=$('beatOn'),home=$('view-home'),bin=$('binCard');if(!beat||!home||!bin||$('homeIso'))return;var card=beat.closest('.card');if(!card)return;var x=copy(),box=document.createElement('div');box.id='homeIso';box.className='home-iso';box.innerHTML='<div class="hub-heading compact"><h3 id="isoTitle"></h3><p id="isoDesc"></p></div>';bin.insertAdjacentElement('afterend',box);box.appendChild(card);card.classList.add('iso-card');$('isoTitle').textContent=x.iso;$('isoDesc').textContent=x.isoSub;}
  function nav(){document.querySelectorAll('.tabs [data-view="bw"],.tabs [data-view="well"]').forEach(function(b){b.remove();});var p=document.querySelector('.tabs [data-view="play"] span');if(p)p.textContent='Playlists';var tabs=document.querySelector('.tabs');if(tabs&&!document.body.classList.contains('desk'))tabs.style.gridTemplateColumns='repeat('+tabs.querySelectorAll('button').length+',1fr)';var w=$('view-well');if(w)w.hidden=true;}
  var oldShow=window.showView;if(typeof oldShow==='function')window.showView=function(v){return oldShow.call(this,v==='bw'||v==='well'?'play':v);};
  var oldLang=window.applyLang;if(typeof oldLang==='function')window.applyLang=function(){var r=oldLang.apply(this,arguments);refresh();return r;};
  function player(){var b=$('bwBar');if(!b)return;b.hidden=false;var local=document.querySelector('#view-play .pl-player');if(local)local.hidden=true;}
  function refresh(){var p=$('view-play');if(!p)return;sourceHub(p);mergeBrainwaves(p);moveIso();nav();player();}
  var n=0,iv=setInterval(function(){try{refresh();}catch(e){console.error('3.18 layout',e);}if(++n>30){clearInterval(iv);setInterval(player,500);}},350);
})();
