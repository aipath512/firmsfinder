// firmsfinder.eu /api/companies/search -> căutare directă în D1 (binding DB = b2b-romania-db).
// Gratuit, maximum 50 de rezultate per căutare (limită pentru reducerea costurilor).
// Persoanele fizice (PFA/II/IF) sunt mascate, în așteptarea acordului GDPR.
// Filtre (toate SQL): q (începutul denumirii), caen, judet (listă cu virgulă = SAU), fara_judet (NU),
// localitate, cmin/cmax (cifra de afaceri 2024), smin/smax (salariați 2024), profit_pozitiv, fara_pierdere,
// trend (up|down 2023→2025), sort (ca|sal|profit|nou|crestere|nume).
const MAX_REZULTATE = 50;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300'}
});

const normaliza = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ăâ]/gi, 'a').replace(/[îÎ]/g, 'i').replace(/[șş]/gi, 's').replace(/[țţ]/gi, 't')
  .toUpperCase().replace(/[^A-Z0-9 &.\-]/g, '').replace(/\s+/g, ' ').trim();
const intreg = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/[.\s]/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : null;
};
const JUDETE = ['Alba','Arad','Argeș','Bacău','Bihor','Bistrița-Năsăud','Botoșani','Brașov','Brăila','București','Buzău','Caraș-Severin','Cluj','Constanța','Covasna','Călărași','Dolj','Dâmbovița','Galați','Giurgiu','Gorj','Harghita','Hunedoara','Ialomița','Iași','Ilfov','Maramureș','Mehedinți','Mureș','Neamț','Olt','Prahova','Satu Mare','Sibiu','Suceava','Sălaj','Teleorman','Timiș','Tulcea','Vaslui','Vrancea','Vâlcea'];
const JUD_NORM = new Map(JUDETE.map((j) => [normaliza(j), j]));
// Acceptă județe fără diacritice, cu litere mari/mici (ex. "bucuresti", "Timis"); ignoră ce nu recunoaște.
const lista = (v) => [...new Set(String(v || '').split(',').map((x) => JUD_NORM.get(normaliza(x))).filter(Boolean))].slice(0, 8);

export async function onRequestGet({request, env}) {
  const p = new URL(request.url).searchParams;
  const caen = (p.get('caen') || '').trim();
  const q = normaliza(p.get('q')).slice(0, 60);
  if (caen && !/^\d{2,4}$/.test(caen)) return json({error: 'Codul CAEN trebuie să aibă 2–4 cifre (de exemplu 69, 692 sau 6920).'}, 400);
  if (!caen && q.length < 3) {
    return json({error: 'Introduceți codul CAEN din 4 cifre (de exemplu 6920) sau cel puțin 3 litere din începutul denumirii firmei.'}, 400);
  }
  if (!env.DB) return json({error: 'Baza de date nu este conectată momentan.'}, 503);

  const conditii = ['f.top = 1', 'f.cui NOT IN (SELECT cui FROM onrc_excluderi WHERE cui IS NOT NULL)'];
  const valori = [];
  if (caen) { if (caen.length === 4) { conditii.push('b.caen_mf = ?'); valori.push(caen); } else { conditii.push('b.caen_mf >= ? AND b.caen_mf < ?'); valori.push(caen, caen + '\uffff'); } }
  if (q) { conditii.push('f.denumire_cautare LIKE ?'); valori.push(q.replace(/[%_]/g, '') + '%'); }
  const judete = lista(p.get('judet'));
  if (judete.length) { conditii.push(`f.judet IN (${judete.map(() => '?').join(',')})`); valori.push(...judete); }
  const faraJudete = lista(p.get('fara_judet'));
  if (faraJudete.length) { conditii.push(`f.judet NOT IN (${faraJudete.map(() => '?').join(',')})`); valori.push(...faraJudete); }
  const loc = (p.get('localitate') || '').trim().slice(0, 60);
  if (loc) { conditii.push('f.localitate LIKE ?'); valori.push('%' + loc + '%'); }
  const [cmin, cmax, smin, smax] = ['cmin', 'cmax', 'smin', 'smax'].map((k) => intreg(p.get(k)));
  if (cmin !== null) { conditii.push('b.cifra_afaceri >= ?'); valori.push(cmin); }
  if (cmax !== null) { conditii.push('b.cifra_afaceri <= ?'); valori.push(cmax); }
  if (smin !== null) { conditii.push('b.salariati >= ?'); valori.push(smin); }
  if (smax !== null) { conditii.push('b.salariati <= ?'); valori.push(smax); }
  if (p.get('profit_pozitiv')) conditii.push('b.profit_net > 0');
  if (p.get('fara_pierdere')) conditii.push('b.cui IS NOT NULL AND COALESCE(b.pierdere_neta, 0) = 0');
  const trend = p.get('trend');
  if (trend === 'up') conditii.push('a.cifra_afaceri > 0 AND b.cifra_afaceri > a.cifra_afaceri AND (c.cifra_afaceri IS NULL OR c.cifra_afaceri >= b.cifra_afaceri)');
  if (trend === 'down') conditii.push('a.cifra_afaceri > 0 AND b.cifra_afaceri < a.cifra_afaceri AND (c.cifra_afaceri IS NULL OR c.cifra_afaceri <= b.cifra_afaceri)');

  const ORDINI = {
    ca: 'b.cifra_afaceri DESC', sal: 'b.salariati DESC, b.cifra_afaceri DESC', profit: 'b.profit_net DESC',
    nou: 'f.data_inmatriculare DESC', nume: 'f.denumire ASC',
    crestere: '(COALESCE(c.cifra_afaceri, b.cifra_afaceri) * 1.0 / NULLIF(a.cifra_afaceri, 0)) DESC NULLS LAST'
  };
  const sort = ORDINI[p.get('sort')] ? p.get('sort') : (caen ? 'ca' : 'nume');
  if (sort === 'crestere') { conditii.push('a.cifra_afaceri >= ?'); valori.push(1e5); }

  try {
    const r = await env.DB.prepare(`SELECT f.cui, f.denumire, f.forma_juridica, f.persoana_fizica, f.judet, f.localitate, f.data_inmatriculare,
        b.caen_mf, b.cifra_afaceri AS ca_2024, b.salariati AS sal_2024, b.profit_net AS profit_2024
      FROM onrc_firme f
      LEFT JOIN mf_bilant_2024 b ON b.cui = f.cui
      LEFT JOIN mf_bilant_2023 a ON a.cui = f.cui
      LEFT JOIN mf_bilant_2025 c ON c.cui = f.cui
      WHERE ${conditii.join(' AND ')}
      ORDER BY ${ORDINI[sort]} LIMIT ${MAX_REZULTATE}`).bind(...valori).all();
    const results = (r.results || []).map((x) => x.persoana_fizica
      ? {cui: 'P-' + ((x.cui ^ 5921370) >>> 0).toString(36).toUpperCase(), denumire: (x.forma_juridica || 'PFA/II/IF') + ' · în așteptarea acordului GDPR',
         forma_juridica: x.forma_juridica, judet: x.judet, caen_mf: x.caen_mf, mascat: 1}
      : {cui: x.cui, denumire: x.denumire, forma_juridica: x.forma_juridica, judet: x.judet, localitate: x.localitate, caen_mf: x.caen_mf,
         data_inmatriculare: x.data_inmatriculare, cifra_afaceri_2024: x.ca_2024, salariati_2024: x.sal_2024, profit_net_2024: x.profit_2024});
    return json({page: 1, results, limita: MAX_REZULTATE, sort, has_more: false, sursa: 'ONRC / MF, data.gov.ro — FirmsFinder AI'});
  } catch (e) {
    return json({error: 'Căutarea nu este disponibilă momentan.'}, 502);
  }
}
