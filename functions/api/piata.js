// firmsfinder.eu/api/piata?caen=6920 — repartiția pe județe a unei activități (CAEN 2–4 cifre), 2023–2025.
// Citește tabela precalculată sumar_judet_caen (D1, binding DB). Numai agregate; PFA/II/IF sunt excluse (top=1 la construcție).
const h = {'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600'};
const json = (d, s = 200) => new Response(JSON.stringify(d), {status: s, headers: s === 200 ? h : {...h, 'cache-control': 'no-store'}});

export async function onRequestGet({request, env}) {
  const caen = (new URL(request.url).searchParams.get('caen') || '').trim();
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
      surse: 'ONRC și Ministerul Finanțelor, prin data.gov.ro'
    });
  } catch (e) {
    return json({error: 'Datele nu sunt disponibile momentan.'}, 502);
  }
}
