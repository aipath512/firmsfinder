
 // AiVenture 0006H — FirmsFinder.eu
 // Cloudflare Pages Functions middleware
 // Binding: SCHEMA_KV
 // Key: schema:0006H:homepage

const KV_KEY = "schema:0006H:homepage";

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

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.hostname !== "firmsfinder.eu" ||
    url.pathname !== "/"
  ) {
    return next();
  }

  if (!env.SCHEMA_KV) {
    return next();
  }

  let schema;

  try {
    const raw = await env.SCHEMA_KV.get(KV_KEY);

    if (!raw) return next();

    schema = JSON.parse(raw);

    const nodes = schema?.["@graph"];

    if (
      schema?.["@context"] !== "https://schema.org" ||
      !Array.isArray(nodes) ||
      nodes.length !== 3
    ) {
      return next();
    }

    const ids = nodes.map((node) => node?.["@id"]);

    const required = [
      "https://aiventure.ro/#organization",
      "https://firmsfinder.eu/#website",
      "https://firmsfinder.eu/#webpage"
    ];

    if (
      new Set(ids).size !== 3 ||
      !required.every((id) => ids.includes(id))
    ) {
      return next();
    }
  } catch (error) {
    console.error(
      "AiVenture 0006H: invalid KV schema",
      error?.message
    );

    return next();
  }

  const response = await next();

  if (
    !response.ok ||
    !response.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("text/html")
  ) {
    return response;
  }

  if (
    response.headers.has("content-security-policy")
  ) {
    return response;
  }

  let html;

  try {
    html = await response.clone().text();
  } catch {
    return response;
  }

  if (
    html.includes("data-aiventure-0006h=") ||
    html.includes("https://firmsfinder.eu/#website") ||
    html.includes("https://firmsfinder.eu/#webpage")
  ) {
    return response;
  }

  const headers = new Headers(response.headers);

  headers.delete("content-length");
  headers.delete("etag");
  headers.delete("content-encoding");

  return new HTMLRewriter()
    .on("head", new SchemaInjector(schema))
    .transform(
      new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
    );
}
