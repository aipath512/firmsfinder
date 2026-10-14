// firmsfinder.eu/api/date — cifre agregate din D1 (binding: DB = b2b-romania-db), cache 1 oră.
// Numai agregate: nicio firmă individuală, deci nu există date personale în răspuns.
const TTL = 3600;
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300'}
});

const SQL = `SELECT
  (SELECT COUNT(*) FROM onrc_firme) AS active,
  (SELECT COUNT(*) FROM onrc_firme WHERE persoana_fizica=1) AS pfa,
  (SELECT COUNT(*) FROM mf_bilant_2023) AS bilant_2023,
  (SELECT COUNT(*) FROM mf_bilant_2024) AS bilant_2024,
  (SELECT COUNT(*) FROM mf_bilant_2025) AS bilant_2025,
  (SELECT COUNT(*) FROM firme_site) AS procesate,
  (SELECT COUNT(*) FROM firme_site WHERE domeniu IS NOT NULL AND domeniu<>'') AS cu_domeniu,
  (SELECT COUNT(*) FROM firme_site WHERE verificat=1) AS site_verificat,
  (SELECT COUNT(*) FROM firme_site WHERE emailuri IS NOT NULL AND emailuri NOT IN ('','[]')) AS cu_email,
  (SELECT COUNT(*) FROM firme_site WHERE telefoane IS NOT NULL AND telefoane NOT IN ('','[]')) AS cu_telefon`;

export async function onRequestGet(context) {
  const {request, env} = context;
  const cache = caches.default;
  const key = new Request(new URL('/api/date', request.url).toString(), {method: 'GET'});
  const hit = await cache.match(key);
  if (hit) return hit;
  if (!env.DB) return json({error: 'Baza de date nu este conectată.'}, 503);
  try {
    const r = await env.DB.prepare(SQL).first();
    const res = new Response(JSON.stringify({
      ...r,
      calculat_la: new Date().toISOString(),
      surse: {
        onrc: 'ONRC, data.gov.ro, set din 02.09.2026',
        mf: 'Ministerul Finanțelor, bilanțuri publicate pe data.gov.ro',
        incarcare_d1: '5–6 oct 2026'
      }
    }), {headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${TTL}`}});
    context.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) {
    return json({error: 'Cifrele nu sunt disponibile momentan.'}, 502);
  }
}
