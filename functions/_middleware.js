// AiVenture — FirmsFinder.eu — Cloudflare Pages Functions middleware
// v2.0 — 2026-11-01 — sesiunea 0008C
//  1. Schema 0006H pe homepage (neschimbat față de v1): binding SCHEMA_KV, cheia schema:0006H:homepage
//  2. NOU: linia „Date și integritate” pe toate paginile HTML, citită din /data-footer.json
//     (o singură sursă; se actualizează fișierul, nu paginile)

const KV_KEY = "schema:0006H:homepage";
const FOOTER_JSON = "/data-footer.json";
const FOOTER_TTL_MS = 5 * 60 * 1000;

let footerCache = { at: 0, data: null };

const fmt = (n) => Number(n).toLocaleString("ro-RO");
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const shortHash = (h) => (h && h.length > 12 ? `${h.slice(0, 6)}…${h.slice(-4)}` : esc(h));

const LUNI = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
const dataRo = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${Number(m[3])} ${LUNI[Number(m[2]) - 1]} ${m[1]}` : esc(iso);
};

async function loadFooter(env, requestUrl) {
  const now = Date.now();
  if (footerCache.data && now - footerCache.at < FOOTER_TTL_MS) return footerCache.data;
  if (!env.ASSETS) return null;
  try {
    const res = await env.ASSETS.fetch(new URL(FOOTER_JSON, requestUrl));
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.schema !== "FIRMSFINDER_DATA_FOOTER") return null;
    footerCache = { at: now, data };
    return data;
  } catch (error) {
    console.error("FirmsFinder data footer: cannot load", error?.message);
    return null;
  }
}

function footerHtml(d) {
  const s = d.surse_publice || {};
  const c = d.cifre || {};
  const i = d.integritate || {};
  return (
    `<div class="ff-date" data-ff-date="1">` +
    `<style>.ff-date{max-width:1080px;margin:24px auto 0;padding:14px 24px 20px;border-top:1px solid #ffffff22;font:13px/1.55 system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#b9b5ab}.ff-date p{margin:4px 0}.ff-date strong{color:#eae7df}.ff-date a{color:#f5c842}.ff-date code{font-size:12px;color:#eae7df}</style>` +
    `<p><strong>Date:</strong> ONRC și Ministerul Finanțelor, prin <a href="${esc(s.portal)}" rel="noopener">data.gov.ro</a> (licență <a href="${esc(s.licenta_url)}" rel="noopener">CC BY 4.0</a>) · ` +
    `Set ONRC din <a href="${esc(s.onrc_set_url)}" rel="noopener">${dataRo(s.onrc_set)}</a> · ` +
    `${fmt(c.firme_active_persoane_juridice)} firme active (stare „funcțiune”, fără persoane fizice) · ` +
    `bilanțuri ${esc(Math.min(...(s.mf_ani_bilant || [0])))}–${esc(Math.max(...(s.mf_ani_bilant || [0])))} pentru ${fmt(c.firme_active_cu_cel_putin_un_bilant)} dintre ele · ` +
    `județ = sediul social · PFA, II și IF apar mascate</p>` +
    `<p><strong>Integritate:</strong> setul ONRC arhivat, SHA-256 <code title="${esc(i.fisier_onrc_sha256)}">${shortHash(i.fisier_onrc_sha256)}</code> · ` +
    `<a href="${esc(i.manifest_url)}" rel="noopener">manifest</a> SHA-256 <code title="${esc(i.manifest_sha256)}">${shortHash(i.manifest_sha256)}</code> · ` +
    `<a href="${esc(i.ots_url)}" rel="noopener">OpenTimestamps</a>, confirmat în blocul Bitcoin ${fmt(i.ots_bitcoin_bloc)} · ` +
    `cifre calculate la ${dataRo(d.generat_la)} · <a href="/surse/">Detalii despre date</a> · <a href="${FOOTER_JSON}">JSON</a></p>` +
    `</div>`
  );
}

class SchemaInjector {
  constructor(schema) {
    this.schema = schema;
  }
  element(element) {
    const json = JSON.stringify(this.schema)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026");
    element.append(
      `<script type="application/ld+json" data-aiventure-0006h="1">${json}</script>`,
      { html: true }
    );
  }
}

class FooterInjector {
  constructor(html) {
    this.html = html;
  }
  element(element) {
    element.onEndTag((end) => {
      end.before(this.html, { html: true });
    });
  }
}

async function loadHomepageSchema(env) {
  if (!env.SCHEMA_KV) return null;
  try {
    const raw = await env.SCHEMA_KV.get(KV_KEY);
    if (!raw) return null;
    const schema = JSON.parse(raw);
    const nodes = schema?.["@graph"];
    if (schema?.["@context"] !== "https://schema.org" || !Array.isArray(nodes) || nodes.length !== 3) return null;
    const ids = nodes.map((node) => node?.["@id"]);
    const required = [
      "https://aiventure.ro/#organization",
      "https://firmsfinder.eu/#website",
      "https://firmsfinder.eu/#webpage"
    ];
    if (new Set(ids).size !== 3 || !required.every((id) => ids.includes(id))) return null;
    return schema;
  } catch (error) {
    console.error("AiVenture 0006H: invalid KV schema", error?.message);
    return null;
  }
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (request.method !== "GET") return next();

  const response = await next();

  if (
    !response.ok ||
    !response.headers.get("content-type")?.toLowerCase().includes("text/html") ||
    response.headers.has("content-security-policy")
  ) {
    return response;
  }

  const isHomepage = url.hostname === "firmsfinder.eu" && url.pathname === "/";

  const [footerData, schema] = await Promise.all([
    loadFooter(env, request.url),
    isHomepage ? loadHomepageSchema(env) : Promise.resolve(null)
  ]);

  let html;
  try {
    html = await response.clone().text();
  } catch {
    return response;
  }

  const addSchema =
    schema &&
    !html.includes("data-aiventure-0006h=") &&
    !html.includes("https://firmsfinder.eu/#website") &&
    !html.includes("https://firmsfinder.eu/#webpage");
  const addFooter = footerData && !html.includes('data-ff-date="1"');

  if (!addSchema && !addFooter) return response;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.delete("content-encoding");

  let rewriter = new HTMLRewriter();
  if (addSchema) rewriter = rewriter.on("head", new SchemaInjector(schema));
  if (addFooter) rewriter = rewriter.on("body", new FooterInjector(footerHtml(footerData)));

  return rewriter.transform(
    new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  );
}
