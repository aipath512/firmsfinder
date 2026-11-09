// SCARA import — only GitHub Actions OIDC tokens from the exact repository / workflow may write.
// No static admin keys, no public unauthenticated write route.
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const B64=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));
async function verifyGitHubOIDC(request){
 const match=/^Bearer (\S+)$/.exec(request.headers.get("authorization")||"");
 if(!match)return false;
 const parts=match[1].split(".");
 if(parts.length!==3)return false;
 const header=JSON.parse(new TextDecoder().decode(B64(parts[0])));
 const payload=JSON.parse(new TextDecoder().decode(B64(parts[1])));
 const now=Math.floor(Date.now()/1000);
 if(header.alg!=="RS256"||!header.kid||
    payload.iss!=="https://token.actions.githubusercontent.com"||
    payload.aud!=="firmsfinder-anaf-import"||
    payload.repository!=="aipath512/firmsfinder"||
    payload.ref!=="refs/heads/main"||
    payload.workflow_ref!=="aipath512/firmsfinder/.github/workflows/anaf-2026-import-d1.yml@refs/heads/main"||
    !Number.isFinite(payload.exp)||payload.exp<now||!Number.isFinite(payload.iat)||payload.iat>now+90)return false;
 const jwks=await fetch("https://token.actions.githubusercontent.com/.well-known/jwks",{cf:{cacheTtl:3600}});
 if(!jwks.ok)return false;
 const keys=(await jwks.json()).keys||[];
 const jwk=keys.find(k=>k.kid===header.kid&&k.kty==="RSA"&&(!k.alg||k.alg==="RS256"));
 if(!jwk)return false;
 const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
 return crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,B64(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
}
export async function onRequestGet(){return json({service:"SCARA ANAF OIDC importer",version:"import-v2-deployment-gate",write_access:"OIDC-only"});}
export async function onRequestPost({request,env}){
 if(!env.DB)return json({error:"D1 binding unavailable"},503);
 let trusted=false;
 try{trusted=await verifyGitHubOIDC(request);}catch(e){console.error("oidc-verify",String(e).slice(0,100));}
 if(!trusted)return json({error:"GitHub Actions OIDC authorization required"},403);
 let body;try{body=await request.json();}catch{return json({error:"Invalid JSON"},400);}
 if(!Array.isArray(body.records)||body.records.length>100)return json({error:"Expected <=100 records"},400);
 const rows=[];
 for(const r of body.records){
   const cui=Number(r.cui), phone=String(r.telefon||"").trim();
   if(!Number.isSafeInteger(cui)||cui<100||cui>9999999999||phone.length<6||phone.length>90||!/[0-9]{6}/.test(phone.replace(/[^0-9]/g,"")))return json({error:"Invalid CUI or phone"},400);
   rows.push({cui,phone});
 }
 let stage="create-table";
 try{
   await env.DB.exec(`CREATE TABLE IF NOT EXISTS scara_anaf_2026_phone (
     cui INTEGER PRIMARY KEY, telefon_raw TEXT NOT NULL,
     source TEXT NOT NULL DEFAULT 'ANAF_v9',
     queried_at TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0)`);
   stage="prepare-upsert";
   const yearStart="2026-01-01",yearEnd="2027-01-01";
   const savedAt=new Date().toISOString();
   // Confirm each CUI belongs to a 2026 ONRC legal entity before persisting.
   const stmt=env.DB.prepare(`INSERT INTO scara_anaf_2026_phone
      (cui,telefon_raw,source,queried_at,verified)
      SELECT f.cui,?,'ANAF_v9',?,0 FROM onrc_firme f
      WHERE f.cui=? AND f.top=1 AND COALESCE(f.persoana_fizica,0)=0
      AND f.data_inmatriculare>=? AND f.data_inmatriculare<?
      ON CONFLICT(cui) DO UPDATE SET telefon_raw=excluded.telefon_raw,
         queried_at=excluded.queried_at`);
   stage="write-rows";
   for(const r of rows)await stmt.bind(r.phone,savedAt,r.cui,yearStart,yearEnd).run();
   stage="readback";
   const ids=rows.map(r=>r.cui);
   let persisted=0;
   for(const id of ids){
      const res=await env.DB.prepare("SELECT 1 AS ok FROM scara_anaf_2026_phone WHERE cui=?").bind(id).first();
      if(res)persisted++;
   }
   return json({requested:rows.length,persisted,source:"ANAF_v9",year:2026,verified_required:false,complete:persisted===rows.length},persisted===rows.length?200:409);
 }catch(e){
   const detail=String(e?.message||e).slice(0,240);
   console.error("scara-anaf-import",stage,detail);
   // Caller has already passed signed GitHub OIDC; safe to expose SQL diagnostic to CI only.
   return json({error:"D1 import failed",stage,detail},503);
 }
}
