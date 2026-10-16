// Jurnal de intenții pentru /cautare/ (schema market_intent_events v1.1). Nu modifică motorul de căutare: observă pagina.
// Fără acord: se trimit doar numărători (activitate, județ, număr rezultate, tip acțiune) — fără text, fără cod de sesiune.
// Cu acord: și textul, filtrele, selecțiile, legate de un cod aleator din acest browser (30 de zile). Nu se trimite nimic dacă browserul cere Do Not Track / Global Privacy Control.
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const K_ACORD = 'ff_acord_jurnal', K_SID = 'ff_sid', K_SIDT = 'ff_sid_ts';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const semnalOprire = () => navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  const acord = () => store.get(K_ACORD) === 'granted' && !semnalOprire();

  let sidMem = null;
  function sid() {
    const acum = Date.now(), t = Number(store.get(K_SIDT) || 0);
    let s = store.get(K_SID);
    if (!s || !/^[a-z0-9]{12,32}$/.test(s) || !t || acum - t > 30 * 864e5) {
      const b = new Uint8Array(12);
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b); else b.forEach((_, i) => (b[i] = Math.floor(Math.random() * 256)));
      s = Array.from(b, x => (x % 36).toString(36)).join('');
      store.set(K_SID, s); store.set(K_SIDT, String(acum));
    }
    return (sidMem = s);
  }
  const uitaCod = () => { store.del(K_SID); store.del(K_SIDT); sidMem = null; };

  const utm = (() => {
    const p = new URLSearchParams(location.search), o = [];
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) if (p.get(k)) o.push(p.get(k));
    return o.join('|').slice(0, 80) || undefined;
  })();
  const refHost = (() => { try { const h = new URL(document.referrer).hostname; return h && h !== location.hostname ? h : undefined; } catch (e) { return undefined; } })();

  const FILTRE = ['fara_judet', 'cmin', 'cmax', 'smin', 'smax', 'trend', 'sort', 'profit_pozitiv', 'fara_pierdere'];
  function stare() {
    const f = $('#search-form');
    if (!f) return {};
    const v = n => { const e = f.elements.namedItem(n); return e ? (e.type === 'checkbox' ? (e.checked ? '1' : '') : String(e.value || '').trim()) : ''; };
    const filtre = {};
    for (const k of FILTRE) if (v(k)) filtre[k] = v(k);
    return {q: v('q'), caen: v('caen'), judet: v('judet'), localitate: v('localitate'), filtre, smin: v('smin'), smax: v('smax')};
  }

  // Câmpurile bogate pleacă DOAR cu acord; cele de numărare pleacă mereu.
  function trimite(tip, numaratori, formular) {
    if (semnalOprire()) return;
    const corp = Object.assign({event_type: tip, source_page: location.pathname, utm, referrer_host: refHost}, numaratori || {});
    if (formular) { corp.caen = formular.caen || undefined; corp.judet = formular.judet || undefined; }
    if (acord()) {
      corp.consent = true; corp.sid = sidMem || sid();
      if (formular) {
        corp.query = formular.q || undefined; corp.localitate = formular.localitate || undefined; corp.filtre = formular.filtre;
        if (/^\d+$/.test(formular.smin)) corp.size_min = Number(formular.smin);
        if (/^\d+$/.test(formular.smax)) corp.size_max = Number(formular.smax);
      }
    }
    try { fetch('/api/jurnal', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(corp), keepalive: true}).catch(() => {}); } catch (e) {}
  }

  // 1) Căutarea și rezultatul ei, inclusiv „zero rezultate".
  let urmatoarea = false, ultimulZero = false;
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#next')) urmatoarea = true; }, true);
  const msg = $('#message');
  if (msg && window.MutationObserver) {
    new MutationObserver(() => {
      const t = msg.textContent || '';
      const zero = /^Nicio firmă găsită/.test(t), cu = /^\d+ rezultate/.test(t);
      if (!zero && !cu) return;
      if (urmatoarea) { urmatoarea = false; return; }
      const f = stare(), n = zero ? 0 : (window.__rez || []).length;
      ultimulZero = zero;
      if (zero) {
        const areText = !!f.q, areFiltre = !!(f.caen || f.judet || f.localitate || Object.keys(f.filtre).length);
        trimite('zero_results', {result_count: 0, result_count_scope: 'page', zero_result_context: areText && areFiltre ? 'text_and_filters' : areText ? 'text_only' : areFiltre ? 'filters_only' : 'unknown'}, f);
      } else trimite('search_completed', {result_count: n, result_count_scope: 'page'}, f);
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
      const m = u.pathname.match(/^\/firme\/([0-9]{1,10})\//), propriu = u.hostname === location.hostname;
      if (propriu && m && a.closest('#results')) return trimite('result_clicked', {target_kind: 'firm', target_value: m[1]}, stare());
      if (propriu && a.closest('#piata-rez')) return trimite('result_clicked', {target_kind: 'county', target_value: (u.searchParams.get('caen') || '') + ':' + (u.searchParams.get('judet') || ''), caen: u.searchParams.get('caen') || undefined});
      if (propriu && a.closest('#sugestii-cautari')) return trimite('result_clicked', {target_kind: 'market_card', target_value: (u.searchParams.get('caen') || '') + ':' + (u.searchParams.get('judet') || ''), caen: u.searchParams.get('caen') || undefined});
      if (!propriu && RETEA.test(u.hostname)) return trimite('service_clicked', {target_kind: 'service', target_value: (u.hostname + u.pathname).slice(0, 64)});
      return;
    }
    const b = t.closest('button');
    if (!b) return;
    if (b.closest('#aux')) {
      const tx = (b.textContent || '').trim(), gen = /\(CAEN/.test(tx) ? 'synonym' : /\?$/.test(tx) ? 'suggestion' : 'facet';
      return trimite(ultimulZero ? 'recovery_action_clicked' : 'result_clicked', {target_kind: gen, target_value: tx.slice(0, 64)}, stare());
    }
    if (b.id === 'export') return trimite('export_requested', {result_count: (window.__rez || []).length, result_count_scope: 'page'}, stare());
    if (b.id === 'salveaza') return trimite('search_saved', {}, stare());
    if (b.closest('#sugestii-cautari')) return trimite('result_clicked', {target_kind: 'market_card', target_value: ((b.closest('.sg-card') || document).querySelector('h3') || {textContent: ''}).textContent.slice(0, 64)});
  }, true);

  // 3) Panoul „Piața pe județe".
  const pf = $('#piata-form');
  if (pf) pf.addEventListener('submit', () => { const c = $('#piata-caen'); if (c && /^[0-9]{2,4}$/.test(c.value.trim())) trimite('market_panel_opened', {caen: c.value.trim()}); });

  // 4) Acord, refuz, retragere și starea afișată.
  const bDa = $('#jurnal-da'), bNu = $('#jurnal-nu'), bRetrage = $('#jurnal-retrage'), txt = $('#jurnal-stare');
  function arata() {
    const a = store.get(K_ACORD);
    if (txt) txt.textContent = semnalOprire() ? 'Browserul dumneavoastră cere „Do Not Track”: nu memorăm nimic, nici numărători.' :
      a === 'granted' ? 'Ați dat acordul. Îl puteți retrage oricând.' : a === 'denied' ? 'Fără acord: se memorează doar numărători.' : 'Nu ați ales încă: până atunci se memorează doar numărători.';
    const ales = a === 'granted' || a === 'denied' || semnalOprire();
    if (bDa) bDa.hidden = ales; if (bNu) bNu.hidden = ales; if (bRetrage) bRetrage.hidden = a !== 'granted' || semnalOprire();
  }
  if (bDa) bDa.addEventListener('click', () => { store.set(K_ACORD, 'granted'); sid(); arata(); });
  if (bNu) bNu.addEventListener('click', () => { store.set(K_ACORD, 'denied'); uitaCod(); arata(); });
  if (bRetrage) bRetrage.addEventListener('click', () => {
    const s = store.get(K_SID);
    store.set(K_ACORD, 'denied'); uitaCod();
    if (s) { try { fetch('/api/jurnal', {method: 'DELETE', headers: {'content-type': 'application/json'}, body: JSON.stringify({sid: s}), keepalive: true}).catch(() => {}); } catch (e) {} }
    arata();
  });
  arata();

  // Starea reală a jurnalului vine din angajament.json; până la confirmare, pagina spune că jurnalul nu este activ.
  const inactiv = $('#jurnal-inactiv');
  if (inactiv) fetch('/angajament.json').then(r => r.json()).then(j => { if (j && j.jurnal_activ_in_productie === true) inactiv.remove(); }).catch(() => {});
})();
