// FirmsFinder 2026: list legal entities irrespective of detected site, email or phone.
// Cursor pagination avoids a 50-company total ceiling. Contact completeness is source-dependent.
const LIMIT=50;
const reply=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=90"}});
const yearRO=()=>Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Bucharest",year:"numeric"}).format(new Date()));
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[șş]/gi,"s").replace(/[țţ]/gi,"t").trim().toLowerCase();
function parseValues(raw){
 if(raw==null)return [];
 if(Array.isArray(raw))return raw.flatMap(parseValues);
 let input=String(raw).trim();
 if(!input||input==="null"||input==="[]")return [];
 try{const obj=JSON.parse(input);if(Array.isArray(obj))return parseValues(obj);if(typeof obj==="string")input=obj;}catch{}
 return input.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean);
}
const onlyPhones=raw=>parseValues(raw).filter(v=>(v.match(/\d/g)||[]).length>=6);
const onlyEmails=raw=>parseValues(raw).filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
const unique=values=>[...new Set(values)];
export async function onRequestGet({request,env}){
 if(!env.DB)return reply({error:"D1 indisponibil"},503);
 const p=new URL(request.url).searchParams;
 const year=yearRO(),from=year+"-01-01",to=(year+1)+"-01-01";
 const caen=(p.get("caen")||"").trim(),q=(p.get("q")||"").trim().slice(0,60);
 if(caen&&!/^\d{2,4}$/.test(caen))return reply({error:"CAEN invalid"},400);
 const rawJudet=(p.get("judet")||"").trim().slice(0,80);
 const judet=rawJudet.split(",").map(j=>norm(j)==="bucuresti"?"București":j.trim()).filter(Boolean).slice(0,5);
 const loc=(p.get("localitate")||"").trim().slice(0,60);
 const localitate=norm(loc)==="bucuresti"?"Bucure":loc;
 const cuTelefon=p.get("cu_telefon")==="1";
 const nrInmatriculare=(p.get("nr_inmatriculare")||"").trim().slice(0,70);
 if(nrInmatriculare && !/^[\p{L}\p{N}\/., -]+$/u.test(nrInmatriculare))return reply({error:"Număr de înmatriculare invalid"},400);
 const rawCursor=p.get("cursor")||"";
 let cursor=null;
 if(rawCursor){
   const m=/^(\d{4}-\d{2}-\d{2})\|([^|]{1,160})\|(\d{1,12})$/.exec(rawCursor);
   if(!m||m[1]<from||m[1]>=to)return reply({error:"Cursor invalid; reluați căutarea."},400);
   let registration;
   try{registration=decodeURIComponent(m[2]);}catch{return reply({error:"Cursor invalid"},400);}
   if(registration.length>90)return reply({error:"Cursor invalid"},400);
   cursor={date:m[1],registration,cui:Number(m[3])};
 }
 let stage="select";
 try{
   // Restrict the ONRC query to one 50-row page BEFORE contact enrichment.
   const cond=["f.top=1","f.data_inmatriculare>=?","f.data_inmatriculare<?"];
   const args=[from,to];
   if(caen){
     // Correlated ONRC CAEN membership: avoids exploding the joined search row set.
     cond.push("EXISTS (SELECT 1 FROM onrc_firma_caen fc WHERE fc.cod_inmatriculare=f.cod_inmatriculare AND (',' || REPLACE(fc.caen,' ','') || ',') LIKE ?)");
     args.push('%,'+caen+(caen.length===4?':':'%:')+'%');
   }
   if(q){cond.push("f.denumire LIKE ?");args.push("%"+q.replace(/[%_]/g,"")+"%");}
   if(nrInmatriculare){cond.push("UPPER(TRIM(f.cod_inmatriculare))=UPPER(?)");args.push(nrInmatriculare);}
   if(judet.length){cond.push("f.judet IN ("+judet.map(()=>"?").join(",")+")");args.push(...judet);}
   if(localitate){cond.push("f.localitate LIKE ?");args.push("%"+localitate.replace(/[%_]/g,"")+"%");}
   if(cursor){
     cond.push("(f.data_inmatriculare<? OR (f.data_inmatriculare=? AND f.cui<?))");
     args.push(cursor.date,cursor.date,cursor.cui);
   }
   // Privacy: individual businesses PFA/II/IF are excluded from open contact prospecting.
   cond.push("COALESCE(f.persoana_fizica,0)=0","f.cui IS NOT NULL");
   // Cost-bounded query plans: drive telephone searches from the much smaller
   // contact table (not from every ONRC company). For all firms use the ONRC
   // or CAEN index route, never a per-row correlated telephone lookup.
   const fromClause=cuTelefon
      ? "FROM firme_site fs JOIN onrc_firme f ON f.cui=fs.cui"
      : caen
        ? "FROM onrc_firma_caen fc JOIN onrc_firme f ON f.cod_inmatriculare=fc.cod_inmatriculare"
        : "FROM onrc_firme f";
   if(cuTelefon){
     cond.push("fs.telefoane IS NOT NULL AND TRIM(fs.telefoane) NOT IN ('','[]','null') AND fs.telefoane GLOB '*[0-9]*'");
   }
   // If CAEN already drives the query, reuse that row instead of EXISTS.
   if(caen&&!cuTelefon){
     const oldIndex=cond.findIndex(x=>x.startsWith("EXISTS (SELECT 1 FROM onrc_firma_caen"));
     if(oldIndex>=0)cond[oldIndex]="(',' || REPLACE(fc.caen,' ','') || ',') LIKE ?";
   }
   stage="select";
   const sql=`SELECT DISTINCT f.cui,f.denumire,f.forma_juridica,f.judet,f.localitate,
       f.data_inmatriculare,f.cod_inmatriculare
     ${fromClause} WHERE ${cond.join(" AND ")}
     ORDER BY f.data_inmatriculare DESC,f.cui DESC LIMIT ${LIMIT+1}`;
   const response=await env.DB.prepare(sql).bind(...args).all();
   const found=response.results||[];
   const hasMore=found.length>LIMIT;
   const page=found.slice(0,LIMIT);
   if(!page.length)return reply({results:[],has_more:false,next_cursor:null,limita:LIMIT,
     firme_noi:true,cu_telefon:cuTelefon,an_selectat:year,
     perioada_firme_noi:{from,to,year},note:"Date ONRC și contacte descoperite; lipsa contactului nu dovedește inexistența lui."});
   const ids=unique(page.map(x=>Number(x.cui)));
   const placeholders=ids.map(()=>"?").join(",");
   stage="contact-enrichment";
   const sites=await env.DB.prepare(`SELECT cui,telefoane,emailuri,domeniu FROM firme_site WHERE cui IN (${placeholders})`).bind(...ids).all();
   const contacts=new Map();
   for(const item of sites.results||[]){
      const key=Number(item.cui),c=contacts.get(key)||{telefoane:[],emailuri:[],domenii:[]};
      c.telefoane.push(...onlyPhones(item.telefoane));
      c.emailuri.push(...onlyEmails(item.emailuri));
      if(item.domeniu&&String(item.domeniu).trim())c.domenii.push(String(item.domeniu).trim());
      contacts.set(key,c);
   }
   // Migration-independent fallback: ANAF table can be absent until the batch is imported.

   try{
     stage="anaf-enrichment";
     const extra=await env.DB.prepare(`SELECT cui,telefon_raw FROM scara_anaf_2026_phone WHERE cui IN (${placeholders})`).bind(...ids).all();
     for(const item of extra.results||[]){
       const key=Number(item.cui),c=contacts.get(key)||{telefoane:[],emailuri:[],domenii:[]};
       c.telefoane.push(...onlyPhones(item.telefon_raw));
       contacts.set(key,c);
     }
   }catch(e){
     // ANAF import is optional until D1 migration succeeds. Missing table
     // must not make every 2026 search return HTTP 503.
     console.warn("2026-anaf-enrichment-unavailable",String(e?.message||e).slice(0,100));
   }
   let results=page.map(x=>{
     const c=contacts.get(Number(x.cui))||{telefoane:[],emailuri:[],domenii:[]};
     const telefoane=unique(c.telefoane),emailuri=unique(c.emailuri),domenii=unique(c.domenii);
     return {cui:x.cui,nr_inmatriculare:x.cod_inmatriculare||null,denumire:x.denumire,forma_juridica:x.forma_juridica,
       judet:x.judet,localitate:x.localitate,data_inmatriculare:x.data_inmatriculare,
       caen_mf:caen||null,telefoane,emailuri,are_telefon:telefoane.length>0,
       are_email:emailuri.length>0,are_site:domenii.length>0,
       site:domenii[0]||null};
   });
   const last=page[page.length-1];
   return reply({results,has_more:hasMore,next_cursor:hasMore?last.data_inmatriculare+"|"+encodeURIComponent(last.cod_inmatriculare||"")+"|"+last.cui:null,
     limita:LIMIT,firme_noi:true,cu_telefon:cuTelefon,sort:"LIFO",an_selectat:year,
     perioada_firme_noi:{from,to,year},sursa:"ONRC + contacte FirmsFinder / ANAF (dacă importate)",
     nota:"Paginare a întregului an; telefoanele, emailurile și site-urile sunt doar cele descoperite în sursele disponibile."});
 }catch(e){
   console.error("2026-contact-list",stage,String(e?.message||e).slice(0,200));
   return reply({error:"Căutarea firmelor noi nu poate fi executată în D1.",stage,
     diagnostic:String(e?.message||e).replace(/[^a-zA-Z0-9_.: -]/g," ").slice(0,170)},503);
 }
}
