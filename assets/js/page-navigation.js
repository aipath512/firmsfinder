/* FirmsFinder shared page navigation: top / bottom */
(function(){
'use strict';
if(document.getElementById('ff-page-navigation'))return;
function init(){
 if(document.getElementById('ff-page-navigation'))return;
 var nav=document.createElement('nav');
 nav.id='ff-page-navigation';nav.className='ff-page-navigation';
 nav.setAttribute('aria-label','Navigare rapidă în pagină');
 nav.innerHTML='<button type="button" data-target="top" aria-label="Mergi la începutul paginii" title="Sus">↑</button><button type="button" data-target="bottom" aria-label="Mergi la sfârșitul paginii" title="Jos">↓</button>';
 document.body.appendChild(nav);
 var up=nav.querySelector('[data-target="top"]'),down=nav.querySelector('[data-target="bottom"]');
 var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function move(target){window.scrollTo({top:target==='top'?0:document.documentElement.scrollHeight,behavior:reduced?'auto':'smooth'});}
 up.addEventListener('click',function(){move('top')});
 down.addEventListener('click',function(){move('bottom')});
 var ticking=false;
 function update(){
  var y=window.scrollY||document.documentElement.scrollTop;
  var max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  nav.classList.toggle('is-visible',max>600&&y>180);
  up.disabled=y<=8;down.disabled=y>=max-8;
  ticking=false;
 }
 function requestUpdate(){if(!ticking){ticking=true;window.requestAnimationFrame(update);}}
 window.addEventListener('scroll',requestUpdate,{passive:true});
 window.addEventListener('resize',requestUpdate,{passive:true});
 update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
