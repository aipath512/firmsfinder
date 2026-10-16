import {test,before} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
// Testează fișierul real functions/api/piata.js (copiat ca .mjs) pe tabele cu aceeași schemă ca în D1, în SQLite.
const dir=mkdtempSync(join(tmpdir(),'ff-piata-'));
writeFileSync(join(dir,'piata.mjs'),readFileSync(new URL('../functions/api/piata.js',import.meta.url),'utf8'));
const {onRequestGet}=await import(join(dir,'piata.mjs'));
let db,env;
before(()=>{
 db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE sumar_judet_caen(an INTEGER NOT NULL, judet TEXT NOT NULL, caen TEXT NOT NULL, firme INTEGER, salariati INTEGER, cifra_afaceri INTEGER, profit_net INTEGER, PRIMARY KEY(an, judet, caen)) WITHOUT ROWID;
 CREATE TABLE onrc_nom_caen(versiune INTEGER, clasa TEXT, denumire TEXT);
 INSERT INTO onrc_nom_caen VALUES (2,'6201','Activități de realizare a software-ului la comandă'),(2,'6920','Activități de contabilitate'),(1,'6201','VECHI');
 INSERT INTO sumar_judet_caen VALUES
 (2025,'Cluj','6201',2342,7509,3185146077,0),(2023,'Cluj','6201',2000,6000,2000000000,0),
 (2025,'Cluj','6920',900,1500,300000000,0),(2025,'Cluj','4120',0,0,0,0),
 (2025,'București','6201',5000,40000,30000000000,0),(2025,'București','6920',2500,9000,2000000000,0),
 (2025,'Iași','6201',700,2000,900000000,0);`);
 env={DB:{prepare(q){const st=db.prepare(q);let a=[];return {bind(...v){a=v;return this;},async run(){st.run(...a);return {success:true};},async first(){return st.get(...a)??null;},async all(){return {results:st.all(...a)};}};}}};
});
const get=(qs,e=env)=>onRequestGet({request:new Request('https://x/api/piata?'+qs),env:e});

test('lista județelor, în ordine, fără duplicate',async()=>{
 const r=await get('judete=1');assert.equal(r.status,200);
 assert.deepEqual((await r.json()).judete,['Cluj','Iași','București'].sort());
});
test('un județ: activități sortate după firme, fără rânduri cu 0 firme, cu denumire CAEN din versiunea 2',async()=>{
 const d=await (await get('judet=Cluj')).json();
 assert.equal(d.judete.length,1);const j=d.judete[0];
 assert.deepEqual(j.activitati.map(x=>x.caen),['6201','6920']);
 assert.equal(j.activitati[0].denumire,'Activități de realizare a software-ului la comandă');
 assert.equal(j.activitati[0].firme_2023,2000);assert.equal(j.activitati[0].ca_mediu,Math.round(3185146077/2342));
 assert.equal(j.total.firme,2342+900);
});
test('diacritice și majuscule: „bucuresti” găsește „București”',async()=>{
 const d=await (await get('judet=BUCURESTI')).json();assert.equal(d.judete[0].judet,'București');
});
test('comparare: două județe în ordinea cerută; același județ de două ori dă unul singur',async()=>{
 const d=await (await get('judet=Cluj&judet2=Iasi')).json();
 assert.deepEqual(d.judete.map(x=>x.judet),['Cluj','Iași']);
 const e=await (await get('judet=Cluj&judet2=cluj')).json();assert.equal(e.judete.length,1);
});
test('județ necunoscut sau injecție: 400, nimic nu ajunge în SQL',async()=>{
 for(const v of ["Atlantida","Cluj'; DROP TABLE sumar_judet_caen;--",'']){
  const r=await get('judet='+encodeURIComponent(v));assert.equal(r.status,400,v);assert.equal(r.headers.get('cache-control'),'no-store');
 }
 assert.equal((await get('judet=Cluj&judet2=Nicaieri')).status,400);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM sumar_judet_caen').get().n,7);
});
test('răspunsul spune deschis ce nu este: nu evaluare de potențial, primele N activități, sursa',async()=>{
 const d=await (await get('judet=Cluj')).json();
 assert.match(d.nota,/nu o evaluare a potențialului/);assert.match(d.nota,/primele 120/);assert.match(d.surse,/ONRC/);
});
test('calea veche (?caen=) rămâne neschimbată',async()=>{
 const r=await get('caen=6201');assert.equal(r.status,200);const d=await r.json();
 assert.equal(d.caen,'6201');assert.equal(d.total.firme,2342+5000+700);assert.equal(d.judete[0].judet,'București');
 assert.equal((await get('caen=abc')).status,400);
});
test('fără bază de date: 503; bază stricată: 502 fără detalii interne',async()=>{
 assert.equal((await get('judet=Cluj',{})).status,503);
 const rau={DB:{prepare(){throw new Error('secret intern')}}};const r=await get('judet=Cluj',rau);
 assert.equal(r.status,502);assert.ok(!JSON.stringify(await r.json()).includes('secret'));
});
test('răspunsul nu conține câmpuri personale sau de contact',async()=>{
 const t=JSON.stringify(await (await get('judet=Cluj&judet2=Iasi')).json());
 assert.ok(!/@|telefon|email|cnp/i.test(t));
});
