// firmsfinder.eu/api/piata?caen=6920 — repartiția pe județe a unei activități (CAEN 2–4 cifre), 2023–2025.
// firmsfinder.eu/api/piata?judete=1 — lista județelor; ?judet=Cluj[&judet2=Iasi] — activitățile dintr-un județ (sau din două, pentru comparare).
// Citește tabela precalculată sumar_judet_caen (D1, binding DB). Numai agregate; PFA/II/IF sunt excluse (top=1 la construcție).
const h = {'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600'};
const json = (d, s = 200) => new Response(JSON.stringify(d), {status: s, headers: s === 200 ? h : {...h, 'cache-control': 'no-store'}});

const NOTA = 'Date pe sediul social și CAEN principal declarat în bilanțul fiecărui an. Firmele își pot schimba activitatea principală, deci evoluțiile între ani se citesc cu prudență. Fără persoane fizice (PFA/II/IF). Sunt numere de firme și sume declarate, nu o evaluare a potențialului unei piețe. Ponderea = firmele din activitate împărțite la toate firmele județului.';
const SURSE = 'ONRC și Ministerul Finanțelor, prin data.gov.ro';
const TOP = 120;
const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function listaJudete(env) {
  const r = await env.DB.prepare('SELECT DISTINCT judet FROM sumar_judet_caen WHERE an = 2025 ORDER BY judet').all();
  return (r.results || []).map(x => x.judet);
}
async function activitatiJudet(env, judet, nivel) {
  // nivel = numărul de cifre CAEN: 4 = clasă, 3 = grupă, 2 = diviziune (agregare în baza de date, pe toate clasele județului)
  const r = await env.DB.prepare(
    `WITH a AS (SELECT SUBSTR(caen, 1, ?) AS k, SUM(firme) AS f, SUM(salariati) AS s, SUM(cifra_afaceri) AS c FROM sumar_judet_caen WHERE an = 2025 AND judet = ? AND firme > 0 GROUP BY k),
          p AS (SELECT SUBSTR(caen, 1, ?) AS k, SUM(firme) AS f FROM sumar_judet_caen WHERE an = 2023 AND judet = ? GROUP BY k)
     SELECT a.k AS caen, a.f AS firme, a.s AS salariati, a.c AS ca, p.f AS firme_2023, n.denumire AS denumire
     FROM a LEFT JOIN p ON p.k = a.k LEFT JOIN onrc_nom_caen n ON n.clasa = a.k AND n.versiune = 2
     ORDER BY a.f DESC LIMIT ${TOP}`
  ).bind(nivel, judet, nivel, judet).all();
  const t = await env.DB.prepare('SELECT SUM(firme) AS firme, SUM(salariati) AS salariati, SUM(cifra_afaceri) AS ca FROM sumar_judet_caen WHERE an = 2025 AND judet = ?').bind(judet).first();
  const tf = t?.firme ?? 0;
  return {
    judet,
    total: {firme: tf, salariati: t?.salariati ?? 0, ca: t?.ca ?? 0},
    activitati: (r.results || []).map(x => ({caen: x.caen, denumire: x.denumire || null, firme: x.firme, pondere: tf ? Math.round(x.firme / tf * 1000) / 10 : 0, salariati: x.salariati ?? 0, ca: x.ca ?? 0, ca_mediu: x.firme ? Math.round((x.ca || 0) / x.firme) : 0, firme_2023: x.firme_2023 ?? null}))
  };
}

async function peJudet(env, sp) {
  const lista = await listaJudete(env);
  if (sp.get('judete') === '1') return json({judete: lista});
  const alege = v => lista.find(j => fold(j) === fold(v));
  const a = alege(sp.get('judet') || '');
  if (!a) return json({error: 'Alegeți un județ din listă.'}, 400);
  const cere2 = (sp.get('judet2') || '').trim();
  const b = cere2 ? alege(cere2) : null;
  if (cere2 && !b) return json({error: 'Al doilea județ nu este în listă.'}, 400);
  const nv = sp.has('nivel') ? sp.get('nivel') : '4';
  if (!['2', '3', '4'].includes(nv)) return json({error: 'Nivelul CAEN trebuie să fie 2, 3 sau 4.'}, 400);
  const nivel = Number(nv);
  const out = [await activitatiJudet(env, a, nivel)];
  if (b && b !== a) out.push(await activitatiJudet(env, b, nivel));
  return json({an: 2025, nivel, primele: TOP, judete: out, nota: NOTA + ' Se afișează primele ' + TOP + ' activități după numărul de firme.', surse: SURSE});
}

export async function onRequestGet({request, env}) {
  const sp = new URL(request.url).searchParams;
  if (sp.has('judete') || sp.has('judet')) {
    if (!env.DB) return json({error: 'Baza de date nu este conectată.'}, 503);
    try { return await peJudet(env, sp); } catch (e) { return json({error: 'Datele nu sunt disponibile momentan.'}, 502); }
  }
  const caen = (sp.get('caen') || '').trim();
  if (!/^[0-9]{2,4}$/.test(caen)) return json({error: 'Introduceți 2–4 cifre CAEN (ex.: 69 sau 6920).'}, 400);
  if (!env.DB) return json({error: 'Baza de date nu este conectată.'}, 503);
  try {
    const r = await env.DB.prepare(
      `SELECT judet, an, SUM(firme) AS firme, SUM(salariati) AS salariati, SUM(cifra_afaceri) AS ca
       FROM sumar_judet_caen WHERE caen LIKE ? GROUP BY judet, an`
    ).bind(caen + '%').all();
    const map = new Map();
    for (const x of r.results || []) {
      const o = map.get(x.judet) || {judet: x.judet, ani: {}};
      o.ani[x.an] = {firme: x.firme, salariati: x.salariati, ca: x.ca};
      map.set(x.judet, o);
    }
    const judete = [...map.values()].map(o => {
      const a25 = o.ani[2025] || {}, a23 = o.ani[2023] || {};
      return {
        judet: o.judet,
        firme: a25.firme ?? 0,
        salariati: a25.salariati ?? 0,
        ca: a25.ca ?? 0,
        ca_mediu: a25.firme ? Math.round((a25.ca || 0) / a25.firme) : 0,
        firme_2023: a23.firme ?? 0,
        ca_2023: a23.ca ?? 0
      };
    }).filter(x => x.firme > 0).sort((a, b) => b.firme - a.firme);
    const total = judete.reduce((t, x) => ({firme: t.firme + x.firme, salariati: t.salariati + x.salariati, ca: t.ca + x.ca}), {firme: 0, salariati: 0, ca: 0});
    let denumire = null;
    if (caen.length === 4) {
      const n = await env.DB.prepare('SELECT denumire FROM onrc_nom_caen WHERE clasa = ? AND versiune = 2 LIMIT 1').bind(caen).first();
      denumire = n ? n.denumire : null;
    }
    return json({
      caen, denumire, an: 2025, total, judete,
      nota: 'Date pe sediul social și CAEN principal declarat în bilanțul fiecărui an. Firmele își pot schimba activitatea principală, deci evoluțiile între ani se citesc cu prudență. Fără persoane fizice (PFA/II/IF).',
      surse: SURSE
    });
  } catch (e) {
    return json({error: 'Datele nu sunt disponibile momentan.'}, 502);
  }
}
