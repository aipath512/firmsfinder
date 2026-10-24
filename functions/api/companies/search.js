// firmsfinder.eu /api/companies/search -> căutare directă în D1 (binding DB = b2b-romania-db).
// Gratuit, maximum 50 de rezultate per căutare (limită pentru reducerea costurilor).
// Persoanele fizice (PFA/II/IF) sunt mascate, în așteptarea acordului GDPR.
// Filtre (toate SQL): q (începutul denumirii), caen, judet (listă cu virgulă = SAU), fara_judet (NU),
// localitate, cmin/cmax (cifra de afaceri 2024; rezultatele returnează 2023–2025), smin/smax (salariați 2024), profit_pozitiv, fara_pierdere,
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

// Sinonime: cuvinte uzuale -> coduri CAEN Rev.2 (2–3 cifre = diviziune/grupă). Se oferă ca sugestii, nu se aplică automat.
const SINONIME = [
  [['CONTABIL', 'CONTABILITATE', 'AUDIT', 'EXPERT CONTABIL'], 'Contabilitate și audit', '692'],
  [['IT', 'SOFTWARE', 'PROGRAMARE', 'INFORMATICA'], 'Programare și consultanță IT', '62'],
  [['CONSTRUCTII', 'CONSTRUCTOR'], 'Construcții de clădiri', '41'],
  [['INSTALATII', 'INSTALATOR'], 'Lucrări de instalații', '432'],
  [['TRANSPORT', 'TRANSPORTATOR', 'CURIERAT'], 'Transport rutier de mărfuri', '494'],
  [['RESTAURANT', 'HORECA'], 'Restaurante', '561'],
  [['HOTEL', 'PENSIUNE', 'CAZARE'], 'Hoteluri și cazare', '55'],
  [['IMOBILIARE', 'AGENTIE IMOBILIARA'], 'Tranzacții imobiliare', '68'],
  [['AVOCAT', 'JURIDIC'], 'Activități juridice', '691'],
  [['MARKETING', 'PUBLICITATE', 'RECLAMA'], 'Publicitate', '731'],
  [['ARHITECT', 'ARHITECTURA', 'INGINERIE', 'TOPOGRAFIE'], 'Arhitectură și inginerie', '711'],
  [['AUTO', 'AUTOMOTIVE', 'SERVICE AUTO', 'VULCANIZARE'], 'Întreținere și reparare autovehicule', '452'],
  [['AGRICULTURA', 'FERMA', 'CULTURI'], 'Agricultură', '01'],
  [['MEDIC', 'CLINICA', 'STOMATOLOG', 'DENTIST'], 'Sănătate', '86'],
  [['EDUCATIE', 'SCOALA', 'TRAINING', 'CURSURI'], 'Învățământ', '85'],
  [['FRIZERIE', 'COAFOR', 'FRIZER', 'SALON'], 'Servicii de înfrumusețare', '9602'],
  [['PANIFICATIE', 'BRUTARIE', 'PATISERIE'], 'Produse de panificație', '1071']
];
const sinonime = (q) => {
  if (q.length < 3) return [];
  const out = [];
  for (const [chei, eticheta, caen] of SINONIME) {
    if (chei.some((k) => k === q || (q.length >= 4 && k.startsWith(q)) || (q.length >= 4 && q.startsWith(k + ' ')))) out.push({eticheta, caen});
  }
  return out.slice(0, 3);
};
// „Ai vrut să spui…?”: când nu există rezultate, scurtează prefixul (cel mult 3 caractere) și propune primul cuvânt găsit.
async function sugereaza(env, q) {
  const cuvinte = q.split(' ').length;
  for (let l = q.length - 1; l >= Math.max(3, q.length - 3); l--) {
    try {
      const r = await env.DB.prepare('SELECT denumire FROM onrc_firme WHERE top = 1 AND persoana_fizica = 0 AND denumire_cautare LIKE ? LIMIT 1').bind(q.slice(0, l) + '%').first();
      if (r && r.denumire) {
        const s = r.denumire.split(' ').slice(0, cuvinte).join(' ');
        if (normaliza(s) !== q) return s;
      }
    } catch (e) { return null; }
  }
  return fuzzy(env, q, cuvinte);
}
// Fuzzy (distanță de editare ≤ 2 aproximată): variante cu o literă inversată, ștearsă, înlocuită sau lipsă (prima literă trebuie corectă).
const lev = (a, b) => {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
async function fuzzy(env, q, cuvinte) {
  const w = q.slice(0, 16), n = w.length, v = new Set();
  for (let i = 0; i < n - 1; i++) v.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
  for (let i = 1; i < n; i++) { v.add(w.slice(0, i) + w.slice(i + 1)); v.add(w.slice(0, i) + '_' + w.slice(i + 1)); v.add(w.slice(0, i) + '_' + w.slice(i)); }
  v.add(w + '_'); v.delete(w);
  const clauze = [...v].filter((x) => /^[A-Z0-9 &.\-_]+$/.test(x)).map((x) => `denumire_cautare LIKE '${x}%'`);
  if (!clauze.length) return null;
  try {
    const r = await env.DB.prepare(`SELECT denumire, denumire_cautare AS dc FROM onrc_firme WHERE top = 1 AND persoana_fizica = 0 AND (${clauze.join(' OR ')}) LIMIT 60`).all();
    let best = null, bd = 99;
    for (const x of r.results || []) {
      const d = Math.min(...[n - 1, n, n + 1].map((l) => lev(w, String(x.dc).slice(0, l))));
      if (d < bd) { bd = d; best = x.denumire; }
    }
    return best && bd <= 2 ? best.split(' ').slice(0, cuvinte).join(' ') : null;
  } catch (e) { return null; }
}

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
  const faraJudete = lista(p.get('fara_judet'));
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

  // Cu CAEN: se pornește din tabela de bilanț (indexată pe CAEN); fără CAEN: din firme (prefix pe denumire).
  const DEJA = caen
    ? `FROM mf_bilant_2024 b CROSS JOIN onrc_firme f ON f.cui = b.cui
      LEFT JOIN mf_bilant_2023 a ON a.cui = f.cui
      LEFT JOIN mf_bilant_2025 c ON c.cui = f.cui`
    : `FROM onrc_firme f
      LEFT JOIN mf_bilant_2024 b ON b.cui = f.cui
      LEFT JOIN mf_bilant_2023 a ON a.cui = f.cui
      LEFT JOIN mf_bilant_2025 c ON c.cui = f.cui`;
  // Fațetele fără filtre de trend nu au nevoie de bilanțurile 2023/2025.
  // Pentru trend=up/down păstrăm JOIN-urile, fiind folosite în condițiile SQL.
  const DEJA_FACETE = (trend === 'up' || trend === 'down')
    ? DEJA
    : caen
      ? `FROM mf_bilant_2024 b CROSS JOIN onrc_firme f ON f.cui = b.cui`
      : `FROM onrc_firme f LEFT JOIN mf_bilant_2024 b ON b.cui = f.cui`;
  // Fațete (număr de rezultate pe județ), calculate fără filtrul de județ, doar pentru căutări înguste (CAEN sau nume).
  const cuFacete = p.get('facete') && (caen || q.length >= 3);
  const condFacete = conditii.join(' AND '), valFacete = valori.slice();
  if (judete.length) { conditii.push(`f.judet IN (${judete.map(() => '?').join(',')})`); valori.push(...judete); }
  if (faraJudete.length) { conditii.push(`f.judet NOT IN (${faraJudete.map(() => '?').join(',')})`); valori.push(...faraJudete); }

  try {
    const r = await env.DB.prepare(`SELECT f.cui, f.denumire, f.forma_juridica, f.persoana_fizica, f.judet, f.localitate, f.data_inmatriculare,
        b.caen_mf, b.cifra_afaceri AS ca_2024, b.salariati AS sal_2024, b.profit_net AS profit_2024,
        a.cifra_afaceri AS ca_2023, a.salariati AS sal_2023, c.cifra_afaceri AS ca_2025, c.salariati AS sal_2025
      ${DEJA}
      WHERE ${conditii.join(' AND ')}
      ORDER BY ${ORDINI[sort]} LIMIT ${MAX_REZULTATE}`).bind(...valori).all();
    const results = (r.results || []).map((x) => x.persoana_fizica
      ? {cui: 'P-' + ((x.cui ^ 5921370) >>> 0).toString(36).toUpperCase(), denumire: (x.forma_juridica || 'PFA/II/IF') + ' · în așteptarea acordului GDPR',
         forma_juridica: x.forma_juridica, judet: x.judet, caen_mf: x.caen_mf, mascat: 1}
      : {cui: x.cui, denumire: x.denumire, forma_juridica: x.forma_juridica, judet: x.judet, localitate: x.localitate, caen_mf: x.caen_mf,
         data_inmatriculare: x.data_inmatriculare, cifra_afaceri_2023: x.ca_2023, cifra_afaceri_2024: x.ca_2024, cifra_afaceri_2025: x.ca_2025,
         salariati_2023: x.sal_2023, salariati_2024: x.sal_2024, salariati_2025: x.sal_2025, profit_net_2024: x.profit_2024});
    const out = {page: 1, results, limita: MAX_REZULTATE, sort, has_more: false, sursa: 'ONRC / MF, data.gov.ro — FirmsFinder AI'};
    if (cuFacete) {
      try {
        const fr = await env.DB.prepare(`SELECT f.judet AS v, COUNT(*) AS n ${DEJA_FACETE} WHERE ${condFacete} AND f.judet IS NOT NULL GROUP BY f.judet ORDER BY n DESC LIMIT 12`).bind(...valFacete).all();
        out.facete = {judet: (fr.results || []).map((x) => ({v: x.v, n: x.n}))};
      } catch (e) { /* fațetele sunt opționale */ }
    }
    if (!caen) {
      const sin = sinonime(q);
      if (sin.length) out.sinonime = sin;
    }
    if (!results.length && q.length >= 4) {
      out.sugestie = await sugereaza(env, q);
    }
    return json(out);
  } catch (e) {
    return json({error: 'Căutarea nu este disponibilă momentan.'}, 502);
  }
}
