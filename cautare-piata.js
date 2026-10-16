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

    // --- Vedere pe județ și comparare între două județe (tabel sortabil) ---
    const modA = $('#piata-mod-activitate'), modJ = $('#piata-mod-judet'), formA = $('#piata-form'), formJ = $('#piata-judet-form');
    const sel1 = $('#piata-j1'), sel2 = $('#piata-j2');
    let dj = null, toateJ = false, listaIncarcata = false;
    const sj = {k: 'firme', dir: -1};
    const sc = {k: 'fA', dir: -1};

    function mod(judet) {
      formA.hidden = judet; formJ.hidden = !judet;
      out.replaceChildren(); msg.textContent = ''; date = null; dj = null;
      if (judet && !listaIncarcata) incarcaLista();
    }
    modA.addEventListener('change', () => { if (modA.checked) mod(false); });
    modJ.addEventListener('change', () => { if (modJ.checked) mod(true); });

    async function incarcaLista() {
      try {
        const r = await fetch('/api/piata?judete=1'); const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Cerere eșuată.');
        sel1.replaceChildren(); sel2.replaceChildren();
        el('option', 'alegeți județul…', sel1).value = '';
        el('option', '— fără comparare —', sel2).value = '';
        for (const x of d.judete) { el('option', x, sel1).value = x; el('option', x, sel2).value = x; }
        listaIncarcata = true;
      } catch (e) { msg.textContent = 'Lista județelor nu este disponibilă momentan.'; }
    }

    function tabel(parent, coloane, rows, stare, redesen) {
      const wrap = el('div', '', parent, 'pt-wrap');
      const tb = el('table', '', wrap, 'pt');
      const hr = el('tr', '', el('thead', '', tb));
      for (const c of coloane) {
        const th = el('th', '', hr); th.scope = 'col';
        if (c.sort === false) { th.textContent = c.t; continue; }
        th.setAttribute('aria-sort', stare.k === c.k ? (stare.dir < 0 ? 'descending' : 'ascending') : 'none');
        const b = el('button', c.t + (stare.k === c.k ? (stare.dir < 0 ? ' ↓' : ' ↑') : ''), th, 'th-b'); b.type = 'button';
        b.addEventListener('click', () => { stare.dir = stare.k === c.k ? -stare.dir : -1; stare.k = c.k; redesen(); });
      }
      const body = el('tbody', '', tb);
      const srt = rows.slice().sort((a, b) => ((a[stare.k] ?? -1) - (b[stare.k] ?? -1)) * stare.dir);
      return {srt, body};
    }
    const deschideActivitate = caen => { modA.checked = true; mod(false); window.piataIncarca(caen); };
    function celulaActivitate(r, td) {
      const b = el('button', r.caen + (r.denumire ? ' ' + r.denumire : ''), td, 'piata-link'); b.type = 'button';
      b.title = 'Vezi această activitate pe județe';
      b.addEventListener('click', () => deschideActivitate(r.caen));
    }
    const linkFirme = (caen, judet) => (r, td) => { const a = el('a', 'Vezi firmele', td, 'piata-link'); a.href = '/cautare/?caen=' + encodeURIComponent(caen(r)) + '&judet=' + encodeURIComponent(judet(r)); };
    const evo = r => r.firme_2023 ? Math.round((r.firme - r.firme_2023) / r.firme_2023 * 100) : null;

    function desenJ() {
      out.replaceChildren();
      if (!dj) return;
      const [A, B] = dj.judete;
      for (const x of dj.judete) {
        const p = el('p', '', out, 'piata-titlu');
        el('strong', x.judet, p);
        el('span', ' — ' + nr(x.total.firme) + ' firme, ' + nr(x.total.salariati) + ' salariați, ' + mil(x.total.ca) + ' mil. lei cifră de afaceri (' + dj.an + ')', p);
      }
      const LIM = 25;
      let rows, coloane, stare;
      if (!B) {
        stare = sj;
        rows = A.activitati.map(r => ({...r, ca_mil: r.ca, evo: evo(r)}));
        coloane = [
          {t: 'Activitate', k: 'caen', sort: false, cell: celulaActivitate},
          {t: 'Firme', k: 'firme', cell: (r, td) => td.textContent = nr(r.firme)},
          {t: 'Salariați', k: 'salariati', cell: (r, td) => td.textContent = nr(r.salariati)},
          {t: 'Cifră de afaceri (mil. lei)', k: 'ca', cell: (r, td) => td.textContent = mil(r.ca)},
          {t: 'Medie pe firmă (mil. lei)', k: 'ca_mediu', cell: (r, td) => td.textContent = mil(r.ca_mediu)},
          {t: 'Firme față de 2023', k: 'evo', cell: (r, td) => td.textContent = r.evo === null ? '—' : (r.evo > 0 ? '+' : '') + r.evo + '%'},
          {t: '', k: 'x', sort: false, cell: linkFirme(r => r.caen, () => A.judet)}
        ];
      } else {
        stare = sc;
        const m = new Map();
        for (const r of A.activitati) m.set(r.caen, {caen: r.caen, denumire: r.denumire, fA: r.firme, mA: r.ca_mediu, fB: null, mB: null});
        for (const r of B.activitati) { const o = m.get(r.caen) || {caen: r.caen, denumire: r.denumire, fA: null, mA: null, fB: null, mB: null}; o.fB = r.firme; o.mB = r.ca_mediu; m.set(r.caen, o); }
        rows = [...m.values()].sort((a, b) => ((b.fA || 0) + (b.fB || 0)) - ((a.fA || 0) + (a.fB || 0))).slice(0, 60);
        const v = f => (r, td) => td.textContent = r[f] === null ? '—' : nr(r[f]);
        const w = f => (r, td) => td.textContent = r[f] === null ? '—' : mil(r[f]);
        coloane = [
          {t: 'Activitate', k: 'caen', sort: false, cell: celulaActivitate},
          {t: 'Firme ' + A.judet, k: 'fA', cell: v('fA')},
          {t: 'Firme ' + B.judet, k: 'fB', cell: v('fB')},
          {t: 'Medie/firmă ' + A.judet + ' (mil. lei)', k: 'mA', cell: w('mA')},
          {t: 'Medie/firmă ' + B.judet + ' (mil. lei)', k: 'mB', cell: w('mB')}
        ];
      }
      const rd = () => desenJ();
      const {srt, body} = tabel(out, coloane, rows, stare, rd);
      const vizibile = toateJ ? srt : srt.slice(0, LIM);
      for (const r of vizibile) { const tr = el('tr', '', body); for (const c of coloane) c.cell(r, el('td', '', tr)); }
      if (srt.length > LIM) {
        const b = el('button', toateJ ? 'Arată doar primele ' + LIM : 'Arată toate cele ' + srt.length + ' activități', out); b.type = 'button';
        b.addEventListener('click', () => { toateJ = !toateJ; desenJ(); });
      }
      if (B) el('p', '„—” înseamnă că activitatea nu apare printre primele ' + dj.primele + ' ale județului respectiv.', out, 'muted');
      el('p', dj.nota + ' Surse: ' + dj.surse + '.', out, 'muted');
    }

    async function incarcaJ(j1, j2) {
      msg.textContent = 'Calculez…'; out.replaceChildren();
      try {
        const r = await fetch('/api/piata?judet=' + encodeURIComponent(j1) + (j2 ? '&judet2=' + encodeURIComponent(j2) : ''));
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Cerere eșuată.');
        dj = d; toateJ = false; sj.k = 'firme'; sj.dir = -1; sc.k = 'fA'; sc.dir = -1; msg.textContent = '';
        desenJ();
      } catch (e) { dj = null; msg.textContent = e.message; }
    }
    formJ.addEventListener('submit', e => { e.preventDefault(); if (sel1.value) incarcaJ(sel1.value, sel2.value); });
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
