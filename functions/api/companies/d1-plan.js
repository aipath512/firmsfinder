// Read-only diagnostics: index names and planner choice, not company data.
const reply=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function onRequestGet({env}){
 if(!env.DB)return reply({error:"D1 binding missing"},503);
 const outcome={ok:true,tables:{},plans:{}};
 try{
  for(const name of ["onrc_firme","onrc_firma_caen","firme_site"]){
   const indices=await env.DB.prepare("PRAGMA index_list('"+name+"')").all();
   outcome.tables[name]=(indices.results||[]).map(x=>({name:x.name,unique:x.unique,origin:x.origin}));
  }
  const probes={
   all:"SELECT cui FROM onrc_firme WHERE top=1 AND data_inmatriculare>='2026-01-01' AND data_inmatriculare<'2027-01-01' ORDER BY data_inmatriculare DESC,cui DESC LIMIT 51",
   caen:"SELECT f.cui FROM onrc_firma_caen fc JOIN onrc_firme f ON f.cod_inmatriculare=fc.cod_inmatriculare WHERE f.top=1 AND f.data_inmatriculare>='2026-01-01' AND f.data_inmatriculare<'2027-01-01' AND (','||REPLACE(fc.caen,' ','')||',') LIKE '%,4322:%' ORDER BY f.data_inmatriculare DESC,f.cui DESC LIMIT 51",
   contacts:"SELECT cui FROM firme_site WHERE telefoane GLOB '*[0-9]*' LIMIT 51"
  };
  for(const [k,sql] of Object.entries(probes)){
   const p=await env.DB.prepare("EXPLAIN QUERY PLAN "+sql).all();
   outcome.plans[k]=(p.results||[]).map(x=>String(x.detail||""));
  }
  return reply(outcome);
 }catch(e){
  outcome.ok=false;outcome.error=String(e?.message||e).slice(0,180);
  return reply(outcome,503);
 }
}