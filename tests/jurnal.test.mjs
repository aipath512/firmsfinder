import {test,before} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
// Testează fișierul real functions/api/jurnal.js (copiat ca .mjs) pe schema reală backend/market_intent_events_v1.1_2026-10-16.sql, în SQLite.
const dir=mkdtempSync(join(tmpdir(),'ff-jurnal-'));
writeFileSync(join(dir,'jurnal.mjs'),readFileSync(new URL('../functions/api/jurnal.js',import.meta.url),'utf8'));
const {onRequestPost,onRequestDelete}=await import(join(dir,'jurnal.mjs'));
const sql=readFileSync(new URL('../backend/market_intent_events_v1.1_2026-10-16.sql',import.meta.url),'utf8');
let db,env;
before(()=>{
 db=new DatabaseSync(':memory:');db.exec(sql);
 env={DB:{prepare(q){const st=db.prepare(q);let a=[];return {bind(...v){a=v;return this;},async run(){st.run(...a);return {success:true};},async first(){return st.get(...a)??null;},async all(){return {results:st.all(...a)};}};}}};
});
const SID='abcdef123456xyz0',SID2='zzzzzz123456xyz0';
const post=(b,{ua='Mozilla/5.0',raw,e=env}={})=>onRequestPost({request:new Request('https://x/api/jurnal',{method:'POST',headers:{'user-agent':ua,'content-type':'application/json'},body:raw??JSON.stringify(b)}),env:e});
const del=(b)=>onRequestDelete({request:new Request('https://x/api/jurnal',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify(b)}),env});
const rows=(w='1=1',a=[])=>db.prepare('SELECT * FROM market_intent_events WHERE '+w).all(...a);

test('fără acord: doar numărători, fără text și fără cod de sesiune, chiar dacă clientul le trimite',async()=>{
 const r=await post({event_type:'search_completed',sid:SID,consent:false,query:'contabil Ioan 0737123540',caen:'6920',judet:'Cluj',localitate:'Cluj-Napoca',result_count:12,result_count_scope:'page',filtre:{smin:'10'},size_min:10,objective:'find_clients'});
 assert.equal(r.status,204);
 const x=rows("caen='6920'").at(-1);
 assert.equal(x.consent_state,'not_required');
 for(const k of ['session_id','query_raw','query_norm','localitate','size_min','size_max','objective','intent_family','funnel_stage','target_role'])assert.equal(x[k],null,k);
 assert.equal(x.filters_json,'{}');assert.equal(x.judet,'Cluj');assert.equal(x.result_count,12);
 const luni=(new Date(x.retention_until)-new Date(x.occurred_at))/864e5;assert.ok(luni>=720&&luni<=735,String(luni));
});
test('cu acord: text sanitizat, filtre din lista albă, retenție 30 de zile',async()=>{
 const r=await post({event_type:'search_completed',sid:SID,consent:true,query:'Contabil Ioan 0737 123 540 ioan@x.ro RO49AAAA1B31007593840000 1850101123456 Țară',caen:'6920',judet:'Cluj',localitate:'Cluj-Napoca',result_count:0,filtre:{smin:'10',evil:'x',sort:'ca<script>'}});
 assert.equal(r.status,204);
 const x=rows("consent_state='granted'").at(-1);
 assert.equal(x.session_id,SID);assert.ok(!/0737|@|RO49|1850101/.test(x.query_raw),x.query_raw);assert.equal(x.query_norm,'contabil ioan tara');
 assert.equal(x.localitate,'Cluj-Napoca');assert.ok(!x.filters_json.includes('evil'));assert.ok(!x.filters_json.includes('<'));
 const zile=Math.round((new Date(x.retention_until)-new Date(x.occurred_at))/864e5);assert.equal(zile,30);
});
test('zero rezultate: contextul se păstrează doar la zero_results',async()=>{
 await post({event_type:'zero_results',sid:SID,consent:true,query:'zzzz',result_count:0,zero_result_context:'text_only'});
 assert.equal(rows("event_type='zero_results'").at(-1).zero_result_context,'text_only');
 await post({event_type:'search_completed',consent:false,result_count:3,zero_result_context:'text_only'});
 assert.equal(rows("event_type='search_completed'").at(-1).zero_result_context,null);
 await post({event_type:'zero_results',consent:false,result_count:0,zero_result_context:'inventat'});
 assert.equal(rows("event_type='zero_results' AND consent_state='not_required'").at(-1).zero_result_context,'unknown');
});
test('baza de date refuză singură text fără acord (CHECK)',()=>{
 assert.throws(()=>db.prepare("INSERT INTO market_intent_events (event_id,occurred_at,event_type,query_raw,sanitization_version,consent_state,retention_until) VALUES ('x','2026-10-16','search_completed','text','v','not_required','2030-01-01')").run(),/CHECK/);
 assert.throws(()=>db.prepare("INSERT INTO market_intent_events (event_id,occurred_at,event_type,session_id,sanitization_version,consent_state,retention_until) VALUES ('y','2026-10-16','search_completed','abc','v','not_required','2030-01-01')").run(),/CHECK/);
});
test('cereri invalide, boți, cod fals de sesiune, bază lipsă și corp mare',async()=>{
 assert.equal((await post({event_type:'hack'})).status,400);
 assert.equal((await post(null,{raw:'{rău'})).status,400);
 const n=rows().length;assert.equal((await post({event_type:'search_completed'},{ua:'Googlebot/2.1'})).status,204);assert.equal(rows().length,n);
 assert.equal((await post({event_type:'search_completed'},{e:{}})).status,503);
 assert.equal((await post(null,{raw:'x'.repeat(5000)})).status,413);
 await post({event_type:'search_completed',consent:true,sid:'x'});assert.equal(rows("consent_state='granted'").at(-1).session_id!=='x',true);
});
test('limită pe oră pentru un cod de sesiune',async()=>{
 const ins=db.prepare("INSERT INTO market_intent_events (event_id,occurred_at,event_type,session_id,sanitization_version,consent_state,retention_until) VALUES (?,?,?,?,?,?,?)");
 for(let i=0;i<200;i++)ins.run('rl'+i,new Date().toISOString(),'search_completed',SID2,'v','granted','2099-01-01T00:00:00.000Z');
 assert.equal((await post({event_type:'search_completed',consent:true,sid:SID2})).status,429);
});
test('retragerea acordului șterge tot ce ține de cod și nimic altceva',async()=>{
 const inainte=rows("session_id IS NULL").length;
 assert.equal((await del({sid:SID})).status,204);
 assert.equal(rows('session_id=?',[SID]).length,0);assert.ok(rows('session_id=?',[SID2]).length>0);assert.equal(rows("session_id IS NULL").length,inainte);
 assert.equal((await del({sid:'x'})).status,400);
});
test('rândurile expirate se șterg, cele valabile rămân',async()=>{
 db.prepare("INSERT INTO market_intent_events (event_id,occurred_at,event_type,sanitization_version,consent_state,retention_until) VALUES ('old','2020-01-01','search_completed','v','not_required','2020-02-01T00:00:00.000Z')").run();
 const rnd=Math.random;Math.random=()=>0;try{await post({event_type:'search_completed',consent:false,result_count:1});}finally{Math.random=rnd;}
 assert.equal(rows("event_id='old'").length,0);assert.ok(rows().length>0);
});
test('invariant final: niciun rând fără acord nu conține text, cod sau filtre',()=>{
 assert.equal(db.prepare("SELECT COUNT(*) n FROM market_intent_events WHERE consent_state='not_required' AND (session_id IS NOT NULL OR query_raw IS NOT NULL OR query_norm IS NOT NULL OR localitate IS NOT NULL OR filters_json<>'{}')").get().n,0);
});
