// Jurnal anonim de intenții pentru /cautare/. Nu modifică motorul de căutare: observă pagina și trimite evenimente la /api/jurnal.
// Fără IP, fără email. Cod aleator în browser (localStorage), schimbat la 30 de zile. Se oprește la „Nu memora", Do Not Track sau Global Privacy Control.
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const OFF = 'ff_jurnal_off', SID = 'ff_sid', SIDT = 'ff_sid_ts';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const semnalOprire = () => navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  const oprit = () => store.get(OFF) === '1' || semnalOprire();

  let sidMem = null;
  function sid() {
    const acum = Date.now(), t = Number(store.get(SIDT) || 0);
    let s = store.get(SID);
    if (!s || !/^[a-z0-9]{12,32}$/.test(s) || !t || acum - t > 30 * 864e5) {
      const b = new Uint8Array(12);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => (b[i] = Math.floor(Math.random() * 256)));
      s = Array.from(b, x => (x % 36).toString(36)).join('');
      if (s.length < 12) s = (s + 'abcdefghijkl').slice(0, 12);
      store.set(SID, s); store.set(SIDT, String(acum));
    }
    return (sidMem = s);
  }

  const utm = (() => {
    const p = new URLSearchParams(location.search), o = [];
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) if (p.get(k)) o.push(p.get(k));
    return o.join('|').slice(0, 80) || undefined;
  })();
  const refHost = (() => { try { const h = new URL(document.referrer).hostname; return h && h !== location.hostname ? h : undefined; } catch (e) { return undefined; } })();

  function trimite(ev, extra) {
    if (oprit()) return;
    const body = Object.assign({sid: sidMem || sid(), ev, loc: location.pathname, utm, ref_host: refHost}, extra || {});
    try {
      fetch('/api/jurnal', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body), keepalive: true}).catch(() => {});
    } catch (e) {}
  }

  const FILTRE = ['fara_judet', 'cmin', 'cmax', 'smin', 'smax', 'trend', 'sort', 'profit_pozitiv', 'fara_pierdere'];
  function stareFormular() {
    const f = $('#search-form');
    if (!f) return {};
    const v = n => { const e = f.elements.namedItem(n); return e && (e.type === 'checkbox' ? (e.checked ? '1' : '') : String(e.value || '').trim()); };
    const filtre = {};
    for (const k of FILTRE) if (v(k)) filtre[k] = v(k);
    return {q: v('q') || undefined, caen: v('caen') || undefined, judet: v('judet') || undefined, localitate: v('localitate') || undefined, filtre};
  }

  // 1) Căutarea și rezultatul ei, inclusiv „zero rezultate" și ce ajutor a primit vizitatorul.
  let urmatoarea = false;
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#next')) urmatoarea = true; }, true);
  const msg = $('#message');
  if (msg && window.MutationObserver) {
    new MutationObserver(() => {
      const t = msg.textContent || '';
      const zero = /^Nicio firmă găsită/.test(t), cu = /^\d+ rezultate/.test(t);
      if (!zero && !cu) return;
      const aux = ($('#aux') && $('#aux').textContent) || '';
      const ajutor = [/Ai vrut să spui/.test(aux) && 'sugestie', /Căutați după activitate/.test(aux) && 'sinonime', /Județe în rezultate/.test(aux) && 'facete'].filter(Boolean).join(',') || undefined;
      const nxt = $('#next');
      const stare = stareFormular();
      if (urmatoarea) { urmatoarea = false; trimite('pagina', Object.assign(stare, {rezultat_n: (window.__rez || []).length})); return; }
      trimite('cautare', Object.assign(stare, {rezultat_n: zero ? 0 : (window.__rez || []).length, mai_multe: nxt ? !nxt.hidden : undefined, ajutor}));
    }).observe(msg, {childList: true, characterData: true, subtree: true});
  }

  // 2) Click-uri și acțiuni.
  const RETEA = /(^|\.)(aiventure\.(ro|uk)|5thelement\.ai|ai-lens\.eu|3webobs\.com|aireadyinjector\.com|eu-ai-act\.ro|eu-ai-act-ready\.eu|eu-ai-audit\.eu|eu-ai-ready\.eu|1clic-ia\.(eu|fr)|the3webs\.com|b2b-ai-library\.org|eu-112\.(eu|ro))$/i;
  document.addEventListener('click', e => {
    const t = e.target;
    if (!t || !t.closest) return;
    const a = t.closest('a[href]');
    if (a) {
      let u; try { u = new URL(a.getAttribute('href'), location.href); } catch (x) { return; }
      const m = u.pathname.match(/^\/firme\/([0-9]{1,10})\//);
      if (u.hostname === location.hostname && m && a.closest('#results')) return trimite('click_firma', Object.assign(stareFormular(), {ref: m[1]}));
      if (u.hostname === location.hostname && a.closest('#piata-rez')) return trimite('click_piata_judet', {caen: u.searchParams.get('caen') || undefined, judet: u.searchParams.get('judet') || undefined});
      if (u.hostname === location.hostname && a.closest('#sugestii-cautari')) return trimite('click_sugestie', {caen: u.searchParams.get('caen') || undefined, judet: u.searchParams.get('judet') || undefined});
      if (u.hostname !== location.hostname && RETEA.test(u.hostname)) return trimite('click_serviciu', Object.assign(stareFormular(), {ref: (u.hostname + u.pathname).slice(0, 64)}));
      return;
    }
    const b = t.closest('button');
    if (!b) return;
    if (b.closest('#aux')) return trimite('click_ajutor', Object.assign(stareFormular(), {ref: (b.textContent || '').trim().slice(0, 64)}));
    if (b.id === 'export') return trimite('export', Object.assign(stareFormular(), {rezultat_n: (window.__rez || []).length}));
    if (b.id === 'salveaza') return trimite('salveaza', stareFormular());
    if (b.closest('#sugestii-cautari')) { const c = (b.closest('.sg-card') || {}); return trimite('click_sugestie', {ref: ((c.querySelector && c.querySelector('h3') && c.querySelector('h3').textContent) || '').slice(0, 64)}); }
  }, true);

  // 3) Panoul „Piața pe județe".
  const pf = $('#piata-form');
  if (pf) pf.addEventListener('submit', () => { const c = $('#piata-caen'); if (c && /^[0-9]{2,4}$/.test(c.value.trim())) trimite('piata_deschisa', {caen: c.value.trim()}); });

  // 4) Nota de transparență + oprire.
  const nota = $('#jurnal-nota'), buton = $('#jurnal-oprire'), stare = $('#jurnal-stare');
  function arataStarea() {
    if (!nota) return;
    const o = oprit();
    if (stare) stare.textContent = o ? (semnalOprire() && store.get(OFF) !== '1' ? 'Memorarea este oprită, pentru că browserul dumneavoastră cere „Do Not Track”.' : 'Memorarea este oprită pe acest browser.') : '';
    if (buton) { buton.textContent = store.get(OFF) === '1' ? 'Pornește memorarea' : 'Nu memora căutările mele'; buton.hidden = semnalOprire() && store.get(OFF) !== '1'; }
  }
  if (buton) buton.addEventListener('click', () => { if (store.get(OFF) === '1') store.del(OFF); else { store.set(OFF, '1'); store.del(SID); store.del(SIDT); sidMem = null; } arataStarea(); });
  arataStarea();
})();
