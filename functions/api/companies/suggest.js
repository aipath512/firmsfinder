// Autocomplete denumiri: GET /api/companies/suggest?q=abc (min 3 caractere, max 8 sugestii, doar persoane juridice)
function normaliza(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 .\-]/g, ' ').replace(/\s+/g, ' ').trim();
}
const h = {'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300'};
export async function onRequestGet({request, env}) {
  const q = normaliza(new URL(request.url).searchParams.get('q'));
  if (q.length < 3 || !env.DB) return new Response('[]', {headers: h});
  try {
    const r = await env.DB.prepare('SELECT denumire FROM onrc_firme WHERE top = 1 AND denumire_cautare LIKE ? ORDER BY denumire_cautare LIMIT 8').bind(q + '%').all();
    return new Response(JSON.stringify((r.results || []).map(x => x.denumire)), {headers: h});
  } catch (e) { return new Response('[]', {headers: h}); }
}
