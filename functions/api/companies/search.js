// FirmsFinder.eu /api/companies/search -> căutare reală în baza FirmsFinder AI (1clic-ia.eu).
// Gratuit, maximum 50 de rezultate per căutare (limită pentru reducerea costurilor).
const UPSTREAM = 'https://1clic-ia.eu/api/cauta';
const MAX_REZULTATE = 50;
const PE_PAGINA_UPSTREAM = 25;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300'}
});

export async function onRequestGet({request}) {
  const p = new URL(request.url).searchParams;
  const caen = (p.get('caen') || '').trim();
  if (!/^\d{4}$/.test(caen)) {
    return json({error: 'Introduceți codul CAEN din 4 cifre (de exemplu 6920). Căutarea după nume nu este disponibilă încă.'}, 400);
  }
  const base = new URLSearchParams({caen});
  const judet = (p.get('judet') || '').trim();
  const loc = (p.get('localitate') || '').trim();
  if (judet) base.set('judet', judet);
  if (loc) base.set('loc', loc);

  const pagini = Math.ceil(MAX_REZULTATE / PE_PAGINA_UPSTREAM);
  let total = 0;
  const results = [];
  try {
    for (let i = 1; i <= pagini; i++) {
      const q = new URLSearchParams(base);
      q.set('pag', String(i));
      const r = await fetch(UPSTREAM + '?' + q, {headers: {accept: 'application/json'}});
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return json({error: d.eroare || 'Căutarea nu este disponibilă momentan.'}, r.status === 400 ? 400 : 502);
      total = d.total || 0;
      for (const x of d.rezultate || []) {
        results.push({
          cui: x.cui ?? x.referinta,
          denumire: x.denumire,
          forma_juridica: x.forma_juridica,
          judet: x.judet,
          localitate: x.localitate,
          caen_mf: caen,
          data_inmatriculare: x.data_inmatriculare,
          cifra_afaceri_2024: x.ca_2024,
          salariati_2024: x.sal_2024,
          profit_net_2024: x.profit_2024
        });
      }
      if ((d.rezultate || []).length < PE_PAGINA_UPSTREAM) break;
    }
  } catch (e) {
    return json({error: 'Căutarea nu este disponibilă momentan.'}, 502);
  }
  return json({
    page: 1,
    results: results.slice(0, MAX_REZULTATE),
    total_potrivite: total,
    limita: MAX_REZULTATE,
    has_more: false,
    sursa: 'ONRC / MF, data.gov.ro — FirmsFinder AI'
  });
}
