// Independent, low-cost ONRC MM-1 lookup with MM-2 / MM-3 fallback when earlier periods have no matches. Does NOT use MF balance statements.
// Kept separate from the legacy search endpoint to isolate its expensive query plan.
const reply = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {'content-type':'application/json; charset=utf-8', 'cache-control':'public, max-age=120'}
});
const LIMIT = 50;
function previousMonthRO(now = new Date(), monthsBack = 1) {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit'}).formatToParts(now);
  const year = Number(parts.find(x=>x.type==='year').value);
  const month = Number(parts.find(x=>x.type==='month').value);
  const date = new Date(Date.UTC(year, month-1-monthsBack, 1));
  const next = new Date(Date.UTC(year, month-monthsBack, 1));
  const iso = x => x.toISOString().slice(0,10);
  return {from:iso(date), to:iso(next)};
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
  const cuTelefon = p.get('cu_telefon') === '1';
  if(caen && !/^\d{2,4}$/.test(caen)) return reply({error:'CAEN trebuie să conțină 2–4 cifre.'},400);
  const mm1 = previousMonthRO(), mm3 = previousMonthRO(new Date(),3);
  // Search in a single bounded scan, to avoid up to three costly correlated CAEN scans.
  const cond = ["f.top=1", "f.data_inmatriculare >= ?", "f.data_inmatriculare < ?"];
  const args = [mm3.from,mm1.to];
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
  if(cuTelefon) cond.push("EXISTS (SELECT 1 FROM firme_site fs WHERE fs.cui=f.cui AND fs.telefoane IS NOT NULL AND TRIM(fs.telefoane) NOT IN ('','[]','null'))");
  try {
    const source = caen
      ? 'FROM onrc_firma_caen fc JOIN onrc_firme f ON f.cod_inmatriculare=fc.cod_inmatriculare'
      : 'FROM onrc_firme f';
    const sql = `SELECT DISTINCT f.cui,f.denumire,f.forma_juridica,f.persoana_fizica,f.judet,f.localitate,f.data_inmatriculare,
        ${cuTelefon ? "(SELECT fs.telefoane FROM firme_site fs WHERE fs.cui=f.cui AND fs.telefoane IS NOT NULL AND TRIM(fs.telefoane) NOT IN ('','[]','null') LIMIT 1) AS telefoane" : "NULL AS telefoane"}
      ${source} WHERE ${cond.join(' AND ')}
      ORDER BY f.data_inmatriculare DESC LIMIT ${LIMIT}`;
    const rows = await env.DB.prepare(sql).bind(...args).all();
    const sorted = rows.results || [];
    let periodOffset=3, selectedPeriod=mm3, found=[];
    const checkedPeriods=[];
    if(sorted.length){
      const firstDate=sorted[0].data_inmatriculare;
      for(let monthsBack=1;monthsBack<=3;monthsBack++){
        const period=previousMonthRO(new Date(),monthsBack);
        checkedPeriods.push({luna:'MM-'+monthsBack,...period});
        if(firstDate>=period.from && firstDate<period.to){
          periodOffset=monthsBack;selectedPeriod=period;
          found=sorted.filter(x=>x.data_inmatriculare>=period.from && x.data_inmatriculare<period.to);
          break;
        }
      }
    }else {
      for(let monthsBack=1;monthsBack<=3;monthsBack++){
        const period=previousMonthRO(new Date(),monthsBack);
        checkedPeriods.push({luna:'MM-'+monthsBack,...period});
      }
    }
    const results = found.map(x => x.persoana_fizica
      ? {cui:'P-'+((x.cui ^ 5921370)>>>0).toString(36).toUpperCase(),
         denumire:(x.forma_juridica||'PFA/II/IF')+' · în așteptarea acordului GDPR',
         judet:x.judet,forma_juridica:x.forma_juridica,mascat:1}
      : {cui:x.cui,denumire:x.denumire,forma_juridica:x.forma_juridica,
         judet:x.judet,localitate:x.localitate,data_inmatriculare:x.data_inmatriculare,caen_mf:caen||null,telefoane:x.telefoane||null});
    return reply({page:1,results,limita:LIMIT,sort:'nou',has_more:false,
      firme_noi:true,cu_telefon:cuTelefon,perioada_firme_noi:selectedPeriod,luna_selectata:'MM-'+periodOffset,fallback_activat:periodOffset>1,perioade_verificate:checkedPeriods,sursa:'ONRC — FirmsFinder AI',
      nota:'Rezultate limitate la 50; inventarul SCARA complet se procesează separat.'});
  } catch (err) {
    console.error('firme-noi-search', String(err?.message||err).slice(0,180));
    return reply({error:'Căutarea firmelor noi este indisponibilă; verificați interogarea și indexul ONRC în D1.'},503);
  }
}
