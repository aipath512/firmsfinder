// firmsfinder.eu/api/jurnal — jurnal de intenții, schema backend/market_intent_events_v1.1_2026-10-16.sql.
// POST   = un eveniment. DELETE = ștergerea evenimentelor legate de un cod de sesiune (retragerea acordului).
// Fără acord se scriu DOAR numărători (fără text, fără cod de sesiune). Cu acord se scriu și textul, filtrele și codul de sesiune.
// Nu se stochează IP, user-agent, email sau nume. Declarația publică: /angajament.json (verificată de verify_angajament.py).
const ZILE_CU_ACORD = 30;
const LUNI_FARA_ACORD = 24;
const SANITIZATION_VERSION = 'ff-san-1';
const MAX_PE_ORA = 200, MAX_BODY = 4096;
const TIPURI = new Set(['search_completed', 'zero_results', 'result_clicked', 'recovery_action_clicked', 'export_requested', 'search_saved', 'market_panel_opened', 'service_clicked', 'filter_changed', 'objective_selected', 'question_selected', 'search_error']);
const ZERO_CTX = new Set(['text_only', 'filters_only', 'text_and_filters', 'unknown']);
const FILTRE_OK = ['fara_judet', 'cmin', 'cmax', 'smin', 'smax', 'trend', 'sort', 'profit_pozitiv', 'fara_pierdere'];

const R = (s) => new Response(null, {status: s, headers: {'cache-control': 'no-store'}});

// Șterge date care seamănă a fi personale. Nu garantează anonimizarea: nume proprii nu pot fi detectate.
function curata(t, max = 80) {
  if (typeof t !== 'string') return null;
  const s = t.normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, ' ')                       // email
    .replace(/\bRO\d{2}\s?[A-Z]{4}(?:\s?[A-Z0-9]{4}){3,6}\b/gi, ' ') // IBAN RO
    .replace(/(?:\+|00)?\d[\d\s().\/-]{7,}\d/g, (m) => (m.replace(/\D/g, '').length >= 9 ? ' ' : m)) // telefon, CNP, șiruri lungi de cifre
    .replace(/\d{9,}/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
}

function normalizeaza(t) {
  if (!t) return null;
  const s = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 -]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s || null;
}

const intreg = (v, max = 100000) => (Number.isInteger(v) && v >= 0 && v <= max ? v : null);

function pregateste(b, acum = new Date()) {
  if (!b || typeof b !== 'object' || !TIPURI.has(b.event_type)) return null;
  const acord = b.consent === true && typeof b.sid === 'string' && /^[a-z0-9]{12,32}$/.test(b.sid);
  const caen = typeof b.caen === 'string' && /^[0-9]{2,4}$/.test(b.caen) ? b.caen : null;
  const r = {
    event_id: crypto.randomUUID(),
    occurred_at: acum.toISOString(),
    site: 'firmsfinder',
    event_type: b.event_type,
    session_id: null, query_raw: null, query_norm: null, intent_family: null, funnel_stage: null, objective: null, target_role: null,
    caen,
    judet: typeof b.judet === 'string' ? curata(b.judet, 120) : null,
    localitate: null, size_min: null, size_max: null, filters_json: '{}',
    result_count: intreg(b.result_count),
    result_count_scope: ['page', 'total', 'unknown'].includes(b.result_count_scope) ? b.result_count_scope : (intreg(b.result_count) === null ? null : 'unknown'),
    zero_result_context: b.event_type === 'zero_results' ? (ZERO_CTX.has(b.zero_result_context) ? b.zero_result_context : 'unknown') : null,
    target_kind: typeof b.target_kind === 'string' && /^[a-z_]{2,24}$/.test(b.target_kind) ? b.target_kind : null,
    target_value: typeof b.target_value === 'string' ? b.target_value.replace(/[^\p{L}\p{N} :/._|?=&-]/gu, '').slice(0, 64) || null : null,
    source_page: typeof b.source_page === 'string' && /^\/[a-z0-9\/_-]{0,60}$/i.test(b.source_page) ? b.source_page : '/cautare/',
    referrer_host: typeof b.referrer_host === 'string' && /^[a-z0-9.-]{3,80}$/i.test(b.referrer_host) ? b.referrer_host.toLowerCase() : null,
    utm: typeof b.utm === 'string' ? b.utm.replace(/[^A-Za-z0-9_.:|-]/g, '').slice(0, 80) || null : null,
    sanitization_version: SANITIZATION_VERSION,
    consent_state: acord ? 'granted' : 'not_required',
    retention_until: null
  };
  if (acord) {
    r.session_id = b.sid;
    r.query_raw = curata(b.query, 80);
    r.query_norm = normalizeaza(r.query_raw);
    r.localitate = typeof b.localitate === 'string' ? curata(b.localitate, 60) : null;
    r.size_min = intreg(b.size_min); r.size_max = intreg(b.size_max);
    r.objective = typeof b.objective === 'string' && /^[a-z_]{2,30}$/.test(b.objective) ? b.objective : null;
    if (b.filtre && typeof b.filtre === 'object') {
      const o = {};
      for (const k of FILTRE_OK) {
        const v = b.filtre[k];
        if (typeof v === 'string' || typeof v === 'number') {
          const c = String(v).slice(0, 60).replace(/[^\p{L}\p{N} ,._-]/gu, '');
          if (c) o[k] = c;
        }
      }
      r.filters_json = JSON.stringify(o).slice(0, 300);
    }
    r.retention_until = new Date(acum.getTime() + ZILE_CU_ACORD * 864e5).toISOString();
  } else {
    const d = new Date(acum.getTime()); d.setUTCMonth(d.getUTCMonth() + LUNI_FARA_ACORD);
    r.retention_until = d.toISOString();
  }
  return r;
}

async function purjeaza(env) {
  await env.DB.prepare('DELETE FROM market_intent_events WHERE retention_until < ?').bind(new Date().toISOString()).run();
}

export async function onRequestPost({request, env}) {
  if (!env.DB) return R(503);
  if (/bot|crawl|spider|slurp|headless|preview|monitor|curl|python|wget/i.test(request.headers.get('user-agent') || '')) return R(204); // boții nu intră în jurnal; UA nu se stochează
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) return R(413);
  let b;
  try {
    const t = await request.text();
    if (t.length > MAX_BODY) return R(413);
    b = JSON.parse(t);
  } catch (e) { return R(400); }
  const r = pregateste(b);
  if (!r) return R(400);
  try {
    if (r.session_id) {
      const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM market_intent_events WHERE session_id = ? AND occurred_at > ?').bind(r.session_id, new Date(Date.now() - 3600e3).toISOString()).first();
      if (c && c.n >= MAX_PE_ORA) return R(429);
    }
    await env.DB.prepare(
      `INSERT INTO market_intent_events (event_id, occurred_at, site, event_type, session_id, query_raw, query_norm, intent_family, funnel_stage, objective, target_role, caen, judet, localitate, size_min, size_max, filters_json, result_count, result_count_scope, zero_result_context, target_kind, target_value, source_page, referrer_host, utm, sanitization_version, consent_state, retention_until)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(r.event_id, r.occurred_at, r.site, r.event_type, r.session_id, r.query_raw, r.query_norm, r.intent_family, r.funnel_stage, r.objective, r.target_role, r.caen, r.judet, r.localitate, r.size_min, r.size_max, r.filters_json, r.result_count, r.result_count_scope, r.zero_result_context, r.target_kind, r.target_value, r.source_page, r.referrer_host, r.utm, r.sanitization_version, r.consent_state, r.retention_until).run();
    if (Math.random() < 0.02) await purjeaza(env);
  } catch (e) { return R(500); }
  return R(204);
}

// Retragerea acordului: șterge tot ce este legat de codul de sesiune primit.
export async function onRequestDelete({request, env}) {
  if (!env.DB) return R(503);
  let b;
  try { b = JSON.parse(await request.text()); } catch (e) { return R(400); }
  if (!b || typeof b.sid !== 'string' || !/^[a-z0-9]{12,32}$/.test(b.sid)) return R(400);
  try {
    await env.DB.prepare('DELETE FROM market_intent_events WHERE session_id = ?').bind(b.sid).run();
    await purjeaza(env);
  } catch (e) { return R(500); }
  return R(204);
}
