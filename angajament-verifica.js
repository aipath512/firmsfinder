// Recalculează în browser amprenta SHA-256 a /angajament.json și o compară cu cea declarată.
(function () {
  const btn = document.getElementById('verifica'), out = document.getElementById('verifica-rez');
  if (!btn || !out) return;
  const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' :
    (v && typeof v === 'object') ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
  btn.addEventListener('click', async () => {
    out.textContent = 'Verific…';
    try {
      const d = await (await fetch('/angajament.json', {cache: 'no-store'})).json();
      const declarata = d.content_sha256; delete d.content_sha256;
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canon(d)));
      const calc = Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
      out.textContent = calc === declarata ? 'Corect: amprenta recalculată în browserul dumneavoastră coincide cu cea declarată (' + calc + ').' : 'ATENȚIE: amprenta recalculată (' + calc + ') nu coincide cu cea declarată (' + declarata + ').';
    } catch (e) { out.textContent = 'Verificarea nu a putut fi făcută în acest browser.'; }
  });
})();
