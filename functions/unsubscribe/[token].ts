// Cloudflare Pages Function:
// /unsubscribe/:token を Flask 側の /unsubscribe/:token にプロキシして HTML を返す。

export async function onRequestGet({ params, request, env }: any) {
  const token = params?.token;
  if (!token || typeof token !== "string") {
    return new Response("invalid", { status: 400 });
  }

  const backendBase = String(env?.MAILER_BACKEND_BASE_URL || "").replace(/\/+$/, "");
  if (!backendBase) {
    return new Response("MAILER_BACKEND_BASE_URL is not set", { status: 500 });
  }

  let url: URL;
  try {
    url = new URL(`${backendBase}/unsubscribe/${encodeURIComponent(token)}`);
  } catch {
    return new Response("MAILER_BACKEND_BASE_URL is invalid", { status: 500 });
  }

  // クエリは一応引き継ぐ
  url.search = new URL(request.url).search;

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "text/html,*/*",
      "user-agent": "cf-pages-unsubscribe-proxy",
    },
  });

  const headers = new Headers(res.headers);
  headers.set("cache-control", "no-store");
  if (!headers.get("content-type")) {
    headers.set("content-type", "text/html; charset=utf-8");
  }

  return new Response(await res.text(), { status: res.status, headers });
}

