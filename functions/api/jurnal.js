// firmsfinder.eu/api/jurnal — jurnal anonim de intenții (POST). Fără IP, fără email, fără user-agent stocat.
// Un rând = un eveniment. Textul căutării (q_raw) se păstrează 90 de zile, apoi se șterge; restul 24 de luni.
// Tabela: jurnal_evenimente (D1, binding DB). Schema este înghețată: câmpurile rezervate (obiectiv, intrebare_id, intent_id) se completează în etapele următoare.
const EVENIMENTE = new Set([
  'cautare', 'pagina', 'click_firma', 'click_ajutor', 'export', 'salveaza',
  'piata_deschisa', 'click_piata_judet', 'click_sugestie', 'click_serviciu',
  'obiectiv', 'intrebare_context', 'intrebare_libera'
]);
const ZILE_TEXT = 90, ZILE_RAND = 730, MAX_PE_ORA = 200, MAX_BODY = 4096;
const FILTRE_OK = ['fara_judet', 'cmin', 'cmax', 'smin', 'smax', 'trend', 'sort', 'profit_pozitiv', 'fara_pierdere'];

const R = (s) => new Response(null, {status: s, headers: {'cache-control': 'no-store'}});

// Șterge date care seamănă a fi personale. Nu garantează anonimizarea (nume proprii nu se pot detecta).
function curata(t, max = 80) {
  if (typeof t !== 'string') return null;
  let s = t.normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, ' ')                       // email
    .replace(/\bRO\d{2}\s?[A-Z]{4}(?:\s?[A-Z0-9]{4}){3,6}\b/gi, ' ') // IBAN RO
    .replace(/(?:\+|00)?\d[\d\s().\/-]{7,}\d/g, (m) => (m.replace(/\D/g, '').length >= 9 ? ' ' : m)) // telefon, CNP, șiruri lungi de cifre
    .replace(/\d{9,}/g, ' ')
    .replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.slice(0, max);
}

function normalizeaza(t) {
  if (!t) return null;
  const s = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 -]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s || null;
}

const text = (v, max) => (typeof v === 'string' ? curata(v, max) : null);

function pregateste(b, acum = new Date()) {
  if (!b || typeof b !== 'object') return null;
  if (typeof b.sid !== 'string' || !/^[a-z0-9]{12,32}$/.test(b.sid)) return null;
  if (!EVENIMENTE.has(b.ev)) return null;
  const caen = typeof b.caen === 'string' && /^[0-9]{2,4}$/.test(b.caen) ? b.caen : null;
  const q = text(b.q, 80);
  let filtre = null;
  if (b.filtre && typeof b.filtre === 'object') {
    const o = {};
    for (const k of FILTRE_OK) {
      const v = b.filtre[k];
      if (typeof v === 'string' || typeof v === 'number') {
        const c = String(v).slice(0, 60).replace(/[^\p{L}\p{N} ,._-]/gu, '');
        if (c) o[k] = c;
      }
    }
    if (Object.keys(o).length) filtre = JSON.stringify(o).slice(0, 300);
  }
  const n = Number.isInteger(b.rezultat_n) && b.rezultat_n >= 0 && b.rezultat_n <= 100000 ? b.rezultat_n : null;
  const ajutor = typeof b.ajutor === 'string' ? b.ajutor.replace(/[^a-z,]/g, '').slice(0, 40) || null : null;
  const utm = typeof b.utm === 'string' ? b.utm.replace(/[^A-Za-z0-9_.:|-]/g, '').slice(0, 80) || null : null;
  const refHost = typeof b.ref_host === 'string' && /^[a-z0-9.-]{3,80}$/i.test(b.ref_host) ? b.ref_host.toLowerCase() : null;
  const intrebare = b.ev === 'intrebare_libera' ? text(b.q, 300) : q;
  return {
    ts: acum.toISOString(),
    sid: b.sid,
    ev: b.ev,
    loc: typeof b.loc === 'string' && /^\/[a-z0-9\/_-]{0,60}$/i.test(b.loc) ? b.loc : null,
    caen,
    judet: text(b.judet, 120),
    localitate: text(b.localitate, 60),
    q_raw: intrebare,
    q_norm: normalizeaza(intrebare),
    filtre,
    obiectiv: typeof b.obiectiv === 'string' && /^[a-z_]{2,30}$/.test(b.obiectiv) ? b.obiectiv : null,
    intrebare_id: typeof b.intrebare_id === 'string' && /^[a-z0-9_]{2,40}$/.test(b.intrebare_id) ? b.intrebare_id : null,
    rezultat_n: n,
    mai_multe: b.mai_multe === true ? 1 : b.mai_multe === false ? 0 : null,
    ajutor_afisat: ajutor,
    ref: typeof b.ref === 'string' ? b.ref.replace(/[^\p{L}\p{N} :/._|?=&-]/gu, '').slice(0, 64) || null : null,
    utm,
    ref_host: refHost
  };
}

export async function onRequestPost({request, env}) {
  if (!env.DB) return R(503);
  const ua = request.headers.get('user-agent') || '';
  if (/bot|crawl|spider|slurp|headless|preview|monitor|curl|python|wget/i.test(ua)) return R(204); // boții nu intră în jurnal (UA nu se stochează)
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY) return R(413);
  let b;
  try {
    const t = await request.text();
    if (t.length > MAX_BODY) return R(413);
    b = JSON.parse(t);
  } catch (e) { return R(400); }
  const r = pregateste(b);
  if (!r) return R(400);
  try {
    const dupa = new Date(Date.now() - 3600e3).toISOString();
    const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM jurnal_evenimente WHERE sid = ? AND ts > ?').bind(r.sid, dupa).first();
    if (c && c.n >= MAX_PE_ORA) return R(429);
    await env.DB.prepare(
      `INSERT INTO jurnal_evenimente (ts, sid, ev, loc, caen, judet, localitate, q_raw, q_norm, filtre, obiectiv, intrebare_id, rezultat_n, mai_multe, ajutor_afisat, ref, utm, ref_host)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(r.ts, r.sid, r.ev, r.loc, r.caen, r.judet, r.localitate, r.q_raw, r.q_norm, r.filtre, r.obiectiv, r.intrebare_id, r.rezultat_n, r.mai_multe, r.ajutor_afisat, r.ref, r.utm, r.ref_host).run();
    if (Math.random() < 0.02) { // retenție: la ~1 din 50 de scrieri
      const limitaText = new Date(Date.now() - ZILE_TEXT * 864e5).toISOString();
      const limitaRand = new Date(Date.now() - ZILE_RAND * 864e5).toISOString();
      await env.DB.batch([
        env.DB.prepare('UPDATE jurnal_evenimente SET q_raw = NULL WHERE ts < ? AND q_raw IS NOT NULL').bind(limitaText),
        env.DB.prepare('DELETE FROM jurnal_evenimente WHERE ts < ?').bind(limitaRand)
      ]);
    }
  } catch (e) { return R(500); }
  return R(204);
}
