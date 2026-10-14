// firmsfinder.eu /api/companies/search -> căutare directă în D1 (binding DB = b2b-romania-db).
// Gratuit, maximum 50 de rezultate per căutare (limită pentru reducerea costurilor).
// Persoanele fizice (PFA/II/IF) sunt mascate, în așteptarea acordului GDPR.
const MAX_REZULTATE = 50;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300'}
});

export async function onRequestGet({request, env}) {
  const p = new URL(request.url).searchParams;
  const caen = (p.get('caen') || '').trim();
  if (!/^\d{4}$/.test(caen)) {
    return json({error: 'Introduceți codul CAEN din 4 cifre (de exemplu 6920). Căutarea după nume nu este disponibilă încă.'}, 400);
  }
  if (!env.DB) return json({error: 'Baza de date nu este conectată momentan.'}, 503);

  const conditii = ['b.caen_mf = ?', 'f.top = 1', 'b.cui NOT IN (SELECT cui FROM onrc_excluderi WHERE cui IS NOT NULL)'];
  const valori = [caen];
  const judet = (p.get('judet') || '').trim().slice(0, 60);
  if (judet) { conditii.push('f.judet = ?'); valori.push(judet); }
  const loc = (p.get('localitate') || '').trim().slice(0, 60);
  if (loc) { conditii.push('f.localitate LIKE ?'); valori.push('%' + loc + '%'); }

  try {
    const r = await env.DB.prepare(`SELECT f.cui, f.denumire, f.forma_juridica, f.persoana_fizica, f.judet, f.localitate, f.data_inmatriculare,
        b.cifra_afaceri AS ca_2024, b.salariati AS sal_2024, b.profit_net AS profit_2024
      FROM mf_bilant_2024 b CROSS JOIN onrc_firme f ON f.cui = b.cui
      WHERE ${conditii.join(' AND ')}
      ORDER BY b.cifra_afaceri DESC LIMIT ${MAX_REZULTATE}`).bind(...valori).all();
    const results = (r.results || []).map((x) => x.persoana_fizica
      ? {cui: 'P-' + ((x.cui ^ 5921370) >>> 0).toString(36).toUpperCase(), denumire: (x.forma_juridica || 'PFA/II/IF') + ' · în așteptarea acordului GDPR',
         forma_juridica: x.forma_juridica, judet: x.judet, caen_mf: caen, mascat: 1}
      : {cui: x.cui, denumire: x.denumire, forma_juridica: x.forma_juridica, judet: x.judet, localitate: x.localitate, caen_mf: caen,
         data_inmatriculare: x.data_inmatriculare, cifra_afaceri_2024: x.ca_2024, salariati_2024: x.sal_2024, profit_net_2024: x.profit_2024});
    return json({page: 1, results, limita: MAX_REZULTATE, has_more: false, sursa: 'ONRC / MF, data.gov.ro — FirmsFinder AI'});
  } catch (e) {
    return json({error: 'Căutarea nu este disponibilă momentan.'}, 502);
  }
}
