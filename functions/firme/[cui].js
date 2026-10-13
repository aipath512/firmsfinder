// firmsfinder.eu/firme/CUI/ — pagină de firmă generată la cerere din D1 (binding: DB = b2b-romania-db).
// Persoanele fizice (PFA/II/IF) sunt mascate, în așteptarea acordului GDPR.
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const lei = (v) => (v === null || v === undefined ? 'necunoscut' : Number(v).toLocaleString('ro-RO') + ' lei');
const nr = (v) => (v === null || v === undefined ? 'necunoscut' : Number(v).toLocaleString('ro-RO'));


const compact = (v) => {
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return (n / 1e9).toLocaleString('ro-RO', {maximumFractionDigits: 2}) + ' mld lei';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toLocaleString('ro-RO', {maximumFractionDigits: 1}) + ' mil lei';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toLocaleString('ro-RO', {maximumFractionDigits: 0}) + ' mii lei';
  return n.toLocaleString('ro-RO') + ' lei';
};

// Grafic SVG: evoluția cifrei de afaceri 2023-2025 (o singură serie, o singură culoare, baza la zero).
function chartCA(r) {
  const ani = [[2023, r.ca_2023], [2024, r.ca_2024], [2025, r.ca_2025]];
  const valori = ani.map(([, v]) => (v === null || v === undefined ? null : Number(v)));
  const max = Math.max(0, ...valori.filter((v) => v !== null));
  if (!(max > 0)) return '<p>Evoluția cifrei de afaceri nu poate fi afișată: nu există bilanț cu cifră de afaceri pozitivă pentru 2023–2025.</p>';
  const W = 640, H = 280, top = 40, base = 230, bw = 110, gap = 80, x0 = (W - (3 * bw + 2 * gap)) / 2, hmax = base - top;
  let out = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Cifra de afaceri ${esc(r.denumire)}: ${ani.map(([a], i) => a + ' ' + (valori[i] === null ? 'necunoscut' : compact(valori[i]))).join(', ')}" style="max-width:640px;height:auto">`;
  out += `<line x1="${x0 - 20}" y1="${base}" x2="${W - x0 + 20}" y2="${base}" stroke="#516075" stroke-width="1"/>`;
  ani.forEach(([an], i) => {
    const x = x0 + i * (bw + gap), v = valori[i];
    if (v === null || v <= 0) {
      out += `<text x="${x + bw / 2}" y="${base - 12}" text-anchor="middle" fill="#9fb0c4" font-size="14">fără date</text>`;
    } else {
      const h = Math.max(4, (v / max) * hmax), y = base - h, rad = Math.min(4, h);
      out += `<path d="M${x} ${base}V${y + rad}Q${x} ${y} ${x + rad} ${y}H${x + bw - rad}Q${x + bw} ${y} ${x + bw} ${y + rad}V${base}Z" fill="#5db4ec"><title>${an}: ${esc(lei(v))}</title></path>`;
      out += `<text x="${x + bw / 2}" y="${y - 24}" text-anchor="middle" fill="#eaf0f8" font-size="16" font-weight="700">${esc(compact(v))}</text>`;
      const prev = i > 0 ? valori[i - 1] : null;
      if (prev !== null && prev > 0) {
        const d = ((v - prev) / prev) * 100;
        out += `<text x="${x + bw / 2}" y="${y - 7}" text-anchor="middle" fill="#9fb0c4" font-size="13">${d >= 0 ? '▲ +' : '▼ '}${d.toLocaleString('ro-RO', {maximumFractionDigits: 1})}%</text>`;
      }
    }
    out += `<text x="${x + bw / 2}" y="${base + 24}" text-anchor="middle" fill="#9fb0c4" font-size="15">${an}</text>`;
  });
  return out + '</svg>';
}

const page = (status, title, description, body, robots = 'index, follow') => new Response(
`<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | FirmsFinder</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${robots}">
<meta property="og:type" content="website"><meta property="og:site_name" content="FirmsFinder AI"><meta property="og:locale" content="ro_RO">
<meta property="og:title" content="${esc(title)} | FirmsFinder"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="https://firmsfinder.eu/assets/og-image.webp"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/onsite.css"></head><body><main><nav aria-label="Navigație"><a href="/">Acasă</a><a href="/cautare/">Căutare</a><a href="/comparare/">Comparare</a><a href="/semnale/">Semnale</a><a href="/surse/">Surse</a><a href="/contact/">Contact</a></nav>${body}</main></body></html>`,
  {status, headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300'}});

export async function onRequestGet({params, env, request}) {
  const raw = String(params.cui || '').replace(/^RO/i, '');
  if (!/^\d{2,10}$/.test(raw)) {
    return page(404, 'Firmă negăsită', 'Firma nu a fost găsită.', '<h1>Firmă negăsită</h1><p>Adresa nu corespunde unui CUI valid. <a href="/cautare/">Căutați firme</a>.</p>', 'noindex');
  }
  if (!env.DB) {
    return page(503, 'Date indisponibile', 'Baza de date nu este conectată momentan.', '<h1>Date indisponibile</h1><p>Baza de date nu este conectată momentan.</p>', 'noindex');
  }
  const r = await env.DB.prepare(`SELECT f.cui, f.denumire, f.forma_juridica, f.persoana_fizica, f.judet, f.localitate, f.data_inmatriculare, f.coduri_stare,
      b.caen_mf, a.cifra_afaceri AS ca_2023, b.cifra_afaceri AS ca_2024, c.cifra_afaceri AS ca_2025,
      a.salariati AS sal_2023, b.salariati AS sal_2024, c.salariati AS sal_2025, b.profit_net AS profit_2024, b.pierdere_neta AS pierdere_2024
    FROM onrc_firme f
    LEFT JOIN mf_bilant_2024 b ON b.cui = f.cui
    LEFT JOIN mf_bilant_2023 a ON a.cui = f.cui
    LEFT JOIN mf_bilant_2025 c ON c.cui = f.cui
    WHERE f.cui = ? AND f.top = 1 AND f.cui NOT IN (SELECT cui FROM onrc_excluderi WHERE cui IS NOT NULL) LIMIT 1`).bind(Number(raw)).first();
  if (!r) {
    return page(404, 'Firmă negăsită', 'Firma nu a fost găsită printre firmele active.', '<h1>Firmă negăsită</h1><p>Nu am găsit acest CUI printre firmele active. <a href="/cautare/">Căutați firme</a>.</p>', 'noindex');
  }
  if (r.persoana_fizica) {
    return page(200, 'Persoană fizică · în așteptarea acordului GDPR', 'Persoană fizică autorizată, în așteptarea acordului GDPR.',
      `<h1>${esc(r.forma_juridica || 'PFA/II/IF')} · în așteptarea acordului GDPR</h1><p>Datele acestei persoane fizice nu sunt afișate public până la obținerea acordului GDPR.</p><p>Județ: ${esc(r.judet)}</p><p><a href="/cautare/">Înapoi la căutare</a></p>`, 'noindex');
  }
  const url = `https://firmsfinder.eu/firme/${r.cui}/`;
  const title = `${r.denumire} · CUI ${r.cui}`;
  const description = `${r.denumire} (CUI ${r.cui}), ${r.judet || ''}${r.localitate ? ', ' + r.localitate : ''}. CAEN ${r.caen_mf || 'necunoscut'}. Cifră de afaceri 2024: ${lei(r.ca_2024)}. Date ONRC / Ministerul Finanțelor.`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'Organization', '@id': url + '#organization', name: r.denumire, legalName: r.denumire, url,
    taxID: String(r.cui), foundingDate: r.data_inmatriculare || undefined,
    address: {'@type': 'PostalAddress', addressRegion: r.judet || undefined, addressLocality: r.localitate || undefined, addressCountry: 'RO'},
    isicV4: r.caen_mf || undefined
  };
  const body = `<p aria-label="Breadcrumb"><a href="/">Acasă</a> / <a href="/cautare/">Căutare</a> / ${esc(r.denumire)}</p>
<h1>${esc(r.denumire)}</h1>
<p>CUI ${esc(r.cui)} · ${esc(r.forma_juridica)} · ${esc(r.judet)}${r.localitate ? ', ' + esc(r.localitate) : ''}</p>
<section id="identitate"><h2>Identitate</h2><dl><dt>CUI</dt><dd>${esc(r.cui)}</dd><dt>Formă juridică</dt><dd>${esc(r.forma_juridica)}</dd><dt>Data înmatriculării</dt><dd>${esc(r.data_inmatriculare || 'necunoscut')}</dd><dt>Cod stare ONRC</dt><dd>${esc(r.coduri_stare || 'necunoscut')}</dd><dt>CAEN Rev.2 · MF 2024</dt><dd>${esc(r.caen_mf || 'necunoscut')}</dd></dl></section>
<section id="indicatori"><h2>Evoluția cifrei de afaceri, 2023–2025</h2>${chartCA(r)}<h2>Indicatori financiari (istorici)</h2><table><caption>Valori raportate la Ministerul Finanțelor; necunoscut = nu există bilanț depus.</caption><thead><tr><th scope="col">An</th><th scope="col">Cifră de afaceri</th><th scope="col">Salariați</th></tr></thead><tbody>
<tr><th scope="row">2023</th><td>${esc(lei(r.ca_2023))}</td><td>${esc(nr(r.sal_2023))}</td></tr>
<tr><th scope="row">2024</th><td>${esc(lei(r.ca_2024))}</td><td>${esc(nr(r.sal_2024))}</td></tr>
<tr><th scope="row">2025</th><td>${esc(lei(r.ca_2025))}</td><td>${esc(nr(r.sal_2025))}</td></tr></tbody></table>
<p>Profit net 2024: ${esc(lei(r.profit_2024))}${r.pierdere_2024 ? ' · Pierdere netă 2024: ' + esc(lei(r.pierdere_2024)) : ''}</p></section>
<section id="surse"><h2>Sursă și limite</h2><p>Date publice ONRC și Ministerul Finanțelor, prin data.gov.ro. Indicatorii sunt istorici, nu în timp real. Un cod CAEN nu dovedește produsele, clienții sau intenția de cumpărare. Verificați informațiile importante la sursă. <a href="/surse/">Surse și metodologie</a>.</p></section>
<p><a href="/cautare/">Înapoi la căutare</a></p>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  const res = page(200, title, description, body);
  return res;
}
