const $=s=>document.querySelector(s);
const message=text=>{if($('#message'))$('#message').textContent=text;};
function element(tag,text,parent){const x=document.createElement(tag);x.textContent=String(text??'Necunoscut');if(parent)parent.append(x);return x;}
async function call(url,options){const r=await fetch(url,options),d=await r.json();if(!r.ok)throw new Error(d.error||d.notice||'Cerere eșuată ('+r.status+').');if(d.status==='BACKEND_REQUIRED')throw new Error('Backend-ul nu este încă activ. Fișierul public este doar manifestul.');return d;}
function renderCompanies(d){
 const box=$('#results');box.replaceChildren();
 for(const c of d.results){const article=element('article','',box);article.className='result';const h=element('h2','',article),a=element('a',c.denumire,h);a.href='/firme/'+encodeURIComponent(c.cui)+'/';element('p','CUI '+c.cui+' · '+(c.judet??'Necunoscut')+' · '+(c.localitate??'Necunoscut'),article);element('p','CAEN Rev.2 · MF 2024: '+(c.caen_mf??'Necunoscut'),article);element('p','Cifră de afaceri 2024: '+(c.cifra_afaceri_2024!=null?Number(c.cifra_afaceri_2024).toLocaleString('ro-RO')+' lei':'necunoscută')+' · Salariați: '+(c.salariati_2024!=null?Number(c.salariati_2024).toLocaleString('ro-RO'):'necunoscut'),article);}
 message(d.results.length?'Pagina '+d.page+' · '+d.results.length+' rezultate.':'Nicio firmă găsită pentru criteriile introduse.');
 $('#next').hidden=!d.has_more;
}
if($('#search-form')){
 let page=1;const form=$('#search-form');const initial=new URLSearchParams(location.search);
 for(const [key,v] of initial){if(form.elements.namedItem(key))form.elements.namedItem(key).value=v;}
 async function run(){try{message('Caut…');const params=new URLSearchParams();for(const [k,v] of new FormData(form))if(String(v).trim())params.set(k,String(v).trim());params.set('page',page);renderCompanies(await call('/api/companies/search?'+params));}catch(e){message(e.message);$('#results').replaceChildren();$('#next').hidden=true;}}
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
