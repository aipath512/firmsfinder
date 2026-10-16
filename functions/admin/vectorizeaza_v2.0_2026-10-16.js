// firmsfinder.eu /admin/vectorizeaza_v2.0_2026-10-16 -> RULARE COMPLETĂ (toate firmele active cu bilanț, pe intervale de CUI): firme din D1 (DB) -> embeddings bge-m3 (AI) -> Vectorize (VECTORIZE).
// Acces: ?k=<vec_token din tabela config> (token separat, doar pentru vectorizare). Persoanele fizice și firmele cu opoziție GDPR sunt excluse.
//   ?k=...&run=1&min=0&max=24207756   un lot (JSON) pentru CUI în (min, max]; poziția e salvată în config (vec_c_<min>)
//   ?k=...&auto=1&min=..&max=..       ca mai sus, cu reîncărcare automată în browser
//   ?k=...&stat=1        starea pilotului și a indexului
//   ?k=...&cui=12345678  firme asemănătoare cu acest CUI (test)
//   ?k=...&q=contabilitate Cluj   căutare semantică în text liber (test)
//   filtre opționale la &q= și &cui=:  &caen=4941  (sau &caen=4941,4942)  &judet=Cluj
const MODEL = '@cf/baai/bge-m3';
const LOT = 100;
const MAX_PILOT = 0; // fără plafon (păstrat pentru afișare)
const DIM = 1024;

const json = (d, s = 200) => new Response(JSON.stringify(d, null, 2), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const cfg = async (env, k) => (await env.DB.prepare('SELECT valoare FROM config WHERE cheie = ?').bind(k).first())?.valoare ?? null;
const setCfg = (env, k, v) => env.DB.prepare('INSERT OR REPLACE INTO config (cheie, valoare) VALUES (?, ?)').bind(k, String(v)).run();
const taie = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

function text(f, caenDen) {
  const parti = [
    taie(f.denumire, 160) + '.',
    'Activitate: ' + (caenDen ? taie(caenDen, 160) + ' (CAEN ' + f.caen + ')' : 'CAEN ' + f.caen) + '.',
    'Locație: ' + taie(f.localitate, 80) + ', județ ' + taie(f.judet, 40) + '.'
  ];
  if (f.sal) parti.push('Salariați: ' + f.sal + '.');
  const site = taie(f.descriere || f.titlu, 300);
  if (site) parti.push('Site: ' + site);
  return parti.join(' ').slice(0, 800);
}

async function lot(env, mn, mx) {
  const key = 'vec_c_' + mn;
  const cursor = Number(await cfg(env, key)) || mn;
  const r = await env.DB.prepare(`SELECT m.cui, o.denumire, o.judet, o.localitate, m.caen_mf AS caen, m.cifra_afaceri AS ca, m.salariati AS sal, s.titlu, s.descriere
    FROM mf_bilant_2024 m
    CROSS JOIN onrc_firme o ON o.cui = m.cui
    LEFT JOIN firme_site s ON s.cui = m.cui AND s.verificat IN (1, 2)
    WHERE m.cui > ? AND m.cui <= ? AND m.cifra_afaceri > 0 AND m.caen_mf IS NOT NULL AND m.caen_mf <> ''
      AND o.top = 1 AND COALESCE(o.persoana_fizica, 0) = 0
      AND m.cui NOT IN (SELECT cui FROM onrc_excluderi WHERE cui IS NOT NULL)
    ORDER BY m.cui LIMIT ?`).bind(cursor, mx, LOT).all();
  const rows = r.results;
  if (!rows.length) return { gata: true, cursor, trimise: 0 };

  const coduri = [...new Set(rows.map((x) => x.caen).filter(Boolean))];
  const den = {};
  if (coduri.length) {
    const c = await env.DB.prepare(`SELECT clasa, denumire FROM onrc_nom_caen WHERE versiune = 2 AND clasa IN (${coduri.map(() => '?').join(',')})`).bind(...coduri).all();
    for (const x of c.results) den[x.clasa] = x.denumire;
  }

  const texte = rows.map((f) => text(f, den[f.caen]));
  const emb = await env.AI.run(MODEL, { text: texte });
  const date = emb && emb.data;
  if (!Array.isArray(date) || date.length !== rows.length || !date.every((v) => Array.isArray(v) && v.length === DIM))
    throw new Error('Răspuns neașteptat de la modelul de embeddings.');

  const vectori = rows.map((f, i) => ({
    id: String(f.cui),
    values: date[i],
    metadata: { cui: f.cui, denumire: taie(f.denumire, 120), judet: f.judet || '', localitate: taie(f.localitate, 60), caen: f.caen || '', sal: f.sal ?? 0, ca: f.ca ?? 0 }
  }));
  const up = await env.VECTORIZE.upsert(vectori);
  const nou = rows[rows.length - 1].cui;
  await setCfg(env, key, nou);
  return { gata: false, trimise: rows.length, cursor: nou, upsert: up };
}

const filtru = (p) => {
  const f = {};
  const caen = (p.get('caen') || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (caen.length === 1) f.caen = caen[0]; else if (caen.length > 1) f.caen = { $in: caen };
  const judet = (p.get('judet') || '').trim();
  if (judet) f.judet = judet;
  return Object.keys(f).length ? f : undefined;
};

const arata = (m) => (m.matches || []).map((x) => ({ cui: x.id, scor: Math.round(x.score * 1000) / 1000, ...(x.metadata || {}) }));

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const tok = await cfg(env, 'vec_token');
  if (!tok || p.get('k') !== tok) return new Response('Acces interzis.', { status: 403 });
  if (!env.AI || !env.VECTORIZE) return json({ eroare: 'Lipsesc binding-urile AI sau VECTORIZE. Verificați Settings > Bindings și redeployați.' }, 500);

  try {
    if (p.get('stat') === '1') return json({ index: await env.VECTORIZE.describe(), poziții: (await env.DB.prepare("SELECT cheie, valoare FROM config WHERE cheie LIKE 'vec_c_%'").all()).results });

    if (p.get('cui')) {
      const g = await env.VECTORIZE.getByIds([String(p.get('cui'))]);
      if (!g.length) return json({ eroare: 'CUI-ul nu e în index (încă).' }, 404);
      const m = await env.VECTORIZE.query(g[0].values, { topK: 11, returnMetadata: 'all', ...(filtru(p) ? { filter: filtru(p) } : {}) });
      return json({ firma: g[0].metadata, asemanatoare: arata(m).filter((x) => x.cui !== String(p.get('cui'))) });
    }

    if (p.get('q')) {
      const e = await env.AI.run(MODEL, { text: [taie(p.get('q'), 300)] });
      const m = await env.VECTORIZE.query(e.data[0], { topK: 10, returnMetadata: 'all', ...(filtru(p) ? { filter: filtru(p) } : {}) });
      return json({ interogare: p.get('q'), filtru: filtru(p) || null, rezultate: arata(m) });
    }

    const mn = Math.max(0, Number(p.get('min')) || 0);
    const mx = Number(p.get('max')) || 99999999999;
    if (p.get('run') !== '1' && p.get('auto') !== '1') return json({ eroare: 'Folosiți &run=1&min=..&max=.. sau &auto=1.' }, 400);
    const rez = await lot(env, mn, mx);
    if (p.get('auto') === '1') {
      const html = `<!doctype html><meta charset="utf-8"><title>Vectorizare</title>${rez.gata ? '' : '<meta http-equiv="refresh" content="1">'}<body style="font:16px system-ui;padding:24px"><h2>${rez.gata ? 'Gata' : 'Se lucrează…'}</h2><p>Poziție (CUI): <b>${rez.cursor}</b></p>${rez.gata ? '<p>Pilot terminat. Puteți închide pagina.</p>' : '<p>Nu închideți pagina; se reîncarcă singură.</p>'}</body>`;
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }
    return json(rez);
  } catch (e) {
    return json({ eroare: String(e && e.message || e).slice(0, 400) }, 500);
  }
}
