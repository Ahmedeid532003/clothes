/**
 * Cloudflare Pages — proxy /api/* إلى Render (بدون VPS)
 * عيّن MAHALY_API_URL في Cloudflare Dashboard → Settings → Variables
 * مثال: https://mahalyerp-api.onrender.com/api
 */
export async function onRequest(context) {
  const base = (context.env.MAHALY_API_URL || "").replace(/\/$/, "");
  if (!base) {
    return new Response(
      JSON.stringify({ detail: "MAHALY_API_URL not configured on Cloudflare Pages" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(context.request.url);
  const path = context.params.path ?? "";
  const upstream = `${base}/${path}${url.search}`;

  const headers = new Headers(context.request.headers);
  headers.delete("host");

  const init = {
    method: context.request.method,
    headers,
    redirect: "manual",
  };
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    init.body = context.request.body;
  }

  const res = await fetch(upstream, init);
  const out = new Headers(res.headers);
  out.set("Access-Control-Allow-Origin", url.origin);
  out.set("Access-Control-Allow-Credentials", "true");
  return new Response(res.body, { status: res.status, headers: out });
}
