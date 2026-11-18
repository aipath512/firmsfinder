// firmsfinder.eu /api/companies/{CUI} — fișa unei firme în format JSON, doar citire.
// v1.0 — 2026-11-18. Fișier în repo: functions/api/companies/[cui].js
// Binding: DB = b2b-romania-db (același ca /firme/{CUI}); VECTORIZE opțional (firme cu profil apropiat).
// Rutele fixe din același folder (search, suggest, new etc.) au prioritate față de [cui], deci nu sunt afectate.
// Reguli:
//  - aceleași filtre ca pagina /firme/{CUI}: top = 1, fără excluderi; persoanele fizice (PFA/II/IF) nu sunt returnate (acord GDPR în așteptare);
//  - dacă firma nu are site cunoscut, website = null și status_website = "website_missing" — nu se inventează nicio adresă;
//  - nu conține linkuri către alte site-uri; datele sunt publice (ONRC, MF), deci CORS deschis (*).
//  - cost: doar căutări după cheie (CUI / cod înmatriculare); nicio scanare de tabel.

const VERSIUNE = '1.0';

const json = (data, status = 200, cache = 'public, max-age=3600') => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': cache,
    'access-control-allow-origin': '*',
    'x-robots-tag': 'noindex'
  }
});

const nrSauNull = (v) => (v === null || v === undefined ? null : Number(v));

export async function onRequestOptions() {
  return new Response(null, {status: 204, headers: {
    'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-max-age': '86400'
  }});
}

export async function onRequestGet({params, env}) {
  const raw = String(params.cui || '').trim().replace(/^RO/i, '');
  if (!/^\d{2,10}$/.test(raw)) {
    return json({ok: false, eroare: 'cui_invalid', mesaj: 'CUI-ul trebuie să conțină între 2 și 10 cifre.'}, 400, 'no-store');
  }
  if (!env.DB) {
    return json({ok: false, eroare: 'baza_indisponibila', mesaj: 'Baza de date nu este conectată momentan.'}, 503, 'no-store');
  }
  const cui = Number(raw);

  // 1. Identitate + bilanțuri 2023–2025 (aceeași interogare ca pagina /firme/{CUI}).
  const r = await env.DB.prepare(`SELECT f.cui, f.denumire, f.forma_juridica, f.persoana_fizica, f.judet, f.localitate, f.sector,
      f.data_inmatriculare, f.coduri_stare, f.cod_inmatriculare, f.euid,
      a.caen_mf AS caen_2023, b.caen_mf AS caen_2024, c.caen_mf AS caen_2025,
      a.cifra_afaceri AS ca_2023, b.cifra_afaceri AS ca_2024, c.cifra_afaceri AS ca_2025,
      a.salariati AS sal_2023, b.salariati AS sal_2024, c.salariati AS sal_2025,
      a.profit_net AS profit_2023, a.pierdere_neta AS pierdere_2023, b.profit_net AS profit_2024, b.pierdere_neta AS pierdere_2024,
      c.profit_net AS profit_2025, c.pierdere_neta AS pierdere_2025
    FROM onrc_firme f
    LEFT JOIN mf_bilant_2024 b ON b.cui = f.cui
    LEFT JOIN mf_bilant_2023 a ON a.cui = f.cui
    LEFT JOIN mf_bilant_2025 c ON c.cui = f.cui
    WHERE f.cui = ? AND f.top = 1 AND f.cui NOT IN (SELECT cui FROM onrc_excluderi WHERE cui IS NOT NULL) LIMIT 1`).bind(cui).first();

  if (!r) {
    return json({ok: false, eroare: 'firma_negasita', mesaj: 'CUI-ul nu a fost găsit printre firmele active.'}, 404);
  }
  if (r.persoana_fizica) {
    return json({ok: false, eroare: 'gdpr_in_asteptare', mesaj: 'Persoană fizică autorizată: datele nu sunt publicate până la obținerea acordului GDPR.'}, 403);
  }

  // 2. CAEN principal = codul din cel mai recent bilanț MF (caen_mf); CAEN înregistrate = lista ONRC.
  let caenPrincipal = null;
  const ani = [[2025, r.caen_2025], [2024, r.caen_2024], [2023, r.caen_2023]];
  const gasit = ani.find(([, cod]) => cod);
  if (gasit) {
    const [an, cod] = gasit;
    const d = await env.DB.prepare('SELECT denumire, versiune FROM caen_nod WHERE cod = ? ORDER BY CASE versiune WHEN 2 THEN 0 ELSE 1 END LIMIT 1')
      .bind(String(cod)).first();
    caenPrincipal = {cod: String(cod), denumire: d ? d.denumire : null, versiune_nomenclator: d ? d.versiune : null, sursa: `MF, bilanț ${an}`};
  }
  let caenOnrc = [];
  if (r.cod_inmatriculare) {
    const fc = await env.DB.prepare('SELECT caen FROM onrc_firma_caen WHERE cod_inmatriculare = ?').bind(r.cod_inmatriculare).first();
    if (fc && fc.caen) {
      caenOnrc = String(fc.caen).split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
        const [cod, versiune] = x.split(':');
        return {cod, versiune: versiune ? Number(versiune) : null};
      });
    }
  }

  // 3. Site-ul oficial, dacă este cunoscut (tabelul firme_site). Fără site => website_missing.
  const s = await env.DB.prepare('SELECT domeniu, url, verificat, metoda, titlu, descriere, data FROM firme_site WHERE cui = ? LIMIT 1').bind(cui).first();
  const website = s && (s.url || s.domeniu)
    ? {url: s.url || `https://${s.domeniu}/`, domeniu: s.domeniu || null, verificat: s.verificat === 1, metoda: s.metoda || null,
       titlu: s.titlu || null, descriere: s.descriere || null, data_verificarii: s.data || null}
    : null;

  // 4. Firme cu profil apropiat (Vectorize, aceeași logică ca pagina firmei). Opțional.
  let similare = [];
  if (env.VECTORIZE) {
    try {
      const g = await env.VECTORIZE.getByIds([String(cui)]);
      if (g.length) {
        const m = await env.VECTORIZE.query(g[0].values, {topK: 9, returnMetadata: 'all'});
        const ids = (m.matches || []).filter((x) => x.id !== String(cui)).slice(0, 8);
        if (ids.length) {
          const ok = await env.DB.prepare(`SELECT f.cui FROM onrc_firme f INDEXED BY ix_onrc_cui_top WHERE f.cui IN (${ids.map(() => '?').join(',')})
            AND f.top = 1 AND f.persoana_fizica = 0 AND f.cui NOT IN (SELECT cui FROM onrc_excluderi WHERE cui IS NOT NULL)`)
            .bind(...ids.map((x) => Number(x.id))).all();
          const bune = new Set((ok.results || []).map((x) => String(x.cui)));
          similare = ids.filter((x) => bune.has(x.id)).map((x) => {
            const d = x.metadata || {};
            return {cui: x.id, denumire: d.denumire || null, judet: d.judet || null, cifra_afaceri: nrSauNull(d.ca), scor: x.score};
          });
        }
      }
    } catch (e) { /* secțiune opțională */ }
  }

  const bilant = (an, ca, sal, profit, pierdere) => ({an, cifra_afaceri: nrSauNull(ca), salariati: nrSauNull(sal), profit_net: nrSauNull(profit), pierdere_neta: nrSauNull(pierdere)});

  return json({
    ok: true,
    versiune_api: VERSIUNE,
    generat: new Date().toISOString(),
    firma: {
      cui: String(r.cui),
      denumire: r.denumire,
      forma_juridica: r.forma_juridica,
      cod_inmatriculare: r.cod_inmatriculare,
      euid: r.euid,
      data_inmatriculare: r.data_inmatriculare,
      coduri_stare: r.coduri_stare,
      judet: r.judet,
      localitate: r.localitate,
      sector: r.sector || null
    },
    caen_principal: caenPrincipal,
    caen_onrc: caenOnrc,
    website,
    status_website: website ? 'website_found' : 'website_missing',
    bilanturi: [
      bilant(2023, r.ca_2023, r.sal_2023, r.profit_2023, r.pierdere_2023),
      bilant(2024, r.ca_2024, r.sal_2024, r.profit_2024, r.pierdere_2024),
      bilant(2025, r.ca_2025, r.sal_2025, r.profit_2025, r.pierdere_2025)
    ],
    firme_profil_apropiat: similare,
    surse: [
      {nume: 'ONRC — firme înmatriculate', tip: 'registru oficial'},
      {nume: 'Ministerul Finanțelor — situații financiare 2023–2025', tip: 'bilanțuri'},
      {nume: 'FirmsFinder — site-uri identificate', tip: 'site oficial al firmei, când este cunoscut'}
    ],
    pagina: `https://firmsfinder.eu/firme/${r.cui}/`
  });
}
