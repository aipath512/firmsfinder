// FirmsFinder ON-SITE extension. Existing ONRC/MF tables are read-only.
export const VERSION = '1.0.0';
export const BASE = 'https://firmsfinder.eu';
const enc = new TextEncoder();
export const hash = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const json = (v,status=200) => Response.json(v,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
const err = (status,message) => Object.assign(new Error(message),{status});
const esc = v=>String(v??'Necunoscut').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now = ()=>new Date().toISOString();
const cuid = v => { if(!/^\d{2,10}$/.test(String(v))) throw err(400,'CUI invalid.'); return Number(v); };
function integer(v,lo,hi,def) { if(v===undefined||v===null||v==='') return def; const n=Number(v); if(!Number.isInteger(n)||n<lo||n>hi) throw err(400,'Număr în afara limitelor.'); return n; }
function limited(v,max) { if(v===null||v===undefined) return ''; if(typeof v!=='string'||v.length>max) throw err(400,'Text invalid sau prea lung.'); return v.trim(); }
async function body(request) {
 if(!request.headers.get('content-type')?.includes('application/json')) throw err(415,'Content-Type application/json necesar.');
 const reader=request.body?.getReader(); let size=0,parts=[];
 if(!reader) throw err(400,'Lipsește corpul cererii.');
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();throw err(413,'Cerere prea lungă.');}parts.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
 let d;try{d=JSON.parse(new TextDecoder().decode(bytes));}catch{throw err(400,'JSON invalid.');}
 if(!d||typeof d!=='object'||Array.isArray(d))throw err(400,'Obiect JSON necesar.');return d;
}
async function actor(request,env){
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'');if(!token)throw err(401,'Bearer token necesar.');
 let clients;try{clients=JSON.parse(env.FF_CLIENTS_JSON||'[]');}catch{throw err(503,'Configurație client invalidă.');}
 const digest=await hash(token);const c=clients.find(x=>x.token_sha256===digest && x.revoked!==true);
 if(!c||!c.id||!Array.isArray(c.scopes))throw err(401,'Token invalid sau revocat.');return c;
}
async function rate(request,env,key,limit=30){
 if(!env.DB||!env.FF_RATE_SECRET)throw err(503,'Lipsesc binding-ul DB sau secretul FF_RATE_SECRET.');
 const bucket=Math.floor(Date.now()/60000);const ident=await hash(env.FF_RATE_SECRET+':'+key);
 const r=await env.DB.prepare('INSERT INTO ff_rate (actor,bucket,n) VALUES (?,?,1) ON CONFLICT(actor,bucket) DO UPDATE SET n=n+1 RETURNING n').bind(ident,bucket).first();
 if(r.n>limit)throw err(429,'Limită de cereri depășită. Reîncearcă peste un minut.');
}
async function imports(env){return (await env.DB.prepare('SELECT dataset,version,source_url,imported_at,license FROM ff_imports WHERE status=? ORDER BY imported_at DESC').bind('successful').all()).results;}
function provenance(c,meta){
 return {record_verification:'not_independently_verified',sources:[
 {id:'ONRC',url:'https://data.gov.ro/',fields:['denumire','cui','forma_juridica','judet','localitate','coduri_stare'],dataset:meta.find(x=>x.dataset==='onrc')||null},
 {id:'MF-2024',url:'https://data.gov.ro/',fields:['caen_mf','ca_2024','sal_2024','profit_2024'],dataset:meta.find(x=>x.dataset==='mf-2024')||null}],
 note:'Portalul este cunoscut din sursa codului anterior. URL-ul exact al fișierului și data importului rămân necunoscute până la înregistrarea importului real.'};
}
const FROM=`FROM onrc_firme f LEFT JOIN mf_bilant_2024 b ON b.cui=f.cui WHERE f.top=1 AND COALESCE(f.persoana_fizica,0)=0 AND f.cui NOT IN (SELECT cui FROM onrc_excluderi WHERE cui IS NOT NULL)`;
const SELECT=`SELECT f.cui,f.denumire,f.forma_juridica,f.judet,f.localitate,f.coduri_stare,f.data_inmatriculare,b.caen_mf,b.cifra_afaceri AS ca_2024,b.salariati AS sal_2024,b.profit_net AS profit_2024 `;
async function enrich(rows,env){const meta=await imports(env);return rows.map(c=>({...c,canonical_url:BASE+'/firme/'+c.cui+'/',classification:{scheme:'CAEN',revision:2,code:c.caen_mf??null,source:'mf_bilant_2024'},provenance:provenance(c,meta),observed_at:meta.find(x=>x.dataset==='onrc')?.imported_at??null}));}
export async function search(data,env){
 const allowed=['q','caen','revision','judet','localitate','page','limit'];if(Object.keys(data).some(k=>!allowed.includes(k)))throw err(400,'Filtru necunoscut.');
 const q=limited(data.q,120),caen=limited(data.caen,4),judet=limited(data.judet,60),loc=limited(data.localitate,60);
 if(!q&&!caen&&!judet&&!loc)throw err(400,'Introdu un nume, CAEN, județ sau localitate.');
 if(caen&&!/^\d{4}$/.test(caen))throw err(400,'CAEN trebuie să aibă patru cifre.');
 if(data.revision!==undefined&&String(data.revision)!=='2')throw err(400,'Acest filtru folosește CAEN Rev.2 din MF 2024. Rev.3 nu este convertit implicit.');
 const limit=integer(data.limit,1,25,25),page=integer(data.page,1,20,1);let where=FROM,args=[];
 if(q){where+=' AND f.denumire LIKE ? ESCAPE \'\\\'';args.push('%'+q.replace(/[\\%_]/g,c=>'\\'+c)+'%');}
 if(caen){where+=' AND b.caen_mf=?';args.push(caen);}
 if(judet){where+=' AND f.judet=?';args.push(judet);}
 if(loc){where+=' AND f.localitate=?';args.push(loc);}
 const rows=(await env.DB.prepare(SELECT+where+' ORDER BY f.cui LIMIT ? OFFSET ?').bind(...args,limit+1,(page-1)*limit).all()).results;
 return {status:'ok',page,limit,has_more:rows.length>limit,results:await enrich(rows.slice(0,limit),env),limits:{max_page:20,max_results_per_page:25},notice:'Potrivirea după activitate nu dovedește o nevoie de cumpărare.'};
}
export async function getCompany(id,env){
 const c=await env.DB.prepare(SELECT+FROM+' AND f.cui=? LIMIT 1').bind(cuid(id)).first();if(!c)throw err(404,'Firmă absentă sau nepublicabilă.');
 const [result]=await enrich([c],env);
 const services=(await env.DB.prepare('SELECT id,name,description,source_url,observed_at FROM ff_services WHERE cui=? AND status=? AND source_url IS NOT NULL').bind(c.cui,'documented').all()).results;
 return {...result,services,services_notice:services.length?'Servicii documentate de operator; verifică sursa.':'Niciun serviciu documentat în registrul extensiei. CAEN nu este transformat în ofertă.'};
}
export async function compare(data,env){if(!Array.isArray(data.ids)||data.ids.length<2||data.ids.length>4||Object.keys(data).some(k=>k!=='ids'))throw err(400,'Sunt necesare 2–4 CUI-uri.');const ids=[...new Set(data.ids.map(cuid))];if(ids.length!==data.ids.length)throw err(400,'CUI duplicat.');return {status:'ok',fields:['denumire','cui','forma_juridica','judet','localitate','caen_mf','ca_2024','sal_2024','profit_2024','observed_at'],results:await Promise.all(ids.map(id=>getCompany(id,env))),missing_values:'null înseamnă necunoscut, nu zero.'};}
async function audit(env,owner,operation,result,taskId=null){
 const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO ff_audit (id,owner,operation,task_id,at,version,result_sha256) VALUES (?,?,?,?,?,?,?)').bind(id,owner,operation,taskId,now(),VERSION,await hash(JSON.stringify(result))).run();return id;
}
function card(){return {protocolVersion:'0.3.0',name:'FirmsFinder read-only',description:'Căutare, profil și comparație din date ONRC/MF. Fără comenzi comerciale.',url:BASE+'/a2a',version:VERSION,preferredTransport:'JSONRPC',provider:{organization:'AiVenture S.R.L.',url:'https://aiventure.ro/'},capabilities:{streaming:false,pushNotifications:false,stateTransitionHistory:false},defaultInputModes:['application/json'],defaultOutputModes:['application/json'],securitySchemes:{bearer:{type:'http',scheme:'bearer'}},security:[{bearer:[]}],skills:[['company.search','Caută firme'],['company.get','Citește profil'],['company.compare','Compară firme']].map(([id,name])=>({id,name,description:name+' prin DataPart; contract în /a2a-contracts.json.',tags:['company','read-only'],examples:[JSON.stringify(id==='company.get'?{operation:id,cui:'12345678'}:id==='company.compare'?{operation:id,ids:['12345678','23456789']}:{operation:id,caen:'1721',revision:2})]}))};}
export function validateMessage(params){
 const m=params?.message;
 if(!m||m.kind!=='message'||m.role!=='user'||typeof m.messageId!=='string'||m.messageId.length<1||m.messageId.length>128||m.taskId||m.contextId||!Array.isArray(m.parts)||m.parts.length!==1||m.parts[0].kind!=='data'||!m.parts[0].data||typeof m.parts[0].data!=='object'||Array.isArray(m.parts[0].data))throw err(400,'Message nou necesar: kind=message, role=user, messageId și un DataPart. Continuările nu sunt acceptate.');
 return m.parts[0].data;
}
async function a2a(request,env){
 let rpc;try{rpc=await body(request);}catch(e){return json({jsonrpc:'2.0',id:null,error:{code:e.status===400?-32700:-32600,message:e.message}},e.status);}
 const id=rpc.id??null;const fail=(code,message,status=200)=>json({jsonrpc:'2.0',id,error:{code,message}},status);
 if(rpc.jsonrpc!=='2.0'||!['string','number'].includes(typeof rpc.id)||typeof rpc.method!=='string')return fail(-32600,'JSON-RPC request cu id necesar.');
 let client;try{client=await actor(request,env);await rate(request,env,'agent:'+client.id);}catch(e){return fail(-32000,e.message,e.status||500);}
 try{
  if(rpc.method==='tasks/get'||rpc.method==='tasks/cancel'){
   const taskId=limited(rpc.params?.id,128);if(!taskId)throw err(400,'Lipsește task ID.');
   const row=await env.DB.prepare('SELECT task FROM ff_tasks WHERE id=? AND owner=? AND created_at>=?').bind(taskId,client.id,new Date(Date.now()-86400000).toISOString()).first();
   if(!row)return fail(-32001,'Task not found');
   if(rpc.method==='tasks/cancel')return fail(-32002,'Task-ul sincron este deja în stare terminală.');
   const task=JSON.parse(row.task); const n=integer(rpc.params?.historyLength,0,100,0);if(!n)delete task.history;else if(task.history)task.history=task.history.slice(-n);
   return json({jsonrpc:'2.0',id,result:task});
  }
  if(rpc.method!=='message/send')return fail(-32601,'Method not found');
  const input=validateMessage(rpc.params),op=input.operation;
  if(!['company.search','company.get','company.compare'].includes(op)||!client.scopes.includes(op))return fail(-32000,'Operațiune nepermisă. Agentul este read-only.',403);
  const data={...input};delete data.operation;let result;
  if(op==='company.search')result=await search(data,env);
  else if(op==='company.get'){if(Object.keys(data).some(k=>k!=='cui'))throw err(400,'Parametru necunoscut.');result=await getCompany(data.cui,env);}
  else result=await compare(data,env);
  const taskId=crypto.randomUUID(),contextId=crypto.randomUUID();
  const task={kind:'task',id:taskId,contextId,status:{state:'completed',timestamp:now()},artifacts:[{artifactId:crypto.randomUUID(),name:op,parts:[{kind:'data',data:result}]}],history:[{...rpc.params.message,taskId,contextId}]};
  await env.DB.prepare('INSERT INTO ff_tasks (id,owner,created_at,task) VALUES (?,?,?,?)').bind(taskId,client.id,now(),JSON.stringify(task)).run();
  await audit(env,client.id,op,result,taskId);
  return json({jsonrpc:'2.0',id,result:task});
 }catch(e){return fail(e.status===400?-32602:-32603,e.status&&e.status<500?e.message:'Operațiune eșuată. Verifică schema DB și migration.',e.status||500);}
}
function profile(c){
 const fields={Denumire:c.denumire,CUI:c.cui,'Formă juridică':c.forma_juridica,Județ:c.judet,Localitate:c.localitate,'Cod CAEN Rev.2 · MF 2024':c.caen_mf,'Cifră de afaceri 2024 · RON':c.ca_2024,'Salariați 2024':c.sal_2024,'Profit net 2024 · RON':c.profit_2024,'Data importului ONRC':c.observed_at};
 const schema={'@context':'https://schema.org','@type':'Organization','@id':c.canonical_url+'#organization',name:c.denumire,url:c.canonical_url,identifier:{'@type':'PropertyValue',propertyID:'CUI',value:String(c.cui)}};
 const page=`<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.denumire)} | FirmsFinder</title><link rel="canonical" href="${c.canonical_url}"><meta name="description" content="Profil ${esc(c.denumire)}: identificare, activitate și date financiare disponibile."><link rel="stylesheet" href="/onsite.css"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head><body><main><nav aria-label="Breadcrumb"><a href="/">Acasă</a> / <a href="/cautare/">Căutare</a> / ${esc(c.denumire)}</nav><h1>${esc(c.denumire)}</h1><section id="identitate"><h2>Identitate și date disponibile</h2><table><caption>Valori lipsă: necunoscute</caption><thead><tr><th scope="col">Câmp</th><th scope="col">Valoare</th></tr></thead><tbody>${Object.entries(fields).map(([k,v])=>`<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></section><section id="servicii"><h2>Servicii documentate</h2><p>${esc(c.services_notice)}</p>${c.services.map(s=>`<p>${esc(s.name)} — ${esc(s.description)} · <a href="${esc(s.source_url)}" rel="noopener">Sursă</a> · ${esc(s.observed_at)}</p>`).join('')}</section><section id="surse"><h2>Surse și limite</h2><p>ONRC și Ministerul Finanțelor, prin <a href="https://data.gov.ro/">data.gov.ro</a>. Originea este declarată în codul sursă anterior. Verificarea independentă a înregistrării: nerealizată. Datele importului și URL-ul setului exact: ${c.observed_at?'vezi JSON':'necunoscute'}.</p><p>Un cod CAEN nu dovedește un produs, un serviciu oferit sau o intenție de cumpărare.</p><a href="/api/companies/${c.cui}">Profil JSON și proveniență</a> · <a href="/contact/">Solicită o corectură</a></section></main><footer><!--angajament:1.0--><div class="angajament"><link rel="stylesheet" href="/angajament.css"><a class="angajament-badge" href="https://eu-ai-act-ready.eu/" rel="noopener"><img src="/assets/eu-ai-act-ready-2aug2026_256x256_v1.0_2026-10-16.webp" width="96" height="96" alt="EU AI Act Ready: kit cu 70 de documente, 10 module" loading="lazy"></a><p>Angajament de transparență v1.0 (16 octombrie 2026): memorăm doar ce declarăm. Fără acordul dumneavoastră, doar numărători, 24 de luni. Cu acord, text și selecții, cel mult 30 de zile. Nu stocăm în jurnal IP, email sau nume. <a href="/angajament/">Citiți și verificați amprenta</a> · <a href="/angajament.json">JSON</a><br><small>Insigna trimite la kitul EU AI Act Ready (70 de documente, 10 module). Nu este o certificare oficială și nu atestă conformitatea acestui site.</small></p></div><!--/angajament--></footer></body></html>`;
 return new Response(page,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'none'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
export async function handle(request,env){
 const u=new URL(request.url),p=u.pathname;
 const known=p==='/a2a'||p==='/.well-known/agent-card.json'||p.startsWith('/api/companies/')||p==='/api/contact'||p==='/api/onsite/status'||p==='/entities.json'||p==='/taxonomy.json'||p==='/services.json'||p==='/entity-relationships.json'||p==='/data-freshness.json'||p==='/api/onsite/chunks'||/^\/firme\/\d+\/$/.test(p);
 if(!known)return null;
 try{
  if(p==='/.well-known/agent-card.json'){
   if(request.method!=='GET')throw err(405,'Folosește GET.');
   if(!env.DB||!env.FF_CLIENTS_JSON||!env.FF_RATE_SECRET)throw err(503,'Agent neconfigurat; cardul nu este publicat ca funcțional.');return json(card());
  }
  if(p==='/a2a'){if(request.method!=='POST')throw err(405,'Folosește POST.');return await a2a(request,env);}
  if(p==='/api/onsite/status')return json({version:VERSION,db_binding:!!env.DB,rate_secret:!!env.FF_RATE_SECRET,agent_clients_configured:!!env.FF_CLIENTS_JSON,protocol:'0.3.0',deployment_verified:false});
  if(!env.DB)throw err(503,'Binding-ul D1 DB lipsește.');
  if(request.method!=='GET'&&p!=='/api/contact'&&p!=='/api/companies/compare')throw err(405,'Folosește GET.');
  await rate(request,env,'public:'+(request.headers.get('cf-connecting-ip')||'unknown'),p==='/api/contact'?5:30);
  if(p==='/api/contact'){
   if(request.method!=='POST')throw err(405,'Folosește POST.');if(request.headers.get('origin')!==u.origin)throw err(403,'Origine nepermisă.');
   const d=await body(request);if(d.website)return json({accepted:false},400);
   const name=limited(d.name,120),email=limited(d.email,160),message=limited(d.message,2000);
   if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||message.length<10||d.privacy_acknowledged!==true)throw err(400,'Completează nume, email, mesaj și confirmarea informării.');
   const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO ff_contact (id,created_at,name,email,message,status) VALUES (?,?,?,?,?,?)').bind(id,now(),name,email,message,'new').run();
   return json({accepted:true,id,delivery:'saved_in_D1',email_sent:false,notice:'Cererea a fost înregistrată. Acest endpoint nu trimite email.'},201);
  }
  if(p==='/api/companies/search')return json(await search(Object.fromEntries(u.searchParams),env));
  if(p==='/api/companies/compare'){if(request.method!=='POST')throw err(405,'Folosește POST.');return json(await compare(await body(request),env));}
  const match=p.match(/^\/(?:api\/companies|firme)\/(\d+)\/?$/);if(match){const c=await getCompany(match[1],env);return p.startsWith('/firme/')?profile(c):json({status:'ok',result:c});}
  if(p==='/data-freshness.json')return json({datasets:await imports(env),unknown_means:'Niciun import nu a fost înscris în registrul extensiei; nu deduce actualitatea din data paginii.'});
  if(p==='/taxonomy.json'){
   const revision=integer(u.searchParams.get('revision'),2,3,2),page=integer(u.searchParams.get('page'),1,100,1);
   const rows=(await env.DB.prepare('SELECT clasa AS code,denumire AS label FROM onrc_nom_caen WHERE versiune=? AND clasa IS NOT NULL AND clasa<>? ORDER BY clasa LIMIT 101 OFFSET ?').bind(revision,'',(page-1)*100).all()).results;
   return json({scheme:'CAEN',revision,page,has_more:rows.length>100,entries:rows.slice(0,100),mapping_revision_2_to_3:'not_implemented'});
  }
  if(p==='/services.json')return json({items:(await env.DB.prepare('SELECT id,cui,name,description,source_url,observed_at,status FROM ff_services WHERE status=? AND source_url IS NOT NULL ORDER BY id LIMIT 100').bind('documented').all()).results,limit:100,notice:'Numai servicii documentate; nu sunt deduse din CAEN.'});
  if(p==='/entities.json'||p==='/entity-relationships.json'){
   const page=integer(u.searchParams.get('page'),1,100,1),rows=(await env.DB.prepare(SELECT+FROM+' ORDER BY f.cui LIMIT 101 OFFSET ?').bind((page-1)*100).all()).results;
   const cs=await enrich(rows.slice(0,100),env);
   return json({page,has_more:rows.length>100,items:p==='/entities.json'?cs.map(c=>({id:BASE+'/firme/'+c.cui+'/#organization',type:'Company',...c})):cs.flatMap(c=>[{subject:'RO-CUI-'+c.cui,predicate:'located_in',object:{localitate:c.localitate,judet:c.judet},provenance:c.provenance},...(c.caen_mf?[{subject:'RO-CUI-'+c.cui,predicate:'classified_as',object:{scheme:'CAEN',revision:2,code:c.caen_mf},source:'mf_bilant_2024'}]:[])]),commercial_relationships:'not_inferred'});
  }
  if(p==='/api/onsite/chunks'){
   const c=await getCompany(u.searchParams.get('cui'),env);const text=Object.entries(c).filter(([k,v])=>typeof v==='string'||typeof v==='number').map(([k,v])=>k+': '+v).join('\n');
   return json({chunks:[{id:'RO-CUI-'+c.cui+'-profile',url:c.canonical_url+'#identitate',text,sha256:await hash(text),hash_scope:'UTF-8 text',code_version:VERSION,provenance:c.provenance}]});
  }
  throw err(404,'Rută necunoscută.');
 }catch(e){return json({status:'error',error:e.status&&e.status<500?e.message:'Backend indisponibil. Verifică DB, migrarea și configurarea.',code:e.status||500},e.status||500);}
}
