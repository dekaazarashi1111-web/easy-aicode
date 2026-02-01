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
  const token = url.searchParams.get("token");
  if (!token) {
    return jsonResponse({ error: "missing token" }, { status: 400 });
  }

  const kv = env.WG_KV;
  if (!kv) {
    return jsonResponse({ error: "missing KV" }, { status: 500 });
  }

  const record = await kv.get(`tok:${token}`, { type: "json" });
  if (!record) {
    return new Response("Not Found", { status: 404 });
  }

  const now = Math.floor(Date.now() / 1000);
  if (record.expiresAt && record.expiresAt <= now) {
    return new Response("Expired", { status: 410 });
  }

  if (record.downloads >= record.maxDownloads) {
    return new Response("Download limit reached", { status: 410 });
  }

  record.downloads += 1;
  const remainingTtl = Math.max(1, (record.expiresAt || now + 60) - now);
  await kv.put(`tok:${token}`, JSON.stringify(record), { expirationTtl: remainingTtl });
  if (record.sessionId) {
    await kv.put(`sess:${record.sessionId}`, JSON.stringify(record), {
      expirationTtl: remainingTtl,
    });
  }

  const r2 = env.WG_R2;
  const objectKey = env.DOWNLOAD_R2_KEY;
  if (!r2 || !objectKey) {
    console.log("dl: missing R2 binding or key");
    return jsonResponse({ error: "missing download source" }, { status: 500 });
  }

  const object = await r2.get(objectKey);
  if (!object) {
    console.log("dl: R2 object missing", objectKey);
    return jsonResponse({ error: "download not found" }, { status: 500 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="IchimeAI-Setup.exe"',
      "Cache-Control": "no-store",
    },
  });
}
