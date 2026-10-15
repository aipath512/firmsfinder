const $=s=>document.querySelector(s);
const message=text=>{if($('#message'))$('#message').textContent=text;};
function element(tag,text,parent){const x=document.createElement(tag);x.textContent=String(text??'Necunoscut');if(parent)parent.append(x);return x;}
async function call(url,options){const r=await fetch(url,options),d=await r.json();if(!r.ok)throw new Error(d.error||d.notice||'Cerere eșuată ('+r.status+').');if(d.status==='BACKEND_REQUIRED')throw new Error('Backend-ul nu este încă activ. Fișierul public este doar manifestul.');return d;}
function renderCompanies(d){
 const box=$('#results');box.replaceChildren();
 for(const c of d.results){const article=element('article','',box);article.className='result';const h=element('h2','',article);if(c.mascat)element('span',c.denumire,h);else{const a=element('a',c.denumire,h);a.href='/firme/'+encodeURIComponent(c.cui)+'/';}element('p','CUI '+c.cui+' · '+(c.judet??'Necunoscut')+' · '+(c.localitate??'Necunoscut'),article);element('p','CAEN Rev.2 · MF 2024: '+(c.caen_mf??'Necunoscut'),article);const ani=[2023,2024,2025],fy=(k,u)=>ani.map(y=>y+': '+(c[k+y]!=null?Number(c[k+y]).toLocaleString('ro-RO')+u:'—')).join(' · ');element('p','Cifră de afaceri · '+fy('cifra_afaceri_',' lei'),article);element('p','Salariați · '+fy('salariati_',''),article);}
 message(d.results.length?d.results.length+' rezultate (maximum 50).':'Nicio firmă găsită. Încercați: eliminați un filtru, măriți intervalul cifrei de afaceri sau verificați ortografia.');
 $('#next').hidden=!d.has_more;
 if($('#export'))$('#export').hidden=!d.results.some(c=>!c.mascat);window.__rez=d.results;
 const aux=$('#aux');if(aux){aux.replaceChildren();
  const go=(name,val)=>{const f=$('#search-form').elements.namedItem(name);if(f){f.value=val;$('#search-form').requestSubmit();}};
  if(d.sugestie){const p=element('p','Ai vrut să spui: ',aux);const b=element('button',d.sugestie+'?',p);b.type='button';b.addEventListener('click',()=>go('q',d.sugestie));}
  if(d.sinonime&&d.sinonime.length){const p=element('p','Căutați după activitate: ',aux);for(const x of d.sinonime){const b=element('button',x.eticheta+' (CAEN '+x.caen+')',p);b.type='button';b.addEventListener('click',()=>{const f=$('#search-form');f.elements.namedItem('q').value='';go('caen',x.caen);});p.append(' ');}}
  if(d.facete&&d.facete.judet&&d.facete.judet.length){const p=element('p','Județe în rezultate: ',aux);for(const x of d.facete.judet){const b=element('button',x.v+' ('+Number(x.n).toLocaleString('ro-RO')+')',p);b.type='button';b.addEventListener('click',()=>go('judet',x.v));p.append(' ');}}
 }
}
if($('#search-form')){
 let page=1;const form=$('#search-form');const initial=new URLSearchParams(location.search);
 for(const [key,v] of initial){{const f=form.elements.namedItem(key);if(f){if(f.type==='checkbox')f.checked=true;else f.value=v;}}}
 const LBL={q:'Nume',caen:'CAEN',judet:'Județ',fara_judet:'Fără județ',localitate:'Localitate',cmin:'CA ≥',cmax:'CA ≤',smin:'Salariați ≥',smax:'Salariați ≤',trend:'Evoluție',sort:'Sortare',profit_pozitiv:'Profit',fara_pierdere:'Fără pierdere'};
 function chips(params){const box=$('#chips');if(!box)return;box.replaceChildren();for(const [k,v] of params){if(!LBL[k]||k==='page')continue;const b=element('button',LBL[k]+': '+(v==='1'?'da':v)+' ×',box);b.type='button';b.addEventListener('click',()=>{const f=form.elements.namedItem(k);if(f){if(f.type==='checkbox')f.checked=false;else f.value='';}page=1;run();});}}
 async function run(){try{message('Caut…');const params=new URLSearchParams();for(const [k,v] of new FormData(form))if(String(v).trim())params.set(k,String(v).trim());chips(params);params.set('page',page);params.set('facete','1');renderCompanies(await call('/api/companies/search?'+params));}catch(e){message(e.message);$('#results').replaceChildren();$('#next').hidden=true;}}
 const sg=$('#sugestii'),qi=form.elements.namedItem('q');let tm;
 if(sg&&qi)qi.addEventListener('input',()=>{clearTimeout(tm);const v=qi.value.trim();if(v.length<3){sg.replaceChildren();return;}tm=setTimeout(async()=>{try{const r=await fetch('/api/companies/suggest?q='+encodeURIComponent(v));const l=await r.json();sg.replaceChildren();for(const n of l){const o=document.createElement('option');o.value=n;sg.append(o);}}catch(e){}},250);});
 if($('#export'))$('#export').addEventListener('click',()=>{const rows=(window.__rez||[]).filter(c=>!c.mascat);const cols=['cui','denumire','forma_juridica','judet','localitate','caen_mf','data_inmatriculare','cifra_afaceri_2024','salariati_2024','profit_net_2024'];const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv='\ufeff'+cols.join(',')+'\n'+rows.map(c=>cols.map(k=>esc(c[k])).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='firmsfinder_rezultate.csv';a.click();});
 const KEY='ff_cautari_salvate';const citeste=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){return [];}};
 const scrie=l=>{try{localStorage.setItem(KEY,JSON.stringify(l.slice(0,10)));}catch(e){message('Browserul nu permite salvarea.');}};
 function arataSalvate(){const box=$('#salvate');if(!box)return;box.replaceChildren();const l=citeste();if(!l.length)return;element('p','Căutări salvate (doar în acest browser):',box);
  l.forEach((x,i)=>{const p=element('p','',box);const b=element('button',x.nume,p);b.type='button';b.addEventListener('click',()=>{for(const el of form.elements){if(!el.name)continue;const v=x.p[el.name];if(el.type==='checkbox')el.checked=!!v;else el.value=v||'';}page=1;run();});p.append(' ');const d=element('button','șterge',p);d.type='button';d.addEventListener('click',()=>{const n=citeste();n.splice(i,1);scrie(n);arataSalvate();});});}
 if($('#salveaza'))$('#salveaza').addEventListener('click',()=>{const pr={};for(const [k,v] of new FormData(form))if(String(v).trim())pr[k]=String(v).trim();if(!Object.keys(pr).length){message('Completați mai întâi criteriile.');return;}const nume=Object.values(pr).join(' · ').slice(0,60);const l=citeste();l.unshift({nume,p:pr});scrie(l);arataSalvate();message('Căutare salvată în acest browser.');});
 arataSalvate();
 form.addEventListener('submit',e=>{e.preventDefault();page=1;run();});$('#next').addEventListener('click',()=>{page++;run();});if(initial.size)run();
}
if($('#compare-form'))$('#compare-form').addEventListener('submit',async e=>{
 e.preventDefault();try{
 message('Compar…');const ids=String(new FormData(e.target).get('ids')).split(',').map(x=>x.trim()).filter(Boolean);
 const d=await call('/api/companies/compare',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ids})});const box=$('#results');box.replaceChildren();
 const table=element('table','',box),caption=element('caption','Comparație; null = necunoscut',table),thead=element('thead','',table),hr=element('tr','',thead);
 element('th','Câmp',hr).scope='col';for(const c of d.results)element('th',c.denumire,hr).scope='col';
 const tbody=element('tbody','',table);for(const field of d.fields){const row=element('tr','',tbody);element('th',field,row).scope='row';for(const c of d.results)element('td',c[field],row);}
 for(const c of d.results){const p=element('p','',box),a=element('a','Profil și surse: '+c.denumire,p);a.href='/firme/'+c.cui+'/';}message('Comparație încărcată.');
 }catch(e){message(e.message);}
});
if($('#contact-form'))$('#contact-form').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target;try{const d=Object.fromEntries(new FormData(form));d.privacy_acknowledged=form.elements.privacy_acknowledged.checked;
 const r=await call('/api/contact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)});message('Cerere înregistrată: '+r.id+'. Email automat: '+(r.email_sent?'trimis':'nu este trimis de acest modul')+'.');form.reset();
 }catch(e){message(e.message);}
});
if($('#taxonomy-form')){
 let page=1;async function run(){try{const revision=new FormData($('#taxonomy-form')).get('revision');const d=await call('/taxonomy.json?revision='+revision+'&page='+page),box=$('#results');box.replaceChildren();
 if(!d.entries?.length){message('Nomenclatorul acestei ediții nu este încărcat în DB.');$('#next').hidden=true;return;}
 const ul=element('ul','',box);for(const c of d.entries){const li=element('li','',ul);if(Number(revision)===2){const a=element('a',c.code+' · '+c.label,li);a.href='/cautare/?caen='+encodeURIComponent(c.code);}else element('span',c.code+' · '+c.label+' — filtrul MF 2024 rămâne Rev.2',li);}
 message('CAEN Rev.'+revision+' · pagina '+page);$('#next').hidden=!d.has_more;}catch(e){message(e.message);}}
 $('#taxonomy-form').addEventListener('submit',e=>{e.preventDefault();page=1;run();});$('#next').addEventListener('click',()=>{page++;run();});
}
