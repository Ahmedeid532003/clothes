/**
 * Proxy /api/* → VPS (باك إند + داتابيز)
 * Cloudflare Pages Functions — يعمل من مصر (TE Data) بخلاف Netlify
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = context.params.path ?? "";
  const upstream = `http://128.140.127.179:8788/api/${path}${url.search}`;

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
