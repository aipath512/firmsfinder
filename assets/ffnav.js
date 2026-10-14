(function(){var b=document.getElementById('ffh-menu'),n=document.getElementById('ffh-nav');if(!b||!n)return;
b.addEventListener('click',function(){var o=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(o));n.classList.toggle('open',o)});
n.addEventListener('click',function(e){if(e.target.closest('a')){n.classList.remove('open');b.setAttribute('aria-expanded','false')}});})();
