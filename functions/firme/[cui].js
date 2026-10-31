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


// Rezultat net = profit net - pierdere netă (pozitiv = profit, negativ = pierdere). Culoare + semn + etichetă (nu doar culoare).
function chartRez(r) {
  const rez = (p, l) => (p === null || p === undefined) && (l === null || l === undefined) ? null : Number(p || 0) - Number(l || 0);
  const vals = [rez(r.profit_2023, r.pierdere_2023), rez(r.profit_2024, r.pierdere_2024), rez(r.profit_2025, r.pierdere_2025)];
  const ani = [2023, 2024, 2025];
  const max = Math.max(...vals.filter((v) => v !== null).map(Math.abs), 0);
  if (!(max > 0)) return '<p>Rezultatul net nu poate fi afișat: nu există bilanț cu profit sau pierdere pentru 2023–2025.</p>';
  const W = 640, H = 300, zero = 150, half = 80, bw = 110, gap = 80, x0 = (W - (3 * bw + 2 * gap)) / 2;
  let out = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Rezultat net ${esc(r.denumire)}: ${ani.map((a, i) => a + ' ' + (vals[i] === null ? 'necunoscut' : (vals[i] >= 0 ? 'profit ' : 'pierdere ') + compact(Math.abs(vals[i])))).join(', ')}" style="max-width:640px;height:auto">`;
  out += `<line x1="${x0 - 20}" y1="${zero}" x2="${W - x0 + 20}" y2="${zero}" stroke="#516075" stroke-width="1"/>`;
  ani.forEach((an, i) => {
    const x = x0 + i * (bw + gap), v = vals[i];
    if (v === null) {
      out += `<text x="${x + bw / 2}" y="${zero - 12}" text-anchor="middle" fill="#9fb0c4" font-size="14">fără date</text>`;
    } else if (v === 0) {
      out += `<text x="${x + bw / 2}" y="${zero - 12}" text-anchor="middle" fill="#eaf0f8" font-size="16" font-weight="700">0 lei</text>`;
    } else {
      const h = Math.max(4, (Math.abs(v) / max) * half), pos = v > 0, rad = Math.min(4, h);
      const y = pos ? zero - h : zero;
      const d = pos
        ? `M${x} ${zero}V${y + rad}Q${x} ${y} ${x + rad} ${y}H${x + bw - rad}Q${x + bw} ${y} ${x + bw} ${y + rad}V${zero}Z`
        : `M${x} ${zero}V${zero + h - rad}Q${x} ${zero + h} ${x + rad} ${zero + h}H${x + bw - rad}Q${x + bw} ${zero + h} ${x + bw} ${zero + h - rad}V${zero}Z`;
      out += `<path d="${d}" fill="${pos ? '#5db4ec' : '#f0a35e'}"><title>${an}: ${pos ? 'profit net' : 'pierdere netă'} ${esc(lei(Math.abs(v)))}</title></path>`;
      out += `<text x="${x + bw / 2}" y="${pos ? y - 22 : zero + h + 38}" text-anchor="middle" fill="#eaf0f8" font-size="16" font-weight="700">${pos ? '' : '−'}${esc(compact(Math.abs(v)))}</text>`;
      out += `<text x="${x + bw / 2}" y="${pos ? y - 6 : zero + h + 56}" text-anchor="middle" fill="#9fb0c4" font-size="13">${pos ? '▲ profit net' : '▼ pierdere netă'}</text>`;
    }
    out += `<text x="${x + bw / 2}" y="${zero + (v !== null && v < 0 ? 0 : 0) + 130 > H - 4 ? H - 4 : zero + 130}" text-anchor="middle" fill="#9fb0c4" font-size="15">${an}</text>`;
  });
  return out + '</svg>';
}

const page = (status, title, description, body, robots = 'index, follow') => new Response(
`<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="/assets/brand/favicon-16x16.png"><link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png"><link rel="manifest" href="/assets/brand/site.webmanifest"><meta name="theme-color" content="#010e19">
<title>${esc(title)} | FirmsFinder</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${robots}">
<meta property="og:type" content="website"><meta property="og:site_name" content="FirmsFinder AI"><meta property="og:locale" content="ro_RO">
<meta property="og:title" content="${esc(title)} | FirmsFinder"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="https://firmsfinder.eu/assets/og-image.jpg"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/onsite.css"></head><body><main><nav aria-label="Navigație"><a href="/">Acasă</a><a href="/cautare/">Căutare</a><a href="/comparare/">Comparare</a><a href="/semnale/">Semnale</a><a href="/surse/">Surse</a><a href="/contact/">Contact</a></nav>${body}</main><footer><!--angajament:1.1--><div class="angajament"><link rel="stylesheet" href="/angajament.css"><a class="angajament-badge" href="https://eu-ai-act-ready.eu/" rel="noopener"><img src="/assets/eu-ai-act-ready-2aug2026_256x256_v1.0_2026-10-16.webp" width="96" height="96" alt="EU AI Act Ready: kit cu 70 de documente, 10 module" loading="lazy"></a><p>Angajament de transparență v1.1 (31 octombrie 2026): memorăm doar ce declarăm. Fără acordul dumneavoastră, doar numărători, 24 de luni. Cu acord, text și selecții, cel mult 30 de zile. Nu stocăm în jurnalul de căutare IP, email sau nume. Pagina Piața ta (încă inactivă): relații declarate doar cu bifă, email doar pentru lista completă, 36 de luni. <a href="/angajament/">Citiți și verificați amprenta</a> · <a href="/angajament.json">JSON</a><br><small>Insigna trimite la kitul EU AI Act Ready (70 de documente, 10 module). Nu este o certificare oficială și nu atestă conformitatea acestui site.</small></p></div><!--/angajament--></footer></body></html>`,
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
      a.salariati AS sal_2023, b.salariati AS sal_2024, c.salariati AS sal_2025,
      a.profit_net AS profit_2023, a.pierdere_neta AS pierdere_2023, b.profit_net AS profit_2024, b.pierdere_neta AS pierdere_2024, c.profit_net AS profit_2025, c.pierdere_neta AS pierdere_2025
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
  let similare = '';
  // Cost guard: disable expensive optional financial-similarity scan by default.
  // Re-enable only after a measured indexed query is deployed.
  if (env.ENABLE_FINANCIAL_SIMILARS === 'true' && r.caen_mf && r.ca_2024 > 0) {
    try {
      const sr = await env.DB.prepare(`SELECT f.cui, f.denumire, f.judet, b.cifra_afaceri AS ca FROM mf_bilant_2024 b JOIN onrc_firme f ON f.cui = b.cui
        WHERE b.caen_mf = ? AND b.cifra_afaceri BETWEEN ? AND ? AND f.cui <> ? AND f.top = 1 AND f.persoana_fizica = 0
        AND f.cui NOT IN (SELECT cui FROM onrc_excluderi WHERE cui IS NOT NULL)
        ORDER BY ABS(b.cifra_afaceri - ?) LIMIT 5`).bind(r.caen_mf, Math.floor(r.ca_2024 * 0.5), Math.ceil(r.ca_2024 * 2), r.cui, r.ca_2024).all();
      const rows = sr.results || [];
      if (rows.length) similare = `<section id="similare"><h2>Firme similare</h2><p>Aceeași activitate (CAEN ${esc(r.caen_mf)}) și cifră de afaceri 2024 apropiată. Este o apropiere după două criterii publice, nu o evaluare a concurenței.</p><ul>${rows.map((x) => `<li><a href="/firme/${esc(x.cui)}/">${esc(x.denumire)}</a> · ${esc(x.judet || '')} · ${esc(lei(x.ca))}</li>`).join('')}</ul></section>`;
    } catch (e) { /* secțiune opțională */ }
  }
  let semantice = '';
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
          const rows = ids.filter((x) => bune.has(x.id));
          if (rows.length) semantice = `<section id="similare-semantic"><h2>Firme cu profil apropiat</h2><p>Selecție prin analiză semantică a activității, locației și dimensiunii. Este o apropiere statistică, nu o evaluare a concurenței.</p><ul>${rows.map((x) => { const d = x.metadata || {}; return `<li><a href="/firme/${esc(x.id)}/">${esc(d.denumire || x.id)}</a> · ${esc(d.judet || '')} · ${esc(lei(d.ca))}</li>`; }).join('')}</ul></section>`;
        }
      }
    } catch (e) { /* secțiune opțională */ }
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
<section id="indicatori"><h2>Evoluția cifrei de afaceri, 2023–2025</h2>${chartCA(r)}<h2>Profit sau pierdere netă, 2023–2025</h2>${chartRez(r)}<h2>Indicatori financiari (istorici)</h2><table><caption>Valori raportate la Ministerul Finanțelor; necunoscut = nu există bilanț depus.</caption><thead><tr><th scope="col">An</th><th scope="col">Cifră de afaceri</th><th scope="col">Salariați</th><th scope="col">Profit net</th><th scope="col">Pierdere netă</th></tr></thead><tbody>
<tr><th scope="row">2023</th><td>${esc(lei(r.ca_2023))}</td><td>${esc(nr(r.sal_2023))}</td><td>${esc(lei(r.profit_2023))}</td><td>${esc(lei(r.pierdere_2023))}</td></tr>
<tr><th scope="row">2024</th><td>${esc(lei(r.ca_2024))}</td><td>${esc(nr(r.sal_2024))}</td><td>${esc(lei(r.profit_2024))}</td><td>${esc(lei(r.pierdere_2024))}</td></tr>
<tr><th scope="row">2025</th><td>${esc(lei(r.ca_2025))}</td><td>${esc(nr(r.sal_2025))}</td><td>${esc(lei(r.profit_2025))}</td><td>${esc(lei(r.pierdere_2025))}</td></tr></tbody></table>
</section>
<section id="surse"><h2>Sursă și limite</h2><p>Date publice ONRC și Ministerul Finanțelor, prin data.gov.ro. Indicatorii sunt istorici, nu în timp real. Un cod CAEN nu dovedește produsele, clienții sau intenția de cumpărare. Verificați informațiile importante la sursă. <a href="/surse/">Surse și metodologie</a>.</p></section>
${semantice}
${similare}
<section id="vizibilitate-ai"><h2>Cum este văzută această firmă de sistemele AI?</h2><p>Clienții caută tot mai des prin asistenți AI, nu doar în Google. Dacă sunteți această firmă, puteți verifica gratuit ce informații despre dumneavoastră pot găsi și folosi sistemele AI, și ce lipsește.</p><p><a href="https://ai-lens.eu/" target="_blank" rel="noopener noreferrer">Verificați gratuit cu AI-LENS →</a></p><p>Un astfel de test arată ce se poate observa; nu garantează citarea sau recomandarea de către un sistem AI.</p></section>
<p><a href="/cautare/">Înapoi la căutare</a></p>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  const res = page(200, title, description, body);
  return res;
}
