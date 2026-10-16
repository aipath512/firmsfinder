// Panoul „Piața pe județe" și „Căutări sugerate" din /cautare/. Separat de onsite-ui.js ca să nu atingă celelalte pagini.
(function () {
  const $ = s => document.querySelector(s);
  const nr = v => Number(v || 0).toLocaleString('ro-RO');
  const mil = v => (Number(v || 0) / 1e6).toLocaleString('ro-RO', {maximumFractionDigits: 1});
  function el(tag, text, parent, cls) {
    const x = document.createElement(tag);
    if (text != null) x.textContent = String(text);
    if (cls) x.className = cls;
    if (parent) parent.append(x);
    return x;
  }

  const panel = $('#piata');
  if (panel) {
    const input = $('#piata-caen'), out = $('#piata-rez'), sort = $('#piata-sort'), msg = $('#piata-msg');
    let date = null, toate = false;

    function desen() {
      out.replaceChildren();
      if (!date) return;
      const k = sort.value;
      const rows = date.judete.slice().sort((a, b) => b[k] - a[k]);
      const vizibile = toate ? rows : rows.slice(0, 12);
      const max = Math.max(1, ...vizibile.map(r => r[k]));
      const titlu = el('p', '', out, 'piata-titlu');
      el('strong', (date.denumire ? date.denumire + ' (CAEN ' + date.caen + ')' : 'CAEN ' + date.caen), titlu);
      el('span', ' — ' + nr(date.total.firme) + ' firme, ' + nr(date.total.salariati) + ' salariați, ' + mil(date.total.ca) + ' mil. lei cifră de afaceri (' + date.an + ')', titlu);
      const ul = el('ol', '', out, 'piata-lista');
      for (const r of vizibile) {
        const li = el('li', '', ul);
        const cap = el('div', '', li, 'piata-cap');
        el('span', r.judet, cap, 'piata-judet');
        el('span', nr(r.firme) + ' firme · ' + nr(r.salariati) + ' salariați · medie ' + mil(r.ca_mediu) + ' mil. lei/firmă', cap, 'muted');
        const bar = el('div', '', li, 'piata-bara');
        const fill = el('i', '', bar);
        fill.style.width = Math.max(2, Math.round(r[k] / max * 100)) + '%';
        const a = el('a', 'Vezi firmele din ' + r.judet, li, 'piata-link');
        a.href = '/cautare/?caen=' + encodeURIComponent(date.caen) + '&judet=' + encodeURIComponent(r.judet);
      }
      if (rows.length > 12) {
        const b = el('button', toate ? 'Arată doar primele 12' : 'Arată toate cele ' + rows.length + ' județe', out);
        b.type = 'button';
        b.addEventListener('click', () => { toate = !toate; desen(); });
      }
      el('p', date.nota + ' Surse: ' + date.surse + '.', out, 'muted');
    }

    async function incarca(caen) {
      msg.textContent = 'Calculez…';
      out.replaceChildren();
      try {
        const r = await fetch('/api/piata?caen=' + encodeURIComponent(caen));
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Cerere eșuată.');
        date = d; toate = false;
        msg.textContent = d.judete.length ? '' : 'Nicio firmă cu bilanț pentru acest CAEN.';
        desen();
      } catch (e) { date = null; msg.textContent = e.message; }
    }

    $('#piata-form').addEventListener('submit', e => {
      e.preventDefault();
      incarca(input.value.trim());
    });
    sort.addEventListener('change', desen);
    window.piataIncarca = c => { input.value = c; incarca(c); panel.scrollIntoView({behavior: 'smooth', block: 'start'}); };

    const q = new URLSearchParams(location.search).get('caen');
    if (q && /^[0-9]{2,4}$/.test(q)) { input.value = q; incarca(q); }
  }

  const box = $('#sugestii-cautari');
  if (box) {
    fetch('/piata-sugestii.json').then(r => r.json()).then(d => {
      const grid = el('div', '', box, 'sg-grid');
      for (const s of d.sugestii) {
        const card = el('article', '', grid, 'sg-card');
        el('h3', s.titlu, card);
        el('p', nr(s.firme) + ' firme · CAEN ' + s.caen, card, 'muted');
        el('p', 'Cele mai multe: ' + s.top.map(t => t[0] + ' ' + nr(t[1])).join(' · '), card);
        const a = el('a', 'Vezi firmele', card);
        a.href = '/cautare/?caen=' + s.caen;
        card.append(' · ');
        const b = el('button', 'Piața pe județe', card);
        b.type = 'button';
        b.addEventListener('click', () => window.piataIncarca && window.piataIncarca(s.caen));
      }
      el('p', 'Căutări sugerate, cu cifre precalculate (' + d.an + ', calculat ' + d.calculat + '). Nu sunt statistici de utilizare. ' + d.sursa + '.', box, 'muted');
    }).catch(() => { box.hidden = true; });
  }
})();
