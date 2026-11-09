// Independent, low-cost ONRC MM-1 lookup. Does NOT use MF balance statements.
// Kept separate from the legacy search endpoint to isolate its expensive query plan.
const reply = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {'content-type':'application/json; charset=utf-8', 'cache-control':'public, max-age=120'}
});
const LIMIT = 50;
function previousMonthRO(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit'}).formatToParts(now);
  const year = Number(parts.find(x=>x.type==='year').value);
  const month = Number(parts.find(x=>x.type==='month').value);
  const prevY=month===1?year-1:year, prevM=month===1?12:month-1;
  return {from:`${prevY}-${String(prevM).padStart(2,'0')}-01`,
          to:`${year}-${String(month).padStart(2,'0')}-01`};
}
export async function onRequestGet({request,env}) {
  if(!env.DB) return reply({error:'Baza de date D1 nu este conectată.'},503);
  const p = new URL(request.url).searchParams;
  const caen = (p.get('caen') || '').trim();
  const q = (p.get('q') || '').trim().slice(0,60);
  const judet = (p.get('judet') || '').trim().slice(0,80);
  const localitate = (p.get('localitate') || '').trim().slice(0,60);
  if(caen && !/^\d{2,4}$/.test(caen)) return reply({error:'CAEN trebuie să conțină 2–4 cifre.'},400);
  const mm1 = previousMonthRO();
  // Index on data_inmatriculare is recommended in staging, once D1 table is inspected.
  const cond = ["f.top=1", "f.data_inmatriculare >= ?", "f.data_inmatriculare < ?"];
  const args = [mm1.from, mm1.to];
  if(caen) {
    cond.push("EXISTS (SELECT 1 FROM onrc_firma_caen fc WHERE fc.cod_inmatriculare=f.cod_inmatriculare AND (',' || REPLACE(fc.caen,' ','') || ',') LIKE ?)");
    // Code:revision boundary: exact class, or prefix division/group.
    args.push('%,' + caen + (caen.length===4 ? ':' : '%:') + '%');
  }
  if(q) {cond.push("f.denumire LIKE ?");args.push('%'+q.replace(/[%_]/g,'')+'%');}
  if(judet) {
    const j = judet.split(',').map(x=>x.trim()).filter(Boolean).slice(0,5);
    if(j.length) {cond.push('f.judet IN ('+j.map(()=>'?').join(',')+')');args.push(...j);}
  }
  if(localitate) {cond.push('f.localitate LIKE ?');args.push('%'+localitate.replace(/[%_]/g,'')+'%');}
  try {
    // No full-portfolio MF joins or costly facet COUNTs. One query, 50 max.
    const sql = `SELECT f.cui,f.denumire,f.forma_juridica,f.persoana_fizica,f.judet,f.localitate,f.data_inmatriculare
       FROM onrc_firme f WHERE ${cond.join(' AND ')}
       ORDER BY f.data_inmatriculare DESC LIMIT ${LIMIT}`;
    const rows = await env.DB.prepare(sql).bind(...args).all();
    const results = (rows.results||[]).map(x => x.persoana_fizica
      ? {cui:'P-'+((x.cui ^ 5921370)>>>0).toString(36).toUpperCase(),
         denumire:(x.forma_juridica||'PFA/II/IF')+' · în așteptarea acordului GDPR',
         judet:x.judet,forma_juridica:x.forma_juridica,mascat:1}
      : {cui:x.cui,denumire:x.denumire,forma_juridica:x.forma_juridica,
         judet:x.judet,localitate:x.localitate,data_inmatriculare:x.data_inmatriculare,caen_mf:caen||null});
    return reply({page:1,results,limita:LIMIT,sort:'nou',has_more:false,
      firme_noi:true,perioada_firme_noi:mm1,sursa:'ONRC — FirmsFinder AI',
      nota:'Rezultate limitate la 50; inventarul SCARA complet se procesează separat.'});
  } catch (err) {
    console.error('firme-noi-search', String(err?.message||err).slice(0,180));
    return reply({error:'Căutarea firmelor noi este indisponibilă; verificați interogarea și indexul ONRC în D1.'},503);
  }
}
