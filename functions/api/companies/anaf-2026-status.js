// Aggregated progress, no CUI or phone numbers exposed.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function onRequestGet({env}){
 if(!env.DB)return json({error:"D1 binding unavailable"},503);
 try{
   const exists=await env.DB.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='scara_anaf_2026_phone'").first();
   if(!exists)return json({year:2026,source:"ANAF_v9",table_exists:false,phones_stored:0,import_confirmed:false});
   const row=await env.DB.prepare("SELECT COUNT(*) AS n FROM scara_anaf_2026_phone WHERE telefon_raw GLOB '*[0-9]*'").first();
   return json({year:2026,source:"ANAF_v9",table_exists:true,phones_stored:Number(row?.n||0),import_confirmed:Number(row?.n||0)>0});
 }catch(e){
   console.error("anaf-2026-status",String(e?.message||e).slice(0,160));
   return json({error:"D1 contact status unavailable"},503);
 }
}
