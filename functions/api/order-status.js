const jsonResponse = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return jsonResponse({ ready: false, error: "missing session_id" }, { status: 400 });
  }

  const kv = env.WG_KV;
  if (!kv) {
    return jsonResponse({ ready: false, error: "missing KV" }, { status: 500 });
  }

  const record = await kv.get(`sess:${sessionId}`, { type: "json" });
  if (!record) {
    return jsonResponse({ ready: false });
  }

  const dlUrl = `${url.origin}/dl?token=${record.token}`;
  return jsonResponse({ ready: true, token: record.token, dlUrl });
}
