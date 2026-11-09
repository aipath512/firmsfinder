// ONRC current-calendar-year company search (Bucharest time zone). Does NOT require MF balances.
// Kept separate from the legacy search endpoint to isolate its expensive query plan.
const reply = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {'content-type':'application/json; charset=utf-8', 'cache-control':'public, max-age=120'}
});
const LIMIT = 50;
function currentYearRO(now = new Date()) {
 const year = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Bucharest',year:'numeric'}).format(now);
 return {from:year+'-01-01',to:(Number(year)+1)+'-01-01',year:Number(year)};
}
export async function onRequestGet({request,env}) {
  if(!env.DB) return reply({error:'Baza de date D1 nu este conectată.'},503);
  const p = new URL(request.url).searchParams;
  const caen = (p.get('caen') || '').trim();
  const q = (p.get('q') || '').trim().slice(0,60);
  // ONRC stores București with diacritics; accept user text with or without them.
  const norm = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[șş]/gi,'s').replace(/[țţ]/gi,'t').trim().toLowerCase();
  const judetRaw = (p.get('judet') || '').trim().slice(0,80);
  const judet = judetRaw.split(',').map(x => norm(x)==='bucuresti' ? 'București' : x.trim()).join(',');
  const localitateRaw = (p.get('localitate') || '').trim().slice(0,60);
  const localitate = norm(localitateRaw)==='bucuresti' ? 'Bucure' : localitateRaw;
  // No verified/unchecked distinction: any stored numeric phone candidate qualifies.
  const cuTelefon = p.get('cu_telefon') === '1';
  if(caen && !/^\d{2,4}$/.test(caen)) return reply({error:'CAEN trebuie să conțină 2–4 cifre.'},400);
  const period = currentYearRO();
  // ONRC records created in the current calendar year; latest 50 first.
  const cond = ["f.top=1", "f.data_inmatriculare >= ?", "f.data_inmatriculare < ?"];
  const args = [period.from,period.to];
  if(caen) {
    // A code is stored as a comma-delimited code:revision token in ONRC.
    cond.push("(',' || REPLACE(fc.caen,' ','') || ',') LIKE ?");
    args.push('%,' + caen + (caen.length===4 ? ':' : '%:') + '%');
  }
  if(q) {cond.push('f.denumire LIKE ?');args.push('%'+q.replace(/[%_]/g,'')+'%');}
  if(judet) {
    const j=judet.split(',').map(x=>x.trim()).filter(Boolean).slice(0,5);
    if(j.length){cond.push('f.judet IN ('+j.map(()=>'?').join(',')+')');args.push(...j);}
  }
  if(localitate){cond.push('f.localitate LIKE ?');args.push('%'+localitate.replace(/[%_]/g,'')+'%');}
  if(cuTelefon) cond.push("fs.telefoane IS NOT NULL AND TRIM(fs.telefoane) NOT IN ('','[]','null') AND fs.telefoane GLOB '*[0-9]*'");
  try {
    // When filtering contacts, start with the contact table instead of asking D1
    // to evaluate a correlated EXISTS for every ONRC candidate.
    const source = cuTelefon
      ? (caen
          ? 'FROM firme_site fs JOIN onrc_firme f ON f.cui=fs.cui JOIN onrc_firma_caen fc ON fc.cod_inmatriculare=f.cod_inmatriculare'
          : 'FROM firme_site fs JOIN onrc_firme f ON f.cui=fs.cui')
      : (caen
          ? 'FROM onrc_firma_caen fc JOIN onrc_firme f ON f.cod_inmatriculare=fc.cod_inmatriculare'
          : 'FROM onrc_firme f');
    const sql = `SELECT DISTINCT f.cui,f.denumire,f.forma_juridica,f.persoana_fizica,f.judet,f.localitate,f.data_inmatriculare,
        ${cuTelefon ? "fs.telefoane AS telefoane" : "NULL AS telefoane"}
      ${source} WHERE ${cond.join(' AND ')}
      ORDER BY f.data_inmatriculare DESC LIMIT ${LIMIT}`;
    const rows = await env.DB.prepare(sql).bind(...args).all();
    const found = rows.results || [];
    const results = found.map(x => x.persoana_fizica
      ? {cui:'P-'+((x.cui ^ 5921370)>>>0).toString(36).toUpperCase(),
         denumire:(x.forma_juridica||'PFA/II/IF')+' · în așteptarea acordului GDPR',
         judet:x.judet,forma_juridica:x.forma_juridica,mascat:1}
      : {cui:x.cui,denumire:x.denumire,forma_juridica:x.forma_juridica,
         judet:x.judet,localitate:x.localitate,data_inmatriculare:x.data_inmatriculare,caen_mf:caen||null,telefoane:x.telefoane||null});
    return reply({page:1,results,limita:LIMIT,sort:'nou',has_more:false,
      firme_noi:true,cu_telefon:cuTelefon,perioada_firme_noi:period,an_selectat:period.year,sursa:'ONRC — FirmsFinder AI',
      nota:'Rezultate limitate la 50; inventarul SCARA complet se procesează separat.'});
  } catch (err) {
    console.error('firme-noi-search', String(err?.message||err).slice(0,180));
    return reply({error:'Căutarea firmelor noi este indisponibilă; verificați interogarea și indexul ONRC în D1.'},503);
  }
}
