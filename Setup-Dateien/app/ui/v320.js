/* Aurelune 3.20 – calm, single-column Live screen. */
(function(){
  var $=function(id){return document.getElementById(id);};
  var isDe=function(){return typeof lang!=='undefined'&&lang==='de';};
  function build(){
    var home=$('view-home'),main=home&&home.querySelector('.col-main');if(!main)return false;document.body.classList.add('v320-clean');
    var route=$('routeCard'),target=main.querySelector('.target-box');if(route&&route.parentNode!==main)(target||main.lastChild).insertAdjacentElement('afterend',route);
    if(!$('quickSound')){var bin=$('binCard'),iso=$('homeIso');if(bin&&iso){var d=document.createElement('details');d.id='quickSound';d.className='quick-sound';d.innerHTML='<summary><span>◉</span><b id="quickSoundTitle"></b><small id="quickSoundSub"></small><i>›</i></summary><div id="quickSoundBody"></div>';main.appendChild(d);$('quickSoundBody').appendChild(bin);$('quickSoundBody').appendChild(iso);}}
    var q=$('quickSound');if(q){$('quickSoundTitle').textContent=isDe()?'Brainwaves & isochrone Beats':'Brainwaves & isochronic beats';$('quickSoundSub').textContent=isDe()?'Optional zum Klang hinzufügen':'Optional sound layers';}
    return !!route;
  }
  var oldLang=window.applyLang;if(typeof oldLang==='function')window.applyLang=function(){var r=oldLang.apply(this,arguments);build();return r;};
  var n=0,iv=setInterval(function(){try{if(build()&&++n>12)clearInterval(iv);}catch(e){}},350);
})();
