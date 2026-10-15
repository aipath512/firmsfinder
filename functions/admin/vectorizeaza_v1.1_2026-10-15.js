// firmsfinder.eu /admin/vectorizeaza_v1.1_2026-10-15 -> PILOT 2 (20.000 firme, eșantion pe ramuri CAEN din tabela vec_plan): firme din D1 (DB) -> embeddings bge-m3 (AI) -> Vectorize (VECTORIZE).
// Acces: ?k=<admin_token din tabela config>. Persoanele fizice și firmele cu opoziție GDPR sunt excluse.
//   ?k=...&auto=1        rulează pilotul pe loturi, cu reîncărcare automată până la final
//   ?k=...               un singur lot (JSON)
//   ?k=...&stat=1        starea pilotului și a indexului
//   ?k=...&cui=12345678  firme asemănătoare cu acest CUI (test)
//   ?k=...&q=contabilitate Cluj   căutare semantică în text liber (test)
const MODEL = '@cf/baai/bge-m3';
const LOT = 100;
const MAX_PILOT = 20000;
const KEY = 'vec_offset2';
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

async function lot(env) {
  const offset = Number(await cfg(env, KEY)) || 0;
  if (offset >= MAX_PILOT) return { gata: true, mesaj: 'Pilot terminat.', offset };
  const n = Math.min(LOT, MAX_PILOT - offset);
  const r = await env.DB.prepare(`SELECT m.cui, o.denumire, o.judet, o.localitate, m.caen_mf AS caen, m.cifra_afaceri AS ca, m.salariati AS sal, s.titlu, s.descriere
    FROM (SELECT cui, ord FROM vec_plan WHERE ord > ? ORDER BY ord LIMIT ?) p
    CROSS JOIN mf_bilant_2024 m ON m.cui = p.cui
    CROSS JOIN onrc_firme o ON o.cui = p.cui
    LEFT JOIN firme_site s ON s.cui = p.cui AND s.verificat IN (1, 2)
    WHERE o.top = 1 AND COALESCE(o.persoana_fizica, 0) = 0
      AND p.cui NOT IN (SELECT cui FROM onrc_excluderi WHERE cui IS NOT NULL)
    ORDER BY p.ord`).bind(offset, n).all();
  const rows = r.results;
  if (!rows.length) { await setCfg(env, KEY, offset + n); return { gata: offset + n >= MAX_PILOT, offset_nou: offset + n, trimise: 0 }; }

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
  await setCfg(env, KEY, offset + n);
  return { gata: offset + n >= MAX_PILOT, trimise: rows.length, offset_nou: offset + n, exemplu: texte[0], upsert: up };
}

const arata = (m) => (m.matches || []).map((x) => ({ cui: x.id, scor: Math.round(x.score * 1000) / 1000, ...(x.metadata || {}) }));

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const tok = await cfg(env, 'admin_token');
  if (!tok || p.get('k') !== tok) return new Response('Acces interzis.', { status: 403 });
  if (!env.AI || !env.VECTORIZE) return json({ eroare: 'Lipsesc binding-urile AI sau VECTORIZE. Verificați Settings > Bindings și redeployați.' }, 500);

  try {
    if (p.get('stat') === '1') return json({ offset: Number(await cfg(env, KEY)) || 0, plafon_pilot: MAX_PILOT, index: await env.VECTORIZE.describe() });

    if (p.get('cui')) {
      const g = await env.VECTORIZE.getByIds([String(p.get('cui'))]);
      if (!g.length) return json({ eroare: 'CUI-ul nu e în index (încă).' }, 404);
      const m = await env.VECTORIZE.query(g[0].values, { topK: 11, returnMetadata: 'all' });
      return json({ firma: g[0].metadata, asemanatoare: arata(m).filter((x) => x.cui !== String(p.get('cui'))) });
    }

    if (p.get('q')) {
      const e = await env.AI.run(MODEL, { text: [taie(p.get('q'), 300)] });
      const m = await env.VECTORIZE.query(e.data[0], { topK: 10, returnMetadata: 'all' });
      return json({ interogare: p.get('q'), rezultate: arata(m) });
    }

    const rez = await lot(env);
    if (p.get('auto') === '1') {
      const html = `<!doctype html><meta charset="utf-8"><title>Vectorizare</title>${rez.gata ? '' : '<meta http-equiv="refresh" content="1">'}<body style="font:16px system-ui;padding:24px"><h2>${rez.gata ? 'Gata' : 'Se lucrează…'}</h2><p>Firme vectorizate: <b>${rez.offset_nou ?? rez.offset}</b> din ${MAX_PILOT}</p>${rez.gata ? '<p>Pilot terminat. Puteți închide pagina.</p>' : '<p>Nu închideți pagina; se reîncarcă singură.</p>'}</body>`;
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }
    return json(rez);
  } catch (e) {
    return json({ eroare: String(e && e.message || e).slice(0, 400) }, 500);
  }
}
