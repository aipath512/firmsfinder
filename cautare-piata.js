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
    let pas = 0; const PAS_MAX = 3;

    // Sugestii „mai departe” calculate din datele deja afișate (fără cerere nouă), cascadă de cel mult PAS_MAX pași.
    function cascada(optiuni) {
      const box = el('div', '', out, 'piata-urmeaza');
      if (pas >= PAS_MAX) {
        el('h3', 'Ați parcurs ' + PAS_MAX + ' pași', box);
        el('p', 'Mai departe merg analizele avansate: „mai multe ca asta”, alerte pe criterii și monitorizare. Sunt în pregătire și încă indisponibile.', box);
        const a = el('a', 'Vedeți ce pregătim', el('p', '', box)); a.href = '#functionalitati';
        el('p', 'Căutarea gratuită rămâne la dispoziția dumneavoastră. Dacă doriți să ne ajutați să alegem ce construim întâi, puteți permite jurnalul de intenții din blocul „Ce memorăm când căutați”; serviciul rămâne gratuit și fără acord.', box, 'muted');
        const b = el('button', 'Începeți un subiect nou', box); b.type = 'button';
        b.addEventListener('click', () => { pas = 0; box.remove(); });
        return;
      }
      const ok = optiuni.filter(Boolean).slice(0, 3);
      if (!ok.length) return;
      el('h3', 'Continuați cu (pasul ' + (pas + 1) + ' din ' + PAS_MAX + ')', box);
      const ul = el('ul', '', box, 'piata-urm-lista');
      for (const o of ok) {
        const b = el('button', o.t, el('li', '', ul), 'piata-link'); b.type = 'button';
        b.addEventListener('click', () => { const urm = pas + 1; o.f(); pas = urm; });
      }
    }

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
      const top = date.judete.slice().sort((a, b) => b.firme - a.firme);
      const c = date.caen, sus = c.length > 2 ? c.slice(0, c.length - 1) : null;
      cascada([
        top[0] && {t: 'Ce activități sunt în ' + top[0].judet + ', județul cu cele mai multe firme din domeniu', f: () => { modJ.checked = true; mod(true); sel1.value = top[0].judet; sel2.value = ''; selN.value = '4'; incarcaJ(top[0].judet, ''); }},
        sus ? {t: 'Urcați la ' + (sus.length === 3 ? 'grupa ' : 'diviziunea ') + sus + ': domeniul mai larg', f: () => { input.value = sus; incarca(sus); }}
            : (top[0] && {t: 'Vedeți firmele din ' + top[0].judet + ' din această diviziune', f: () => { location.href = '/cautare/?caen=' + encodeURIComponent(c) + '&judet=' + encodeURIComponent(top[0].judet); }}),
        top[1] && {t: 'Comparați ' + top[0].judet + ' cu ' + top[1].judet + ', primele două județe', f: () => { modJ.checked = true; mod(true); sel1.value = top[0].judet; sel2.value = top[1].judet; selN.value = '4'; incarcaJ(top[0].judet, top[1].judet); }}
      ]);
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
      e.preventDefault(); pas = 0;
      incarca(input.value.trim());
    });
    sort.addEventListener('change', desen);
    window.piataIncarca = c => { pas = 0; input.value = c; incarca(c); panel.scrollIntoView({behavior: 'smooth', block: 'start'}); };

    const q = new URLSearchParams(location.search).get('caen');
    if (q && /^[0-9]{2,4}$/.test(q)) { input.value = q; incarca(q); }

    // --- Vedere pe județ și comparare între două județe (tabel sortabil) ---
    const modA = $('#piata-mod-activitate'), modJ = $('#piata-mod-judet'), formA = $('#piata-form'), formJ = $('#piata-judet-form');
    const sel1 = $('#piata-j1'), sel2 = $('#piata-j2'), selN = $('#piata-nivel');
    let evid = null;
    let dj = null, toateJ = false, listaIncarcata = false;
    const sj = {k: 'firme', dir: -1};
    const sc = {k: 'fA', dir: -1};

    function mod(judet) {
      formA.hidden = judet; formJ.hidden = !judet;
      out.replaceChildren(); msg.textContent = ''; date = null; dj = null;
      if (judet && !listaIncarcata) incarcaLista();
    }
    modA.addEventListener('change', () => { if (modA.checked) { pas = 0; mod(false); } });
    modJ.addEventListener('change', () => { if (modJ.checked) { pas = 0; mod(true); } });

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
      if (r.caen.length > 2) {
        const u = el('button', ' ↑', td, 'piata-link piata-sus'); u.type = 'button';
        u.title = 'Urcă în ierarhia CAEN: ' + (r.caen.length === 4 ? 'grupa ' : 'diviziunea ') + r.caen.slice(0, r.caen.length - 1);
        u.setAttribute('aria-label', u.title);
        u.addEventListener('click', () => schimbaNivel(r.caen.length - 1, r.caen.slice(0, r.caen.length - 1)));
      }
    }
    const NUME = {2: 'Diviziune (2 cifre)', 3: 'Grupă (3 cifre)', 4: 'Clasă (4 cifre)'};
    function schimbaNivel(n, evidentiat) {
      selN.value = String(n); evid = evidentiat || null;
      if (sel1.value) incarcaJ(sel1.value, sel2.value);
    }
    const linkFirme = (caen, judet) => (r, td) => { const a = el('a', 'Vezi firmele', td, 'piata-link'); a.href = '/cautare/?caen=' + encodeURIComponent(caen(r)) + '&judet=' + encodeURIComponent(judet(r)); };
    const pct = v => v === null || v === undefined ? '—' : v.toLocaleString('ro-RO', {maximumFractionDigits: 1}) + '%';
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
      const scara = el('p', '', out, 'piata-scara'); scara.setAttribute('aria-label', 'Nivelul CAEN afișat');
      el('span', 'Nivel CAEN: ', scara);
      [2, 3, 4].forEach((n, i) => {
        if (i) el('span', ' › ', scara);
        if (n === dj.nivel) { const s = el('strong', NUME[n], scara); s.setAttribute('aria-current', 'true'); }
        else { const b = el('button', NUME[n], scara, 'piata-link'); b.type = 'button'; b.addEventListener('click', () => schimbaNivel(n, null)); }
      });
      const LIM = 25;
      let rows, coloane, stare;
      if (!B) {
        stare = sj;
        rows = A.activitati.map(r => ({...r, ca_mil: r.ca, evo: evo(r)}));
        coloane = [
          {t: 'Activitate', k: 'caen', sort: false, cell: celulaActivitate},
          {t: 'Firme', k: 'firme', cell: (r, td) => td.textContent = nr(r.firme)},
          {t: 'Pondere în județ', k: 'pondere', cell: (r, td) => td.textContent = pct(r.pondere)},
          {t: 'Salariați', k: 'salariati', cell: (r, td) => td.textContent = nr(r.salariati)},
          {t: 'Cifră de afaceri (mil. lei)', k: 'ca', cell: (r, td) => td.textContent = mil(r.ca)},
          {t: 'Medie pe firmă (mil. lei)', k: 'ca_mediu', cell: (r, td) => td.textContent = mil(r.ca_mediu)},
          {t: 'Firme față de 2023', k: 'evo', cell: (r, td) => td.textContent = r.evo === null ? '—' : (r.evo > 0 ? '+' : '') + r.evo + '%'},
          {t: '', k: 'x', sort: false, cell: linkFirme(r => r.caen, () => A.judet)}
        ];
      } else {
        stare = sc;
        const m = new Map();
        for (const r of A.activitati) m.set(r.caen, {caen: r.caen, denumire: r.denumire, fA: r.firme, pA: r.pondere, mA: r.ca_mediu, fB: null, pB: null, mB: null});
        for (const r of B.activitati) { const o = m.get(r.caen) || {caen: r.caen, denumire: r.denumire, fA: null, pA: null, mA: null, fB: null, pB: null, mB: null}; o.fB = r.firme; o.pB = r.pondere; o.mB = r.ca_mediu; m.set(r.caen, o); }
        rows = [...m.values()].sort((a, b) => ((b.fA || 0) + (b.fB || 0)) - ((a.fA || 0) + (a.fB || 0))).slice(0, 60);
        const v = f => (r, td) => td.textContent = r[f] === null ? '—' : nr(r[f]);
        const w = f => (r, td) => td.textContent = r[f] === null ? '—' : mil(r[f]);
        coloane = [
          {t: 'Activitate', k: 'caen', sort: false, cell: celulaActivitate},
          {t: 'Firme ' + A.judet, k: 'fA', cell: v('fA')},
          {t: 'Firme ' + B.judet, k: 'fB', cell: v('fB')},
          {t: 'Pondere ' + A.judet, k: 'pA', cell: (r, td) => td.textContent = pct(r.pA)},
          {t: 'Pondere ' + B.judet, k: 'pB', cell: (r, td) => td.textContent = pct(r.pB)},
          {t: 'Medie/firmă ' + A.judet + ' (mil. lei)', k: 'mA', cell: w('mA')},
          {t: 'Medie/firmă ' + B.judet + ' (mil. lei)', k: 'mB', cell: w('mB')}
        ];
      }
      const rd = () => desenJ();
      const {srt, body} = tabel(out, coloane, rows, stare, rd);
      const vizibile = toateJ ? srt : srt.slice(0, LIM);
      for (const r of vizibile) { const tr = el('tr', '', body); if (evid && r.caen === evid) { tr.className = 'evid'; tr.setAttribute('aria-current', 'true'); } for (const c of coloane) c.cell(r, el('td', '', tr)); }
      if (srt.length > LIM) {
        const b = el('button', toateJ ? 'Arată doar primele ' + LIM : 'Arată toate cele ' + srt.length + ' activități', out); b.type = 'button';
        b.addEventListener('click', () => { toateJ = !toateJ; desenJ(); });
      }
      if (evid && !vizibile.some(r => r.caen === evid)) el('p', 'Activitatea ' + evid + ' nu este printre rândurile afișate; arătați toate activitățile sau comutați sortarea.', out, 'muted');
      if (B) el('p', '„—” înseamnă că activitatea nu apare printre primele ' + dj.primele + ' ale județului respectiv.', out, 'muted');
      el('p', dj.nota + ' Surse: ' + dj.surse + '.', out, 'muted');
      const prima = A.activitati[0];
      const altul = ['București', 'Cluj'].find(x => x !== A.judet && [...sel2.options].some(o => o.value === x));
      cascada([
        prima && {t: 'Vedeți ' + prima.caen + (prima.denumire ? ' ' + prima.denumire : '') + ', cea mai mare activitate din ' + A.judet + ', pe toate județele', f: () => deschideActivitate(prima.caen)},
        dj.nivel > 2 ? {t: 'Urcați la ' + (dj.nivel === 4 ? 'grupe' : 'diviziuni') + ': imaginea mai largă', f: () => schimbaNivel(dj.nivel - 1, null)} : {t: 'Coborâți la grupe: mai mult detaliu', f: () => schimbaNivel(3, null)},
        B ? {t: 'Vedeți doar ' + A.judet, f: () => { sel2.value = ''; incarcaJ(A.judet, ''); }}
          : (altul && {t: 'Comparați ' + A.judet + ' cu ' + altul, f: () => { sel2.value = altul; incarcaJ(A.judet, altul); }})
      ]);
    }

    async function incarcaJ(j1, j2) {
      msg.textContent = 'Calculez…'; out.replaceChildren();
      try {
        const r = await fetch('/api/piata?judet=' + encodeURIComponent(j1) + (j2 ? '&judet2=' + encodeURIComponent(j2) : '') + '&nivel=' + encodeURIComponent(selN.value));
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Cerere eșuată.');
        dj = d; toateJ = false; sj.k = 'firme'; sj.dir = -1; sc.k = 'fA'; sc.dir = -1; msg.textContent = '';
        desenJ();
      } catch (e) { dj = null; msg.textContent = e.message; }
    }
    formJ.addEventListener('submit', e => { e.preventDefault(); evid = null; pas = 0; if (sel1.value) incarcaJ(sel1.value, sel2.value); });
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
