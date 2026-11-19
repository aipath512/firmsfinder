// firmsfinder.eu /api/companies/{CUI} — fișa unei firme în format JSON, doar citire.
// v1.0 — 2026-11-19. Binding: DB = b2b-romania-db (același ca /firme/{CUI}); VECTORIZE opțional.
// Rutele fixe din același folder (search, suggest, new etc.) au prioritate față de [cui].
// Reguli: doar firme active (top = 1), fără excluderi; persoanele fizice (PFA/II/IF) nu sunt returnate (acord GDPR în așteptare);
// site-ul vine doar din firme_site cu verificat = 1, altfel website_missing; nimic nu este inventat.

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store',
    'access-control-allow-origin': '*',
    'x-robots-tag': 'noindex'
  }
});

const SURSA = {
  identitate: 'ONRC, prin data.gov.ro',
  bilanturi: 'Ministerul Finanțelor, prin data.gov.ro',
  site: 'FirmsFinderBot (verificare CUI pe pagină)',
  limite: 'Date istorice, nu în timp real. Un cod CAEN nu dovedește produsele, clienții sau intenția de cumpărare.'
};

export async function onRequestOptions() {
  return new Response(null, {status: 204, headers: {'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS'}});
}

export async function onRequestGet({params, env}) {
  const raw = String(params.cui || '').replace(/^RO/i, '').trim();
  if (!/^\d{2,10}$/.test(raw)) return json({error: 'cui_invalid', mesaj: 'CUI-ul trebuie să conțină 2–10 cifre.'}, 400);
  if (!env.DB) return json({error: 'db_indisponibil'}, 503);
  const cui = Number(raw);

  const r = await env.DB.prepare(`SELECT f.cui, f.denumire, f.forma_juridica, f.persoana_fizica, f.judet, f.localitate, f.data_inmatriculare,
      f.cod_inmatriculare, f.euid, f.coduri_stare, fc.caen AS caen_onrc,
      COALESCE(c.caen_mf, b.caen_mf, a.caen_mf) AS caen_mf,
      a.cifra_afaceri AS ca_2023, b.cifra_afaceri AS ca_2024, c.cifra_afaceri AS ca_2025,
      a.salariati AS sal_2023, b.salariati AS sal_2024, c.salariati AS sal_2025,
      a.profit_net AS profit_2023, a.pierdere_neta AS pierdere_2023, b.profit_net AS profit_2024, b.pierdere_neta AS pierdere_2024,
      c.profit_net AS profit_2025, c.pierdere_neta AS pierdere_2025,
      s.url AS site_url, s.data AS site_data
    FROM onrc_firme f
    LEFT JOIN onrc_firma_caen fc ON fc.cod_inmatriculare = f.cod_inmatriculare
    LEFT JOIN mf_bilant_2023 a ON a.cui = f.cui
    LEFT JOIN mf_bilant_2024 b ON b.cui = f.cui
    LEFT JOIN mf_bilant_2025 c ON c.cui = f.cui
    LEFT JOIN firme_site s ON s.cui = f.cui AND s.verificat = 1
    WHERE f.cui = ? AND f.top = 1 AND f.cui NOT IN (SELECT cui FROM onrc_excluderi WHERE cui IS NOT NULL) LIMIT 1`).bind(cui).first();

  if (!r) return json({error: 'negasit', mesaj: 'CUI-ul nu se află printre firmele active.', cui}, 404);
  if (r.persoana_fizica) return json({cui, persoana_fizica: true, mesaj: 'Persoană fizică: date nepublicate, în așteptarea acordului GDPR.'});

  let caen_denumire = null;
  if (r.caen_mf) {
    const d = await env.DB.prepare('SELECT denumire FROM onrc_nom_caen WHERE clasa = ? ORDER BY versiune DESC LIMIT 1').bind(String(r.caen_mf)).first();
    caen_denumire = d ? d.denumire : null;
  }
  const caen_onrc = String(r.caen_onrc || '').split(',').map((x) => x.split(':')[0].trim()).filter(Boolean);

  const an = (y) => {
    const ca = r['ca_' + y];
    if (ca === null || ca === undefined) return {an: y, bilant: false};
    return {an: y, bilant: true, cifra_afaceri: ca, salariati: r['sal_' + y], profit_net: r['profit_' + y], pierdere_neta: r['pierdere_' + y]};
  };

  let profil_apropiat = [];
  if (env.VECTORIZE) {
    try {
      const g = await env.VECTORIZE.getByIds([String(r.cui)]);
      if (g.length) {
        const m = await env.VECTORIZE.query(g[0].values, {topK: 9, returnMetadata: 'all'});
        const ids = (m.matches || []).filter((x) => x.id !== String(r.cui)).slice(0, 8);
        if (ids.length) {
          const ok = await env.DB.prepare(`SELECT f.cui FROM onrc_firme f INDEXED BY ix_onrc_cui_top WHERE f.cui IN (${ids.map(() => '?').join(',')}) AND f.top = 1 AND f.persoana_fizica = 0
            AND f.cui NOT IN (SELECT cui FROM onrc_excluderi WHERE cui IS NOT NULL)`).bind(...ids.map((x) => Number(x.id))).all();
          const bune = new Set((ok.results || []).map((x) => String(x.cui)));
          profil_apropiat = ids.filter((x) => bune.has(x.id)).map((x) => ({cui: Number(x.id), denumire: (x.metadata || {}).denumire || null, judet: (x.metadata || {}).judet || null, scor: Math.round(x.score * 1000) / 1000}));
        }
      }
    } catch (e) { /* secțiune opțională */ }
  }

  return json({
    versiune_api: '1.0',
    cui: r.cui,
    denumire: r.denumire,
    forma_juridica: r.forma_juridica,
    cod_inmatriculare: r.cod_inmatriculare,
    euid: r.euid,
    data_inmatriculare: r.data_inmatriculare,
    judet: r.judet,
    localitate: r.localitate,
    cod_stare_onrc: r.coduri_stare,
    caen_principal: r.caen_mf ? {cod: String(r.caen_mf), denumire: caen_denumire, sursa: 'cel mai recent bilanț MF'} : null,
    caen_onrc,
    site: r.site_url ? {url: r.site_url, verificat_la: r.site_data} : 'website_missing',
    bilanturi: [an(2023), an(2024), an(2025)],
    profil_apropiat,
    pagina: `https://firmsfinder.eu/firme/${r.cui}/`,
    sursa: SURSA
  });
}
